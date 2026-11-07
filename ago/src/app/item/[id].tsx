// Отдельный пункт: давность крупно, заметка, история отметок и всё, что с ней
// можно сделать. История здесь не украшение: по ней приложение и понимает, как
// часто ты это делаешь на самом деле.

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Pencil, Share2, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Calendar } from "../../components/Calendar";
import { Counter } from "../../components/Counter";
import { ItemSheet } from "../../components/ItemSheet";
import { toast } from "../../components/Toast";
import { Card, Field, GlassCircle, Pill, Sheet, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import {
  CATEGORIES, daysAgoIso, daysOf, expected, mark, nextDue, readItems, removeItem, restoreItem,
  moveMark, setMarkNote, status, typicalInterval, unmark, type Item, type Mark,
} from "../../lib/items";
import { ago, dateLabel, daysSince, daysWord, everyLabel, marksWord, nextLabel, rough } from "../../lib/time";
import { C } from "../../theme/tokens";

export default function ItemScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null | "missing">(null);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickDate, setPickDate] = useState(new Date());
  /** какую отметку переносим; null — ставим новую */
  const [moving, setMoving] = useState<Mark | null>(null);
  const [noting, setNoting] = useState<Mark | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const reload = useCallback(() => {
    readItems()
      .then((all) => setItem(all.find((i) => i.id === id) ?? "missing"))
      .catch(() => setItem("missing"));
  }, [id]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  if (item === "missing") {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: insets.top }}>
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

  const days = item ? daysOf(item) : null;
  const a = ago(days);
  const r = rough(days);
  const st = item ? status(item) : "none";
  const every = item ? expected(item) : null;
  const guessed = item ? typicalInterval(item) : null;
  const next = item ? nextDue(item) : null;

  const share = async () => {
    if (!item) return;
    const lines = [
      days === null
        ? `${item.title}: ещё ни разу.`
        : `${item.title}: ${days} ${daysWord(days)} назад.`,
      r ? r[0].toUpperCase() + r.slice(1) + "." : "",
      "",
      "Считает приложение Ago",
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {}
  };
  const category = item ? CATEGORIES.find((c) => c.id === item.category) : undefined;

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <GlassCircle onPress={() => router.back()} label="Назад">
          <ChevronLeft size={22} color={C.t1} />
        </GlassCircle>
        <Txt numberOfLines={1} className="flex-1 font-m800 text-[22px]">{item?.title ?? ""}</Txt>
        <GlassCircle onPress={share} label="Поделиться">
          <Share2 size={20} color={C.t1} />
        </GlassCircle>
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
                  <Counter
                    value={days}
                    className="font-m800"
                    style={{
                      fontSize: 56, letterSpacing: -2, fontVariant: ["tabular-nums"],
                      color: st === "due" ? C.lime : C.t1,
                    }}
                  />
                  <Txt className="text-[17px] text-t2">{a.unit}</Txt>
                </View>
              )}
              {item.marks[0] ? (
                <Txt className="mt-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                  {dateLabel(item.marks[0].at)}
                  {r ? ` · ${r}` : ""}
                </Txt>
              ) : null}
              {every ? (
                <>
                  <Txt className="mt-3 text-[15px] text-t2">
                    {item.everyDays ? "Срок: " : "Обычно "}
                    {everyLabel(every)}
                    {!item.everyDays ? ", приложение заметило само" : ""}
                  </Txt>
                  {next ? (
                    // смотреть только назад — половина пользы: человек сразу
                    // спрашивает, когда теперь
                    <Txt className="mt-1 text-[15px]" style={{ color: st === "due" ? C.lime : C.t2 }}>
                      Следующий раз {nextLabel(next)}
                    </Txt>
                  ) : null}
                </>
              ) : (
                <Txt className="mt-3 text-[13px] leading-[18px] text-t3">
                  Срок не задан. После трёх отметок станет видно, как часто ты это делаешь, и приложение начнёт считать по этому.
                </Txt>
              )}
            </Card>

            {item.note ? (
              <Card className="p-4" onPress={() => setEditing(item)}>
                <Txt className="text-[13px] text-t2">Заметка</Txt>
                <Txt className="mt-1 text-[15px] leading-[21px]">{item.note}</Txt>
              </Card>
            ) : null}

            <View className="gap-3">
              <Pill full onPress={() => put(daysAgoIso(), "Отмечено сегодня")} icon={<Check size={18} color={C.onLime} />}>
                Отметить сегодня
              </Pill>
              <Pill
                full
                kind="ghost"
                onPress={() => {
                  setMoving(null);
                  setPickDate(new Date());
                  setPicking(true);
                }}
              >
                Выбрать дату
              </Pill>
            </View>

            <View>
              <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
                {item.marks.length ? `${item.marks.length} ${marksWord(item.marks.length)}` : "Отметок пока нет"}
              </Txt>
              {item.marks.length ? (
                <View className="overflow-hidden rounded-card bg-card">
                  {item.marks.map((m, i) => (
                    <View key={m.at}>
                      {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 }} /> : null}
                      <View className="flex-row items-center gap-3 px-4 py-3">
                        <Card
                          className="flex-1 bg-transparent"
                          onPress={() => {
                            setNoting(m);
                            setNoteDraft(m.note ?? "");
                          }}
                        >
                          <Txt className="text-[15px]">{dateLabel(m.at)}</Txt>
                          <Txt className="mt-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                            {gapLabel(item.marks, i)}
                          </Txt>
                          {m.note ? <Txt className="mt-1 text-[13px] text-t2">{m.note}</Txt> : null}
                        </Card>
                        <GlassCircle
                          size={40}
                          label={"Убрать отметку " + dateLabel(m.at)}
                          onPress={() => {
                            haptic("warning");
                            unmark(id, m.at).then(() => reload()).catch(() => {});
                          }}
                        >
                          <Trash2 size={18} color={C.t2} />
                        </GlassCircle>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              <Txt className="mt-3 px-4 text-[13px] leading-[18px] text-t3">
                {guessed && !item.everyDays
                  ? "Промежутки считаются по медиане, поэтому один пропущенный год не портит картину."
                  : "Тап по отметке добавит к ней приписку: что было в тот раз."}
              </Txt>
            </View>

            <Pill
              full
              kind="ghost"
              onPress={() => {
                // удаление уносит с собой всю историю отметок, поэтому отмена
                // тут нужна не меньше, чем в списке
                if (!item) return;
                const gone = item;
                haptic("warning");
                removeItem(id)
                  .then(() => {
                    router.back();
                    toast.info("Удалено", {
                      action: { label: "Отменить", onPress: () => restoreItem(gone).catch(() => {}) },
                      duration: 5000,
                      root: true,
                    });
                  })
                  .catch(() => {});
              }}
            >
              <Txt className="font-m600 text-base text-danger">Удалить пункт</Txt>
            </Pill>
          </>
        )}
      </ScrollView>

      <Sheet visible={picking} title={moving ? "Перенести на" : "Когда это было"} onClose={() => setPicking(false)}>
        <Calendar value={pickDate} onChange={setPickDate} />
        <Txt className="mt-4 text-center text-[15px] text-t2">
          {dateLabel(pickDate.toISOString())} · {daysSince(pickDate.toISOString())} {daysWord(daysSince(pickDate.toISOString()))} назад
        </Txt>
        <View className="mt-6">
          <Pill
            full
            onPress={() => {
              setPicking(false);
              const at = new Date(pickDate);
              at.setHours(12, 0, 0, 0);
              if (moving) {
                const from = moving.at;
                setMoving(null);
                haptic("light");
                moveMark(id, from, at.toISOString())
                  .then(() => reload())
                  .then(() => toast.success("Перенесено на " + dateLabel(at.toISOString())))
                  .catch(() => {});
                return;
              }
              put(at.toISOString(), "Отмечено: " + dateLabel(at.toISOString()));
            }}
          >
            {moving ? "Перенести" : "Отметить"}
          </Pill>
        </View>
      </Sheet>

      <Sheet visible={noting !== null} title={noting ? dateLabel(noting.at) : ""} onClose={() => setNoting(null)}>
        <Field
          label="Что было в тот раз"
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder="У Иры, 3000"
          autoCapitalize="sentences"
          multiline
        />
        <View className="gap-3">
          <Pill
            full
            onPress={() => {
              const target = noting;
              setNoting(null);
              if (target) setMarkNote(id, target.at, noteDraft).then(() => reload()).catch(() => {});
            }}
          >
            Сохранить
          </Pill>
          <Pill
            full
            kind="ghost"
            onPress={() => {
              const target = noting;
              if (!target) return;
              setNoting(null);
              setMoving(target);
              setPickDate(new Date(target.at));
              setPicking(true);
            }}
          >
            Перенести на другую дату
          </Pill>
        </View>
      </Sheet>

      <ItemSheet item={editing} onClose={() => setEditing(null)} onSaved={() => reload()} />
    </View>
  );
}

/** Сколько прошло между этой отметкой и предыдущей по времени. */
function gapLabel(marks: Mark[], i: number): string {
  const next = marks[i + 1];
  if (!next) return "первая отметка";
  const gap = daysSince(next.at, new Date(marks[i].at));
  return `через ${gap} ${daysWord(gap)}`;
}
