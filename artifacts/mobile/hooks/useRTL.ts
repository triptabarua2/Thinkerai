import { I18nManager } from "react-native";

const RTL_LANGUAGES = new Set(["ar", "he", "ur", "fa", "yi", "dv", "ha", "ks", "ps", "sd", "ug"]);

export function isRTL(languageCode: string): boolean {
  return RTL_LANGUAGES.has(languageCode);
}

export function useRTL(detectedLanguage?: string): {
  isRTL: boolean;
  textAlign: "left" | "right" | "auto";
  flexDirection: "row" | "row-reverse";
  writingDirection: "ltr" | "rtl";
} {
  const rtl = isRTL(detectedLanguage ?? "en");
  return {
    isRTL: rtl,
    textAlign: rtl ? "right" : "left",
    flexDirection: rtl ? "row-reverse" : "row",
    writingDirection: rtl ? "rtl" : "ltr",
  };
}

export function applyRTL(languageCode: string): void {
  const rtl = isRTL(languageCode);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
  }
}
