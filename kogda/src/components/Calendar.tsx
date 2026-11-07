// Месяц для выбора даты. Свой, а не системный: системный пикер в тёмной теме
// выглядит чужим рядом с нашими карточками, а здесь он на тех же токенах.
// Будущие дни выключены: отметить то, чего ещё не было, нельзя.

import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function Calendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [shown, setShown] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();

  const first = new Date(shown.getFullYear(), shown.getMonth(), 1);
  const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // неделя начинается с понедельника
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, k) => new Date(shown.getFullYear(), shown.getMonth(), k + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (by: number) => {
    haptic("select");
    setShown((s) => new Date(s.getFullYear(), s.getMonth() + by, 1));
  };
  const nextBlocked = shown.getFullYear() === today.getFullYear() && shown.getMonth() === today.getMonth();

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable onPress={() => shift(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Предыдущий месяц" className="h-sm w-sm items-center justify-center rounded-full">
          <ChevronLeft size={22} color={C.t1} />
        </Pressable>
        <Txt className="font-m700 text-[17px]">
          {MONTHS[shown.getMonth()]}
          {shown.getFullYear() !== today.getFullYear() ? ` ${shown.getFullYear()}` : ""}
        </Txt>
        <Pressable
          onPress={() => !nextBlocked && shift(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          className="h-sm w-sm items-center justify-center rounded-full"
          style={{ opacity: nextBlocked ? 0.3 : 1 }}
        >
          <ChevronRight size={22} color={C.t1} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEK.map((w) => (
          <View key={w} className="flex-1 items-center py-1">
            <Txt className="text-[13px] text-t3">{w}</Txt>
          </View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} className="flex-row">
          {cells.slice(row * 7, row * 7 + 7).map((d, k) => {
            if (!d) return <View key={k} className="flex-1 py-1" />;
            const future = d.getTime() > today.getTime() && !sameDay(d, today);
            const picked = sameDay(d, value);
            return (
              <Pressable
                key={k}
                disabled={future}
                onPress={() => {
                  haptic("select");
                  onChange(d);
                }}
                className="flex-1 items-center py-1"
                accessibilityRole="button"
                accessibilityLabel={`${d.getDate()} ${MONTHS[d.getMonth()]}`}
              >
                <View
                  className="h-sm w-sm items-center justify-center rounded-full"
                  style={{ backgroundColor: picked ? C.lime : "transparent" }}
                >
                  <Txt
                    className={picked ? "font-m700" : "font-m500"}
                    style={{
                      fontSize: 15,
                      fontVariant: ["tabular-nums"],
                      color: picked ? C.onLime : future ? C.t3 : sameDay(d, today) ? C.lime : C.t1,
                      opacity: future ? 0.4 : 1,
                    }}
                  >
                    {d.getDate()}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
