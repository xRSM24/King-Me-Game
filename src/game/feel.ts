import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

async function run(fn: () => Promise<void>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await fn();
  } catch {
    /* simulator or missing plugin */
  }
}

export function bump(): void {
  void run(() => Haptics.impact({ style: ImpactStyle.Medium }));
}

export function tap(): void {
  void run(() => Haptics.impact({ style: ImpactStyle.Light }));
}

export function heavy(): void {
  void run(() => Haptics.impact({ style: ImpactStyle.Heavy }));
}

export function winBuzz(): void {
  void run(() => Haptics.notification({ type: NotificationType.Success }));
}

export function loseBuzz(): void {
  void run(() => Haptics.notification({ type: NotificationType.Warning }));
}
