// lucide dropped its brand icons, so the Instagram mark is drawn here: the
// rounded square, the lens and the dot, on lucide's own 24 grid with a stroke
// that matches, so it sits level with the other icons at any size.

import Svg, { Circle, Rect } from "react-native-svg";

export function InstagramGlyph({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={2} width={20} height={20} rx={5.5} stroke={color} strokeWidth={1.9} />
      <Circle cx={12} cy={12} r={4.2} stroke={color} strokeWidth={1.9} />
      <Circle cx={17.4} cy={6.6} r={1.2} fill={color} />
    </Svg>
  );
}
