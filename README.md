# MoneyM: веб-сервис акционеров МКПАО «Яндекс»

Бэкенд на NestJS + TypeORM + PostgreSQL, файлы изображений и видео хранятся в MinIO.
Лабораторная работа №3: REST API для будущего SPA-фронтенда.

## Запуск

1. `docker compose up -d` (PostgreSQL на порту 5433, Adminer на 8080; MinIO запущен отдельным контейнером на 9000/9001)
2. `npm install`
3. `npm run migration:run`
4. `npm run start:dev` (сервер на http://localhost:3000)

Переменные окружения (`.env`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`, `MINIO_HOST`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_PUBLIC_HOST`.

## Таблицы БД

### users

| Поле | Тип | Описание |
|---|---|---|
| id | serial, PK | идентификатор |
| login | varchar(64), unique | логин |
| password | varchar(128) | bcrypt-хэш пароля |
| is_admin | boolean, по умолчанию false | признак администратора |

### shareholders (услуги)

| Поле | Тип | Описание |
|---|---|---|
| id | serial, PK | идентификатор |
| full_name | varchar(255) | название / ФИО акционера |
| short_description | text, nullable | краткое описание |
| status | enum: draft, published, deleted | статус карточки |
| image_url | varchar, nullable | имя файла изображения в MinIO |
| video_url | varchar, nullable | имя файла видео в MinIO |
| ownership_share | float | доля владения, % |
| preferred_share | float | доля привилегированных акций, % |
| created_at | timestamp | дата создания |
| formed_at | timestamp, nullable | дата формирования (публикации) |
| completed_at | timestamp, nullable | дата завершения (удаления) |
| creator_id | integer, FK на users.id, RESTRICT | создатель |
| moderator_id | integer, FK на users.id, RESTRICT, nullable | модератор |

### likes (связь многие-ко-многим пользователь и акционер)

| Поле | Тип | Описание |
|---|---|---|
| id | serial, PK | идентификатор |
| user_id | integer, FK на users.id, RESTRICT | пользователь |
| shareholder_id | integer, FK на shareholders.id, RESTRICT | акционер |

Пара (user_id, shareholder_id) уникальна. Каскадное удаление не используется.

## HTTP-методы

Все адреса начинаются с `/api`. Текущий пользователь зафиксирован через singleton `CurrentUser.getInstance()` (id = 1), авторизация появится в лабораторной №4.

### Домен shareholders

| Метод | Адрес | Вход | Выход |
|---|---|---|---|
| GET | /api/shareholders | query: `minShare` (необязательно) | массив опубликованных карточек: id, fullName, shortDescription, status, imageUrl, videoUrl, ownershipShare, preferredShare, likesCount, isMine (0/1) |
| GET | /api/shareholders/feed | query: `afterId` (необязательно) | одна карточка; без afterId первая опубликованная, с afterId следующая по кругу |
| GET | /api/shareholders/draft | нет | черновик текущего пользователя (не более одного), пустой ответ если его нет |
| POST | /api/shareholders | multipart/form-data: `fullName` (текст), `image` (файл), `video` (файл) | созданный или обновлённый черновик; файлы сохраняются в MinIO под именем-UUID на латинице, имена пишутся в БД |
| PUT | /api/shareholders/:id/publish | JSON: `shortDescription`, `ownershipShare`, `preferredShare` | опубликованная карточка (draft в published) |
| DELETE | /api/shareholders/:id | нет | `{"success": true}`; мягкое удаление (status = deleted, заполняется completed_at), только свои записи |
| POST | /api/shareholders/:id/like | JSON: `value` (0 снимает лайк, 1 ставит) | `{"success": true}` |

### Домен users

| Метод | Адрес | Вход | Выход |
|---|---|---|---|
| POST | /api/users/register | JSON: `login`, `password` (не короче 6 символов) | id, login, isAdmin (пароль не возвращается) |
| POST | /api/users/login | нет | заглушка для лабораторной №4 |
| POST | /api/users/logout | нет | заглушка для лабораторной №4 |

## Бизнес-правила

- Переходы статусов: draft в published (PUT publish), draft или published в deleted (DELETE). Возврат в draft запрещён.
- Записи в статусе deleted клиенту не передаются.
- У пользователя не более одного черновика.
- Системные поля (id, status, creator, moderator, created_at, formed_at, completed_at) клиент менять не может: они вычисляются на бэкенде, а лишние поля в теле запроса отсекает ValidationPipe (whitelist).
- Публиковать и удалять можно только свои записи.

## Страницы SSR из лабораторных №1-2

`/shareholders` (лента), `/shareholders/tiles` (плитка), `/shareholders/add` (добавление).
