import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { initDatabase, getReminderById, getDrugsForReminder } from "@/services/database";
import {
  setNotificationHandler,
  setupNotificationChannel,
  scheduleSnooze,
} from "@/services/notification-service";
import * as FullscreenAlarm from "@/modules/expo-fullscreen-alarm";
import { recordDosesForReminder } from "@/services/dose-recording";
import { ThemeProvider } from "@/contexts/theme-context";
import { LanguageProvider } from "@/contexts/language-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { toDateString } from "@/utils/date-helpers";
import { getSetting } from "@/services/settings-service";
import { router } from "expo-router";

SplashScreen.preventAutoHideAsync();

setNotificationHandler();

const recentlyProcessedNotifications = new Set<string>();

function ThemedStatusBar() {
  const statusBarBg = useThemeColor({}, "background") as string;
  const statusBarStyle = useThemeColor({ light: "dark", dark: "light" }, "textPrimary") as "light" | "dark";
  return <StatusBar style={statusBarStyle} backgroundColor={statusBarBg} translucent={false} />;
}

export default function RootLayout() {
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasBackgroundRef = useRef(false);

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
        } else {
          // Check if app was launched from a notification
          const lastResponse = await Notifications.getLastNotificationResponseAsync();
          if (lastResponse) {
            const data = lastResponse.notification.request.content.data as {
              reminderId?: string;
              type?: string;
            };
            if (data?.reminderId && (data?.type === "alarm" || data?.type === "snooze")) {
              setTimeout(() => {
                router.replace(`/alarm?reminderId=${data.reminderId}`);
              }, 300);
            }
          } else {
            // Check if launched from fullscreen alarm intent
            const launchReminderId = await FullscreenAlarm.consumeLaunchReminderId();
            if (launchReminderId) {
              setTimeout(() => {
                router.replace(`/alarm?reminderId=${launchReminderId}`);
              }, 300);
            }
          }
        }
      }
    }
    init();
  }, []);

  // Track app state to detect when notification actions bring app to foreground.
  // Known Android OS limitation: any notification interaction (including action buttons
  // like "Mark Done") brings the app to the foreground. This is OS behavior and cannot
  // be fully prevented without background task runners (e.g. expo-task-manager), which
  // are out of scope. Instead, we detect this case and move the app back to background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current === "background" && nextState === "active") {
        wasBackgroundRef.current = true;
      } else if (nextState === "background") {
        wasBackgroundRef.current = false;
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
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
        const type = data?.type;
        const actionId = response.actionIdentifier;

        if (!reminderId) return;

        const notificationId = response.notification.request.identifier;
        if (recentlyProcessedNotifications.has(notificationId)) return;
        recentlyProcessedNotifications.add(notificationId);
        setTimeout(() => recentlyProcessedNotifications.delete(notificationId), 2000);

        if (actionId === "mark-done") {
          try {
            const today = toDateString(new Date());
            recordDosesForReminder({
              reminderId,
              date: today,
              status: "taken",
              takenAt: Date.now(),
            });
          } catch (e) {
            console.error("Failed to log dose from notification:", e);
          }
          Notifications.dismissNotificationAsync(notificationId);
        } else if (actionId === "snooze") {
          const reminder = getReminderById(reminderId);
          if (reminder) {
            const drugs = getDrugsForReminder(reminderId);
            scheduleSnooze(reminder, drugs).catch((e) =>
              console.error("Failed to snooze:", e),
            );
          }
          Notifications.dismissNotificationAsync(notificationId);
        } else if (type === "alarm" || type === "snooze") {
          // Default tap on alarm/snooze notification -> navigate to alarm screen
          router.replace(`/alarm?reminderId=${reminderId}`);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
      <ThemeProvider>
        <LanguageProvider>
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
            name="report"
            options={{ title: "Adherence Report" }}
          />
          <Stack.Screen
            name="interactions"
            options={{ title: "Drug Interactions", headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="alarm"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </Stack>
        <ThemedStatusBar />
        </LanguageProvider>
      </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
