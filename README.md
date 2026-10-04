# MoneyM: веб-сервис акционеров МКПАО «Яндекс»

Бэкенд на NestJS + TypeORM + PostgreSQL, файлы изображений и видео хранятся в MinIO.
Лабораторная работа №3: REST API для будущего SPA-фронтенда.

## Запуск

1. `docker compose up -d` (PostgreSQL на порту 5433, Adminer на 8080; MinIO запущен отдельным контейнером на 9000/9001)
2. `npm install`
3. `npm run migration:run`
4. `npm run start:dev` (сервер на http://localhost:3000)

Переменные окружения (`.env`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`, `MINIO_HOST`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_PUBLIC_HOST`.

## Описание таблиц БД

### Таблица пользователей (users)

Используется для хранения пользователей системы.

| Столбец | Тип | Модификаторы | Описание |
|---|---|---|---|
| id | INTEGER | PK | id пользователя |
| login | VARCHAR(64) | UNIQUE, NOT NULL | логин |
| password | VARCHAR(128) | NOT NULL | bcrypt-хэш пароля |
| is_admin | BOOLEAN | DEFAULT false | признак администратора |

### Таблица акционеров (shareholders)

Используется для хранения услуг системы: карточек акционеров со статусами черновик, опубликован, удалён.

| Столбец | Тип | Модификаторы | Описание |
|---|---|---|---|
| id | INTEGER | PK | id акционера |
| full_name | VARCHAR(255) | NOT NULL | название или ФИО |
| short_description | TEXT | NULL | краткое описание |
| status | ENUM (draft, published, deleted) | NOT NULL, DEFAULT draft | статус карточки, наружу не передаётся |
| image_url | VARCHAR | NULL | имя файла изображения в MinIO |
| video_url | VARCHAR | NULL | имя файла видео в MinIO |
| ownership_share | FLOAT | DEFAULT 0 | доля владения, % |
| preferred_share | FLOAT | DEFAULT 0 | доля привилегированных акций, % |
| created_at | TIMESTAMP | NOT NULL | дата создания |
| formed_at | TIMESTAMP | NULL | дата формирования (публикации) |
| completed_at | TIMESTAMP | NULL | дата завершения (удаления) |
| creator_id | INTEGER | FK (users.id), NOT NULL, RESTRICT | id создателя |
| moderator_id | INTEGER | FK (users.id), NULL, RESTRICT | id модератора |

### Таблица лайков (likes)

Используется для связи многие-ко-многим между пользователями и акционерами.

| Столбец | Тип | Модификаторы | Описание |
|---|---|---|---|
| id | INTEGER | PK | id лайка |
| user_id | INTEGER | FK (users.id), NOT NULL, RESTRICT | id пользователя |
| shareholder_id | INTEGER | FK (shareholders.id), NOT NULL, RESTRICT | id акционера |

Пара (user_id, shareholder_id) уникальна. Каскадное удаление не используется.

## Описание методов

Все адреса начинаются с `/api`. Текущий пользователь зафиксирован через singleton `CurrentUser.getInstance()` (id = 1), авторизация появится в лабораторной №4. Методы сгруппированы по домену url.

Карточка акционера (**Card**) всегда содержит один и тот же набор полей, пустые значения передаются как `null`:

`{ id: integer, fullName: string, shortDescription: string, imageUrl: string <URL>, videoUrl: string <URL>, ownershipShare: float, preferredShare: float, likesCount: integer, isMine: integer (0 или 1) }`

Статус, создатель, модератор и даты в ответе не передаются. Ошибки возвращаются только кодом статуса без тела.

### Домен /api/shareholders

| Название | Описание | Method | Path | Вход | Выход |
|---|---|---|---|---|---|
| list | Список опубликованных акционеров с фильтрацией | GET | /api/shareholders | query: `minShare: float` (необязательно) | 200, `[Card]` |
| feed | Первая карточка ленты | GET | /api/shareholders/feed | нет | 200, `Card`; 404, если опубликованных нет |
| feedById | Карточка по id или следующая по кругу | GET | /api/shareholders/feed/{id} | path: `id: integer`; query: `next: boolean` (необязательно) | 200, `Card`; 404 |
| draft | Черновик текущего пользователя (не более одного) | GET | /api/shareholders/draft | нет | 200, `Card`; 404, если черновика нет |
| create | Добавление акционера с файлами | POST | /api/shareholders | multipart/form-data: `fullName: string`, `image: file`, `video: file` | 201, `Card` (файлы в MinIO под именем UUID на латинице) |
| publish | Публикация черновика (draft в published) | PUT | /api/shareholders/{id}/publish | path: `id: integer`; JSON: `{ shortDescription: string, ownershipShare: float, preferredShare: float }` | 200, `Card`; 404; 403 |
| remove | Мягкое удаление своей записи | DELETE | /api/shareholders/{id} | path: `id: integer` | 200, тело пустое; 404; 403 |
| like | Поставить или снять лайк | POST | /api/shareholders/{id}/like | path: `id: integer`; JSON: `{ value: integer (0 или 1) }` | 200, тело пустое; 400 |

### Домен /api/users

| Название | Описание | Method | Path | Вход | Выход |
|---|---|---|---|---|---|
| register | Регистрация пользователя | POST | /api/users/register | JSON: `{ login: string, password: string (от 6 символов) }` | 201, `{ id: integer, login: string, isAdmin: boolean }`; 409, если логин занят |
| login | Аутентификация (заглушка для лабораторной №4) | POST | /api/users/login | нет | 200, тело пустое |
| logout | Деавторизация (заглушка для лабораторной №4) | POST | /api/users/logout | нет | 200, тело пустое |

## Бизнес-правила

- Переходы статусов: draft в published (publish), draft или published в deleted (remove). Возврат в draft запрещён.
- Записи в статусе deleted клиенту не передаются.
- У пользователя не более одного черновика.
- Системные поля (id, статус, создатель, модератор, даты) клиент менять не может: они вычисляются на бэкенде, лишние поля в теле запроса отсекает ValidationPipe (whitelist).
- Публиковать и удалять можно только свои записи.

## Страницы SSR из лабораторных №1-2

`/shareholders` (лента), `/shareholders/tiles` (плитка), `/shareholders/add` (добавление).