import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { ThinkingLevel } from "@/components/ThinkingLevelPicker";

const SETTINGS_KEY = "@thinker_settings_v1";

export interface AppSettings {
  /** Default thinking level shown in every new chat. "auto" = backend decides. */
  defaultThinkingLevel: ThinkingLevel;
  /** When true, "auto" is the initial level; overrides defaultThinkingLevel */
  autoSelectLevel: boolean;
}

const DEFAULTS: AppSettings = {
  defaultThinkingLevel: "auto",
  autoSelectLevel: true,
};

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettingsState({ ...DEFAULTS, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const next = { ...settings, ...updates };
      setSettingsState(next);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    },
    [settings]
  );

  /** Effective starting level for a new chat */
  const effectiveDefaultLevel: ThinkingLevel =
    settings.autoSelectLevel ? "auto" : settings.defaultThinkingLevel;

  return { settings, loaded, updateSettings, effectiveDefaultLevel };
}
