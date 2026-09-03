import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Status bar, splash, and the Android back key. Safe to call on the web — it no-ops. */
export async function bootNative(onBack: () => boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("native-app");
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#140c28" });
  } catch {
    /* iOS ignores background color */
  }
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    /* web or old OS */
  }
  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    /* already gone */
  }
  await App.addListener("backButton", ({ canGoBack }) => {
    const handled = onBack();
    if (!handled && !canGoBack) void App.exitApp();
  });
  await App.addListener("pause", () => {
    window.dispatchEvent(new Event("pagehide"));
  });
}
