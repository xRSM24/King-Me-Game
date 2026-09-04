import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.kingme.climb",
  appName: "King Me",
  webDir: "dist",
  backgroundColor: "#1c1208",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "KingMe",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#1c1208",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1c1208",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
