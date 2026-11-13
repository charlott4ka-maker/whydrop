// Стекло живёт только на плавающем слое: пилюли и круглые кнопки, под
// которыми проезжает список. На карточках его нет — под ними плоская чёрная
// страница, преломлять нечего, и стекло просто глушит карточку.

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { View, type ViewStyle } from "react-native";

import { LiquidGlass } from "../lib/liquidGlass";
import { Press } from "./Press";

/** Подложка: системное Liquid Glass на iOS 26, иначе наш блюр. */
export function GlassFill({ radius }: { radius: number }) {
  const [laidOut, setLaidOut] = useState(false);
  const fill: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, zIndex: -1 };
  if (LiquidGlass) {
    return (
      <View style={fill} onLayout={() => setLaidOut(true)} pointerEvents="none">
        {laidOut ? <LiquidGlass glassEffectStyle="regular" colorScheme="dark" style={{ flex: 1, borderRadius: radius }} /> : null}
      </View>
    );
  }
  return (
    <View style={fill} pointerEvents="none">
      <BlurView intensity={40} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.14)" }} />
      <LinearGradient
        colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </View>
  );
}

/** Стеклянная пилюля: профиль сверху слева, поиск и «…» сверху справа. */
export function GlassPill({
  children, onPress, label, px = 16, py = 10, gap = 8,
}: { children: React.ReactNode; onPress?: () => void; label: string; px?: number; py?: number; gap?: number }) {
  const body = (
    <>
      <GlassFill radius={999} />
      <View style={{ flexDirection: "row", alignItems: "center", gap }}>{children}</View>
    </>
  );
  const style: ViewStyle = {
    paddingHorizontal: px, paddingVertical: py, borderRadius: 999,
    overflow: "hidden", flexDirection: "row", alignItems: "center",
  };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Press onPress={onPress} scaleTo={0.94} accessibilityLabel={label} style={style}>
      {body}
    </Press>
  );
}

/** Круглая стеклянная кнопка: назад, правка, вид списка, архив. */
export function GlassRound({
  size = 44, onPress, label, children,
}: { size?: number; onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.9}
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
    >
      <GlassFill radius={size / 2} />
      {children}
    </Press>
  );
}
