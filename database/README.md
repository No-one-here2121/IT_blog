# IT Blog — Database (PostgreSQL 18)

Khong cai them bat ky goi npm nao. Chi dung `psql.exe` co san cua PostgreSQL 18.

## 1. Thong tin ket noi

| Key | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `it_blog` |
| User | `postgres` |
| Password | `123456` |
| Connection string | `postgresql://postgres:123456@localhost:5432/it_blog` |

> Mat khau chi luu trong `database/.env` (may local cua ban), khong hardcode vao code.
> Copy `database/.env.example` thanh `database/.env` neu can dung tool doc .env.

## 2. Mo pgAdmin 4 de thay database

1. Mo pgAdmin 4 → nhom **Servers (1)** → **PostgreSQL 18**
2. Neu hoi password: nhap `123456` → tick **Save password**
3. Mo **Databases** → thay co them **`it_blog`** (ben canh `postgres`)
4. Mo `it_blog → Schemas → public → Tables` se thay:
   `users, follows, posts, post_tags, post_likes, post_bookmarks, comments`

## 3. Tao lai database tu dau (neu can)

Mo PowerShell tai thu muc project roi chay (dung psql co san, khong cai gi them):

```powershell
$env:PGPASSWORD='123456'; $env:PGCLIENTENCODING='UTF8'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d postgres -c "CREATE DATABASE it_blog ENCODING 'UTF8';"
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d it_blog -f database/schema.sql
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d it_blog -f database/seed.sql
```

Luu y tren Windows phai co `$env:PGCLIENTENCODING='UTF8'` thi tieng Viet moi khong bi loi font.

## 4. Dong bo seed data moi tu frontend

Khi sua `src/data/seedData.js`, chay lai (chi dung Node builtin):

```powershell
node database/generate_seed.mjs
$env:PGPASSWORD='123456'; $env:PGCLIENTENCODING='UTF8'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d it_blog -f database/seed.sql
```

## 5. Kiem tra nhanh

```powershell
$env:PGPASSWORD='123456'; $env:PGCLIENTENCODING='UTF8'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d it_blog -c 'SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM posts) AS posts, (SELECT count(*) FROM comments) AS comments;'
```
Ket qua hien tai: **4 users, 12 posts, 3 comments.**

## 6. Chay database that (API + frontend)

```powershell
# Terminal 1: API noi frontend -> Postgres
npm run api

# Terminal 2: web (tu doc posts tu API, fallback localStorage khi tat API)
npm run dev
```

Day toan bo du lieu cu tu trinh duyet len DB that: xem `npm run db:push`
(can file `database/browser-export.json` xuat tu localStorage, chi tiet trong
script `database/push-all.mjs`).

## 7. Frontend co can sua gi khong?

Khong. `BlogContext` da tu goi API (`src/utils/dbApi.js`); tat API thi
tu fallback localStorage nhu cu.
