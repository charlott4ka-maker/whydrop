// Добавление и изменение пункта. Один шит на оба случая: поля те же, меняются
// только заголовок, кнопка и наличие «Удалить».

import { useEffect, useState } from "react";
import { View } from "react-native";

import { haptic } from "../lib/haptics";
import { addItem, CATEGORIES, updateItem, type CategoryId, type Item } from "../lib/items";
import { Chip, Field, Pill, Sheet, Txt } from "./ui";

/** «Приложение само» значит, что срок не задан и мы смотрим на привычку. */
const EVERY: [number | undefined, string][] = [
  [undefined, "Приложение само"],
  [7, "Раз в неделю"],
  [30, "Раз в месяц"],
  [90, "Раз в 3 месяца"],
  [180, "Раз в полгода"],
  [365, "Раз в год"],
];

export function ItemSheet({
  item, onClose, onSaved, onDelete,
}: {
  /** "new" — создание, Item — изменение, null — закрыт */
  item: Item | "new" | null;
  onClose: () => void;
  onSaved: (items: Item[]) => void;
  onDelete?: (item: Item) => void;
}) {
  const isNew = item === "new";
  const current = item && item !== "new" ? item : null;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryId>("other");
  const [every, setEvery] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | false>(false);

  useEffect(() => {
    if (!item) return;
    setTitle(current?.title ?? "");
    setCategory(current?.category ?? "other");
    setEvery(current?.everyDays);
    setError(false);
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!title.trim()) {
      setError("Напиши, что это");
      haptic("error");
      return;
    }
    haptic("light");
    const p = current
      ? updateItem(current.id, { title: title.trim(), category, everyDays: every })
      : addItem(title, { category, everyDays: every });
    p.then(onSaved).catch(() => {});
    onClose();
  };

  return (
    <Sheet visible={item !== null} title={isNew ? "Что добавить" : "Изменить"} onClose={onClose}>
      <Field
        label="Что это"
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          if (error) setError(false);
        }}
        placeholder="Меняла линзы"
        autoCapitalize="sentences"
        autoFocus={isNew}
        error={error}
      />

      <Txt className="mb-2 font-m600 text-[13px] text-t2">Куда отнести</Txt>
      <View className="flex-row flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={category === c.id} onPress={() => setCategory(c.id)}>
            {c.title}
          </Chip>
        ))}
      </View>

      <Txt className="mb-2 mt-6 font-m600 text-[13px] text-t2">Как часто</Txt>
      <View className="flex-row flex-wrap gap-2">
        {EVERY.map(([days, label]) => (
          <Chip key={label} active={every === days} onPress={() => setEvery(days)}>
            {label}
          </Chip>
        ))}
      </View>
      <Txt className="mt-3 text-[13px] leading-[18px] text-t3">
        С «приложение само» срок не задаётся: после трёх отметок станет видно, как часто ты это делаешь на самом деле, и приложение начнёт считать по этому.
      </Txt>

      <View className="mt-6 gap-3">
        <Pill full onPress={save}>{isNew ? "Добавить" : "Сохранить"}</Pill>
        {current && onDelete ? (
          <Pill full kind="ghost" onPress={() => onDelete(current)}>
            <Txt className="font-m600 text-base text-danger">Удалить</Txt>
          </Pill>
        ) : null}
      </View>
    </Sheet>
  );
}
