import { useAutoSync } from "@/hooks/useAutoSync";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { initDatabase } from "../db/database";

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  useAutoSync({ enabled: true, intervalMs: 5 * 60 * 1000 });

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        {/* 🆕 Pending screen */}
        <Stack.Screen
          name="pending"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}