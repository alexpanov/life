import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "QuestOS",
  slug: "questos-iphone",
  version: "0.4.0",
  scheme: "questos",
  platforms: ["ios"],
  orientation: "portrait",
  userInterfaceStyle: "dark",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "app.questos.iphone",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
};
export default config;
