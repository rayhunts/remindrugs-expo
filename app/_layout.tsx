import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase, getReminderById, getDrugsForReminder, logDose } from "@/services/database";
import {
  setNotificationHandler,
  setupNotificationChannel,
  scheduleSnooze,
} from "@/services/notification-service";
import { adherenceEvents } from "@/services/event-bus";
import { ThemeProvider } from "@/contexts/theme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { generateId, toDateString } from "@/utils/date-helpers";
import { getSetting } from "@/services/settings-service";
import { router } from "expo-router";

SplashScreen.preventAutoHideAsync();

setNotificationHandler();

function ThemedStatusBar() {
  const statusBarBg = useThemeColor({}, "background");
  const statusBarStyle = useThemeColor({ light: "dark", dark: "light" }, "textPrimary") as "light" | "dark";
  return <StatusBar style={statusBarStyle} backgroundColor={statusBarBg} translucent={false} />;
}

export default function RootLayout() {
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        initDatabase();
        await setupNotificationChannel();
      } catch (error) {
        console.error("App init error:", error);
      } finally {
        await SplashScreen.hideAsync();
        const onboarded = getSetting("onboarded");
        if (onboarded !== "true") {
          router.replace("/onboarding");
        }
      }
    }
    init();
  }, []);

  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Could show an in-app toast here in the future
      });

    // Listen for user tapping a notification or action button
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          reminderId?: string;
          type?: string;
        };
        const reminderId = data?.reminderId;
        const actionId = response.actionIdentifier;

        if (!reminderId) return;

        if (actionId === "mark-done") {
          try {
            const today = toDateString(new Date());
            const drugs = getDrugsForReminder(reminderId);
            for (const drug of drugs) {
              logDose({
                id: generateId(),
                reminderId,
                drugId: drug.id,
                date: today,
                status: "taken",
                takenAt: Date.now(),
              });
            }
            adherenceEvents.emit();
          } catch (e) {
            console.error("Failed to log dose from notification:", e);
          }
        } else if (actionId === "snooze") {
          const reminder = getReminderById(reminderId);
          if (reminder) {
            const drugs = getDrugsForReminder(reminderId);
            scheduleSnooze(reminder, drugs).catch((e) =>
              console.error("Failed to snooze:", e),
            );
          }
        }
        // Default tap (no action) — just open the app, handled by navigator
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerBackTitle: "Back" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-reminder"
            options={{ presentation: "modal", title: "Add Reminder" }}
          />
          <Stack.Screen
            name="edit-reminder/[id]"
            options={{ title: "Edit Reminder" }}
          />
          <Stack.Screen
            name="edit-drug/[id]"
            options={{ title: "Edit Medication" }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false }}
          />
        </Stack>
        <ThemedStatusBar />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
