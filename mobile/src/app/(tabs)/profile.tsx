// Профиль: подключённый аккаунт сверху, настройки под ним. Подключение
// необязательно: статистика через API есть только у Business и Creator, так что
// ручная форма остаётся полноценным путём, а не запасным.

import Constants from "expo-constants";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, BookOpen, ChevronRight, Flame, Lock, Save, Trash2, Vibrate } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstagramGlyph } from "../../components/InstagramGlyph";
import { SettingsCell, SettingsGroup } from "../../components/SettingsList";
import { TabBarFade } from "../../components/TabBarFade";
import { TabHeader } from "../../components/TabHeader";
import { toast } from "../../components/Toast";
import { Card, Pill, Segmented, Sheet, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import { clearHistory, readHistory, type Entry } from "../../lib/history";
import { comparableFromApi, connect, disconnect, useAccount } from "../../lib/instagram";
import { PERIODS } from "../../lib/period";
import { setPref, usePrefs } from "../../lib/prefs";
import { streak, weeksWord } from "../../lib/streak";
import { C } from "../../theme/tokens";

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const account = useAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [items, setItems] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      readHistory().then(setItems).catch(() => {});
    }, []),
  );
  const s = streak(items);

  const onConnect = async () => {
    setBusy(true);
    try {
      const acc = await connect();
      if (acc) {
        haptic("success");
        toast.success("Instagram подключён");
      }
    } catch (e) {
      haptic("error");
      toast.error(e instanceof Error ? e.message : "Не удалось подключить");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = () => {
    Alert.alert("Отключить Instagram?", "Цифры снова придётся вводить руками.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Отключить",
        style: "destructive",
        onPress: () => {
          disconnect().catch(() => {});
          haptic("warning");
          toast.info("Instagram отключён");
        },
      },
    ]);
  };

  const onClearHistory = () => {
    Alert.alert("Очистить историю?", "Все сохранённые разборы будут удалены. Отменить это нельзя.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Очистить",
        style: "destructive",
        onPress: () => {
          clearHistory().catch(() => {});
          haptic("warning");
          toast.success("История очищена");
        },
      },
    ]);
  };

  const replayIntro = () => {
    haptic("light");
    setPref("onboarded", false);
  };

  const apiPeriodWarning = account && !comparableFromApi(Number(prefs.period));

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title="Профиль" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}>
        {account ? (
          <Card className="mb-8 items-center p-6">
            {account.avatar ? (
              <Image source={{ uri: account.avatar }} style={{ width: 88, height: 88, borderRadius: 44 }} />
            ) : (
              <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-card2">
                <InstagramGlyph size={34} color={C.t2} />
              </View>
            )}
            <Txt numberOfLines={1} className="mt-4 font-m800 text-[22px]">@{account.username}</Txt>
            <Txt className="mt-1 text-[15px] text-t2" style={{ fontVariant: ["tabular-nums"] }}>
              {account.followers.toLocaleString("ru-RU")} подписчиков
            </Txt>
            <View className="mt-5 w-full">
              <Pill full kind="ghost" onPress={onDisconnect}>Отключить</Pill>
            </View>
          </Card>
        ) : (
          <Card className="mb-8 items-center p-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-card2">
              <InstagramGlyph size={34} color={C.t1} />
            </View>
            <Txt className="mt-4 text-center font-m700 text-[19px]">Подключи Instagram</Txt>
            <Txt className="mt-1.5 max-w-[300px] text-center text-[15px] leading-5 text-t2">
              Охват, посты и подписчики подтянутся сами. Нужен профессиональный аккаунт, Business или Creator: у личного аккаунта статистика через Instagram закрыта.
            </Txt>
            <View className="mt-5 w-full">
              <Pill full loading={busy} onPress={onConnect} icon={<InstagramGlyph size={18} color={C.onLime} />}>
                Подключить
              </Pill>
            </View>
          </Card>
        )}

        <View className="mb-8">
          <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
            Период по умолчанию
          </Txt>
          <Segmented options={PERIODS} value={prefs.period} onChange={(p) => setPref("period", p)} neutral fill={C.card} />
          <Txt className="mt-3 px-4 text-[13px] leading-[18px] text-t3">
            Сколько дней сравнивает разбор: выбранный период против такого же перед ним.
          </Txt>
          {apiPeriodWarning ? (
            <Txt className="mt-2 px-4 text-[13px] leading-[18px]" style={{ color: C.danger }}>
              За месяц Instagram не отдаёт прошлый период: статистика хранится около 30 дней. Кнопка «Подтянуть» вернёт нули в прошлом охвате.
            </Txt>
          ) : null}
        </View>

        <Card className="mb-8 flex-row items-center gap-3 p-4" onPress={() => router.push("/streak")}>
          <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(200,255,74,0.16)" }}>
            <Flame size={20} color={C.lime} absoluteStrokeWidth strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Txt className="font-m600 text-[15px]">Серия</Txt>
            <Txt className="mt-0.5 text-[13px] text-t2">
              {s.current > 0 ? `${s.current} ${weeksWord(s.current)} подряд` : "Начнётся с первого разбора"}
            </Txt>
          </View>
          <ChevronRight size={20} color={C.t3} />
        </Card>

        <SettingsGroup title="Разборы">
          <SettingsCell icon={BarChart3} tint="#3DF2EE" label="Аналитика" onPress={() => router.push("/analytics")} />
        </SettingsGroup>

        <SettingsGroup title="Приложение">
          <SettingsCell
            icon={Save}
            tint="#5468F0"
            label="Сохранять историю"
            toggle={{ value: prefs.saveHistory, onChange: (v) => setPref("saveHistory", v) }}
          />
          <SettingsCell
            icon={Vibrate}
            tint="#636366"
            label="Вибрация"
            toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }}
          />
          <SettingsCell icon={Trash2} tint="#FF5A6E" label="Очистить историю" destructive onPress={onClearHistory} />
        </SettingsGroup>

        <SettingsGroup title="О приложении" footer={"whydrop " + VERSION}>
          <SettingsCell icon={BookOpen} tint="#3DF2EE" label="Как это работает" onPress={replayIntro} />
          <SettingsCell icon={Lock} tint="#636366" label="Конфиденциальность" onPress={() => setPrivacy(true)} />
        </SettingsGroup>
      </ScrollView>
      <TabBarFade />
      <PrivacySheet visible={privacy} onClose={() => setPrivacy(false)} />
    </View>
  );
}

function PrivacySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const blocks: [string, string][] = [
    ["Что хранится на телефоне", "Разборы, настройки и токен Instagram лежат только на этом устройстве. Токен в защищённом хранилище системы, остальное в памяти приложения."],
    ["Что уходит наружу", "Только запросы к Instagram за твоей же статистикой и один запрос к нашему серверу в момент подключения: он нужен, чтобы обменять код авторизации на токен, и ничего не сохраняет."],
    ["Чего мы не делаем", "Не собираем аналитику, не показываем рекламу, не передаём данные третьим лицам и не видим твои цифры: они не покидают телефон."],
    ["Как всё удалить", "«Очистить историю» стирает разборы, «Отключить» удаляет токен. Удаление приложения уносит всё остальное."],
  ];
  return (
    <Sheet visible={visible} title="Конфиденциальность" onClose={onClose}>
      <View className="gap-5">
        {blocks.map(([t, b]) => (
          <View key={t}>
            <Txt className="font-m700 text-[16px]">{t}</Txt>
            <Txt className="mt-1.5 text-[15px] leading-5 text-t2">{b}</Txt>
          </View>
        ))}
      </View>
    </Sheet>
  );
}
