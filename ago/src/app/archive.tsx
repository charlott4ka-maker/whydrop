// Архив: всё, что было отмечено, по месяцам. До него история была заперта
// внутри каждого пункта, и общей картины не складывалось. Открывается из «…»
// на главном, поэтому у него обычная шапка с кнопкой назад.

import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavBar } from "../components/Chrome";
import { Empty, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import { feedGroups } from "../lib/feed";
import { readItems, type Item } from "../lib/items";
import { dateLabel } from "../lib/time";
import { C } from "../theme/tokens";

/** Поиск появляется, когда листать становится дольше, чем искать. */
const BUSY = 12;

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      readItems().then(setItems).catch(() => setItems([]));
    }, []),
  );

  const all = items ?? [];
  const total = all.reduce((n, i) => n + i.marks.length, 0);
  const list = feedGroups(all, query);

  return (
    <View className="flex-1 bg-bg">
      <NavBar title="Архив" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {total >= BUSY ? (
          <View className="h-lg flex-row items-center gap-3 rounded-full bg-card2 px-4">
            <Search size={18} color={C.t3} absoluteStrokeWidth strokeWidth={1.5} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Найти по названию или заметке"
              placeholderTextColor={C.hint}
              returnKeyType="search"
              className="flex-1 font-m500 text-t1"
              style={{ fontSize: 16 }}
            />
          </View>
        ) : null}

        {items === null ? null : list.length === 0 && query.trim() ? (
          <Txt className="px-1 pt-4 text-[15px] text-t3">Ничего не нашлось.</Txt>
        ) : list.length === 0 ? (
          <View className="pt-10">
            <Empty icon={CalendarDays} title="Пока пусто" sub="Здесь появится всё, что было отмечено, по месяцам." />
          </View>
        ) : (
          list.map((g) => (
            <View key={g.key} className="gap-3">
              <Txt className="px-1 font-m600 text-[15px] text-t2">{g.title}</Txt>
              <View className="overflow-hidden rounded-card bg-card">
                {g.rows.map((r, i) => (
                  <View key={r.id + r.at}>
                    {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 18 }} /> : null}
                    <Pressable
                      onPress={() => {
                        haptic("light");
                        router.push(`/item/${r.id}`);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                        paddingHorizontal: 18, paddingVertical: 17,
                        backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent",
                      })}
                    >
                      <View style={{ flexShrink: 1, gap: 2 }}>
                        <Txt numberOfLines={1} className="text-[17px]">{r.title}</Txt>
                        {r.note ? <Txt numberOfLines={1} className="text-[13px] text-t2">{r.note}</Txt> : null}
                      </View>
                      <Txt className="text-[15px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>{dateLabel(r.at)}</Txt>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
