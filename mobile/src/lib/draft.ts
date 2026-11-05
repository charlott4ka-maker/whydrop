// Цифры, которые нужно подставить в форму при следующем показе экрана
// разбора: «повторить с этими цифрами» из сохранённой записи. Живёт в памяти
// одного запуска, на диск класть нечего.

import type { Metrics } from "./diagnose";

let draft: Metrics | null = null;

export const setDraft = (m: Metrics) => {
  draft = m;
};

/** Возвращает черновик один раз: второй вызов уже пустой. */
export const takeDraft = (): Metrics | null => {
  const d = draft;
  draft = null;
  return d;
};
