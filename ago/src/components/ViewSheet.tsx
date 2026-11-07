// Как показывать список. Один шит на всё: вид, группировка и порядок — три
// вопроса об одном и том же, и разносить их по разным кнопкам незачем.

import { View } from "react-native";

import { haptic } from "../lib/haptics";
import { setPref, usePrefs, type Sort, type View as ViewKind } from "../lib/prefs";
import { Chip, Sheet, Txt } from "./ui";

const VIEWS: [ViewKind, string][] = [
  ["big", "Крупно"],
  ["rows", "Строками"],
  ["tiles", "Плитками"],
];

const SORTS: [Sort, string][] = [
  ["recent", "Сначала давнее"],
  ["due", "Скоро пора"],
  ["alpha", "По алфавиту"],
];

export function ViewSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const prefs = usePrefs();

  return (
    <Sheet visible={visible} title="Вид" onClose={onClose}>
      <Txt className="mb-2 font-m600 text-[13px] text-t2">Как показывать</Txt>
      <View className="flex-row flex-wrap gap-2">
        {VIEWS.map(([v, label]) => (
          <Chip key={v} active={prefs.view === v} onPress={() => { haptic("select"); setPref("view", v); }}>
            {label}
          </Chip>
        ))}
      </View>

      <Txt className="mb-2 mt-6 font-m600 text-[13px] text-t2">Порядок</Txt>
      <View className="flex-row flex-wrap gap-2">
        {SORTS.map(([s, label]) => (
          <Chip key={s} active={prefs.sort === s} onPress={() => { haptic("select"); setPref("sort", s); }}>
            {label}
          </Chip>
        ))}
      </View>

      <Txt className="mb-2 mt-6 font-m600 text-[13px] text-t2">Группировка</Txt>
      <View className="flex-row flex-wrap gap-2">
        <Chip active={!prefs.group} onPress={() => { haptic("select"); setPref("group", false); }}>Одним списком</Chip>
        <Chip active={prefs.group} onPress={() => { haptic("select"); setPref("group", true); }}>По категориям</Chip>
      </View>

      <Txt className="mt-6 text-[13px] leading-[18px] text-t3">
        «Скоро пора» ставит наверх то, до чего остаётся меньше всего времени по сроку. Пункты без срока уходят в конец: торопиться с ними некуда.
      </Txt>
    </Sheet>
  );
}
