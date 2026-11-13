// Настройки открываются из «…» на главном. Группы карточек со сносками под
// ними, как в Mononote: подсказка объясняет группу, и экран обходится без
// онбординга. Итоги живут отдельным экраном.

import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, BookOpen, Download, Lock, Rows3, Share2, SlidersHorizontal, Trash2, Vibrate } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavBar } from "../components/Chrome";
import { Menu } from "../components/Menu";
import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { toast } from "../components/Toast";
import { Field, Pill, Sheet, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import {
  clearAll, exportBackup, parseBackup, readItems, replaceAll, restoreAll, type Item,
} from "../lib/items";
import { setPref, usePrefs, type Sort, type View as ListView } from "../lib/prefs";
import { C } from "../theme/tokens";

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [items, setItems] = useState<Item[]>([]);
  const [privacy, setPrivacy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [paste, setPaste] = useState("");
  const [menu, setMenu] = useState<null | "sort" | "view">(null);

  useFocusEffect(
    useCallback(() => {
      readItems().then(setItems).catch(() => {});
    }, []),
  );

  const wipe = () => {
    Alert.alert("Удалить все пункты?", "Вместе с историей отметок.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          // список копился годами: без отмены один промах стирает всю историю
          const gone = items;
          clearAll()
            .then(() => setItems([]))
            .then(() =>
              toast.info("Всё удалено", {
                action: { label: "Отменить", onPress: () => restoreAll(gone).then(setItems).catch(() => {}) },
                duration: 6000,
              }),
            )
            .catch(() => {});
          haptic("warning");
        },
      },
    ]);
  };

  const backup = async () => {
    if (!items.length) return toast.info("Пока нечего сохранять");
    haptic("light");
    try {
      await Share.share({ message: exportBackup(items) });
    } catch {}
  };

  const restore = () => {
    const read = parseBackup(paste);
    if (!read) {
      haptic("error");
      toast.error("Это не похоже на копию");
      return;
    }
    setRestoring(false);
    setPaste("");
    Alert.alert(
      "Восстановить копию?",
      `В копии ${read.length}. Сейчас в списке ${items.length}. Текущий список будет заменён.`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Восстановить",
          onPress: () => {
            const gone = items;
            replaceAll(read)
              .then(setItems)
              .then(() =>
                toast.success("Восстановлено", {
                  action: { label: "Отменить", onPress: () => replaceAll(gone).then(setItems).catch(() => {}) },
                  duration: 6000,
                }),
              )
              .catch(() => {});
            haptic("success");
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <NavBar title="Настройки" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup footer="Так список выглядит на всех экранах.">
          <SettingsCell icon={BarChart3} label="Итоги" onPress={() => router.push("/stats")} />
          <SettingsCell icon={SlidersHorizontal} label="Сортировка" value={SORT_LABEL[prefs.sort]} onPress={() => setMenu("sort")} />
          <SettingsCell icon={Rows3} label="Вид списка" value={VIEW_LABEL[prefs.view]} onPress={() => setMenu("view")} />
        </SettingsGroup>

        <SettingsGroup footer="Копия это обычный текст, её можно отправить себе в заметки.">
          <SettingsCell icon={Share2} label="Резервная копия" onPress={backup} />
          <SettingsCell icon={Download} label="Восстановить из текста" onPress={() => setRestoring(true)} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsCell
            icon={Vibrate}
            label="Вибрация"
            toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }}
          />
          <SettingsCell
            icon={BookOpen}
            label="Как это работает"
            onPress={() => {
              haptic("light");
              setPref("onboarded", false);
            }}
          />
          <SettingsCell icon={Lock} label="Конфиденциальность" onPress={() => setPrivacy(true)} />
        </SettingsGroup>

        <SettingsGroup footer={"Ago " + VERSION}>
          <SettingsCell icon={Trash2} label="Удалить все пункты" destructive onPress={wipe} />
        </SettingsGroup>
      </ScrollView>

      <Menu
        visible={menu === "sort"}
        onClose={() => setMenu(null)}
        anchor={{ top: insets.top + 120, right: 16 }}
        items={(["due", "recent", "alpha"] as Sort[]).map((k) => ({
          label: SORT_LABEL[k],
          checked: prefs.sort === k,
          onPress: () => setPref("sort", k),
        }))}
      />
      <Menu
        visible={menu === "view"}
        onClose={() => setMenu(null)}
        anchor={{ top: insets.top + 180, right: 16 }}
        items={(["rows", "big", "tiles"] as ListView[]).map((k) => ({
          label: VIEW_LABEL[k],
          checked: prefs.view === k,
          onPress: () => setPref("view", k),
        }))}
      />

      <PrivacySheet visible={privacy} onClose={() => setPrivacy(false)} />

      <Sheet visible={restoring} title="Восстановить из копии" onClose={() => setRestoring(false)}>
        <Field
          label="Вставь сюда текст копии"
          value={paste}
          onChangeText={setPaste}
          placeholder={'{ "app": "kogda", ... }'}
          autoCapitalize="none"
          multiline
        />
        <Txt className="mb-6 text-[15px] leading-[20px] text-t2">
          Текущий список будет заменён целиком. Перед заменой приложение спросит ещё раз и покажет, сколько пунктов в копии.
        </Txt>
        <Pill full onPress={restore}>Проверить копию</Pill>
      </Sheet>
    </View>
  );
}

const SORT_LABEL: Record<Sort, string> = { due: "По сроку", recent: "По давности", alpha: "По алфавиту" };
const VIEW_LABEL: Record<ListView, string> = { rows: "Строки", big: "Крупно", tiles: "Плитки" };

function PrivacySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const blocks: [string, string][] = [
    ["Где лежат данные", "Пункты и история отметок хранятся только на этом устройстве, в памяти приложения."],
    ["Что уходит наружу", "Ничего. У приложения нет сервера, нет входа и нет ни одного сетевого запроса."],
    ["Как всё удалить", "«Удалить все пункты» стирает список вместе с историей. Удаление приложения уносит остальное."],
  ];
  return (
    <Sheet visible={visible} title="Конфиденциальность" onClose={onClose}>
      <View className="gap-6">
        {blocks.map(([t, b]) => (
          <View key={t}>
            <Txt className="font-m700 text-[16px]">{t}</Txt>
            <Txt className="mt-1 text-[15px] leading-5 text-t2">{b}</Txt>
          </View>
        ))}
      </View>
    </Sheet>
  );
}
