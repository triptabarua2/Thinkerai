/**
 * ResumeFromBackgroundBanner
 *
 * Appears at the top of the chat message list when the user returns to the app
 * (or re-opens this conversation) after a pipeline was still running in the
 * background. Gives two options:
 *   • Reconnect — re-attaches the SSE stream and watches progress live
 *   • Dismiss   — hides the banner (pipeline keeps running; a push notification
 *                 will be sent when done)
 */
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  onReconnect: () => void;
  onDismiss: () => void;
  colors: {
    primary: string;
    surface: string;
    text: string;
    subtext?: string;
    border: string;
    [key: string]: string | undefined;
  };
}

export function ResumeFromBackgroundBanner({
  onReconnect,
  onDismiss,
  colors,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const amber = "#F59E0B";

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: amber + "12",
          borderColor: amber + "35",
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: amber + "22" }]}>
          <Animated.View style={{ opacity: pulse }}>
            <Feather name="loader" size={14} color={amber} />
          </Animated.View>
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: amber }]}>
            Pipeline still running
          </Text>
          <Text style={[styles.sub, { color: colors.subtext ?? colors.text }]}>
            You left while the agents were working. Reconnect to watch progress
            live, or wait for a notification when it's done.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn, { backgroundColor: amber }]}
          onPress={onReconnect}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={12} color="#fff" />
          <Text style={styles.primaryBtnText}>Reconnect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.secondaryBtn,
            { borderColor: amber + "50" },
          ]}
          onPress={onDismiss}
          activeOpacity={0.75}
        >
          <Text style={[styles.secondaryBtnText, { color: amber }]}>
            Dismiss
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: 12,
    marginBottom: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtn: {},
  primaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
