// Карточка списка в трёх видах. Крупный — один пункт читается с расстояния,
// строки — когда пунктов много и важен обзор, плитки — когда хочется видеть
// всё сразу. Данные одни и те же, меняется только плотность.

import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { daysOf, lastMark, status, type Item } from "../lib/items";
import type { View as ViewKind } from "../lib/prefs";
import { ago, dateLabel, dateShort, rough } from "../lib/time";
import { C } from "../theme/tokens";
import { Counter } from "./Counter";
import { Card, GlassCircle, Txt } from "./ui";

export function ItemRow({ item, view, onDone }: { item: Item; view: ViewKind; onDone: () => void }) {
  const router = useRouter();
  const days = daysOf(item);
  const a = ago(days);
  const st = status(item);
  const accent = st === "due" ? C.lime : C.t1;
  const last = lastMark(item);
  const open = () => router.push(`/item/${item.id}`);

  if (view === "rows") {
    return (
      <Card className="flex-row items-center gap-3 px-4 py-3" onPress={open}>
        <View className="flex-1">
          <Txt numberOfLines={1} className="text-[15px]">{item.title}</Txt>
          {last ? (
            <Txt className="mt-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
              {dateLabel(last.at)}
            </Txt>
          ) : null}
        </View>
        {st === "due" ? (
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(200,255,74,0.16)" }}>
            <Txt className="font-m600 text-[13px]" style={{ color: C.lime }}>Пора</Txt>
          </View>
        ) : null}
        {days === null ? (
          <Txt className="font-m700" style={{ fontSize: 19, color: accent, minWidth: 44, textAlign: "right" }}>—</Txt>
        ) : (
          <Counter
            value={days}
            className="font-m700"
            style={{ fontSize: 19, color: accent, fontVariant: ["tabular-nums"], minWidth: 44, textAlign: "right" }}
          />
        )}
        <GlassCircle size={40} onPress={onDone} label={"Отметить: " + item.title}>
          <Check size={20} color={C.t1} />
        </GlassCircle>
      </Card>
    );
  }

  if (view === "tiles") {
    return (
      <Card className="flex-1 p-4" onPress={open}>
        <View className="flex-row items-start gap-2">
          <Txt numberOfLines={2} className="flex-1 text-[15px] text-t2" style={{ lineHeight: 20, minHeight: 40 }}>
            {item.title}
          </Txt>
          {st === "due" ? <View className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: C.lime }} /> : null}
        </View>
        {days === null ? (
          <Txt className="mt-2 font-m700 text-[17px]" style={{ color: accent }}>Ещё ни разу</Txt>
        ) : (
          <View className="mt-2 flex-row items-baseline gap-2">
            <Counter
              value={days}
              className="font-m800"
              style={{ fontSize: 30, letterSpacing: -1, color: accent, fontVariant: ["tabular-nums"] }}
            />
            <Txt className="text-[13px] text-t2">{a.unit}</Txt>
          </View>
        )}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 12 }} />
        <View className="flex-row items-center justify-between gap-2">
          <Txt numberOfLines={1} className="flex-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
            {last ? dateShort(last.at) : "нет отметок"}
          </Txt>
          <GlassCircle size={40} onPress={onDone} label={"Отметить: " + item.title}>
            <Check size={20} color={C.t1} />
          </GlassCircle>
        </View>
      </Card>
    );
  }

  const r = rough(days);
  return (
    <Card className="flex-row items-center gap-4 p-4" onPress={open}>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Txt numberOfLines={1} className="flex-1 text-[15px] text-t2">{item.title}</Txt>
          {st === "due" ? (
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(200,255,74,0.16)" }}>
              <Txt className="font-m600 text-[13px]" style={{ color: C.lime }}>Пора</Txt>
            </View>
          ) : null}
        </View>
        {days === null ? (
          // крупное тире вместо числа читается как случайная чёрточка
          <Txt className="mt-1 font-m700 text-[19px]" style={{ letterSpacing: -0.2, color: accent }}>
            Ещё ни разу
          </Txt>
        ) : (
          <View className="mt-1 flex-row items-baseline gap-2">
            <Counter
              value={days}
              className="font-m800"
              style={{ fontSize: 34, letterSpacing: -1, color: accent, fontVariant: ["tabular-nums"] }}
            />
            <Txt className="text-[15px] text-t2">{a.unit}</Txt>
          </View>
        )}
        <Txt className="mt-1 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
          {last ? dateLabel(last.at) : "ещё не отмечено"}
          {r ? ` · ${r}` : ""}
        </Txt>
        {item.note ? (
          <Txt numberOfLines={1} className="mt-1 text-[13px] text-t3">{item.note}</Txt>
        ) : null}
      </View>
      <GlassCircle size={52} onPress={onDone} label={"Отметить: " + item.title}>
        <Check size={24} color={C.t1} />
      </GlassCircle>
    </Card>
  );
}
