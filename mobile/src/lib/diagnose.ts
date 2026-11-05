// The rule engine. Deliberately a short ladder of rules rather than a model:
// the user needs one cause and two things to do, not a ranked list.

export type Metrics = {
  /** reach over the chosen period */
  now: number;
  /** reach over the period before it */
  prev: number;
  posts: number;
  reels: number;
  /** average likes per post */
  likes: number;
  followers: number;
};

export type Diagnosis = {
  title: string;
  why: string;
  /** what to do, in order */
  actions: string[];
  /** reach change, per cent */
  change: number;
  /** a fall worth acting on, as opposed to noise */
  falling: boolean;
};

export function change(now: number, prev: number): number {
  if (!prev) return 0;
  return Math.round(((now - prev) / prev) * 100);
}

export function diagnose(m: Metrics): Diagnosis {
  const ch = change(m.now, m.prev);
  // likes per post as a share of the audience: the engagement the algorithm sees
  const er = m.followers ? (m.likes / m.followers) * 100 : 0;
  const falling = ch <= -5;

  let d: Omit<Diagnosis, "change" | "falling">;
  if (!m.prev) {
    // nothing to compare against: saying "no drop" here would be an answer,
    // and a wrong one, where the honest reply is that we cannot tell yet
    d = {
      title: "Не с чем сравнить",
      why: "За прошлый период нет данных об охвате, а разбор строится на сравнении двух периодов.",
      actions: [
        "Подожди, пока пройдёт ещё один такой же период.",
        "Или возьми период покороче в профиле: за неделю данные обычно уже есть.",
      ],
    };
  } else if (!falling) {
    d = {
      title: ch > 5 ? "Охват растёт" : "Падения нет",
      why: "Изменение в пределах нормальных колебаний. Рано делать выводы по одному периоду.",
      actions: ["Не меняй стратегию из-за одного периода.", "Сравни ещё два периода подряд."],
    };
  } else if (m.posts <= 2) {
    d = {
      title: "Мало публикаций",
      why: "Алгоритм реже показывает аккаунты с редкими постами.",
      actions: ["Вернись к 3 или 4 публикациям в неделю.", "Сделай один из постов Reels."],
    };
  } else if (m.reels === 0) {
    d = {
      title: "Нет Reels",
      why: "Без Reels контент почти не попадает к новой аудитории.",
      actions: ["Выпусти 2 Reels на этой неделе.", "Первые 3 секунды: сразу результат."],
    };
  } else if (er < 1) {
    d = {
      title: "Слабая вовлечённость",
      why: "Лайки на пост это " + er.toFixed(1) + "% от подписчиков. Алгоритм не расширяет показ.",
      actions: ["Заканчивай пост вопросом.", "Отвечай на комментарии в первые 30 минут."],
    };
  } else {
    d = {
      title: "Похоже на сезонность",
      why: "Критичных проблем в цифрах нет. Вероятно, сменился интерес аудитории.",
      actions: ["Сравни темы лучших постов.", "Верни тему, которая работала."],
    };
  }
  return { ...d, change: ch, falling };
}
