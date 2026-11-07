// Лента: всё, что было отмечено, по месяцам. До неё история была заперта
// внутри каждого пункта, и общей картины не складывалось: не видно, что ты
// вообще успела за октябрь. С приписками к отметкам это уже дневник.

import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Empty, ScreenTitle, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import { readItems, type Item, type Mark } from "../../lib/items";
import { dateLabel, marksWord } from "../../lib/time";
import { C } from "../../theme/tokens";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

type Row = Mark & { title: string; id: string };
type Group = { key: string; title: string; rows: Row[] };

/** Отметки всех пунктов, свежие сверху, разложенные по месяцам. */
function groups(items: Item[], now = new Date()): Group[] {
  const all: Row[] = [];
  for (const i of items) for (const m of i.marks) all.push({ ...m, title: i.title, id: i.id });
  all.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const out: Group[] = [];
  for (const r of all) {
    const d = new Date(r.at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = out.find((x) => x.key === key);
    if (!g) {
      const year = d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`;
      g = { key, title: MONTHS[d.getMonth()] + year, rows: [] };
      out.push(g);
    }
    g.rows.push(r);
  }
  return out;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      readItems().then(setItems).catch(() => setItems([]));
    }, []),
  );

  const list = items ? groups(items) : [];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, gap: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTitle title="Лента" />

      {items === null ? null : list.length === 0 ? (
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
