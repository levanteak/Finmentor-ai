# FinMentor Frontend

React 18 + Vite приложение.

## Требования

- Node.js 18+
- npm 9+

## Установка и запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`.

## Сборка для продакшна

```bash
npm run build
```

Результат в папке `dist/`.

## Стек

- **React 18** — UI
- **React Router v6** — маршрутизация
- **Axios** — HTTP клиент
- **Recharts** — графики финансовой статистики
- **Vite** — сборщик

## Страницы

| Путь | Страница | Описание |
|---|---|---|
| `/login` | Login | Вход в аккаунт |
| `/register` | Register | Регистрация |
| `/dashboard` | Dashboard | Главная с финансовой сводкой |
| `/documents` | Documents | Загрузка и анализ PDF (FinLens) |
| `/finance` | Finance | Трекер доходов и налогов (GigFinance) |
| `/chat` | Chat | AI советник (FutureMe) |

## Подключение к бэкенду

URL бэкенда задаётся в `src/api/client.js`. По умолчанию `http://localhost:8080`.
