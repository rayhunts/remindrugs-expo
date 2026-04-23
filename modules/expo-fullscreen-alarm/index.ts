import { requireNativeModule } from "expo-modules-core";

const NativeModule = requireNativeModule("ExpoFullscreenAlarm");

export async function scheduleAlarm(params: {
  id: string;
  title: string;
  body: string;
  channelId: string;
  triggerAtMs: number;
}): Promise<void> {
  return NativeModule.scheduleAlarm(params);
}

export async function cancelAlarm(id: string): Promise<void> {
  return NativeModule.cancelAlarm(id);
}

export async function cancelAllAlarms(): Promise<void> {
  return NativeModule.cancelAllAlarms();
}

export async function consumeLaunchReminderId(): Promise<string | null> {
  return NativeModule.consumeLaunchReminderId();
}
