// Настройки и итоги на одном экране. Итоги не тянут на отдельную вкладку:
// это пять чисел, которые смотрят изредка, и здесь они на своём месте.

import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { BookOpen, Download, Lock, Share2, Trash2, Vibrate } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsCell, SettingsGroup } from "../../components/SettingsList";
import { toast } from "../../components/Toast";
import { Card, Field, Pill, ScreenTitle, Sheet, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import {
  clearAll, daysOf, expected, exportBackup, parseBackup, readItems, replaceAll, restoreAll, status,
  type Item,
} from "../../lib/items";
import { setPref, usePrefs } from "../../lib/prefs";
import { daysWord, everyLabel } from "../../lib/time";
import { C } from "../../theme/tokens";

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [items, setItems] = useState<Item[]>([]);
  const [privacy, setPrivacy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [paste, setPaste] = useState("");

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
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="Настройки" />

        <Stats items={items} onOpen={(id) => router.push(`/item/${id}`)} />

        <SettingsGroup
          title="Данные"
          footer="Копия это обычный текст: отправь его себе в заметки или в чат, а потом вставь обратно. Пока у приложения нет облака, это единственный способ не потерять историю вместе с телефоном."
        >
          <SettingsCell icon={Share2} tint="#5468F0" label="Сохранить копию" onPress={backup} />
          <SettingsCell icon={Download} tint="#636366" label="Восстановить из копии" onPress={() => setRestoring(true)} />
        </SettingsGroup>

        <SettingsGroup title="Приложение">
          <SettingsCell
            icon={Vibrate}
            tint="#636366"
            label="Вибрация"
            toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }}
          />
          <SettingsCell icon={Trash2} tint="#FF5A6E" label="Удалить все пункты" destructive onPress={wipe} />
        </SettingsGroup>

        <SettingsGroup title="О приложении" footer={"Ago " + VERSION}>
          <SettingsCell
            icon={BookOpen}
            tint="#5468F0"
            label="Как это работает"
            onPress={() => {
              haptic("light");
              setPref("onboarded", false);
            }}
          />
          <SettingsCell icon={Lock} tint="#636366" label="Конфиденциальность" onPress={() => setPrivacy(true)} />
        </SettingsGroup>
      </ScrollView>

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
        <Txt className="mb-6 text-[13px] leading-[18px] text-t3">
          Текущий список будет заменён целиком. Перед заменой приложение спросит ещё раз и покажет, сколько пунктов в копии.
        </Txt>
        <Pill full onPress={restore}>Проверить копию</Pill>
      </Sheet>
    </View>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="flex-1 p-4">
      <Txt className="font-m800" style={{ fontSize: 30, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>
        {value}
      </Txt>
      <Txt className="mt-1 text-[13px] text-t3">{label}</Txt>
    </Card>
  );
}

function Stats({ items, onOpen }: { items: Item[]; onOpen: (id: string) => void }) {
  if (!items.length) return null;
  const due = items.filter((i) => status(i) === "due").length;
  const marks = items.reduce((n, i) => n + i.marks.length, 0);
  const year = items.reduce((n, i) => n + i.marks.filter((m) => Date.now() - +new Date(m.at) <= 365 * 864e5).length, 0);
  const oldest = items.filter((i) => daysOf(i) !== null).sort((a, b) => (daysOf(b) ?? 0) - (daysOf(a) ?? 0))[0];
  const known = items.map(expected).filter((x): x is number => Boolean(x));
  const avg = known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;

  return (
    <View className="mb-8 gap-3">
      <Txt className="px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>Итоги</Txt>
      <View className="flex-row gap-3">
        <Tile value={items.length} label="пунктов" />
        <Tile value={due} label="сейчас пора" />
      </View>
      <View className="flex-row gap-3">
        <Tile value={marks} label="отметок всего" />
        <Tile value={year} label="за последний год" />
      </View>
      {oldest ? (
        <Card className="p-4" onPress={() => onOpen(oldest.id)}>
          <Txt className="text-[13px] text-t3">Дольше всего не трогала</Txt>
          <Txt numberOfLines={1} className="mt-1 font-m700 text-[17px]">{oldest.title}</Txt>
          <View className="mt-1 flex-row items-baseline gap-2">
            <Txt className="font-m800" style={{ fontSize: 30, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>
              {daysOf(oldest)}
            </Txt>
            <Txt className="text-[15px] text-t2">{daysWord(daysOf(oldest) ?? 0)} назад</Txt>
          </View>
        </Card>
      ) : null}
      {avg ? (
        <Card className="p-4">
          <Txt className="text-[13px] text-t3">Средний срок по всем пунктам</Txt>
          <Txt className="mt-1 font-m700 text-[17px]">{everyLabel(avg)}</Txt>
          <Txt className="mt-2 text-[13px] leading-[18px] text-t3">
            Считается и по заданным срокам, и по тем, что приложение подсмотрело само.
          </Txt>
        </Card>
      ) : null}
    </View>
  );
}

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
