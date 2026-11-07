// Два шага: что это за приложение и с чего начать. Второй шаг заодно
// наполняет список, поэтому из приветствия человек выходит не в пустоту.

import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, Pill, Txt } from "../components/ui";
import { haptic } from "../lib/haptics";
import { addItem, CATEGORIES, type CategoryId } from "../lib/items";
import { setPref } from "../lib/prefs";
import { C } from "../theme/tokens";

/** Готовые пункты по категориям: тапнул — и список уже не пустой. */
const READY: Record<CategoryId, string[]> = {
  home: ["Стирала шторы", "Меняла фильтр в воде", "Мыла окна", "Меняла постель"],
  body: ["Была у стоматолога", "Сдавала анализы", "Была у врача", "Меняла линзы"],
  beauty: ["Стригла волосы", "Делала маску", "Красила корни", "Меняла зубную щётку"],
  stuff: ["Меняла щётки у машины", "Чистила ноутбук", "Меняла бритву", "Относила вещи в химчистку"],
  people: ["Звонила бабушке", "Писала подруге", "Виделась с родителями"],
  other: [],
};

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<{ title: string; category: CategoryId }[]>([]);

  const toggle = (title: string, category: CategoryId) => {
    haptic("select");
    setPicked((p) =>
      p.some((x) => x.title === title) ? p.filter((x) => x.title !== title) : [...p, { title, category }],
    );
  };

  const finish = async () => {
    haptic("success");
    // по одному, чтобы порядок в списке совпал с порядком выбора
    for (const p of picked) await addItem(p.title, { category: p.category }).catch(() => {});
    setPref("onboarded", true);
  };

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row gap-2 px-4 py-6">
        {[0, 1].map((i) => (
          <View key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= step ? C.lime : C.card2 }} />
        ))}
      </View>

      {step === 0 ? (
        <View className="flex-1 justify-center px-4">
          <Txt className="font-m800" style={{ fontSize: 34, letterSpacing: -1, lineHeight: 38 }}>
            Когда ты последний раз это делала?
          </Txt>
          <Txt className="mt-4 text-[18px] leading-[25px] text-t2">
            Приложение помнит за тебя. Не напоминалка и не трекер привычек: оно ничего не требует, а просто показывает, сколько прошло.
          </Txt>
          <Txt className="mt-6 text-[15px] leading-[21px] text-t3">
            Отметила — счётчик обнулился. Через три отметки приложение само поймёт, как часто ты это делаешь.
          </Txt>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 24 }}>
          <View>
            <Txt className="font-m800" style={{ fontSize: 34, letterSpacing: -1, lineHeight: 38 }}>
              С чего начнём
            </Txt>
            <Txt className="mt-3 text-[18px] leading-[25px] text-t2">
              Выбери, что тебе близко. Остальное добавишь потом.
            </Txt>
          </View>
          {CATEGORIES.filter((c) => READY[c.id].length).map((c) => (
            <View key={c.id}>
              <Txt className="mb-3 px-1 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>
                {c.title}
              </Txt>
              <View className="flex-row flex-wrap gap-2">
                {READY[c.id].map((t) => (
                  <Chip key={t} active={picked.some((x) => x.title === t)} onPress={() => toggle(t, c.id)}>
                    {t}
                  </Chip>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View className="gap-3 px-4" style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}>
        <Pill full onPress={step === 0 ? () => { haptic("light"); setStep(1); } : finish}>
          {step === 0 ? "Дальше" : picked.length ? `Добавить ${picked.length}` : "Начать с пустого списка"}
        </Pill>
      </View>
    </View>
  );
}
