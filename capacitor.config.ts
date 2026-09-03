import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.hopcrown.climb",
  appName: "Hop Crown",
  webDir: "dist",
  backgroundColor: "#140c28",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "HopCrown",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#140c28",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#140c28",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
