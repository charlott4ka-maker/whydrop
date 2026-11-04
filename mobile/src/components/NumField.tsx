// A number the user types: a small label over a big bold figure, in a card.
// Two of these sit side by side, so the label gets two lines of room and the
// error line is always there (the grid must not jump when one appears).

import { TextInput, View } from "react-native";

import { C } from "../theme/tokens";
import { Txt } from "./ui";

export function NumField({
  label, value, onChange, error, hint, autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  /** stands in for the error line while there is no error */
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <View className="flex-1">
      <View
        className="rounded-[20px] bg-card px-4 py-3.5"
        style={{ borderWidth: 2, borderColor: error ? C.danger : "transparent" }}
      >
        <Txt numberOfLines={2} className="font-m600 text-[13px] text-t2" style={{ minHeight: 34 }}>{label}</Txt>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/\D/g, ""))}
          placeholder="0"
          placeholderTextColor={C.hint}
          keyboardType="number-pad"
          inputMode="numeric"
          autoFocus={autoFocus}
          className="font-m800 text-t1"
          // fontSize only: a line height pushes iOS input text down
          style={{ fontSize: 30, paddingVertical: 2 }}
        />
      </View>
      <Txt numberOfLines={1} className="mt-1 px-1 font-m600 text-[12px]" style={{ minHeight: 16, color: error ? C.danger : C.t3 }}>
        {error || hint || ""}
      </Txt>
    </View>
  );
}
