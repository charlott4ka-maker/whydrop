import "react-native-url-polyfill/auto";
import "../global.css";
import "../lib/nativewindInterop";

import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastHost } from "../components/Toast";
import { loadSession } from "../lib/instagram";
import { loadPrefs, usePrefs } from "../lib/prefs";
import { C } from "../theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.lime, text: C.t1, border: "transparent" },
};

export default function RootLayout() {
  // prefs are read synchronously later on (haptics), so they load before the
  // first screen; the session decides whether the profile tab shows an account
  const [ready, setReady] = useState(false);
  // from the prefs store, not local state: finishing the intro has to move
  // the gate, and a useState here would never hear about it
  const { onboarded } = usePrefs();

  useEffect(() => {
    Promise.all([loadPrefs(), loadSession()])
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
            {/* результат приходит поверх вкладки и закрывается крестиком:
                форма под ним остаётся на месте */}
            <Stack.Screen name="result" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
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
