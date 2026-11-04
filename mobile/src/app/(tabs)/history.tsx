// Every diagnosis that was kept, newest first. Nothing here ever left the
// phone, which is why the list says so rather than offering a sync.

import { useFocusEffect, useRouter } from "expo-router";
import { Clock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstagramGlyph } from "../../components/InstagramGlyph";
import { TabBarFade } from "../../components/TabBarFade";
import { TabHeader } from "../../components/TabHeader";
import { Card, Empty, Pill, Txt } from "../../components/ui";
import { haptic } from "../../lib/haptics";
import { readHistory, removeEntry, type Entry } from "../../lib/history";
import { C } from "../../theme/tokens";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Entry[] | null>(null);

  // a diagnosis made on the other tab should be here when this one comes up
  useFocusEffect(
    useCallback(() => {
      readHistory().then(setItems).catch(() => setItems([]));
    }, []),
  );

  const confirmRemove = (e: Entry) => {
    haptic("light");
    Alert.alert("Удалить диагноз?", e.title, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => removeEntry(e.id).then(setItems).catch(() => {}),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title="История" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 10 }}
      >
        {items === null ? null : items.length === 0 ? (
          <View className="pt-10">
            <Empty
              icon={Clock}
              title="Пока нет истории"
              sub="Появится после первого диагноза."
              action={<Pill onPress={() => router.navigate("/(tabs)")}>Поставить диагноз</Pill>}
            />
          </View>
        ) : (
          <>
            <Txt className="px-1 pb-1 text-[14px] text-t2">Сохранённые диагнозы. Данные остаются на этом устройстве.</Txt>
            {items.map((e) => (
              <Card key={e.id} className="flex-row items-center gap-3 p-4" onPress={() => confirmRemove(e)}>
                <View className="flex-1">
                  <Txt numberOfLines={1} className="font-m700">{e.title}</Txt>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    {e.source === "instagram" ? <InstagramGlyph size={13} color={C.t3} /> : null}
                    <Txt className="text-[13.5px] text-t2">
                      {when(e.at)} · охват {e.reach.toLocaleString("ru-RU")}
                    </Txt>
                  </View>
                </View>
                <View
                  className="rounded-xl px-2.5 py-1.5"
                  style={{ backgroundColor: e.change <= -5 ? "rgba(255,90,110,0.16)" : "rgba(79,224,160,0.16)" }}
                >
                  <Txt className="font-m700 text-[14px]" style={{ color: e.change <= -5 ? C.danger : C.ok }}>
                    {e.change > 0 ? "+" : ""}{e.change}%
                  </Txt>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      <TabBarFade />
    </View>
  );
}
