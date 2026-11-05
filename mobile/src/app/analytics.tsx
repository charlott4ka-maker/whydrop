// Аналитика аккаунта: пять чисел, которые объясняют охват, а не стена плиток.
// Нужен подключённый аккаунт: руками такие разбивки не ввести.

import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, GlassCircle, Pill, Txt } from "../components/ui";
import { fetchAnalytics, useAccount, type Analytics } from "../lib/instagram";
import { WORDS } from "../lib/period";
import { usePrefs } from "../lib/prefs";
import { C } from "../theme/tokens";

const num = (n: number) => Math.round(n).toLocaleString("ru-RU");
const share = (a: number, b: number) => (a + b ? Math.round((a / (a + b)) * 100) : 0);

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const account = useAccount();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!account) return;
    setLoading(true);
    setError(null);
    fetchAnalytics(Number(prefs.period))
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Не получилось загрузить"))
      .finally(() => setLoading(false));
  }, [account, prefs.period]);

  useFocusEffect(
    useCallback(() => {
      if (!data) load();
    }, [data, load]),
  );

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <GlassCircle onPress={() => router.back()} label="Назад">
          <ChevronLeft size={22} color={C.t1} />
        </GlassCircle>
        <Txt className="flex-1 font-m800 text-[22px]">Аналитика</Txt>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Txt className="px-1 text-[13px] leading-[18px] text-t3">
          За {WORDS[prefs.period].now}. Период меняется в профиле.
        </Txt>

        {!account ? (
          <Card className="p-5">
            <Txt className="font-m700 text-[17px]">Нужен подключённый аккаунт</Txt>
            <Txt className="mt-1.5 text-[15px] leading-5 text-t2">
              Эти разбивки Instagram отдаёт только через API: руками их не ввести.
            </Txt>
          </Card>
        ) : error ? (
          <Card className="p-5">
            <Txt className="font-m700 text-[17px]">Не загрузилось</Txt>
            <Txt className="mt-1.5 text-[15px] leading-5 text-t2">{error}</Txt>
            <View className="mt-4"><Pill kind="ghost" size="sm" onPress={load}>Ещё раз</Pill></View>
          </Card>
        ) : !data ? (
          <Card className="p-5"><Txt className="text-t2">{loading ? "Считаю…" : "Нет данных"}</Txt></Card>
        ) : (
          <>
            <Split
              title="Кто видит"
              left={["Подписчики", data.audience?.followers ?? 0]}
              right={["Остальные", data.audience?.others ?? 0]}
              missing={!data.audience}
              note="Если своих больше, охват почти не растёт: новых людей контент не находит."
            />
            <Split
              title="Что приносит охват"
              left={["Reels", data.format?.reels ?? 0]}
              right={["Остальное", data.format?.rest ?? 0]}
              missing={!data.format}
              note="Правило разбора смотрит именно на Reels: без них выход к новой аудитории почти закрыт."
            />
            <Card className="p-4">
              <Txt className="text-[13px] text-t2">Вовлечённость</Txt>
              {data.engagement ? (
                <>
                  <Txt className="mt-1 font-m800 text-[28px]" style={{ fontVariant: ["tabular-nums"] }}>
                    {data.engagement.percent.toFixed(1)}%
                  </Txt>
                  <Txt className="mt-1 text-[13px] leading-[17px] text-t3">
                    Лайки и комментарии на пост к числу подписчиков, по {data.engagement.posts} постам. Порог разбора 1%.
                  </Txt>
                </>
              ) : (
                <Txt className="mt-1 text-[15px] text-t3">За период нет постов</Txt>
              )}
            </Card>
            <Card className="p-4">
              <Txt className="text-[13px] text-t2">Подписки минус отписки</Txt>
              {data.follows ? (
                <>
                  <Txt
                    className="mt-1 font-m800 text-[28px]"
                    style={{ fontVariant: ["tabular-nums"], color: data.follows.gained - data.follows.lost >= 0 ? C.ok : C.danger }}
                  >
                    {data.follows.gained - data.follows.lost > 0 ? "+" : ""}
                    {num(data.follows.gained - data.follows.lost)}
                  </Txt>
                  <Txt className="mt-1 text-[13px] leading-[17px] text-t3">
                    Пришло {num(data.follows.gained)}, ушло {num(data.follows.lost)}. Кто именно отписался, Instagram не отдаёт никому.
                  </Txt>
                </>
              ) : (
                <Txt className="mt-1 text-[15px] text-t3">Instagram не отдал эти данные</Txt>
              )}
            </Card>

            <Txt className="mt-2 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
              Лучшее за период
            </Txt>
            {data.top.length ? (
              <View className="overflow-hidden rounded-card bg-card">
                {data.top.map((t, i) => (
                  <View key={t.id}>
                    {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 }} /> : null}
                    <Pressable
                      onPress={() => t.link && Linking.openURL(t.link)}
                      accessibilityRole="link"
                      accessibilityLabel={`${t.type}, ${t.likes} лайков`}
                      className="flex-row items-center gap-3 px-4 py-3"
                    >
                      {t.thumb ? (
                        <Image source={{ uri: t.thumb }} style={{ width: 44, height: 44, borderRadius: 10 }} />
                      ) : (
                        <View className="h-11 w-11 rounded-[10px] bg-card2" />
                      )}
                      <View className="flex-1">
                        <Txt className="font-m600 text-[15px]">{t.type}</Txt>
                        <Txt className="mt-0.5 text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>
                          {num(t.likes)} лайков · {num(t.comments)} комментариев
                        </Txt>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Card className="p-4"><Txt className="text-[15px] text-t3">За период нет публикаций</Txt></Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Две доли одной величины: полоса и два числа под ней. */
function Split({
  title, left, right, note, missing,
}: {
  title: string;
  left: [string, number];
  right: [string, number];
  note: string;
  missing?: boolean;
}) {
  const pct = share(left[1], right[1]);
  return (
    <Card className="p-4">
      <Txt className="text-[13px] text-t2">{title}</Txt>
      {missing ? (
        <Txt className="mt-1 text-[15px] text-t3">Instagram не отдал эту разбивку</Txt>
      ) : (
        <>
          <Txt className="mt-1 font-m800 text-[28px]" style={{ fontVariant: ["tabular-nums"] }}>{pct}%</Txt>
          <View className="mt-3 h-2 flex-row overflow-hidden rounded-full" style={{ backgroundColor: C.card2 }}>
            <View style={{ width: `${pct}%`, backgroundColor: C.lime }} />
          </View>
          <View className="mt-2 flex-row justify-between">
            <Txt className="text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>{left[0]} {num(left[1])}</Txt>
            <Txt className="text-[13px] text-t3" style={{ fontVariant: ["tabular-nums"] }}>{right[0]} {num(right[1])}</Txt>
          </View>
          <Txt className="mt-2 text-[13px] leading-[17px] text-t3">{note}</Txt>
        </>
      )}
    </Card>
  );
}
