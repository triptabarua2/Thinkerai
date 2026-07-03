import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export type SavePref = "auto" | "manual" | null;

const KEYS = {
  image: "@thinker_save_pref_image",
  file: "@thinker_save_pref_file",
};

export function useSavePreference(type: "image" | "file") {
  const [pref, setPrefState] = useState<SavePref>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEYS[type]).then((val) => {
      setPrefState((val as SavePref) ?? null);
      setLoaded(true);
    });
  }, [type]);

  const savePref = useCallback(
    async (value: "auto" | "manual") => {
      await AsyncStorage.setItem(KEYS[type], value);
      setPrefState(value);
    },
    [type]
  );

  return { pref, loaded, savePref };
}
