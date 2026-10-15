import sys
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

e = create_engine("postgresql://postgres:123456@localhost:5432/it_blog")
with e.connect() as c:
    rows = c.execute(text("SELECT id, title, status FROM posts ORDER BY id")).all()
    print("TOTAL:", len(rows))
    for r in rows:
        print(r.id, "|", r.status, "|", (r.title or "")[:60])
    print("APPROVED:", c.execute(text("SELECT count(*) FROM posts WHERE status='approved'")).scalar())
