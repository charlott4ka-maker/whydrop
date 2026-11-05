// Серия: сколько недель подряд человек разбирает охват, и что из этого уже
// собрано. Отдельная страница, потому что на главном экране это перекрывало бы
// то, ради чего приложение открывают.

import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft, Check, Flame } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, GlassCircle, Txt } from "../components/ui";
import { readHistory, type Entry } from "../lib/history";
import { achievements, streak, weeksWord } from "../lib/streak";
import { C } from "../theme/tokens";

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      readHistory().then(setItems).catch(() => {});
    }, []),
  );

  const s = streak(items);
  const list = achievements(items, s);
  const got = list.filter((a) => a.done).length;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <GlassCircle onPress={() => router.back()} label="Назад">
          <ChevronLeft size={22} color={C.t1} />
        </GlassCircle>
        <Txt className="flex-1 font-m800 text-[22px]">Серия</Txt>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="items-center p-6">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px]" style={{ backgroundColor: "rgba(200,255,74,0.16)" }}>
            <Flame size={34} color={C.lime} absoluteStrokeWidth strokeWidth={2} />
          </View>
          <Txt className="mt-4 font-m800 text-[44px]" style={{ letterSpacing: -1, fontVariant: ["tabular-nums"] }}>
            {s.current}
          </Txt>
          <Txt className="mt-0.5 text-[15px] text-t2">{weeksWord(s.current)} подряд</Txt>
          <Txt className="mt-3 max-w-[280px] text-center text-[13px] leading-[18px] text-t3">
            {s.doneThisWeek
              ? "Эта неделя закрыта. Следующий разбор на следующей неделе продлит серию."
              : s.current > 0
                ? "Разбери охват на этой неделе, чтобы серия не прервалась."
                : "Серия начнётся с первого разбора."}
          </Txt>
        </Card>

        <View className="flex-row gap-3">
          <Stat label="Лучшая серия" value={`${s.best} ${weeksWord(s.best)}`} />
          <Stat label="Всего разборов" value={String(s.total)} />
        </View>

        <View>
          <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
            Ачивки · {got} из {list.length}
          </Txt>
          <View className="overflow-hidden rounded-card bg-card">
            {list.map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 }} /> : null}
                <View className="flex-row items-center gap-3 px-4 py-3.5">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: a.done ? C.lime : C.card2 }}
                  >
                    {a.done ? (
                      <Check size={20} color={C.onLime} strokeWidth={2.6} />
                    ) : a.progress ? (
                      <Txt className="font-m700 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                        {a.progress[0]}
                      </Txt>
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Txt className={`text-[15px] ${a.done ? "font-m600" : ""}`} style={{ color: a.done ? C.t1 : C.t2 }}>
                      {a.title}
                    </Txt>
                    <Txt className="mt-0.5 text-[13px] leading-[17px] text-t3">{a.sub}</Txt>
                  </View>
                  {a.progress && !a.done ? (
                    <Txt className="text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                      {a.progress[0]}/{a.progress[1]}
                    </Txt>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 p-4">
      <Txt className="text-[13px] text-t2">{label}</Txt>
      <Txt className="mt-1 font-m800 text-[20px]" style={{ fontVariant: ["tabular-nums"] }}>{value}</Txt>
    </Card>
  );
}
