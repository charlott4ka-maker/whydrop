// Карточка списка: название, крупная цифра давности, кнопка «отметить».
// «Пора» стоит в строке названия, а не под числом, иначе карточки выходят
// разной высоты и список идёт рваным.

import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { View } from "react-native";

import { daysOf, status, type Item } from "../lib/items";
import { ago, rough } from "../lib/time";
import { C } from "../theme/tokens";
import { Card, GlassCircle, Txt } from "./ui";

export function ItemRow({ item, onDone }: { item: Item; onDone: () => void }) {
  const router = useRouter();
  const days = daysOf(item);
  const a = ago(days);
  const r = rough(days);
  const st = status(item);
  const accent = st === "due" ? C.lime : C.t1;

  return (
    <Card className="flex-row items-center gap-4 p-4" onPress={() => router.push(`/item/${item.id}`)}>
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
            <Txt className="font-m800" style={{ fontSize: 34, letterSpacing: -1, color: accent, fontVariant: ["tabular-nums"] }}>
              {a.value}
            </Txt>
            <Txt className="text-[15px] text-t2">{a.unit}</Txt>
          </View>
        )}
        {r ? <Txt className="mt-1 text-[13px] text-t3">{r}</Txt> : null}
      </View>
      <GlassCircle size={52} onPress={onDone} label={"Отметить: " + item.title}>
        <Check size={24} color={C.t1} />
      </GlassCircle>
    </Card>
  );
}
