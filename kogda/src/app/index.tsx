// Список. Сверху то, что просрочено, дальше просто давнее. Сегмент
// появляется только когда есть что фильтровать, поиск — когда список вырос:
// на пяти пунктах и то и другое было бы лишним шумом.

import { useFocusEffect, useRouter } from "expo-router";
import { Clock, LayoutGrid, Search, Settings2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ItemRow } from "../components/ItemRow";
import { ItemSheet } from "../components/ItemSheet";
import { ViewSheet } from "../components/ViewSheet";
import { toast } from "../components/Toast";
import { Chip, Empty, GlassCircle, HeaderAdd, Pill, ScreenTitle, Segmented, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import {
  addItem, byCategory, daysAgoIso, dueCount, mark, orderBy, readItems, removeItem, restoreItem, status,
  unmark, type Item,
} from "../lib/items";
import { usePrefs } from "../lib/prefs";
import { C } from "../theme/tokens";

const SUGGEST = [
  "Меняла линзы",
  "Стирала шторы",
  "Была у стоматолога",
  "Меняла зубную щётку",
  "Звонила бабушке",
  "Поливала цветы",
  "Меняла фильтр в воде",
  "Делала маску",
];

/** Поиск и фильтр появляются, когда список перестаёт умещаться в голове. */
const BUSY = 8;

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [tab, setTab] = useState<"all" | "due">("all");
  const [query, setQuery] = useState("");
  const [viewSheet, setViewSheet] = useState(false);
  const prefs = usePrefs();

  useFocusEffect(
    useCallback(() => {
      readItems().then(setItems).catch(() => setItems([]));
    }, []),
  );

  const done = (item: Item) => {
    haptic("success");
    const at = daysAgoIso();
    mark(item.id, at)
      .then(setItems)
      .then(() =>
        toast.success("Отмечено сегодня", {
          // снимаем именно эту отметку, а не ту, что оказалась сверху
          action: { label: "Отменить", onPress: () => unmark(item.id, at).then(setItems).catch(() => {}) },
        }),
      )
      .catch(() => {});
  };

  const drop = (item: Item) => {
    haptic("warning");
    removeItem(item.id)
      .then(setItems)
      .then(() =>
        toast.info("Удалено", {
          action: { label: "Отменить", onPress: () => restoreItem(item).then(setItems).catch(() => {}) },
          duration: 5000,
        }),
      )
      .catch(() => {});
  };

  const all = items ?? [];
  const due = dueCount(all);
  const busy = all.length >= BUSY;
  const found = all.filter((i) =>
    query.trim() ? i.title.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );
  const list = orderBy(tab === "due" ? found.filter((i) => status(i) === "due") : found, prefs.sort);
  const groups = prefs.group ? byCategory(list) : null;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle
          title="Когда"
          right={
            <View className="flex-row gap-2">
              <GlassCircle size={52} onPress={() => setViewSheet(true)} label="Вид списка">
                <LayoutGrid size={22} color={C.t1} />
              </GlassCircle>
              <GlassCircle size={52} onPress={() => router.push("/settings")} label="Настройки">
                <Settings2 size={22} color={C.t1} />
              </GlassCircle>
              <HeaderAdd onPress={() => setEditing("new")} label="Добавить" />
            </View>
          }
        />

        {items === null ? null : all.length === 0 ? (
          <View className="pt-6">
            <Empty
              icon={Clock}
              title="Пока пусто"
              sub="Добавь то, что делаешь редко и всё время забываешь когда."
            />
            <Txt className="mb-3 mt-2 px-1 text-[13px] text-t3">Например:</Txt>
            <View className="flex-row flex-wrap gap-2">
              {SUGGEST.map((s) => (
                <Chip
                  key={s}
                  onPress={() => {
                    haptic("light");
                    addItem(s).then(setItems).catch(() => {});
                  }}
                >
                  {s}
                </Chip>
              ))}
            </View>
          </View>
        ) : (
          <>
            {busy ? (
              <View className="h-lg flex-row items-center gap-3 rounded-full bg-card px-4">
                <Search size={18} color={C.t3} absoluteStrokeWidth strokeWidth={1.8} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Найти"
                  placeholderTextColor={C.hint}
                  returnKeyType="search"
                  className="flex-1 font-m500 text-t1"
                  style={{ fontSize: 16 }}
                />
              </View>
            ) : null}

            {due > 0 ? (
              <Segmented
                neutral
                options={[["all", "Все"], ["due", `Пора · ${due}`]] as ["all" | "due", string][]}
                value={tab}
                onChange={setTab}
              />
            ) : null}

            {list.length === 0 ? (
              <Txt className="px-1 pt-4 text-[15px] text-t3">
                {query.trim() ? "Ничего не нашлось." : "Сейчас ничего не просрочено."}
              </Txt>
            ) : groups ? (
              groups.map((g) => (
                <View key={g.id} className="gap-3">
                  <Txt className="px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
                    {g.title}
                  </Txt>
                  <Grid items={g.items} view={prefs.view} onDone={done} />
                </View>
              ))
            ) : (
              <Grid items={list} view={prefs.view} onDone={done} />
            )}
          </>
        )}
      </ScrollView>

      <ViewSheet visible={viewSheet} onClose={() => setViewSheet(false)} />
      <ItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={setItems}
        onDelete={(i) => {
          setEditing(null);
          drop(i);
        }}
      />
    </View>
  );
}

/** Плитки идут в два столбца, остальные виды — в один. */
function Grid({ items, view, onDone }: { items: Item[]; view: "big" | "rows" | "tiles"; onDone: (i: Item) => void }) {
  if (view !== "tiles") {
    return (
      <View className={view === "rows" ? "gap-2" : "gap-4"}>
        {items.map((i) => (
          <ItemRow key={i.id} item={i} view={view} onDone={() => onDone(i)} />
        ))}
      </View>
    );
  }
  const rows: Item[][] = [];
  for (let k = 0; k < items.length; k += 2) rows.push(items.slice(k, k + 2));
  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row[0].id} className="flex-row gap-3">
          {row.map((i) => (
            <ItemRow key={i.id} item={i} view="tiles" onDone={() => onDone(i)} />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}
