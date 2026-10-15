from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


def _create_database_engine():
    """
    Tạo engine kết nối database.

    LƯU Ý QUAN TRỌNG: Trước đây có cơ chế "im lặng" fallback sang SQLite khi kết nối
    PostgreSQL thất bại. Đây chính là nguyên nhân gây ra lỗi "đăng bài khi được khi không":
    dữ liệu được ghi vào một file SQLite tạm (it_blog.db) thay vì PostgreSQL, khiến bài viết
    "tự biến mất" giữa các lần tải lại. Vì vậy ta chỉ dùng SQLite khi cấu hình thực sự trỏ
    tới SQLite; ngược lại luôn dùng PostgreSQL và để lỗi hiển thị rõ ràng nếu không kết nối được.
    """
    if settings.DATABASE_URL.startswith("sqlite"):
        return create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )

    # PostgreSQL: kiểm tra kết nối ngay khi khởi động để phát hiện lỗi sớm,
    # nhưng KHÔNG âm thầm chuyển sang database khác (tránh mất dữ liệu).
    pg_engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,   # tự động phát hiện & loại bỏ kết nối chết trong pool
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,    # tái sử dụng kết nối an toàn, tránh kết nối bị đóng sau thời gian dài
    )
    try:
        with pg_engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        try:
            print("[database] Da ket noi PostgreSQL thanh cong.")
        except Exception:
            pass
    except Exception as exc:
        # Không fallback im lặng. Ném lỗi rõ ràng để người dùng sửa cấu hình kết nối.
        raise RuntimeError(
            "Không thể kết nối tới PostgreSQL qua DATABASE_URL "
            f"'{settings.DATABASE_URL}'. Vui lòng kiểm tra PostgreSQL đang chạy, "
            "tên database, user và mật khẩu (mặc định: postgres / 123456, db: it_blog). "
            f"Chi tiết lỗi: {exc}"
        ) from exc

    return pg_engine


engine = _create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator for FastAPI routes that yields a database session
    and ensures it's closed after request lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
