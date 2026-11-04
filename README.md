# whydrop

Приложение отвечает на один вопрос: почему упали охваты. Вводишь шесть цифр
или подтягиваешь их из Instagram, получаешь причину и два действия.

```
mobile/   Expo приложение (iOS)
api/      две функции на Vercel: обмен OAuth-кода на токен
```

## Запустить приложение

```bash
cd mobile
npm install
npx expo start
```

Без подключённого Instagram приложение работает целиком: форма, диагноз,
история, настройки. Для подключения аккаунта нужны шаги ниже.

## Подключить Instagram

Нужны три вещи, и порядок важен.

### 1. Профессиональный аккаунт

В Instagram: Настройки → Тип аккаунта → переключить на Business или Creator.
У личного аккаунта статистика через API закрыта совсем, это ограничение Meta,
а не приложения.

### 2. Приложение в Meta

На [developers.facebook.com](https://developers.facebook.com) создать приложение,
добавить продукт **Instagram** → «API setup with Instagram login».

- Записать **Instagram App ID** и **Instagram App Secret**
- В «Business login settings» прописать redirect URI:
  `https://<твой-домен>/api/instagram/callback`
- В тестовые пользователи («Instagram testers») добавить свой аккаунт и
  принять приглашение в самом Instagram

Пока нет App Review, подключиться смогут только аккаунты из списка тестовых.
Для публичного релиза нужно ревью на `instagram_business_basic` и
`instagram_business_manage_insights`.

### 3. Бэкенд на Vercel

```bash
vercel link
vercel env add IG_CLIENT_ID
vercel env add IG_CLIENT_SECRET
vercel deploy --prod
```

Переменные перечислены в `.env.example`. Дальше в `mobile/eas.json` подставить
адрес деплоя в `EXPO_PUBLIC_API_URL` для нужного профиля.

## Собрать сборку

```bash
cd mobile
npm run build:dev    # для устройства, с dev-клиентом
npm run build:ios    # production
```

Подключение Instagram открывает системный браузер и возвращается в приложение
по схеме `whydrop://auth`, поэтому в Expo Go оно не заработает: нужна сборка.

## Проверки

```bash
cd mobile
npm run typecheck
npm test
```
