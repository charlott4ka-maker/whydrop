// Единственный экран: список того, что делаешь нерегулярно, и сколько с тех
// пор прошло. Наверху то, что просрочено, дальше просто давнее.

import { Check, Clock } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toast } from "../components/Toast";
import { Card, Chip, Empty, Field, GlassCircle, HeaderAdd, Pill, ScreenTitle, Sheet, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import {
  addItem, markDone, readItems, removeItem, restoreItem, sortItems, status, updateItem, type Item,
} from "../lib/items";
import { ago, daysSince, rough } from "../lib/time";
import { C } from "../theme/tokens";

/** Интервалы, которые люди реально называют вслух. */
const EVERY: [number | undefined, string][] = [
  [undefined, "Просто считать"],
  [7, "Раз в неделю"],
  [30, "Раз в месяц"],
  [90, "Раз в 3 месяца"],
  [180, "Раз в полгода"],
  [365, "Раз в год"],
];

const SUGGESTIONS = [
  "Меняла линзы",
  "Стирала шторы",
  "Была у стоматолога",
  "Меняла зубную щётку",
  "Звонила бабушке",
  "Поливала цветы",
  "Меняла фильтр в воде",
  "Делала маску",
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[] | null>(null);
  const [editing, setEditing] = useState<Item | "new" | null>(null);

  useEffect(() => {
    readItems().then(setItems).catch(() => setItems([]));
  }, []);

  const done = useCallback((item: Item) => {
    haptic("success");
    const before = item.lastAt;
    markDone(item.id)
      .then(setItems)
      .then(() =>
        toast.success("Отмечено сегодня", {
          action: {
            label: "Отменить",
            onPress: () => updateItem(item.id, { lastAt: before }).then(setItems).catch(() => {}),
          },
        }),
      )
      .catch(() => {});
  }, []);

  const drop = useCallback((item: Item) => {
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
  }, []);

  const list = items ? sortItems(items) : [];

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle
          title="Давно"
          right={<HeaderAdd onPress={() => setEditing("new")} label="Добавить" />}
        />

        {items === null ? null : list.length === 0 ? (
          <View className="pt-6">
            <Empty
              icon={Clock}
              title="Пока пусто"
              sub="Добавь то, что делаешь редко и всё время забываешь когда."
            />
            <Txt className="mb-3 mt-2 px-1 text-[13px] text-t3">Например:</Txt>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
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
          list.map((item) => (
            <Row key={item.id} item={item} onDone={() => done(item)} onEdit={() => setEditing(item)} />
          ))
        )}
      </ScrollView>

      <EditSheet
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

function Row({ item, onDone, onEdit }: { item: Item; onDone: () => void; onEdit: () => void }) {
  const days = item.lastAt === null ? null : daysSince(item.lastAt);
  const a = ago(days);
  const r = rough(days);
  const st = status(item);
  const accent = st === "due" ? C.lime : st === "soon" ? C.t1 : C.t1;

  return (
    <Card className="flex-row items-center gap-3 p-4" onPress={onEdit}>
      <View className="flex-1">
        <Txt numberOfLines={1} className="text-[15px] text-t2">{item.title}</Txt>
        <View className="mt-1 flex-row items-baseline gap-2">
          <Txt className="font-m800" style={{ fontSize: 34, letterSpacing: -1, color: accent, fontVariant: ["tabular-nums"] }}>
            {a.value}
          </Txt>
          <Txt className="text-[15px] text-t2">{a.unit}</Txt>
        </View>
        {r ? <Txt className="mt-0.5 text-[13px] text-t3">{r}</Txt> : null}
        {st === "due" && item.everyDays ? (
          <View className="mt-2 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(200,255,74,0.16)" }}>
            <Txt className="font-m600 text-[13px]" style={{ color: C.lime }}>Пора</Txt>
          </View>
        ) : null}
      </View>
      <GlassCircle size={52} onPress={onDone} label={"Отметить: " + item.title}>
        <Check size={24} color={C.t1} />
      </GlassCircle>
    </Card>
  );
}

function EditSheet({
  item, onClose, onSaved, onDelete,
}: {
  item: Item | "new" | null;
  onClose: () => void;
  onSaved: (items: Item[]) => void;
  onDelete: (item: Item) => void;
}) {
  const isNew = item === "new";
  const current = item && item !== "new" ? item : null;
  const [title, setTitle] = useState("");
  const [every, setEvery] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | false>(false);

  useEffect(() => {
    if (!item) return;
    setTitle(current?.title ?? "");
    setEvery(current?.everyDays);
    setError(false);
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!title.trim()) {
      setError("Напиши, что это");
      haptic("error");
      return;
    }
    haptic("light");
    const p = current
      ? updateItem(current.id, { title: title.trim(), everyDays: every })
      : addItem(title, every);
    p.then(onSaved).catch(() => {});
    onClose();
  };

  return (
    <Sheet visible={item !== null} title={isNew ? "Что добавить" : "Изменить"} onClose={onClose}>
      <Field
        label="Что это"
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          if (error) setError(false);
        }}
        placeholder="Меняла линзы"
        autoCapitalize="sentences"
        autoFocus={isNew}
        error={error}
      />

      <Txt className="mb-2 font-m600 text-[13px] text-t2">Как часто</Txt>
      <View className="flex-row flex-wrap gap-2">
        {EVERY.map(([days, label]) => (
          <Chip key={label} active={every === days} onPress={() => setEvery(days)}>
            {label}
          </Chip>
        ))}
      </View>
      <Txt className="mt-3 text-[13px] leading-[18px] text-t3">
        Если выбрать срок, карточка сама скажет «пора». Без него приложение просто считает дни.
      </Txt>

      <View className="mt-6 gap-3">
        <Pill full onPress={save}>{isNew ? "Добавить" : "Сохранить"}</Pill>
        {current ? (
          <Pill full kind="ghost" onPress={() => onDelete(current)}>
            <Txt className="font-m600 text-base text-danger">Удалить</Txt>
          </Pill>
        ) : null}
      </View>
    </Sheet>
  );
}
