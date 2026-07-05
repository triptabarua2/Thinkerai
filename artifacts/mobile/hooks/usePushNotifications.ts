/**
 * usePushNotifications
 *
 * Requests push notification permission and registers the Expo push token
 * with the backend so the server can send notifications when:
 *   - A blueprint is ready to approve
 *   - Output is ready to approve
 *   - A long pipeline task completes
 *
 * Gracefully no-ops on web (expo-notifications requires native iOS/Android).
 * On notification tap, navigates to the relevant conversation via deep link data.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { getBaseUrl } from "@/lib/api";

const BASE_URL = () => getBaseUrl();

async function registerTokenWithBackend(
  token: string,
  userId = "default"
): Promise<void> {
  try {
    await fetch(`${BASE_URL()}api/notifications/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token, platform: Platform.OS }),
    });
  } catch {
    // Non-fatal — push notifications just won't work
  }
}

function handleNotificationResponse(response: {
  notification: { request: { content: { data?: Record<string, unknown> } } };
}): void {
  const data = response.notification.request.content.data;
  if (!data) return;

  const screen = data.screen as string | undefined;
  const conversationId = data.conversationId as string | undefined;
  const jobId = data.jobId as string | undefined;
  if (screen === "chat" && conversationId) {
    // Navigate to the conversation and reconnect to the live job stream
    // (job may have kept progressing/completed while the app was backgrounded).
    if (jobId) {
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId, reconnectJobId: jobId },
      });
    } else {
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
    }
  }
}

export function usePushNotifications(userId = "default"): void {
  const registered = useRef(false);

  useEffect(() => {
    // Push notifications only work on native (iOS / Android)
    if (Platform.OS === "web" || registered.current) return;

    let notificationSub: { remove(): void } | null = null;

    async function setup() {
      try {
        const Notifications = await import("expo-notifications");

        // Configure how notifications appear when app is foregrounded
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Android requires an explicit notification channel or importance/sound
        // may not work correctly (silent/low-priority notifications).
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
          });
        }

        // Request permission
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        if (token) {
          registered.current = true;
          await registerTokenWithBackend(token, userId);
        }

        // Listen for notification taps (app backgrounded)
        notificationSub =
          Notifications.addNotificationResponseReceivedListener(
            handleNotificationResponse
          );
      } catch {
        // expo-notifications may not be installed or platform unsupported — silent fail
      }
    }

    setup();

    return () => {
      notificationSub?.remove();
    };
  }, [userId]);
}
