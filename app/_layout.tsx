import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { initDatabase } from "@/services/database";
import { setNotificationHandler, setupNotificationChannel } from "@/services/notification-service";
import { ThemeProvider } from "@/contexts/theme-context";

SplashScreen.preventAutoHideAsync();

setNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      try {
        initDatabase();
        await setupNotificationChannel();
      } catch (error) {
        console.error("App init error:", error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  return (
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
          name="onboarding"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
