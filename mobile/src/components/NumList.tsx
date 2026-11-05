// Форма разбора: одна карточка, строки «подпись слева, число справа», как в
// настройках iOS. Шесть отдельных плиток давали слишком много шума, а список
// читается сверху вниз и даёт клавиатуре естественную цепочку «Дальше».

import { useRef, useState } from "react";
import { InputAccessoryView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { C } from "../theme/tokens";
import { Txt } from "./ui";

const ACCESSORY = "numlist";
const PAD = 16;

/** 18420 -> "18 420": на глаз не ошибёшься порядком. */
export const spaced = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export type NumRow<K extends string> = { key: K; label: string; hint?: string };

export function NumList<K extends string>({
  rows, values, errors, onChange, onDone,
}: {
  rows: NumRow<K>[];
  values: Record<K, string>;
  errors: Partial<Record<K, string>>;
  onChange: (key: K, value: string) => void;
  /** последнее поле заполнено и пользователь нажал «Готово» */
  onDone?: () => void;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState(-1);

  const go = (i: number) => {
    if (i < 0 || i >= rows.length) return;
    inputs.current[i]?.focus();
  };
  const done = () => {
    inputs.current[focused]?.blur();
    onDone?.();
  };

  return (
    <>
      <View className="overflow-hidden rounded-card bg-card">
        {rows.map((r, i) => {
          const error = errors[r.key];
          const sub = error || r.hint;
          return (
            <View key={r.key}>
              {i > 0 ? (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: PAD }} />
              ) : null}
              <Pressable
                onPress={() => go(i)}
                accessibilityRole="none"
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: PAD, minHeight: 58, paddingVertical: 10, gap: 12 }}
              >
                <View className="flex-1">
                  <Txt className="text-[15px] leading-5">{r.label}</Txt>
                  {sub ? (
                    <Txt className="mt-1 text-[12.5px] leading-4" style={{ color: error ? C.danger : C.t3 }}>
                      {sub}
                    </Txt>
                  ) : null}
                </View>
                <TextInput
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={spaced(values[r.key])}
                  onChangeText={(v) => onChange(r.key, v.replace(/\D/g, ""))}
                  onFocus={() => setFocused(i)}
                  placeholder="—"
                  placeholderTextColor={C.hint}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  accessibilityLabel={r.label}
                  inputAccessoryViewID={Platform.OS === "ios" ? ACCESSORY : undefined}
                  className="font-m700 text-t1"
                  // только fontSize: междустрочный интервал уводит текст инпута вниз на iOS
                  style={{
                    fontSize: 19,
                    minWidth: 92,
                    textAlign: "right",
                    paddingVertical: 4,
                    fontVariant: ["tabular-nums"],
                    color: error ? C.danger : C.t1,
                  }}
                />
              </Pressable>
            </View>
          );
        })}
      </View>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={ACCESSORY}>
          <View
            className="flex-row items-center justify-between bg-card2 px-2"
            style={{ height: 44, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }}
          >
            <View className="flex-row">
              <Bar label="Назад" disabled={focused <= 0} onPress={() => go(focused - 1)} />
              <Bar label="Дальше" disabled={focused >= rows.length - 1} onPress={() => go(focused + 1)} />
            </View>
            <Bar label="Готово" bold onPress={done} />
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
}

function Bar({ label, onPress, disabled, bold }: { label: string; onPress: () => void; disabled?: boolean; bold?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ paddingHorizontal: 14, height: 44, justifyContent: "center", opacity: disabled ? 0.35 : 1 }}
    >
      <Txt className={`text-[16px] ${bold ? "font-m700" : "font-m500"}`} style={{ color: C.lime }}>
        {label}
      </Txt>
    </Pressable>
  );
}
