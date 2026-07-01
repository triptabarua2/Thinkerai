import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getBaseUrl } from "@/lib/api";

const QUEUE_KEY = "thinker_pending_queue";
const PING_INTERVAL_MS = 8000;

export interface PendingMessage {
  id: string;
  conversationId: string;
  text: string;
  displayText?: string;
  enqueuedAt: number;
}

async function loadQueue(): Promise<PendingMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingMessage[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

async function removeFromQueue(msgId: string): Promise<void> {
  const queue = await loadQueue();
  await saveQueue(queue.filter((m) => m.id !== msgId));
}

async function isOnline(): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}healthz`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

interface UseOfflineQueueOptions {
  conversationId: string | undefined;
  onRetry: (msg: PendingMessage) => Promise<void>;
}

export function useOfflineQueue({ conversationId, onRetry }: UseOfflineQueueOptions) {
  const retryingRef = useRef(false);
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;

  const flushQueue = useCallback(async () => {
    if (retryingRef.current) return;
    const online = await isOnline();
    if (!online) return;

    const queue = await loadQueue();
    const mine = queue.filter((m) => m.conversationId === conversationId);
    if (mine.length === 0) return;

    retryingRef.current = true;
    try {
      for (const msg of mine) {
        try {
          await onRetryRef.current(msg);
          await removeFromQueue(msg.id);
        } catch {
          break;
        }
      }
    } finally {
      retryingRef.current = false;
    }
  }, [conversationId]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        flushQueue();
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        flushQueue();
      }
    }, PING_INTERVAL_MS);

    flushQueue();

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [flushQueue]);

  const enqueue = useCallback(async (msg: PendingMessage): Promise<void> => {
    const queue = await loadQueue();
    const already = queue.find((m) => m.id === msg.id);
    if (!already) {
      await saveQueue([...queue, msg]);
    }
  }, []);

  const markSent = useCallback(async (msgId: string): Promise<void> => {
    await removeFromQueue(msgId);
  }, []);

  return { enqueue, markSent, flushQueue };
}
