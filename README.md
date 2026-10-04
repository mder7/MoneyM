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
| status | enum: draft, published, deleted | статус, хранится только в БД |
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

## Формат ответов

Все адреса начинаются с `/api`. Текущий пользователь зафиксирован через singleton `CurrentUser.getInstance()` (id = 1), авторизация появится в лабораторной №4.

Карточка акционера всегда содержит один и тот же набор полей, пустые значения передаются как `null`:

`id`, `fullName`, `shortDescription`, `imageUrl`, `videoUrl`, `ownershipShare`, `preferredShare`, `likesCount`, `isMine` (1, если создатель текущий пользователь, иначе 0).

Статус, создатель, модератор и даты в ответе не передаются. Ошибки возвращаются только кодом статуса без тела: 404 (не найдено), 403 (чужая запись), 400 (неверные данные), 409 (логин занят).

## HTTP-методы

### Домен shareholders

| Метод | Адрес | Вход | Выход |
|---|---|---|---|
| GET | /api/shareholders | query: `minShare` (необязательно) | 200, массив карточек, только опубликованные |
| GET | /api/shareholders/feed | нет | 200, первая опубликованная карточка |
| GET | /api/shareholders/feed/:id | query: `next=true` (необязательно) | 200, карточка по id; с `next=true` следующая опубликованная по кругу; 404, если нет |
| GET | /api/shareholders/draft | нет | 200, черновик текущего пользователя (не более одного); 404, если его нет |
| POST | /api/shareholders | multipart/form-data: `fullName` (текст), `image` (файл), `video` (файл) | 201, карточка-черновик; файлы сохраняются в MinIO под именем-UUID на латинице, имена пишутся в БД |
| PUT | /api/shareholders/:id/publish | JSON: `shortDescription`, `ownershipShare`, `preferredShare` | 200, опубликованная карточка |
| DELETE | /api/shareholders/:id | нет | 200, тело пустое; мягкое удаление, только своих записей |
| POST | /api/shareholders/:id/like | JSON: `value` (0 снимает лайк, 1 ставит) | 200, тело пустое |

### Домен users

| Метод | Адрес | Вход | Выход |
|---|---|---|---|
| POST | /api/users/register | JSON: `login`, `password` (не короче 6 символов) | 201, `id`, `login`, `isAdmin` (пароль не возвращается) |
| POST | /api/users/login | нет | 200, заглушка для лабораторной №4 |
| POST | /api/users/logout | нет | 200, заглушка для лабораторной №4 |

## Бизнес-правила

- Переходы статусов: draft в published (PUT publish), draft или published в deleted (DELETE). Возврат в draft запрещён.
- Записи в статусе deleted клиенту не передаются.
- У пользователя не более одного черновика.
- Системные поля (id, статус, создатель, модератор, даты) клиент менять не может: они вычисляются на бэкенде, лишние поля в теле запроса отсекает ValidationPipe (whitelist).
- Публиковать и удалять можно только свои записи.

## Страницы SSR из лабораторных №1-2

`/shareholders` (лента), `/shareholders/tiles` (плитка), `/shareholders/add` (добавление).
