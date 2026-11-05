import "../global.css";
import "../lib/nativewindInterop";

import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastHost } from "../components/Toast";
import { C } from "../theme/tokens";

SplashScreen.hideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.lime, text: C.t1, border: "transparent" },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
        <ToastHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
