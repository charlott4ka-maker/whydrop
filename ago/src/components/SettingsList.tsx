// Список настроек в манере Mononote: белый глиф, подпись, значение и шеврон.
// Цветных плиток здесь нет — это приём whydrop, а на чёрном плоские глифы
// читаются спокойнее. Разделитель начинается от подписи, как в iOS.
// Под группой — подсказка: 15, серая, одной строкой, где влезает.

import { ChevronRight, LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const PAD = 18;
const ICON = 22;
const GAP = 14;

export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View className="mb-5">
      {title ? <Txt className="mb-3 px-1 font-m600 text-[15px] text-t2">{title}</Txt> : null}
      <View className="overflow-hidden rounded-card bg-card">
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: PAD + ICON + GAP }} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? <Txt className="mt-3 px-1 text-[15px] leading-[20px] text-t2">{footer}</Txt> : null}
    </View>
  );
}

type CellProps = {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  /** Красная подпись, без шеврона (удалить всё). */
  destructive?: boolean;
  chevron?: boolean;
  right?: React.ReactNode;
};

export function SettingsCell({
  icon: Icon, label, value, onPress, toggle, destructive, right,
  chevron = !toggle && !destructive && !right,
}: CellProps) {
  const body = (
    <View className="flex-row items-center" style={{ paddingHorizontal: PAD, paddingVertical: 17 }}>
      <Icon
        size={ICON}
        color={destructive ? C.danger : C.t1}
        absoluteStrokeWidth
        strokeWidth={1.5}
        style={{ marginRight: GAP }}
      />
      <Txt numberOfLines={1} className={`flex-1 text-[17px] ${destructive ? "text-danger" : ""}`}>{label}</Txt>
      {value ? <Txt numberOfLines={1} className="ml-2 text-[17px] text-t2">{value}</Txt> : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          disabled={toggle.disabled}
          onValueChange={(v) => {
            haptic("select");
            toggle.onChange(v);
          }}
          style={{ marginLeft: 8 }}
        />
      ) : null}
      {chevron ? <ChevronRight size={18} color={C.t2} absoluteStrokeWidth strokeWidth={1.5} style={{ marginLeft: 6, opacity: 0.8 }} /> : null}
    </View>
  );
  if (!onPress || toggle) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" })}>
      {body}
    </Pressable>
  );
}
