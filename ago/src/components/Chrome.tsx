// Управление живёт по углам, а не в таб-баре: профиль слева сверху, поиск и
// «…» справа, снизу плавающая строка — вид списка, добавить, архив. Список
// от этого получает весь экран, а стекло получает то, что под ним проезжает.

import { ChevronDown, ChevronLeft, User } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../theme/tokens";
import { GlassPill, GlassRound } from "./Glass";
import { Txt } from "./ui";

/** Верхняя строка главного экрана. */
export function TopChrome({
  profile, onProfile, actions,
}: { profile: string; onProfile: () => void; actions: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ position: "absolute", top: insets.top + 2, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}
    >
      <GlassPill label="Профиль" onPress={onProfile} px={14} py={9}>
        <User size={18} color={C.t1} absoluteStrokeWidth strokeWidth={1.5} />
        <Txt className="font-m600 text-[17px]">{profile}</Txt>
        <ChevronDown size={16} color={C.t2} absoluteStrokeWidth strokeWidth={1.5} />
      </GlassPill>
      <GlassPill label="Ещё" px={16} py={10} gap={18}>
        {actions}
      </GlassPill>
    </View>
  );
}

/** Нижняя плавающая строка: слева вид, по центру действие, справа архив. */
export function BottomBar({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}
    >
      {left}
      {center}
      {right}
    </View>
  );
}

/** Шапка экрана, открытого поверх: кнопка назад, заголовок, действие справа. */
export function NavBar({
  title, onBack, right,
}: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ position: "absolute", top: insets.top + 2, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}
    >
      <GlassRound size={40} onPress={onBack} label="Назад">
        <ChevronLeft size={20} color={C.t1} absoluteStrokeWidth strokeWidth={1.5} />
      </GlassRound>
      <Txt className="font-m600 text-[17px]">{title}</Txt>
      <View style={{ width: 40, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
