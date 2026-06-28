import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

/**
 * Returns design tokens for the current color scheme.
 * Dark-first: null / "dark" → dark palette; only "light" → light palette.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
