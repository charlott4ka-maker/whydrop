// Разбор: форма из шести чисел. Результат открывается полноэкранной модалкой
// поверх этого экрана, поэтому форма никуда не девается и к ней можно
// вернуться, ничего не вводя заново.

import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { Info, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstagramGlyph } from "../../components/InstagramGlyph";
import { NumList } from "../../components/NumList";
import { TabBarFade } from "../../components/TabBarFade";
import { TabHeader } from "../../components/TabHeader";
import { toast } from "../../components/Toast";
import { Card, Pill, Sheet, Txt } from "../../components/ui";
import { diagnose, type Metrics } from "../../lib/diagnose";
import { takeDraft } from "../../lib/draft";
import { haptic } from "../../lib/haptics";
import { addEntry } from "../../lib/history";
import { comparableFromApi, fetchMetrics, useAccount, type Account } from "../../lib/instagram";
import { rows, WORDS, type Key } from "../../lib/period";
import { getPrefs, usePrefs } from "../../lib/prefs";
import { C } from "../../theme/tokens";

type Form = Record<Key, string>;
const EMPTY: Form = { now: "", prev: "", posts: "", reels: "", likes: "", followers: "" };

export default function DiagnosisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const account = useAccount();

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [pulling, setPulling] = useState(false);
  const [help, setHelp] = useState(false);

  const scroller = useRef<ScrollView>(null);
  const listY = useRef(0);

  // подписи полей завязаны на период: сменился период — старые ошибки
  // относятся уже не к тем числам
  useEffect(() => setErrors({}), [prefs.period]);

  // «повторить с этими цифрами» из сохранённого разбора
  useFocusEffect(
    useCallback(() => {
      const d = takeDraft();
      if (!d) return;
      setForm({
        now: String(d.now), prev: String(d.prev), posts: String(d.posts),
        reels: String(d.reels), likes: String(d.likes), followers: String(d.followers),
      });
      setErrors({});
    }, []),
  );

  const open = (m: Metrics, source: "manual" | "instagram") => {
    const d = diagnose(m);
    haptic(d.falling ? "warning" : "success");
    if (getPrefs().saveHistory) addEntry(d, m, source, prefs.period).catch(() => {});
    router.push({ pathname: "/result", params: { m: JSON.stringify(m), period: prefs.period } });
  };

  const submit = () => {
    const next: Partial<Record<Key, string>> = {};
    for (const r of rows(prefs.period)) if (form[r.key] === "") next[r.key] = "Заполни это поле";
    if (!next.reels && !next.posts && +form.reels > +form.posts) next.reels = "Не больше, чем постов";
    if (!next.prev && +form.prev === 0) next.prev = "Без прошлого периода не с чем сравнивать";
    setErrors(next);
    if (Object.keys(next).length) {
      haptic("error");
      // первая ошибка может быть за пределами экрана: показываем список целиком
      scroller.current?.scrollTo({ y: Math.max(0, listY.current - 8), animated: true });
      return;
    }
    open(
      { now: +form.now, prev: +form.prev, posts: +form.posts, reels: +form.reels, likes: +form.likes, followers: +form.followers },
      "manual",
    );
  };

  const pull = async () => {
    setPulling(true);
    try {
      const m = await fetchMetrics(Number(prefs.period));
      // цифры остаются в форме: закрыв результат, человек видит, что подтянулось
      setForm({
        now: String(m.now), prev: String(m.prev), posts: String(m.posts),
        reels: String(m.reels), likes: String(m.likes), followers: String(m.followers),
      });
      setErrors({});
      open(m, "instagram");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось получить данные");
      haptic("error");
    } finally {
      setPulling(false);
    }
  };

  const shortPeriod = !comparableFromApi(Number(prefs.period));

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title="Разбор" />
      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {account ? (
          <Connected account={account} pulling={pulling} onPull={pull} warn={shortPeriod} />
        ) : (
          <Banner onPress={() => setHelp(true)} />
        )}

        <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
          <NumList
            rows={rows(prefs.period)}
            values={form}
            errors={errors}
            onChange={(key, v) => {
              setForm((f) => ({ ...f, [key]: v }));
              if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
            }}
            onDone={submit}
          />
        </View>

        <Pill full onPress={submit}>Узнать причину</Pill>
      </ScrollView>
      <TabBarFade />
      <HelpSheet visible={help} onClose={() => setHelp(false)} period={prefs.period} />
    </View>
  );
}

function Connected({ account, pulling, onPull, warn }: { account: Account; pulling: boolean; onPull: () => void; warn: boolean }) {
  return (
    <View className="gap-2">
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
      {warn ? (
        <Txt className="px-4 text-[13px] leading-[18px] text-t3">
          За месяц Instagram не отдаёт прошлый период: статистика хранится около 30 дней. Для подтягивания выбери неделю или 2 недели.
        </Txt>
      ) : null}
    </View>
  );
}

/** Где взять цифры, если аккаунт не подключён. Тап открывает инструкцию. */
function Banner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Откуда цифры, инструкция"
      className="flex-row items-start gap-3 rounded-card p-4"
      style={{ backgroundColor: "rgba(61,242,238,0.12)" }}
    >
      <View style={{ height: 22, justifyContent: "center" }}>
        <Info size={20} color={C.cyan} absoluteStrokeWidth strokeWidth={1.8} />
      </View>
      <View className="flex-1">
        <Txt className="font-m600 text-[17px] leading-[22px]">Откуда цифры</Txt>
        <Txt className="mt-1 text-[15px] leading-[19px] text-t2">
          Instagram, раздел Insights. Или подключи аккаунт.
        </Txt>
      </View>
    </Pressable>
  );
}

function HelpSheet({ visible, onClose, period }: { visible: boolean; onClose: () => void; period: "7" | "14" | "30" }) {
  const w = WORDS[period];
  const steps = [
    "Открой свой профиль в Instagram и нажми «Статистика» (Insights).",
    "Сверху выбери период «Последние " + (period === "7" ? "7 дней" : period === "14" ? "14 дней" : "30 дней") + "» и запиши «Охваченные аккаунты» — это охват за " + w.now + ".",
    "Переключи период на предыдущий такой же и запиши охват ещё раз: это второе поле.",
    "Посты, Reels, лайки и подписчиков видно в том же разделе.",
  ];
  return (
    <Sheet visible={visible} title="Откуда цифры" onClose={onClose}>
      <View className="gap-3.5">
        {steps.map((s, i) => (
          <View key={s} className="flex-row items-start gap-3">
            <View className="h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ backgroundColor: C.cyan }}>
              <Txt className="font-m700 text-[15px]" style={{ color: C.onCyan }}>{i + 1}</Txt>
            </View>
            <Txt className="flex-1 text-[15px] leading-[21px]">{s}</Txt>
          </View>
        ))}
        <Txt className="mt-2 text-[13px] leading-[18px] text-t3">
          Статистика есть только у профессиональных аккаунтов, Business или Creator. Переключить тип можно в настройках Instagram, это бесплатно и занимает минуту.
        </Txt>
      </View>
    </Sheet>
  );
}
