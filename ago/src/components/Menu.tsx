// Выпадающее меню — системное контекстное меню iOS, а не наша карточка:
// подпись слева, символ справа, строки по 52, разделители во всю ширину без
// отступа, фон за меню затемнён. Заблокированная строка гасится целиком.

import { BlurView } from "expo-blur";
import { Check, Lock, type LucideIcon } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

export const MENU_W = 264;

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  /** выбранный пункт: галочка справа */
  checked?: boolean;
  /** недоступно: строка гаснет целиком и получает замок */
  locked?: boolean;
  onPress?: () => void;
};

export function Menu({
  visible, onClose, items, anchor,
}: {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** откуда раскрывается: угол экрана, к которому меню прижато */
  anchor: { top?: number; bottom?: number; left?: number; right?: number };
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
      </Pressable>
      <View style={{ position: "absolute", width: MENU_W, borderRadius: 20, overflow: "hidden", ...anchor }}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(178,178,178,0.23)" }]} />
        {items.map((it, i) => {
          const Icon = it.icon;
          const dim = it.locked ? 0.4 : 1;
          return (
            <View key={it.label}>
              {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }} /> : null}
              <Pressable
                disabled={it.locked}
                onPress={() => {
                  haptic("select");
                  onClose();
                  it.onPress?.();
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent",
                })}
              >
                <Txt numberOfLines={1} className="text-[17px]" style={{ opacity: dim, flexShrink: 1 }}>
                  {it.label}
                </Txt>
                {it.locked ? (
                  <Lock size={20} color={C.t1} style={{ opacity: dim }} />
                ) : it.checked ? (
                  <Check size={20} color={C.lime} />
                ) : Icon ? (
                  <Icon size={20} color={C.t1} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </Modal>
  );
}
