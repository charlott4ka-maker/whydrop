// app.json как есть, плюс одно: плагин виджета подключается, только если он
// реально установлен. Виджету нужен нативный проект, которого в Expo Go нет,
// а неразрешившийся плагин роняет не сборку, а сам запуск — `expo start`
// падает ещё до бандла. Так тестовый запуск через Expo Go переживает
// отсутствие модуля, а нативная сборка получает плагин как раньше.

const OPTIONAL = ["@bacons/apple-targets"];

module.exports = ({ config }) => {
  const plugins = (config.plugins ?? []).filter((p) => {
    const name = Array.isArray(p) ? p[0] : p;
    if (!OPTIONAL.includes(name)) return true;
    try {
      require.resolve(name);
      return true;
    } catch {
      return false;
    }
  });
  return { ...config, plugins };
};
