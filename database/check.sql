-- Kiem tra nhanh database it_blog (chay: psql -d it_blog -f database/check.sql)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
SELECT count(*) AS users FROM users;
SELECT count(*) AS posts FROM posts;
SELECT count(*) AS comments FROM comments;
SELECT count(*) AS likes FROM post_likes;
SELECT count(*) AS follows FROM follows;
SELECT id, name, email FROM users ORDER BY 1;
