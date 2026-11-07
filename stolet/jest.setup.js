// AsyncStorage это нативный модуль: в тестах подменяем официальной заглушкой,
// иначе любой импорт хранилища падает ещё до первой проверки.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Виджет это нативная цель: в тестах её нет и быть не должно. virtual, потому
// что пакет появляется только после установки, а проверки должны идти и до неё.
jest.mock(
  "@bacons/apple-targets",
  () => ({
    ExtensionStorage: class {
      set() {}
      static reloadWidget() {}
    },
  }),
  { virtual: true },
);
