// Системный таб-бар iOS: на 26 и новее он сам приходит с Liquid Glass, и это
// единственный способ получить настоящее стекло, а не его имитацию. Контент
// проезжает под ним, поэтому стеклу есть что преломлять.

import { NativeTabs } from "expo-router/unstable-native-tabs";

import { C } from "../../theme/tokens";

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={C.lime} blurEffect="systemThinMaterialDark" minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <NativeTabs.Trigger.Label>Список</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Icon sf={{ default: "calendar", selected: "calendar" }} />
        <NativeTabs.Trigger.Label>Лента</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <NativeTabs.Trigger.Label>Настройки</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
