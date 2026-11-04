// The diagnosis. Either the form or its result, never both: once there is a
// result the form sits behind "Новая проверка", so the screen says one thing.

import { Image } from "expo-image";
import { RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstagramGlyph } from "../../components/InstagramGlyph";
import { NumField } from "../../components/NumField";
import { TabBarFade } from "../../components/TabBarFade";
import { TabHeader } from "../../components/TabHeader";
import { toast } from "../../components/Toast";
import { Card, Pill, Txt } from "../../components/ui";
import { diagnose, type Diagnosis, type Metrics } from "../../lib/diagnose";
import { haptic } from "../../lib/haptics";
import { addEntry } from "../../lib/history";
import { fetchMetrics, useAccount, type Account } from "../../lib/instagram";
import { getPrefs, usePrefs, type Period } from "../../lib/prefs";
import { C } from "../../theme/tokens";

type Key = keyof Metrics;
type Form = Record<Key, string>;

const EMPTY: Form = { now: "", prev: "", posts: "", reels: "", likes: "", followers: "" };

/** Period wording, so the labels say what the numbers cover. */
const WORDS: Record<Period, { now: string; prev: string }> = {
  "7": { now: "эту неделю", prev: "прошлую неделю" },
  "14": { now: "2 недели", prev: "прошлые 2 недели" },
  "30": { now: "месяц", prev: "прошлый месяц" },
};

function labels(period: Period): [Key, string, string?][] {
  const w = WORDS[period];
  return [
    ["now", "Охват за " + w.now],
    ["prev", "Охват за " + w.prev],
    ["posts", "Постов за " + w.now],
    ["reels", "Из них Reels", "Не больше, чем постов"],
    ["likes", "Лайков в среднем за пост"],
    ["followers", "Подписчиков"],
  ];
}

export default function DiagnosisScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const account = useAccount();

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [result, setResult] = useState<{ d: Diagnosis; m: Metrics } | null>(null);
  const [pulling, setPulling] = useState(false);

  const reset = () => {
    setResult(null);
    setForm(EMPTY);
    setErrors({});
  };

  const run = (m: Metrics, source: "manual" | "instagram") => {
    const d = diagnose(m);
    setResult({ d, m });
    haptic(d.falling ? "warning" : "success");
    if (getPrefs().saveHistory) addEntry(d, m, source).catch(() => {});
  };

  const submit = () => {
    const next: Partial<Record<Key, string>> = {};
    for (const [key] of labels(prefs.period)) if (form[key] === "") next[key] = "Заполни это поле";
    if (!next.reels && !next.posts && +form.reels > +form.posts) next.reels = "Не больше, чем постов";
    if (!next.prev && +form.prev === 0) next.prev = "Больше нуля";
    setErrors(next);
    if (Object.keys(next).length) return haptic("error");

    run(
      { now: +form.now, prev: +form.prev, posts: +form.posts, reels: +form.reels, likes: +form.likes, followers: +form.followers },
      "manual",
    );
  };

  const pull = async () => {
    setPulling(true);
    try {
      const m = await fetchMetrics(Number(prefs.period));
      setForm({
        now: String(m.now), prev: String(m.prev), posts: String(m.posts),
        reels: String(m.reels), likes: String(m.likes), followers: String(m.followers),
      });
      setErrors({});
      run(m, "instagram");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось получить данные");
      haptic("error");
    } finally {
      setPulling(false);
    }
  };

  const rows = labels(prefs.period);

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title="Диагноз" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {result ? (
          <Result d={result.d} onReset={reset} />
        ) : (
          <>
            {account ? <Connected account={account} pulling={pulling} onPull={pull} /> : <Banner />}

            <View className="gap-1">
              {[0, 2, 4].map((i) => (
                <View key={i} className="flex-row gap-3">
                  {rows.slice(i, i + 2).map(([key, label, hint]) => (
                    <NumField
                      key={key}
                      label={label}
                      hint={hint}
                      value={form[key]}
                      error={errors[key]}
                      onChange={(v) => {
                        setForm((f) => ({ ...f, [key]: v }));
                        if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>

            <Pill full onPress={submit}>Узнать диагноз</Pill>
          </>
        )}
      </ScrollView>
      <TabBarFade />
    </View>
  );
}

function Connected({ account, pulling, onPull }: { account: Account; pulling: boolean; onPull: () => void }) {
  return (
    <Card className="flex-row items-center gap-3 p-3.5">
      {account.avatar ? (
        <Image source={{ uri: account.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-full bg-card2">
          <InstagramGlyph size={20} color={C.t2} />
        </View>
      )}
      <View className="flex-1">
        <Txt numberOfLines={1} className="font-m700">@{account.username}</Txt>
        <Txt className="mt-0.5 text-[13px] text-t2">Цифры подтянутся сами</Txt>
      </View>
      <Pill size="sm" loading={pulling} onPress={onPull} icon={<RefreshCw size={16} color={C.onLime} />}>
        Подтянуть
      </Pill>
    </Card>
  );
}

/** Where the numbers live, for people filling the form in by hand. */
function Banner() {
  return (
    <View className="overflow-hidden rounded-card p-5" style={{ backgroundColor: C.card }}>
      <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ backgroundColor: "rgba(200,255,74,0.08)" }} />
      <Txt className="font-m700 text-[19px]">Где взять цифры</Txt>
      <Txt className="mt-1.5 text-[14.5px] leading-5 text-t2">
        Статистика в Instagram, раздел Insights. Или подключи аккаунт в профиле, и заполнять руками не придётся.
      </Txt>
    </View>
  );
}

function Result({ d, onReset }: { d: Diagnosis; onReset: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(260)} className="gap-4">
      <Card className="p-[18px]">
        <Txt className="font-m800" style={{ fontSize: 64, letterSpacing: -2, color: d.falling ? C.danger : C.ok }}>
          {d.change > 0 ? "+" : ""}{d.change}%
        </Txt>
        <Txt className="mt-1.5 font-m700 text-[19px]">{d.title}</Txt>
        <Txt className="mt-1.5 text-[14.5px] leading-5 text-t2">{d.why}</Txt>
      </Card>

      <Card className="px-[18px] py-1.5">
        <Txt className="py-3 font-m700 text-[19px]">Что делать</Txt>
        {d.actions.map((a, i) => (
          <View key={a} className="flex-row items-start gap-3 py-3.5" style={{ borderTopWidth: 1, borderTopColor: C.line }}>
            <View className="h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ backgroundColor: C.cyan }}>
              <Txt className="font-m700 text-[14px]" style={{ color: C.onCyan }}>{i + 1}</Txt>
            </View>
            <Txt className="flex-1 text-[15px] leading-[21px]">{a}</Txt>
          </View>
        ))}
      </Card>

      <Pill full kind="ghost" onPress={onReset}>Новая проверка</Pill>
    </Animated.View>
  );
}
