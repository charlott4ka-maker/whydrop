// Настройки. Коротко: всё, что приложение умеет, умещается на одном экране,
// и настраивать тут почти нечего — это хорошо.

import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { BookOpen, ChevronLeft, Lock, Trash2, Vibrate } from "lucide-react-native";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { toast } from "../components/Toast";
import { GlassCircle, Sheet, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import { clearAll } from "../lib/items";
import { setPref, usePrefs } from "../lib/prefs";
import { C } from "../theme/tokens";

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [privacy, setPrivacy] = useState(false);

  const wipe = () => {
    Alert.alert("Удалить все пункты?", "Вместе с историей отметок. Отменить это нельзя.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          clearAll().catch(() => {});
          haptic("warning");
          toast.success("Всё удалено");
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <GlassCircle onPress={() => router.back()} label="Назад">
          <ChevronLeft size={22} color={C.t1} />
        </GlassCircle>
        <Txt className="flex-1 font-m800 text-[22px]">Настройки</Txt>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <SettingsGroup title="Приложение">
          <SettingsCell
            icon={Vibrate}
            tint="#636366"
            label="Вибрация"
            toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }}
          />
          <SettingsCell icon={Trash2} tint="#FF5A6E" label="Удалить все пункты" destructive onPress={wipe} />
        </SettingsGroup>

        <SettingsGroup title="О приложении" footer={"Когда " + VERSION}>
          <SettingsCell
            icon={BookOpen}
            tint="#3DF2EE"
            label="Как это работает"
            onPress={() => {
              haptic("light");
              setPref("onboarded", false);
            }}
          />
          <SettingsCell icon={Lock} tint="#636366" label="Конфиденциальность" onPress={() => setPrivacy(true)} />
        </SettingsGroup>
      </ScrollView>

      <Sheet visible={privacy} title="Конфиденциальность" onClose={() => setPrivacy(false)}>
        <View className="gap-6">
          {[
            ["Где лежат данные", "Пункты и история отметок хранятся только на этом устройстве, в памяти приложения."],
            ["Что уходит наружу", "Ничего. У приложения нет сервера, нет входа и нет ни одного сетевого запроса."],
            ["Как всё удалить", "«Удалить все пункты» стирает список вместе с историей. Удаление приложения уносит остальное."],
          ].map(([t, b]) => (
            <View key={t}>
              <Txt className="font-m700 text-[16px]">{t}</Txt>
              <Txt className="mt-1 text-[15px] leading-5 text-t2">{b}</Txt>
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
