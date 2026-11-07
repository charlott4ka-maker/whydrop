// Один тихий источник света на всё приложение. Нужен не для красоты: стекло
// это отношение между слоями, и на ровном чёрном оно превращается в серый.
// Лежит под всеми экранами, поэтому их фон прозрачный.

import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

import { C, hex } from "../theme/tokens";

export function Glow() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
      <LinearGradient
        colors={[hex(C.cyan, 0.1), hex(C.cyan, 0)]}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.2, y: 0.55 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
      />
    </View>
  );
}
