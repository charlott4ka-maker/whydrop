import "react-native-url-polyfill/auto";
import "../global.css";
import "../lib/nativewindInterop";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastHost } from "../components/Toast";
import { loadSession } from "../lib/instagram";
import { loadPrefs } from "../lib/prefs";
import { C } from "../theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const ONBOARDED = "onboarded";

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.lime, text: C.t1, border: "transparent" },
};

export default function RootLayout() {
  // prefs are read synchronously later on (haptics), so they load before the
  // first screen; the session decides whether the profile tab shows an account
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    Promise.all([loadPrefs(), loadSession(), AsyncStorage.getItem(ONBOARDED)])
      .then(([, , seen]) => setOnboarded(seen === "1"))
      .catch(() => {})
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
