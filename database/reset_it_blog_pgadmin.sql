-- =====================================================================
-- IT BLOG — RESET DATABASE THAT CHO PGADMIN (postgres / 123456)
-- Chay trong Query Tool, database: it_blog
-- Xoa sach schema cu lech kieu (id TEXT) de backend tu tao lai chuan
-- (users.id INTEGER tu tang theo backend/app/models/user.py)
-- Backend se tu chay Base.metadata.create_all + seed.py o lan khoi dong
-- =====================================================================

-- Xoa toan bo bang cu (CASCADE de sach FK)
DROP TABLE IF EXISTS
  user_behavior_events,
  ad_clicks, ads, ad_campaigns,
  quiz_question_posts, quiz_questions,
  course_lesson_progress, course_enrollments, course_lessons, course_posts, courses,
  job_applications, job_posts, companies,
  events,
  crawl_jobs, crawl_sources,
  user_badges, badges, reputation_logs,
  audit_logs, bug_reports, reports,
  notifications,
  comment_likes, comments,
  post_likes, bookmarks, follows,
  post_tags, post_revisions, posts,
  tags, categories,
  user_roles, permissions, roles,
  users,
  alembic_version
CASCADE;

-- Xoa luon type enum neu con sot ( tranh loi create_all )
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationtype') THEN
    DROP TYPE notificationtype CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poststatus') THEN
    DROP TYPE poststatus CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reportstatus') THEN
    DROP TYPE reportstatus CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bugreportstatus') THEN
    DROP TYPE bugreportstatus CASCADE;
  END IF;
END $$;

-- Kiem tra da sach
SELECT COUNT(*) AS tables_left
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

