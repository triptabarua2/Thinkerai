import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const CONNECTORS_KEY = "@thinker_connectors_v1";

export interface ConnectorApp {
  id: string;
  label: string;
  description: string;
  /** Feather icon name */
  icon: string;
}

/** Common third-party apps users can connect for Thinker AI to reference. */
export const CONNECTOR_APPS: ConnectorApp[] = [
  {
    id: "google-drive",
    label: "Google Drive",
    description: "Search and reference your docs & files",
    icon: "hard-drive",
  },
  {
    id: "notion",
    label: "Notion",
    description: "Pull context from your workspace pages",
    icon: "file-text",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Read channels and post updates",
    icon: "hash",
  },
  {
    id: "github",
    label: "GitHub",
    description: "Reference repos, issues & pull requests",
    icon: "github",
  },
  {
    id: "gmail",
    label: "Gmail",
    description: "Summarize and draft emails",
    icon: "mail",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    description: "Check availability and schedule events",
    icon: "calendar",
  },
];

export function useConnectors() {
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONNECTORS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setConnectedIds(parsed);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const toggleConnector = useCallback((id: string) => {
    setConnectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((existing) => existing !== id)
        : [...prev, id];
      AsyncStorage.setItem(CONNECTORS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { apps: CONNECTOR_APPS, connectedIds, loaded, toggleConnector };
}
