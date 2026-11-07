// Заглушка типов, чтобы проект проверялся до установки пакета.
// После `npm install` её можно удалить: у @bacons/apple-targets свои типы.
declare module "@bacons/apple-targets" {
  export class ExtensionStorage {
    constructor(appGroup: string);
    set(key: string, value: string | null): void;
    static reloadWidget(name?: string): void;
  }
}
