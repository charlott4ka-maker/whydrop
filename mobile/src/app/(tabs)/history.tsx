// Сохранённые разборы, новые сверху. Ничего не уходит с телефона, поэтому
// список об этом и говорит, а не предлагает синхронизацию. Тап открывает
// разбор целиком, долгое нажатие удаляет с возможностью отменить.

import { useFocusEffect, useRouter } from "expo-router";
import { Clock, Save } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstagramGlyph } from "../../components/InstagramGlyph";
import { TabBarFade } from "../../components/TabBarFade";
import { TabHeader } from "../../components/TabHeader";
import { toast } from "../../components/Toast";
import { Card, Empty, Pill, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import { readHistory, removeEntry, restoreEntry, type Entry } from "../../lib/history";
import { WORDS } from "../../lib/period";
import { usePrefs } from "../../lib/prefs";
import { C } from "../../theme/tokens";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [items, setItems] = useState<Entry[] | null>(null);

  // разбор, сделанный на другой вкладке, должен быть здесь при переходе сюда
  useFocusEffect(
    useCallback(() => {
      readHistory().then(setItems).catch(() => setItems([]));
    }, []),
  );

  const confirmRemove = (e: Entry) => {
    haptic("warning");
    removeEntry(e.id)
      .then(setItems)
      .then(() =>
        toast.info("Разбор удалён", {
          action: { label: "Отменить", onPress: () => restoreEntry(e).then(setItems).catch(() => {}) },
          duration: 5000,
        }),
      )
      .catch(() => {});
  };

  const openEntry = (e: Entry) => {
    haptic("light");
    router.push({
      pathname: "/result",
      params: { m: JSON.stringify(e.metrics), period: e.period, at: e.at, id: e.id },
    });
  };

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title="История" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 10 }}
      >
        {items === null ? null : items.length === 0 ? (
          <View className="pt-10">
            {prefs.saveHistory ? (
              <Empty
                icon={Clock}
                title="Пока нет истории"
                sub="Появится после первого разбора."
                action={<Pill onPress={() => router.navigate("/(tabs)")}>Сделать разбор</Pill>}
              />
            ) : (
              <Empty
                icon={Save}
                title="Сохранение выключено"
                sub="Разборы не записываются. Включи «Сохранять историю», и они начнут появляться здесь."
                action={<Pill kind="ghost" onPress={() => router.navigate("/(tabs)/profile")}>В профиль</Pill>}
              />
            )}
          </View>
        ) : (
          <>
            <Trend items={items} />
            <Txt className="px-1 pb-1 text-[13px] leading-[18px] text-t3">
              Данные остаются на этом устройстве. Тап открывает разбор, долгое нажатие удаляет.
            </Txt>
            {items.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => openEntry(e)}
                onLongPress={() => confirmRemove(e)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={`${e.title}, ${e.change} процентов, ${when(e.at)}`}
              >
                <Card className="flex-row items-center gap-3 p-4">
                  <View className="flex-1">
                    <Txt numberOfLines={1} className="font-m700">{e.title}</Txt>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      {e.source === "instagram" ? <InstagramGlyph size={13} color={C.t3} /> : null}
                      <Txt className="text-[13.5px] text-t2" style={{ fontVariant: ["tabular-nums"] }}>
                        {WORDS[e.period].short} · {when(e.at)} · охват {e.reach.toLocaleString("ru-RU")}
                      </Txt>
                    </View>
                  </View>
                  <View
                    className="rounded-xl px-2.5 py-1.5"
                    style={{ backgroundColor: e.change <= -5 ? "rgba(255,90,110,0.16)" : "rgba(79,224,160,0.16)" }}
                  >
                    <Txt className="font-m700 text-[14px]" style={{ fontVariant: ["tabular-nums"], color: e.change <= -5 ? C.danger : C.ok }}>
                      {e.change > 0 ? "+" : ""}{e.change}%
                    </Txt>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      <TabBarFade />
    </View>
  );
}

/**
 * Охват по сохранённым разборам. Берём только записи того же периода, что и
 * последняя: недельный охват и месячный на одной линии ничего не значат.
 */
function Trend({ items }: { items: Entry[] }) {
  const period = items[0].period;
  const points = items
    .filter((e) => e.period === period)
    .slice(0, 10)
    .map((e) => e.reach)
    .reverse();
  if (points.length < 3) return null;

  const W = 1000, H = 120;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - 8 - ((v - min) / span) * (H - 16);
  const line = points.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const up = points[points.length - 1] >= points[0];
  const color = up ? C.ok : C.danger;

  return (
    <Card className="mb-1 p-4">
      <Txt className="font-m600 text-[13px] text-t2">Охват по разборам · {WORDS[period].short}</Txt>
      <Txt className="mt-1 font-m800 text-[26px]" style={{ fontVariant: ["tabular-nums"] }}>
        {points[points.length - 1].toLocaleString("ru-RU")}
      </Txt>
      <View className="mt-3" style={{ height: 60 }}>
        <Svg width="100%" height={60} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Path d={area} fill={color} fillOpacity={0.12} />
          <Path d={line} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </Card>
  );
}
