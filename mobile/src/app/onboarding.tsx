// Three pages, flipped with a swipe (the dots and the button follow). Shown
// once: the flag lands in AsyncStorage and the root layout stops routing here.

import { useRef, useState } from "react";
import { Dimensions, type DimensionValue, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Pill, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import { setPref } from "../lib/prefs";
import { C } from "../theme/tokens";

const { width } = Dimensions.get("window");

const Tag = ({ children, kind }: { children: string; kind: "lime" | "cyan" | "mute" }) => (
  <View
    className="rounded-xl px-3 py-1.5"
    style={{ backgroundColor: kind === "lime" ? C.lime : kind === "cyan" ? C.cyan : C.card2 }}
  >
    <Txt
      className="font-m600 text-[13px]"
      style={{ color: kind === "mute" ? C.t2 : kind === "lime" ? C.onLime : C.onCyan, textDecorationLine: kind === "mute" ? "line-through" : "none" }}
    >
      {children}
    </Txt>
  </View>
);

const Bar = ({ w }: { w: DimensionValue }) => <View className="h-3.5 rounded-lg bg-card2" style={{ width: w }} />;

/** The falling line of the first page. */
function FallingLine() {
  return (
    <Svg width="100%" height={110} viewBox="0 0 300 110">
      <Path d="M0 95H300" stroke={C.card2} strokeWidth={2} strokeDasharray="4 6" />
      <Path d="M8 14 L70 30 L120 24 L190 70 L292 92" fill="none" stroke={C.danger} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const PAGES = [
  {
    title: "Пойми, почему упали охваты",
    sub: "Введи цифры или подтяни их из Instagram, получи точную причину.",
    art: (
      <>
        <View className="flex-row gap-2">
          <Tag kind="cyan">Охват за неделю</Tag>
          <Tag kind="lime">Причина найдена</Tag>
        </View>
        <Txt className="font-m800 text-danger" style={{ fontSize: 64, letterSpacing: -2 }}>−34%</Txt>
        <FallingLine />
      </>
    ),
  },
  {
    title: "Минута вместо форумов",
    sub: "Без статей из интернета. Короткая форма, понятная причина.",
    art: (
      <>
        <View className="flex-row flex-wrap gap-2">
          <Tag kind="mute">Форумы</Tag>
          <Tag kind="mute">Статьи</Tag>
          <Tag kind="cyan">Короткая форма</Tag>
        </View>
        <Txt className="font-m800" style={{ fontSize: 72, letterSpacing: -3 }}>1 мин</Txt>
        <View className="gap-2.5">
          <Bar w="90%" />
          <Bar w="70%" />
          <Bar w="80%" />
        </View>
      </>
    ),
  },
  {
    title: "Смотри историю",
    sub: "Разборы сохраняются на устройстве.",
    art: (
      <>
        <View className="self-start">
          <Tag kind="cyan">На этом устройстве</Tag>
        </View>
        {[
          ["Мало публикаций", "−34%", C.danger],
          ["Падения нет", "−3%", C.ok],
          ["Нет Reels", "−18%", C.danger],
        ].map(([label, value, color]) => (
          <View key={label as string} className="flex-row items-center justify-between rounded-[18px] bg-bg px-4 py-3.5">
            <Txt className="font-m600">{label as string}</Txt>
            <Txt className="font-m700" style={{ color: color as string }}>{value as string}</Txt>
          </View>
        ))}
      </>
    ),
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  // flipping the pref moves the gate in the root layout, which swaps this
  // screen for the tabs; navigating by hand would aim at a screen the gate
  // has not mounted yet
  const finish = () => {
    haptic("success");
    setPref("onboarded", true);
  };

  const next = () => {
    if (page === PAGES.length - 1) return finish();
    haptic("light");
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="h-11 flex-row items-center justify-end px-5">
        {page < PAGES.length - 1 ? (
          <Txt className="px-3 py-3 font-m600 text-t2" accessibilityRole="button" onPress={finish}>Пропустить</Txt>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={{ width }} className="px-5">
            <View>
              {/* мягкий лаймовый отсвет из-под карточки, как тень от экрана */}
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(200,255,74,0.16)", "rgba(200,255,74,0)"]}
                style={{ position: "absolute", left: 24, right: 24, bottom: -14, height: 56, borderRadius: 28 }}
              />
              <View className="h-[330px] justify-center gap-3.5 overflow-hidden rounded-[32px] bg-card p-[22px]">{p.art}</View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* полоса из трёх сегментов: видно не только где ты, но и сколько осталось */}
      <View className="flex-row gap-1.5 px-5 py-6">
        {PAGES.map((p, i) => (
          <View
            key={p.title}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: i <= page ? C.lime : C.card2 }}
          />
        ))}
      </View>

      <Animated.View key={page} entering={FadeIn.duration(220)} className="flex-1 px-5">
        <Txt className="font-m800 text-[34px]" style={{ letterSpacing: -1, lineHeight: 38 }}>{PAGES[page].title}</Txt>
        <Txt className="mt-3 text-[18px] leading-[25px] text-t2">{PAGES[page].sub}</Txt>
      </Animated.View>

      <View className="px-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pill full onPress={next}>{page === PAGES.length - 1 ? "Начать" : "Дальше"}</Pill>
      </View>
    </View>
  );
}
