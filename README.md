# MoneyM — сумма дивидендов акционеров МКПАО «Яндекс»

## Оглавление

1. [Запуск проекта](#1-запуск-проекта)
2. [База данных](#2-база-данных)
   - [2.1. users](#21-таблица-users)
   - [2.2. shareholders](#22-таблица-shareholders)
   - [2.3. likes](#23-таблица-likes)
   - [2.4. Связи](#24-связи-между-таблицами)
3. [Описание методов REST API](#3-описание-методов-rest-api)
   - [3.1. Общие правила](#31-общие-правила)
   - [3.2. Карточка акционера](#32-формат-карточки-акционера)
   - [3.3. Методы акционеров](#33-методы-акционеров)
   - [3.4. Методы пользователя](#34-методы-пользователя)
4. [Коллекция Postman](#4-коллекция-postman)
5. [Расхождения старого README и кода](#5-расхождения-старого-readme-и-кода)

## 1. Запуск проекта

1. Создать `.env` с параметрами подключения: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`, `MINIO_HOST`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_PUBLIC_HOST`, `REDIS_HOST`, `REDIS_PORT`. Локальные значения Redis: `REDIS_HOST=localhost`, `REDIS_PORT=6379`.
2. Запустить PostgreSQL, Adminer и Redis: `docker compose up -d`. PostgreSQL доступен на хост-порту `5433` (в контейнере `5432`), Adminer — на `8080`, Redis — на `6379`. Для подключения приложения с хоста используйте `DB_PORT=5433`.
3. Запустить MinIO отдельно: `docker-compose.yml` его не содержит. Приложение по умолчанию подключается к `localhost:9000`; порт консоли MinIO проектом не задаётся.
4. Установить зависимости: `npm install`.
5. Применить миграции: `npm run migration:run`.
6. Запустить приложение в режиме разработки: `npm run start:dev`. Порт по умолчанию — `3000`; его можно изменить параметром `PORT`. Swagger UI доступен по адресу `http://localhost:3000/api`.

Другие определённые npm-команды: `npm run build`, `npm start`, `npm run start:prod`, `npm test`, `npm run test:e2e`, `npm run lint`.

## 2. База данных

Таблицы создаются миграциями; автоматическая синхронизация TypeORM отключена. Типы ниже указаны для PostgreSQL после применения имеющихся миграций.

### 2.1. Таблица users

Хранит учётные записи пользователей.

| Столбец | Тип | Модификаторы | Описание |
|---|---|---|---|
| id | INTEGER | PK, NOT NULL, DEFAULT (генерируется) | Идентификатор пользователя |
| login | VARCHAR(64) | NOT NULL, UNIQUE | Логин |
| password | VARCHAR(128) | NOT NULL | Хеш пароля |
| is_admin | BOOLEAN | NOT NULL, DEFAULT false | Признак администратора |

### 2.2. Таблица shareholders

Хранит карточки акционеров, их статус и ссылки на медиафайлы.

| Столбец | Тип | Модификаторы | Описание |
|---|---|---|---|
| id | INTEGER | PK, NOT NULL, DEFAULT (генерируется) | Идентификатор карточки |
| full_name | VARCHAR(255) | NOT NULL | Имя акционера |
| short_description | TEXT | NULL | Краткое описание |
| status | ENUM ('draft', 'published', 'deleted') | NOT NULL, DEFAULT 'draft' | Статус карточки |
| image_url | VARCHAR (без ограничения длины) | NULL | Имя изображения в MinIO или URL |
| video_url | VARCHAR (без ограничения длины) | NULL | Имя видео в MinIO или URL |
| ownership_share | DOUBLE PRECISION | NOT NULL, DEFAULT 0 | Доля владения |
| preferred_share | DOUBLE PRECISION | NOT NULL, DEFAULT 0 | Доля привилегированных акций |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Время создания |
| formed_at | TIMESTAMP | NULL | Время публикации |
| creator_id | INTEGER | FK → users.id, NOT NULL | Создатель карточки |

### 2.3. Таблица likes

Хранит лайки пользователей карточкам; пара `user_id` и `shareholder_id` уникальна.

| Столбец | Тип | Модификаторы | Описание |
|---|---|---|---|
| id | INTEGER | PK, NOT NULL, DEFAULT (генерируется) | Идентификатор лайка |
| user_id | INTEGER | FK → users.id, NOT NULL, UNIQUE (user_id, shareholder_id) | Пользователь, поставивший лайк |
| shareholder_id | INTEGER | FK → shareholders.id, NOT NULL, UNIQUE (user_id, shareholder_id) | Карточка, которой поставлен лайк |

### 2.4. Связи между таблицами

- `users` 1 — 0..* `shareholders` по `shareholders.creator_id` (создатель).
- `users` 1 — 0..* `shareholders` по `shareholders.moderator_id` (необязательный модератор в entity; этой колонки нет в миграциях).
- `users` 1 — 0..* `likes` по `likes.user_id`.
- `shareholders` 1 — 0..* `likes` по `likes.shareholder_id`.
- Связь пользователей и карточек через `likes` — многие-ко-многим; одна и та же пара пользователя и карточки не может повторяться.

## 3. Описание методов REST API

### 3.1. Общие правила

База API — `/api`. Успешные ответы с данными возвращаются в JSON; для загрузки файлов используется `multipart/form-data`. Обработанные NestJS-ошибки (`HttpException`) возвращаются с HTTP-кодом и пустым телом. Прочие ошибки этим фильтром не преобразуются. В текущем коде нет расчёта или отдельного поля суммы дивидендов.

Аутентификация использует cookie `sessionId` и сессии в Redis с TTL один час. Закрытые методы акционеров требуют действующую cookie; список и лента доступны без авторизации. При запросе без сессии `isMine` равен `0`. HTML-страница черновика и действия HTML-форм также требуют сессию. Cookies читаются через cookie-parser; в production cookie помечается `Secure`.

### 3.2. Формат карточки акционера

Все методы, возвращающие карточку, используют следующую форму; пустые необязательные значения явно представлены `null`:

```json
{
  "id": 0,
  "fullName": "",
  "shortDescription": null,
  "imageUrl": null,
  "videoUrl": null,
  "ownershipShare": 0,
  "preferredShare": 0,
  "likesCount": 0,
  "isMine": 0
}
```

Типы полей: `{ id: number, fullName: string, shortDescription: string | null, imageUrl: string | null, videoUrl: string | null, ownershipShare: number, preferredShare: number, likesCount: number, isMine: number }`. `isMine` имеет значение `0` или `1`. Статус, создатель, модератор и даты в карточку не входят.

### 3.3. Методы акционеров

| № | Название | Описание | Method | Path | Вход | Выход |
|---|---|---|---|---|---|---|
| 1 | Список акционеров | Список опубликованных карточек; необязательный фильтр по минимальной доле владения | GET | `/api/shareholders` | query `{ minShare?: number }` | `200`: `Card[]` |
| 2 | Лента | Первая карточка, карточка по id или следующая по кругу. Оба варианта ленты — один метод | GET | `/api/shareholders/feed`, `/api/shareholders/feed/{id}` | path/query `{ id?: number, next?: string }`; для перехода к следующей карточке передать строку `next=true` | `200`: `Card`; `400`: неверный id; `404`: карточка не найдена или не опубликована |
| 3 | Черновик | Черновик текущего пользователя; требуется cookie сессии | GET | `/api/shareholders/draft` | cookie `{ sessionId: string }` | `200`: `Card`; `401`: нет действующей сессии; `404`: черновик не найден |
| 4 | Добавление акционера | Создание или обновление черновика; файлы сохраняются в MinIO; требуется cookie сессии | POST | `/api/shareholders` | cookie `{ sessionId: string }`; multipart `{ fullName: string, image?: file, video?: file }` | `201`: `Card`; `401`: нет действующей сессии |
| 5 | Публикация акционера | Публикация черновика с описанием и долями; требуется cookie сессии | PUT | `/api/shareholders/{id}/publish` | cookie `{ sessionId: string }`; path `{ id: number }`; JSON `{ shortDescription: string, ownershipShare: number, preferredShare: number }` | `200`: `Card`; `400`: неверный id или ошибка валидации; `401`: нет действующей сессии; `403`: чужая карточка; `404`: карточка не найдена или не черновик |
| 6 | Удаление акционера | Мягкое удаление своей карточки; требуется cookie сессии | DELETE | `/api/shareholders/{id}` | cookie `{ sessionId: string }`; path `{ id: number }` | `200`: пустое тело; `400`: неверный id или карточка уже удалена; `401`: нет действующей сессии; `403`: чужая карточка; `404`: карточка не найдена |
| 7 | Like | Поставить или снять лайк; требуется cookie сессии | POST | `/api/shareholders/{id}/like` | cookie `{ sessionId: string }`; path `{ id: number }`; JSON `{ value: 0 \| 1 }` | `200`: пустое тело; `400`: неверный id или недопустимое значение; `401`: нет действующей сессии |

### 3.4. Методы пользователя

| № | Название | Описание | Method | Path | Вход | Выход |
|---|---|---|---|---|---|---|
| 8 | Регистрация | Создание пользователя; пароль хешируется, новому пользователю назначается `isAdmin: false` | POST | `/api/users/register` | JSON `{ login: string, password: string }`; пароль — не короче 6 символов | `201`: пустое тело; `400`: ошибка валидации; `409`: логин занят |
| 9 | Аутентификация | Проверка логина и пароля, создание Redis-сессии и cookie `sessionId` | POST | `/api/users/login` | JSON `{ login: string, password: string }` | `200`: `{ login: string, isAdmin: boolean }` и `Set-Cookie`; `401`: неверные учётные данные |
| 10 | Деавторизация | Удаление Redis-сессии и очистка cookie | POST | `/api/users/logout` | cookie `{ sessionId?: string }` | `200`: пустое тело |

## 4. Коллекция Postman

Экспортированной коллекции в репозитории нет; 10 запросов: Список акционеров, Лента, Черновик, Добавление акционера, Публикация акционера, Удаление акционера, Like, Регистрация, Аутентификация, Деавторизация.

## 5. Расхождения старого README и кода

- Старый README указывал 8 методов акционеров, отдельно считая ленту без id и с id. В коде это один метод с двумя маршрутами; всего API содержит 10 методов: 7 методов акционеров и 3 метода пользователя.
- Старый README указывал `next` как boolean. Контроллер читает query-параметр как строку и проверяет точное значение `"true"`.
- В старом README было указано, что MinIO запускается отдельным контейнером на портах `9000/9001`. `docker-compose.yml` содержит только PostgreSQL и Adminer; MinIO должен быть запущен отдельно, а порт консоли здесь не задан.
- В старом README были описаны `moderator_id` и `completed_at` как существующие колонки. Они объявлены в `Shareholder` entity, но отсутствуют в имеющихся миграциях и, следовательно, не создаются этими миграциями.
- Старый README описывал `image_url` и `video_url` без длины и `ownership_share`/`preferred_share` как `FLOAT`. В entity и миграциях у `VARCHAR` для URL не задан предел длины, а PostgreSQL `float` без точности соответствует `DOUBLE PRECISION`.
- Старая таблица `shareholders` не указывала `DEFAULT now()` для `created_at`, присутствующий в миграции.
- Старый README утверждал, что методы login/logout — заглушки, а текущий пользователь фиксирован как `id = 1`. Теперь login/logout работают через Redis-сессии и cookie `sessionId`; закрытые API-методы акционеров используют id из сессии.
- В старом README не было настроек `REDIS_HOST`/`REDIS_PORT`, Redis в compose и Swagger UI. Они добавлены для сессионной авторизации и документации API.
- В старом README не было отмечено, что код не реализует расчёт и отдельное поле суммы дивидендов.
