// Лента: всё, что было отмечено, по месяцам. До неё история была заперта
// внутри каждого пункта, и общей картины не складывалось: не видно, что ты
// вообще успела за октябрь. С приписками к отметкам это уже дневник.

import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Empty, ScreenTitle, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import { feedGroups } from "../../lib/feed";
import { readItems, type Item } from "../../lib/items";
import { dateLabel, marksWord } from "../../lib/time";
import { C } from "../../theme/tokens";

/** Поиск появляется, когда листать становится дольше, чем искать. */
const BUSY = 12;

export default function FeedScreen() {
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
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, gap: 24 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <ScreenTitle title="Лента" />

      {total >= BUSY ? (
        <View className="h-lg flex-row items-center gap-3 rounded-full bg-card px-4">
          <Search size={18} color={C.t3} absoluteStrokeWidth strokeWidth={1.8} />
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
        <View className="pt-6">
          <Empty
            icon={CalendarDays}
            title="Пока пусто"
            sub="Здесь появится всё, что ты отмечала, по месяцам."
          />
        </View>
      ) : (
        list.map((g) => (
          <View key={g.key} className="gap-3">
            <Txt className="px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
              {g.title} · {g.rows.length} {marksWord(g.rows.length)}
            </Txt>
            <View className="overflow-hidden rounded-card bg-card">
              {g.rows.map((r, i) => (
                <View key={r.id + r.at}>
                  {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 }} /> : null}
                  <Card
                    className="bg-transparent px-4 py-3"
                    onPress={() => {
                      haptic("light");
                      router.push(`/item/${r.id}`);
                    }}
                  >
                    <Txt numberOfLines={1} className="text-[15px]">{r.title}</Txt>
                    <Txt numberOfLines={1} className="mt-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                      {dateLabel(r.at)}
                      {r.note ? ` · ${r.note}` : ""}
                    </Txt>
                  </Card>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
