// Результат разбора: полноэкранная модалка поверх вкладки, а не подмена
// экрана. Закрыл — и форма осталась там, где была. Сюда же открывается
// сохранённая запись из истории.

import { useLocalSearchParams, useRouter } from "expo-router";
import { RotateCcw, Share2, Trash2 } from "lucide-react-native";
import { Alert, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CloseButton, Card, Pill, Txt } from "../components/ui";
import { spaced } from "../components/NumList";
import { toast } from "../components/Toast";
import { diagnose, type Metrics } from "../lib/diagnose";
import { haptic } from "../lib/haptics";
import { setDraft } from "../lib/draft";
import { removeEntry } from "../lib/history";
import { compared, rows } from "../lib/period";
import type { Period } from "../lib/prefs";
import { C } from "../theme/tokens";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

export default function ResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const p = useLocalSearchParams<{ m?: string; period?: Period; at?: string; id?: string }>();

  let m: Metrics | null = null;
  try {
    m = p.m ? (JSON.parse(p.m) as Metrics) : null;
  } catch {
    m = null;
  }
  const period: Period = p.period ?? "7";

  if (!m) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6" style={{ paddingTop: insets.top }}>
        <Txt className="text-center text-t2">Разбор не открылся. Попробуй ещё раз.</Txt>
        <View className="mt-6 w-full"><Pill full kind="ghost" onPress={() => router.back()}>Закрыть</Pill></View>
      </View>
    );
  }

  const d = diagnose(m);
  const sign = d.change > 0 ? "+" : "";

  const share = async () => {
    const lines = [
      `${d.title} · охват ${sign}${d.change}%`,
      compared(period) + ".",
      "",
      d.why,
      "",
      "Что делать:",
      ...d.actions.map((a, i) => `${i + 1}. ${a}`),
      "",
      "Разобрал whydrop",
    ];
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {}
  };

  const drop = () => {
    if (!p.id) return;
    haptic("light");
    Alert.alert("Удалить разбор?", d.title, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          removeEntry(p.id as string)
            .then(() => {
              toast.success("Разбор удалён", { root: true });
              router.back();
            })
            .catch(() => {});
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between gap-3 px-4 pb-2 pt-2">
        <Txt className="flex-1 font-m800 text-[22px]">Разбор</Txt>
        <CloseButton onPress={() => router.back()} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="p-[18px]">
          <Txt
            className="font-m800"
            style={{ fontSize: 64, letterSpacing: -2, fontVariant: ["tabular-nums"], color: d.falling ? C.danger : C.ok }}
          >
            {sign}{d.change}%
          </Txt>
          <Txt className="mt-1 text-[13px] text-t3">
            {compared(period)}{p.at ? " · " + date(p.at) : ""}
          </Txt>
          <Txt className="mt-3 font-m700 text-[19px]">{d.title}</Txt>
          <Txt className="mt-1.5 text-[15px] leading-5 text-t2">{d.why}</Txt>
        </Card>

        <Card className="px-[18px] py-1.5">
          <Txt className="py-3 font-m700 text-[19px]">Что делать</Txt>
          {d.actions.map((a, i) => (
            <View key={a} className="flex-row items-start gap-3 py-3.5" style={{ borderTopWidth: 1, borderTopColor: C.line }}>
              <View className="h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ backgroundColor: C.cyan }}>
                <Txt className="font-m700 text-[15px]" style={{ color: C.onCyan }}>{i + 1}</Txt>
              </View>
              <Txt className="flex-1 text-[15px] leading-[21px]">{a}</Txt>
            </View>
          ))}
        </Card>

        <View>
          <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
            Цифры разбора
          </Txt>
          <View className="overflow-hidden rounded-card bg-card">
            {rows(period).map((r, i) => (
              <View key={r.key}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 }} /> : null}
                <View className="flex-row items-center justify-between gap-3 px-4 py-3">
                  <Txt className="flex-1 text-[15px] text-t2">{r.label}</Txt>
                  <Txt className="font-m700 text-[15px]" style={{ fontVariant: ["tabular-nums"] }}>
                    {spaced(String(m[r.key]))}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Pill full kind="ghost" onPress={share} icon={<Share2 size={18} color={C.t1} />}>Поделиться</Pill>
          {p.id ? (
            <Pill
              full
              kind="ghost"
              icon={<RotateCcw size={18} color={C.t1} />}
              onPress={() => {
                setDraft(m as Metrics);
                router.replace("/(tabs)");
              }}
            >
              Повторить с этими цифрами
            </Pill>
          ) : null}
          {p.id ? (
            <Pill full kind="ghost" onPress={drop} icon={<Trash2 size={18} color={C.danger} />}>
              <Txt className="font-m600 text-base text-danger">Удалить разбор</Txt>
            </Pill>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
