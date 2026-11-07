/**
 * Виджет на домашний экран. По ресерчу конкурентов это наше главное отличие:
 * у лидера категории за виджет просят денег, и это главная претензия в его
 * отзывах. У нас он бесплатный и, более того, заменяет уведомления: человек
 * сам смотрит на растущее число, и приложение его не дёргает.
 */
module.exports = (config) => ({
  type: "widget",
  name: "Ago",
  icon: "../../assets/icon.png",
  colors: {
    $accent: "#C8FF4A",
    $background: "#0B0B0C",
  },
  entitlements: {
    "com.apple.security.application-groups": ["group.app.ago.ios"],
  },
});
