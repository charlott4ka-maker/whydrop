// Итоги: пять чисел за всё время и интервал по каждому пункту. Отдельный
// экран, а не вкладка — сюда заходят изредка.

import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, CircleCheck, Hash, Repeat } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Banner } from "../components/Banner";
import { NavBar } from "../components/Chrome";
import { Txt } from "../components/ui";
import { expected, readItems, typicalInterval, type Item } from "../lib/items";
import { daysWord, everyLabel, marksWord } from "../lib/time";
import { C } from "../theme/tokens";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);

  useFocusEffect(
    useCallback(() => {
      readItems().then(setItems).catch(() => {});
    }, []),
  );

  const marks = items.flatMap((i) => i.marks);
  const total = marks.length;
  const now = new Date();
  const thisMonth = marks.filter((m) => {
    const d = new Date(m.at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const intervals = items.map(typicalInterval).filter((n): n is number => n != null);
  const avg = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
  const oldest = marks.length
    ? marks.reduce((a, b) => (new Date(a.at) < new Date(b.at) ? a : b)).at
    : null;
  const years = oldest ? Math.max(0, Math.round((now.getTime() - new Date(oldest).getTime()) / 31557600000)) : 0;

  const rows: { icon: typeof Hash; value: string; label: string }[] = [
    { icon: Hash, value: String(total), label: total === 1 ? "отметка всего" : "отметки всего" },
    ...(avg ? [{ icon: Repeat, value: `${avg} ${daysWord(avg)}`, label: "средний интервал" }] : []),
    { icon: CircleCheck, value: String(thisMonth), label: "в этом месяце" },
    ...(years > 0 ? [{ icon: CalendarDays, value: `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`, label: "самая длинная история" }] : []),
  ];

  const per = items
    .map((i) => ({ title: i.title, every: expected(i) }))
    .filter((p): p is { title: string; every: number } => p.every != null);

  return (
    <View className="flex-1 bg-bg">
      <NavBar title="Итоги" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Banner source={require("../../assets/art/banner-stats.png")} height={220} />

        <View style={{ paddingHorizontal: 16, gap: 24 }}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <View className="flex-row" style={{ gap: 30 }}>
              <Figure value={String(total)} label={marksWord(total)} />
              <Figure value={String(items.length)} label={items.length === 1 ? "пункт" : "пунктов"} />
              {avg ? <Figure value={String(avg)} label={daysWord(avg)} /> : null}
            </View>
            {oldest ? (
              <Txt className="text-[15px] text-t3">
                с {new Date(oldest).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </Txt>
            ) : null}
          </View>

          {rows.length ? (
            <View className="gap-3">
              <Txt className="px-1 font-m600 text-[15px] text-t2">Всё время</Txt>
              <View className="overflow-hidden rounded-card bg-card">
                {rows.map((r) => {
                  const Icon = r.icon;
                  return (
                    <View key={r.label} className="flex-row items-center gap-3" style={{ paddingHorizontal: 18, paddingVertical: 17 }}>
                      <Icon size={20} color={C.t2} absoluteStrokeWidth strokeWidth={1.5} />
                      <Txt className="font-m700 text-[17px]">{r.value}</Txt>
                      <Txt className="text-[17px] text-t2">{r.label}</Txt>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {per.length ? (
            <View className="gap-3">
              <Txt className="px-1 font-m600 text-[15px] text-t2">По пунктам</Txt>
              <View className="overflow-hidden rounded-card bg-card">
                {per.map((p, n) => (
                  <View key={p.title}>
                    {n > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 18 }} /> : null}
                    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 18, paddingVertical: 17 }}>
                      <Txt numberOfLines={1} className="text-[17px]" style={{ flexShrink: 1 }}>{p.title}</Txt>
                      <Txt className="text-[15px] text-t2">{everyLabel(p.every)}</Txt>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Txt className="font-m800" style={{ fontSize: 46, letterSpacing: -1 }}>{value}</Txt>
      <Txt className="text-[15px] text-t2">{label}</Txt>
    </View>
  );
}
