// AsyncStorage это нативный модуль: в тестах подменяем официальной заглушкой,
// иначе любой импорт хранилища падает ещё до первой проверки.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
