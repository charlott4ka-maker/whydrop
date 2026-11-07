// Число, которое отсчитывается, а не перескакивает. Нужно ровно в одном
// месте: когда отмечаешь, счётчик едет к нулю, и это единственная награда,
// которую приложение себе позволяет. Вверх меняется сразу: там анимировать
// нечего, данные просто подгрузились.

import { useEffect, useRef, useState } from "react";

import { Txt } from "./ui";

const MS = 420;
/** плавное торможение к концу */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function Counter({ value, style, className }: { value: number; style?: object; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    clearInterval(timer.current);
    if (value >= from.current) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = Date.now();
    const a = from.current;
    from.current = value;
    timer.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / MS);
      setShown(Math.round(a + (value - a) * ease(t)));
      if (t === 1) clearInterval(timer.current);
    }, 16);
    return () => clearInterval(timer.current);
  }, [value]);

  return (
    <Txt className={className} style={style}>
      {shown}
    </Txt>
  );
}
