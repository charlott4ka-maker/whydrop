// Отдельный пункт: давность крупно, история отметок и всё, что с ней можно
// сделать. История здесь не украшение: по ней приложение и понимает, как часто
// ты это делаешь на самом деле.

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Minus, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ItemSheet } from "../../components/ItemSheet";
import { toast } from "../../components/Toast";
import { Card, GlassCircle, Pill, Sheet, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import {
  CATEGORIES, daysAgoIso, daysOf, expected, mark, readItems, removeItem, status, typicalInterval,
  unmark, type Item,
} from "../../lib/items";
import { ago, dateLabel, daysSince, daysWord, everyLabel, marksWord, rough } from "../../lib/time";
import { C } from "../../theme/tokens";

export default function ItemScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null | "missing">(null);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [backdating, setBackdating] = useState(false);
  const [daysBack, setDaysBack] = useState(1);

  const reload = useCallback(() => {
    readItems()
      .then((all) => setItem(all.find((i) => i.id === id) ?? "missing"))
      .catch(() => setItem("missing"));
  }, [id]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  if (item === "missing") {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6" style={{ paddingTop: insets.top }}>
        <Txt className="text-center text-t2">Пункт не найден.</Txt>
        <View className="mt-6 w-full"><Pill full kind="ghost" onPress={() => router.back()}>Назад</Pill></View>
      </View>
    );
  }

  const put = (at: string, label: string) => {
    haptic("success");
    mark(id, at)
      .then(() => reload())
      .then(() =>
        toast.success(label, {
          action: { label: "Отменить", onPress: () => unmark(id, at).then(() => reload()).catch(() => {}) },
        }),
      )
      .catch(() => {});
  };

  const drop = () => {
    haptic("warning");
    removeItem(id).then(() => router.back()).catch(() => {});
  };

  const days = item ? daysOf(item) : null;
  const a = ago(days);
  const r = rough(days);
  const st = item ? status(item) : "none";
  const every = item ? expected(item) : null;
  const guessed = item ? typicalInterval(item) : null;
  const category = item ? CATEGORIES.find((c) => c.id === item.category) : undefined;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <GlassCircle onPress={() => router.back()} label="Назад">
          <ChevronLeft size={22} color={C.t1} />
        </GlassCircle>
        <Txt numberOfLines={1} className="flex-1 font-m800 text-[22px]">{item?.title ?? ""}</Txt>
        <GlassCircle onPress={() => item && setEditing(item)} label="Изменить">
          <Pencil size={20} color={C.t1} />
        </GlassCircle>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {!item ? null : (
          <>
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Txt className="flex-1 text-[15px] text-t2">{category?.title}</Txt>
                {st === "due" ? (
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(200,255,74,0.16)" }}>
                    <Txt className="font-m600 text-[13px]" style={{ color: C.lime }}>Пора</Txt>
                  </View>
                ) : null}
              </View>
              {days === null ? (
                <Txt className="mt-1 font-m700 text-[19px]" style={{ color: st === "due" ? C.lime : C.t1 }}>
                  Ещё ни разу
                </Txt>
              ) : (
                <View className="mt-1 flex-row items-baseline gap-2">
                  <Txt
                    className="font-m800"
                    style={{ fontSize: 56, letterSpacing: -2, color: st === "due" ? C.lime : C.t1, fontVariant: ["tabular-nums"] }}
                  >
                    {a.value}
                  </Txt>
                  <Txt className="text-[17px] text-t2">{a.unit}</Txt>
                </View>
              )}
              {r ? <Txt className="mt-1 text-[13px] text-t3">{r}</Txt> : null}
              {every ? (
                <Txt className="mt-3 text-[15px] text-t2">
                  {item.everyDays ? "Срок: " : "Обычно "}
                  {everyLabel(every)}
                  {!item.everyDays ? ", приложение заметило само" : ""}
                </Txt>
              ) : (
                <Txt className="mt-3 text-[13px] leading-[18px] text-t3">
                  Срок не задан. После трёх отметок станет видно, как часто ты это делаешь, и приложение начнёт считать по этому.
                </Txt>
              )}
            </Card>

            <View className="gap-3">
              <Pill full onPress={() => put(daysAgoIso(), "Отмечено сегодня")} icon={<Check size={18} color={C.onLime} />}>
                Отметить сегодня
              </Pill>
              <Pill full kind="ghost" onPress={() => { setDaysBack(1); setBackdating(true); }}>
                Другой датой
              </Pill>
            </View>

            <View>
              <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
                {item.marks.length
                  ? `${item.marks.length} ${marksWord(item.marks.length)}`
                  : "Отметок пока нет"}
              </Txt>
              {item.marks.length ? (
                <View className="overflow-hidden rounded-card bg-card">
                  {item.marks.map((m, i) => (
                    <View key={m}>
                      {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 }} /> : null}
                      <View className="flex-row items-center gap-3 px-4 py-3">
                        <View className="flex-1">
                          <Txt className="text-[15px]">{dateLabel(m)}</Txt>
                          <Txt className="mt-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                            {gapLabel(item.marks, i)}
                          </Txt>
                        </View>
                        <GlassCircle
                          size={40}
                          label={"Убрать отметку " + dateLabel(m)}
                          onPress={() => {
                            haptic("warning");
                            unmark(id, m).then(() => reload()).catch(() => {});
                          }}
                        >
                          <Trash2 size={18} color={C.t2} />
                        </GlassCircle>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {guessed && !item.everyDays ? (
                <Txt className="mt-3 px-4 text-[13px] leading-[18px] text-t3">
                  Промежутки считаются по медиане, поэтому один пропущенный год не портит картину.
                </Txt>
              ) : null}
            </View>

            <Pill full kind="ghost" onPress={drop}>
              <Txt className="font-m600 text-base text-danger">Удалить пункт</Txt>
            </Pill>
          </>
        )}
      </ScrollView>

      <Sheet visible={backdating} title="Когда это было" onClose={() => setBackdating(false)}>
        <View className="items-center">
          <Txt className="font-m800" style={{ fontSize: 56, letterSpacing: -2, fontVariant: ["tabular-nums"] }}>
            {daysBack}
          </Txt>
          <Txt className="mt-1 text-[15px] text-t2">{daysWord(daysBack)} назад</Txt>
          <Txt className="mt-1 text-[13px] text-t3">{dateLabel(daysAgoIso(daysBack))}</Txt>
          <View className="mt-6 flex-row items-center gap-4">
            <GlassCircle size={52} label="Меньше" onPress={() => { haptic("select"); setDaysBack((d) => Math.max(1, d - 1)); }}>
              <Minus size={24} color={C.t1} />
            </GlassCircle>
            <GlassCircle size={52} label="Больше" onPress={() => { haptic("select"); setDaysBack((d) => Math.min(3650, d + 1)); }}>
              <Plus size={24} color={C.t1} />
            </GlassCircle>
          </View>
        </View>
        <View className="mt-6 flex-row flex-wrap gap-2">
          {[7, 14, 30, 90, 180, 365].map((d) => (
            <Pill key={d} size="sm" kind="ghost" onPress={() => { haptic("select"); setDaysBack(d); }}>
              {everyLabel(d).replace("раз в ", "")}
            </Pill>
          ))}
        </View>
        <View className="mt-6">
          <Pill
            full
            onPress={() => {
              setBackdating(false);
              put(daysAgoIso(daysBack), "Отмечено: " + dateLabel(daysAgoIso(daysBack)));
            }}
          >
            Отметить
          </Pill>
        </View>
      </Sheet>

      <ItemSheet item={editing} onClose={() => setEditing(null)} onSaved={() => reload()} />
    </View>
  );
}

/** Сколько прошло между этой отметкой и предыдущей по времени. */
function gapLabel(marks: string[], i: number): string {
  const next = marks[i + 1];
  if (!next) return "первая отметка";
  const gap = daysSince(next, new Date(marks[i]));
  return `через ${gap} ${daysWord(gap)}`;
}
