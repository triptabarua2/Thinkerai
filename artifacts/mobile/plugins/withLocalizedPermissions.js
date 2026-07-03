/**
 * Expo config plugin: adds localized InfoPlist.strings for iOS so that
 * permission dialogs appear in the device language (English / Bengali).
 *
 * The files must live inside the app target directory (ios/<AppName>/)
 * alongside Info.plist — not at the ios/ root — to be bundled correctly.
 *
 * Android does not use these strings. Its permission rationale is shown
 * at the JS level via Alert (see ImageOutputCard.tsx).
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PERMISSIONS = {
  NSPhotoLibraryAddUsageDescription: {
    en: "ThinkerAI needs access to save generated images to your photo library.",
    bn: "ThinkerAI আপনার গ্যালারিতে তৈরি ছবি সেভ করতে অ্যাক্সেস চায়।",
  },
  NSPhotoLibraryUsageDescription: {
    en: "ThinkerAI needs access to your photo library to save generated images.",
    bn: "ThinkerAI আপনার গ্যালারিতে ছবি সেভ করতে অ্যাক্সেস চায়।",
  },
};

/**
 * Finds the app target directory inside ios/.
 * Expo prebuild names it after the project name (spaces removed).
 * Falls back to the first sub-directory containing Info.plist.
 */
function findAppTargetDir(iosRoot, projectName) {
  // 1. Try the expected name (Expo default)
  const expected = path.join(iosRoot, projectName);
  if (fs.existsSync(expected) && fs.statSync(expected).isDirectory()) {
    return expected;
  }

  // 2. Scan for any directory that already has Info.plist
  if (fs.existsSync(iosRoot)) {
    for (const entry of fs.readdirSync(iosRoot)) {
      const candidate = path.join(iosRoot, entry);
      try {
        if (
          fs.statSync(candidate).isDirectory() &&
          fs.existsSync(path.join(candidate, "Info.plist"))
        ) {
          return candidate;
        }
      } catch {
        // skip
      }
    }
  }

  // 3. Fallback: use expected path (will be created during prebuild)
  return expected;
}

/** Writes an InfoPlist.strings file for a given locale into the app target. */
function writeInfoPlistStrings(appTargetDir, locale, strings) {
  const lprojDir = path.join(appTargetDir, `${locale}.lproj`);
  fs.mkdirSync(lprojDir, { recursive: true });

  const content = Object.entries(strings)
    .map(([key, value]) => `"${key}" = "${value}";`)
    .join("\n");

  fs.writeFileSync(
    path.join(lprojDir, "InfoPlist.strings"),
    content + "\n",
    "utf8"
  );
}

const withLocalizedPermissions = (config) =>
  withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;

      // Derive the project name: Expo strips spaces when naming the target folder
      const rawName = cfg.name ?? "ThinkerAI";
      const projectName = rawName.replace(/\s+/g, "");

      const appTargetDir = findAppTargetDir(iosRoot, projectName);

      const locales = {
        en: Object.fromEntries(
          Object.entries(PERMISSIONS).map(([key, val]) => [key, val.en])
        ),
        bn: Object.fromEntries(
          Object.entries(PERMISSIONS).map(([key, val]) => [key, val.bn])
        ),
      };

      for (const [locale, strings] of Object.entries(locales)) {
        writeInfoPlistStrings(appTargetDir, locale, strings);
      }

      return cfg;
    },
  ]);

module.exports = withLocalizedPermissions;
