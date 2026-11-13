// Картинка вверху экрана. Верхний край у неё чёрный, поэтому со страницей она
// стыкуется без шва, а нижний растворяется градиентом в тот же чёрный —
// резкой границы не остаётся.

import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View } from "react-native";

export function Banner({ source, height = 220 }: { source: ImageSource; height?: number }) {
  return (
    <View style={{ height, width: "100%" }}>
      <Image source={source} style={{ width: "100%", height }} contentFit="cover" />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "#000000"]}
        locations={[0.48, 0.76, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height }}
      />
    </View>
  );
}
