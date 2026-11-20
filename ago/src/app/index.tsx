// Главный экран. Весь он — список, а управление по углам: профиль слева
// сверху, поиск и «…» справа, снизу вид списка, «Добавить» и архив. Группы
// идут по сроку: что пора, что скоро, что недавно.

import { useFocusEffect, useRouter } from "expo-router";
import { Archive, Clock, Ellipsis, LayoutGrid, Plus, Rows3, Search, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomBar, TopChrome } from "../components/Chrome";
import { GlassPill, GlassRound } from "../components/Glass";
import { ItemRow } from "../components/ItemRow";
import { ItemSheet } from "../components/ItemSheet";
import { Menu } from "../components/Menu";
import { toast } from "../components/Toast";
import { Chip, Empty, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import {
  addItem, daysAgoIso, daysOf, expected, mark, orderBy, readItems, removeItem, restoreItem, status,
  unmark, type Item,
} from "../lib/items";
import { setPref, usePrefs, type View as ListView } from "../lib/prefs";
import { daysWord, everyLabel } from "../lib/time";
import { C } from "../theme/tokens";

const SUGGEST = [
  "Линзы",
  "Шторы",
  "Стоматолог",
  "Зубная щётка",
  "Бабушка",
  "Цветы",
  "Фильтр для воды",
  "Маска",
];

/** Поиск появляется, когда список перестаёт умещаться в голове. */
const BUSY = 8;

/** Тач-зона 44x44: символ маленький, попадать по нему пальцем всё равно надо. */
const TAP = { width: 44, height: 44, alignItems: "center", justifyContent: "center" } as const;

const VIEW_LABEL: Record<ListView, string> = { rows: "Строки", big: "Крупно", tiles: "Плитки" };

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState<null | "more" | "profile" | "view">(null);
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
  const q = query.trim().toLowerCase();
  const found = all.filter((i) => {
    if (!q) return true;
    const hay = [i.title, i.note ?? "", ...i.marks.map((m) => m.note ?? "")].join(" ").toLowerCase();
    return hay.includes(q);
  });
  const list = orderBy(found, prefs.sort);
  const groups: { title: string; items: Item[] }[] = [
    { title: "Пора", items: list.filter((i) => status(i) === "due") },
    { title: "Скоро", items: list.filter((i) => status(i) === "soon") },
    { title: "Недавно", items: list.filter((i) => status(i) === "ok" || status(i) === "none") },
  ].filter((g) => g.items.length > 0);

  return (
    <View className="flex-1 bg-bg">
      <TopChrome
        profile="Личное"
        onProfile={() => setMenu("profile")}
        actions={
          <>
            <Pressable
              onPress={() => {
                haptic("light");
                setSearching((v) => !v);
              }}
              accessibilityLabel="Поиск"
              style={TAP}
            >
              <Search size={20} color={C.t1} absoluteStrokeWidth strokeWidth={1.5} />
            </Pressable>
            <Pressable onPress={() => setMenu("more")} accessibilityLabel="Ещё" style={TAP}>
              <Ellipsis size={20} color={C.t1} absoluteStrokeWidth strokeWidth={1.5} />
            </Pressable>
          </>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 110, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {searching || all.length >= BUSY ? (
          <View className="h-lg flex-row items-center gap-3 rounded-full bg-card2 px-4">
            <Search size={18} color={C.t3} absoluteStrokeWidth strokeWidth={1.5} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus={searching}
              placeholder="Найти по названию или заметке"
              placeholderTextColor={C.hint}
              returnKeyType="search"
              className="flex-1 font-m500 text-t1"
              style={{ fontSize: 16 }}
            />
          </View>
        ) : null}

        {items === null ? null : all.length === 0 ? (
          <View className="pt-10">
            <Empty icon={Clock} title="Пока пусто" sub="Добавь первое дело, и Ago начнёт считать дни." />
            <Txt className="mb-3 mt-6 px-1 text-[13px] text-t3">Например:</Txt>
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
        ) : list.length === 0 ? (
          <Txt className="px-1 pt-4 text-[15px] text-t3">Ничего не нашлось.</Txt>
        ) : (
          groups.map((g) => (
            <View key={g.title} className="gap-3">
              <Txt className="px-1 font-m600 text-[15px] text-t2">{g.title}</Txt>
              {prefs.view === "rows" ? (
                <View className="overflow-hidden rounded-card bg-card">
                  {g.items.map((i, n) => (
                    <View key={i.id}>
                      {n > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 18 }} /> : null}
                      <Row item={i} onOpen={() => router.push(`/item/${i.id}`)} onDone={() => done(i)} onDrop={() => drop(i)} />
                    </View>
                  ))}
                </View>
              ) : (
                <Grid items={g.items} view={prefs.view} onDone={done} />
              )}
            </View>
          ))
        )}
      </ScrollView>

      <BottomBar
        left={
          <GlassRound size={44} onPress={() => setMenu("view")} label="Вид списка">
            <Rows3 size={20} color={C.t1} absoluteStrokeWidth strokeWidth={1.5} />
          </GlassRound>
        }
        center={
          <GlassPill label="Добавить" onPress={() => setEditing("new")} px={0} py={0}>
            <View className="flex-row items-center gap-2 rounded-full bg-lime px-5" style={{ height: 52 }}>
              <Plus size={20} color={C.onLime} absoluteStrokeWidth strokeWidth={2} />
              <Txt className="font-m600 text-[17px] text-onLime">Добавить</Txt>
            </View>
          </GlassPill>
        }
        right={
          <GlassRound size={44} onPress={() => router.push("/archive")} label="Архив">
            <Archive size={20} color={C.t1} absoluteStrokeWidth strokeWidth={1.5} />
          </GlassRound>
        }
      />

      <Menu
        visible={menu === "more"}
        onClose={() => setMenu(null)}
        anchor={{ top: insets.top + 50, right: 16 }}
        items={[
          { label: "Архив", icon: Archive, onPress: () => router.push("/archive") },
          { label: "Настройки", icon: Settings, onPress: () => router.push("/settings") },
        ]}
      />
      <Menu
        visible={menu === "profile"}
        onClose={() => setMenu(null)}
        anchor={{ top: insets.top + 50, left: 16 }}
        items={[
          { label: "Личное", checked: true },
          { label: "Работа", locked: true },
          { label: "Новый профиль", locked: true },
        ]}
      />
      <Menu
        visible={menu === "view"}
        onClose={() => setMenu(null)}
        anchor={{ bottom: Math.max(insets.bottom, 12) + 56, left: 16 }}
        items={(["rows", "big", "tiles"] as ListView[]).map((v) => ({
          label: VIEW_LABEL[v],
          checked: prefs.view === v,
          onPress: () => setPref("view", v),
        }))}
      />

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

/** Строка списка: название, как часто, и сколько прошло справа. */
function Row({ item, onOpen, onDone, onDrop }: { item: Item; onOpen: () => void; onDone: () => void; onDrop: () => void }) {
  const d = daysOf(item);
  const every = expected(item);
  const over = status(item) === "due";
  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onDrop}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 18, paddingVertical: 17,
        backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent",
      })}
    >
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Txt numberOfLines={1} className="text-[17px]">{item.title}</Txt>
        {every ? <Txt className="text-[13px] text-t2">{everyLabel(every)}</Txt> : null}
      </View>
      <Txt className={`font-m600 text-[17px] ${over ? "text-lime" : ""}`}>
        {d == null ? "ни разу" : `${d} ${daysWord(d)}`}
      </Txt>
    </Pressable>
  );
}

/** Крупно — в один столбец, плитки — в два. Строки рисует Row внутри карточки. */
function Grid({ items, view, onDone }: { items: Item[]; view: "big" | "tiles"; onDone: (i: Item) => void }) {
  if (view !== "tiles") {
    return (
      <View className="gap-4">
        {items.map((i) => (
          <ItemRow key={i.id} item={i} view="big" onDone={() => onDone(i)} />
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
