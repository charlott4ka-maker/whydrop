// System iOS tab bar (UITabBarController, Liquid Glass on iOS 26) with SF Symbols.
// So cards scrolling under it don't blend into the bar: a thick dark material
// that never goes transparent, plus a dark fade at the bottom of each tab
// screen (<TabBarFade/>), which also works under the iOS 26 glass.

import { NativeTabs } from "expo-router/unstable-native-tabs";

import { C } from "../../theme/tokens";

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={C.lime} blurEffect="systemThickMaterialDark" disableTransparentOnScrollEdge minimizeBehavior="never">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "waveform.path.ecg", selected: "waveform.path.ecg" }} />
        <NativeTabs.Trigger.Label>Разбор</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <NativeTabs.Trigger.Label>История</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <NativeTabs.Trigger.Label>Профиль</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
