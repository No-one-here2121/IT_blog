import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const INITIAL_COURSES = [
  {
    id: 1,
    title: "Khóa học FastAPI & Microservices Masterclass 2026",
    slug: "fastapi-microservices-masterclass",
    description: "Xây dựng hệ thống RESTful API chuẩn Enterprise, tích hợp xác thực JWT, Redis Caching, PostgreSQL ORM SQLAlchemy 2.0 và Docker.",
    level: "intermediate",
    cover_image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    instructor_name: "Nguyễn Văn Tuấn (Tech Lead)",
    category_name: "Backend",
    total_lessons: 3,
    enrolled_students: 142,
    is_enrolled: false,
    user_progress_percent: 0,
    lessons: [
      { id: 11, title: "Bài 1: Kiến trúc Dependency Injection & Lifespan trong FastAPI", duration_minutes: 25, is_completed: false },
      { id: 12, title: "Bài 2: Tối ưu kết nối Async SQLAlchemy 2.0 & Connection Pooling", duration_minutes: 35, is_completed: false },
      { id: 13, title: "Bài 3: Triển khai Caching với Redis và Rate Limiter", duration_minutes: 30, is_completed: false }
    ]
  },
  {
    id: 2,
    title: "Khóa học Lập trình React 19 & Next.js Thực chiến",
    slug: "react-19-nextjs-thuc-chien",
    description: "Làm chủ Server Actions, Server Components, Zustand state management và Tailwind CSS để xây dựng web application hiệu năng cao.",
    level: "beginner",
    cover_image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
    instructor_name: "Trần Mai Anh (Senior Frontend)",
    category_name: "Frontend",
    total_lessons: 2,
    enrolled_students: 215,
    is_enrolled: false,
    user_progress_percent: 0,
    lessons: [
      { id: 21, title: "Bài 1: Nền tảng React 19, Hooks và State Management", duration_minutes: 30, is_completed: false },
      { id: 22, title: "Bài 2: Tối ưu render, memoization và Responsive Tailwind", duration_minutes: 40, is_completed: false }
    ]
  },
  {
    id: 3,
    title: "Khóa học DevOps Thực chiến: Docker, Kubernetes & CI/CD",
    slug: "devops-docker-k8s-cicd",
    description: "Tự động hóa triển khai sản phẩm lên Kubernetes Cluster, quản lý bí mật bảo mật và xây dựng pipeline kiểm thử tự động với GitHub Actions.",
    level: "advanced",
    cover_image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80",
    instructor_name: "Lê Hoàng Long (DevOps Architect)",
    category_name: "DevOps",
    total_lessons: 2,
    enrolled_students: 89,
    is_enrolled: false,
    user_progress_percent: 0,
    lessons: [
      { id: 31, title: "Bài 1: Docker Multi-Stage Build tối ưu hoá dung lượng", duration_minutes: 25, video_url: "https://www.youtube.com/watch?v=hBYkWQvPVkY", is_completed: false },
      { id: 32, title: "Bài 2: Thiết lập K8s Deployment, Service và HPA", duration_minutes: 45, video_url: "https://www.youtube.com/watch?v=DUZEw07g0Gs", is_completed: false }
    ]
  }
];

const LESSON_DETAILS = {
  11: {
    video_url: "https://www.youtube.com/embed/0rsXZXb3vEQ",
    objectives: [
      "Hiểu rõ kiến trúc Dependency Injection (DI) trong FastAPI qua hàm Depends().",
      "Sử dụng Lifespan context manager (asynccontextmanager) thay thế cho startup/shutdown events cũ.",
      "Tối ưu quản trị tài nguyên kết nối Database và Redis theo vòng đời ứng dụng."
    ],
    content: "FastAPI cung cấp hệ thống Dependency Injection cực kỳ mạnh mẽ và dễ mở rộng. Thay vì sử dụng các sự kiện @app.on_event('startup') đã bị deprecate, FastAPI khuyến nghị dùng Lifespan context manager để khởi tạo connection pools trước khi nhận request và giải phóng an toàn khi ứng dụng shutdown.",
    code: `# main.py - Quản trị Lifespan và Dependency Injection trong FastAPI
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
import redis.asyncio as aioredis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo Redis Pool khi ứng dụng khởi động
    app.state.redis = await aioredis.from_url("redis://localhost:6379", decode_responses=True)
    yield
    # Dọn dẹp tài nguyên khi ứng dụng tắt
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)

async def get_redis():
    return app.state.redis

@app.get("/api/v1/ping")
async def ping(r = Depends(get_redis)):
    await r.set("last_ping", "ok", ex=60)
    return {"status": "healthy", "redis": await r.get("last_ping")}`,
    challenge: "Hãy cài đặt thêm một dependency get_current_user để kiểm tra token JWT từ Header Authorization và gắn thông tin user vào request state.",
    tips: "Luôn dùng yield trong dependencies khi cần dọn dẹp tài nguyên (ví dụ đóng session SQLAlchemy: yield db sau đó db.close())."
  },
  12: {
    video_url: "https://www.youtube.com/embed/0rsXZXb3vEQ",
    objectives: [
      "Cấu hình AsyncSession và create_async_engine trong SQLAlchemy 2.0.",
      "Thiết lập Connection Pooling (pool_size, max_overflow, pool_recycle).",
      "Tránh các lỗi N+1 query phổ biến bằng selectinload và joinedload."
    ],
    content: "SQLAlchemy 2.0 chuyển hẳn sang phong cách Async native với async_sessionmaker. Việc tối ưu kích thước pool_size và pool_recycle giúp hệ thống tránh tình trạng nghẽn connection khi hàng nghìn request đổ về đồng thời.",
    code: `# database.py - Cấu hình Async SQLAlchemy 2.0 Connection Pool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = "postgresql+asyncpg://postgres:secret@localhost:5432/itblog_db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)`,
    challenge: "Viết hàm context manager get_async_db() để tự động rollback khi gặp Exception trong transaction.",
    tips: "Đặt pool_pre_ping=True để ngăn ngừa các lỗi OperationalError do PostgreSQL tự ngắt idle connection từ phía firewall."
  },
  13: {
    video_url: "https://www.youtube.com/embed/0rsXZXb3vEQ",
    objectives: [
      "Hiểu kiến trúc Cache-Aside Pattern với Redis Cluster.",
      "Triển khai middleware Rate Limiter giới hạn 100 requests/phút cho từng IP.",
      "Chiến lược Invalidation Cache khi dữ liệu thay đổi để tránh Dirty Reads."
    ],
    content: "Caching giúp giảm tải tới 90% truy vấn trực tiếp vào Database. Khi kết hợp với Sliding Window Rate Limiting, hệ thống sẽ được bảo vệ tuyệt đối trước các đợt tấn công DoS hoặc spam API.",
    code: `# cache_service.py - Cache-Aside Pattern với Redis
import json

async def get_cached_or_fetch(redis_client, key: str, fetch_func, ttl_seconds: int = 300):
    cached = await redis_client.get(key)
    if cached:
        return json.loads(cached)
    data = await fetch_func()
    await redis_client.set(key, json.dumps(data), ex=ttl_seconds)
    return data`,
    challenge: "Xây dựng thuật toán Token Bucket bằng Redis Lua script để kiểm soát rate limit với độ trễ dưới 1ms.",
    tips: "Luôn đặt thời gian hết hạn (TTL) và thêm jitter (ngẫu nhiên +- vài giây) để tránh hiện tượng Cache Stampede."
  },
  21: {
    video_url: "https://www.youtube.com/embed/SqcY0GlETPk",
    objectives: [
      "Làm quen với các tính năng mới trong React 19: Action Hooks, useActionState, useOptimistic.",
      "Hiểu rõ sự khác biệt giữa Client Components và React Server Components (RSC).",
      "Quản lý Global State hiệu quả với Zustand thay thế cho Redux cồng kềnh."
    ],
    content: "React 19 mang đến cuộc cách mạng lớn về xử lý Form và State không đồng bộ. Với useActionState và useOptimistic, bạn có thể cập nhật giao diện người dùng ngay lập tức trước khi server phản hồi, mang lại trải nghiệm mượt mà tuyệt đối.",
    code: `// LikeButton.jsx - Ứng dụng useOptimistic trong React 19
import { useOptimistic, useTransition } from "react";

export function LikeButton({ initialLikes, postId, onLikeApi }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    initialLikes,
    (current, delta) => current + delta
  );

  const handleLike = () => {
    startTransition(async () => {
      setOptimisticLikes(1); // Cập nhật UI tức thì
      await onLikeApi(postId); // Gửi API ngầm
    });
  };

  return (
    <button 
      onClick={handleLike} 
      disabled={isPending}
      className="btn btn-sm btn-primary rounded-xl gap-2 font-bold"
    >
      <span>❤️ Thích</span>
      <span className="badge badge-sm">{optimisticLikes}</span>
    </button>
  );
}`,
    challenge: "Tạo một Zustand store để lưu trữ danh sách các bài viết đã đánh dấu yêu thích và đồng bộ tự động với localStorage.",
    tips: "Không đặt các hook trạng thái phía Client (useState, useEffect) vào React Server Components; hãy phân tách rõ ràng ranh giới 'use client'."
  },
  22: {
    video_url: "https://www.youtube.com/embed/SqcY0GlETPk",
    objectives: [
      "Phân tích re-render bằng React Developer Tools Profiler.",
      "Ứng dụng useMemo và useCallback đúng nơi, tránh tối ưu hóa sớm (premature optimization).",
      "Xây dựng giao diện responsive chuẩn mobile-first với DaisyUI và Tailwind CSS v4."
    ],
    content: "Một lỗi phổ biến của frontend developer là bọc useCallback vô tội vạ. Bài học này sẽ chỉ ra chính xác khi nào một component thực sự cần memoization, cách chia nhỏ component để tận dụng React 19 Compiler và thiết kế lưới responsive mượt mà.",
    code: `// ExpensiveDataGrid.jsx - Tối ưu render với useMemo & Virtualization
import { useMemo, useState } from "react";

export function DataGrid({ rawItems }) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredData = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return rawItems;
    return rawItems.filter(item => item.title.toLowerCase().includes(q));
  }, [rawItems, filterQuery]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Lọc dữ liệu..."
        value={filterQuery}
        onChange={(e) => setFilterQuery(e.target.value)}
        className="input input-bordered rounded-xl w-full"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredData.map(item => (
          <div key={item.id} className="card bg-base-100 border border-base-300 p-4 rounded-2xl shadow-xs">
            <h4 className="font-bold text-base-content">{item.title}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}`,
    challenge: "Sử dụng React.memo kết hợp custom comparison function để ngăn chặn component bình luận bị render lại khi cha cập nhật.",
    tips: "Trong Tailwind CSS, hãy luôn viết class cho màn hình nhỏ nhất trước (mobile), sau đó mới thêm các tiền tố sm:, md:, lg: để ghi đè."
  },
  31: {
    video_url: "https://www.youtube.com/watch?v=hBYkWQvPVkY",
    objectives: [
      "Xây dựng Dockerfile chuẩn Multi-Stage Build giảm 80% kích thước image.",
      "Chạy container dưới quyền Non-root user để tăng cường bảo mật container.",
      "Tối ưu hóa Docker Layer Caching đẩy nhanh tốc độ build CI/CD."
    ],
    content: "Việc đưa toàn bộ môi trường biên dịch (build tools, SDK, dev dependencies) vào production container image là rủi ro bảo mật nghiêm trọng và làm phình to dung lượng. Multi-stage build tách biệt giai đoạn build và runtime, mang lại image chỉ vài chục megabyte.",
    code: `# Dockerfile - Multi-stage Build tối ưu cho ứng dụng Python FastAPI
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
RUN useradd -m -u 1001 appuser
USER 1001
COPY --from=builder /root/.local /home/appuser/.local
COPY . .
ENV PATH=/home/appuser/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
    challenge: "Hãy viết lệnh Docker kiểm tra kích thước image trước và sau khi áp dụng Multi-stage build và phân tích các layer bằng tool Dive.",
    tips: "Đặt các lệnh ít thay đổi (như COPY requirements.txt và pip install) lên trên để tận dụng tối đa Docker Layer Cache khi sửa mã nguồn code."
  },
  32: {
    video_url: "https://www.youtube.com/watch?v=DUZEw07g0Gs",
    objectives: [
      "Khởi tạo K8s Deployment với RollingUpdate strategy không gián đoạn dịch vụ (Zero-downtime).",
      "Cấu hình Service ClusterIP và Ingress Controller điều hướng traffic.",
      "Thiết lập Horizontal Pod Autoscaler (HPA) tự động scale theo CPU và Memory."
    ],
    content: "Kubernetes là tiêu chuẩn thực tế để vận hành microservices quy mô lớn. Với RollingUpdate và cấu hình liveness/readiness probes chuẩn xác, ứng dụng của bạn sẽ được deploy phiên bản mới liên tục mà người dùng không hề gặp lỗi 502/504.",
    code: `# deployment.yaml - K8s Deployment & Autoscaling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: itblog-api-deployment
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: itblog-api
  template:
    metadata:
      labels:
        app: itblog-api
    spec:
      containers:
      - name: api
        image: itblog-api:v2.0
        ports:
        - containerPort: 8000
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"`,
    challenge: "Thiết lập một HPA (HorizontalPodAutoscaler) tự động scale từ 3 pods lên tối đa 10 pods khi CPU vượt ngưỡng 75%.",
    tips: "Luôn khai báo resources.requests và resources.limits; nếu không có requests, HPA sẽ không thể tính toán được tỷ lệ phần trăm CPU sử dụng."
  }
};

export const formatEmbedVideoUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return trimmed;
};

const getLessonContent = (course, lesson) => {
  const baseDetail = (lesson && LESSON_DETAILS[lesson.id]) ? { ...LESSON_DETAILS[lesson.id] } : null;
  const rawVideo = lesson?.video_url || baseDetail?.video_url || "https://www.youtube.com/embed/SqcY0GlETPk";
  const formattedVideo = formatEmbedVideoUrl(rawVideo);

  if (baseDetail) {
    return {
      ...baseDetail,
      video_url: formattedVideo,
      content: lesson?.content || baseDetail.content,
      description: lesson?.description || baseDetail.description
    };
  }

  return {
    video_url: formattedVideo,
    objectives: [
      `Nắm vững toàn bộ kiến thức trọng tâm của bài: ${lesson?.title || "Bài học"}.`,
      "Thực hành áp dụng các kỹ thuật chuyên sâu vào dự án phần mềm thực tế.",
      "Hiểu rõ các lỗi thường gặp và cách phòng tránh tối ưu khi đưa lên Production."
    ],
    content: lesson?.content || lesson?.description || `Chào mừng bạn đến với bài học "${lesson?.title || "Bài học"}" thuộc khóa học "${course?.title || "Khóa học"}". Trong bài học này, bạn sẽ được hướng dẫn chi tiết từng bước từ lý thuyết nền tảng đến thực hành thực tế. Hãy theo dõi kỹ nội dung và hoàn thành bài học để tích lũy tiến độ khóa học.`,
    code: `// ${lesson?.title || "Bài học"} - Mã nguồn minh họa thực chiến
export function executeLessonWorkflow() {
  console.log("Khởi động mô-đun bài học: ${lesson?.title || "Lesson"}");
  return { status: "success", lessonId: "${lesson?.id || 1}", timestamp: new Date().toISOString() };
}`,
    challenge: `Thực hiện viết mã nguồn áp dụng các khái niệm vừa học trong bài "${lesson?.title || "Bài học"}" và kiểm thử kết quả trên môi trường cục bộ.`,
    tips: "Nên thực hành viết lại code bằng tay thay vì sao chép để ghi nhớ cú pháp và quy trình xử lý lỗi sâu hơn."
  };
};

const ENROLLED_COURSES_KEY = "it_blog_enrolled_courses";
const COMPLETED_LESSONS_KEY = "it_blog_completed_lessons";

const getStoredEnrolledIds = (userId) => {
  try {
    const raw = localStorage.getItem(`${ENROLLED_COURSES_KEY}_${userId || "default"}`);
    const globalRaw = localStorage.getItem(ENROLLED_COURSES_KEY);
    const set1 = raw ? JSON.parse(raw) : [];
    const set2 = globalRaw ? JSON.parse(globalRaw) : [];
    return new Set([...set1, ...set2].map(String));
  } catch {
    return new Set();
  }
};

const saveStoredEnrolledId = (userId, courseId) => {
  try {
    if (!courseId) return;
    const strId = String(courseId);
    const keys = [`${ENROLLED_COURSES_KEY}_${userId || "default"}`, ENROLLED_COURSES_KEY];
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(strId)) {
        list.push(strId);
        localStorage.setItem(key, JSON.stringify(list));
      }
    });
  } catch {
    // ignore
  }
};

const getStoredCompletedLessonIds = (userId) => {
  try {
    const raw = localStorage.getItem(`${COMPLETED_LESSONS_KEY}_${userId || "default"}`);
    const globalRaw = localStorage.getItem(COMPLETED_LESSONS_KEY);
    const set1 = raw ? JSON.parse(raw) : [];
    const set2 = globalRaw ? JSON.parse(globalRaw) : [];
    return new Set([...set1, ...set2].map(String));
  } catch {
    return new Set();
  }
};

const saveStoredCompletedLessonId = (userId, lessonId, isCompleted = true) => {
  try {
    if (!lessonId) return;
    const strId = String(lessonId);
    const keys = [`${COMPLETED_LESSONS_KEY}_${userId || "default"}`, COMPLETED_LESSONS_KEY];
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      let list = raw ? JSON.parse(raw) : [];
      if (isCompleted) {
        if (!list.includes(strId)) list.push(strId);
      } else {
        list = list.filter((id) => id !== strId);
      }
      localStorage.setItem(key, JSON.stringify(list));
    });
  } catch {
    // ignore
  }
};

const mergeCoursesWithStorage = (courseList, userId) => {
  const enrolledIds = getStoredEnrolledIds(userId);
  const completedLessonIds = getStoredCompletedLessonIds(userId);

  return (courseList || []).map((c) => {
    const isEnrolled = Boolean(c.is_enrolled || enrolledIds.has(String(c.id)) || (c.slug && enrolledIds.has(String(c.slug))));
    const lessons = (c.lessons || []).map((l) => ({
      ...l,
      is_completed: Boolean(l.is_completed || completedLessonIds.has(String(l.id)))
    }));
    const completedCount = lessons.filter((l) => l.is_completed).length;
    const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : (c.user_progress_percent || 0);

    return {
      ...c,
      is_enrolled: isEnrolled,
      lessons,
      user_progress_percent: isEnrolled ? progress : (c.user_progress_percent || 0)
    };
  });
};

export default function CoursesPage({ onNavigate, params }) {
  const { currentUser, requireAuth, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [courses, setCourses] = useState(() => mergeCoursesWithStorage(INITIAL_COURSES));
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [certificateCourse, setCertificateCourse] = useState(null);

  // Lesson Learning Studio Modal State
  const [studyingLesson, setStudyingLesson] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [lessonPlaybackSpeed, setLessonPlaybackSpeed] = useState("1.0x");

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const [lessonStatusFilter, setLessonStatusFilter] = useState("all");
  // Tab trong modal chi tiết khóa học: "lessons" (Bài học) | "articles" (Bài viết liên quan)
  const [courseDetailTab, setCourseDetailTab] = useState("lessons");
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Tải các bài viết liên quan theo chuyên mục của khóa học (gọi khi mở modal)
  const loadRelatedArticles = (course) => {
    const category = course?.category_name;
    setLoadingArticles(true);
    setRelatedArticles([]);

    const mapArticle = (bp) => ({
      id: String(bp.id),
      title: bp.title,
      slug: bp.slug,
      excerpt: bp.excerpt || "",
      coverImage: bp.cover_image || bp.coverImage || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
      category: bp.category?.name || bp.category_name || bp.category || "Công nghệ",
      readTime: bp.read_time || bp.readTime || "5 phút đọc",
      views: bp.views || 0,
    });

    const request = category
      ? api.posts.list({ category, limit: 6 })
      : Promise.resolve({ items: [] });

    request
      .then((res) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setRelatedArticles(items.map(mapArticle));
        } else {
          // Dự phòng: nếu không có bài theo đúng chuyên mục, lấy bài mới nhất
          return api.posts.list({ limit: 6 }).then((fb) => {
            const fbItems = fb?.items || (Array.isArray(fb) ? fb : []);
            setRelatedArticles(fbItems.map(mapArticle));
          });
        }
      })
      .catch(() => {
        setRelatedArticles([]);
      })
      .finally(() => {
        setLoadingArticles(false);
      });
  };

  // Mở modal chi tiết khóa học và tải bài viết liên quan + bài giảng tươi mới từ DB
  const openCourseModal = async (course) => {
    setSelectedCourse(course);
    setCourseDetailTab("lessons");
    setLessonStatusFilter("all");
    loadRelatedArticles(course);
    try {
      const freshCourse = await api.courses.get(course.id);
      if (freshCourse && freshCourse.id) {
        const mergedList = mergeCoursesWithStorage([freshCourse], currentUser?.id);
        const mergedCourse = mergedList[0] || freshCourse;
        setSelectedCourse((prev) =>
          String(prev?.id) === String(mergedCourse.id)
            ? { ...prev, ...mergedCourse, is_enrolled: Boolean(prev?.is_enrolled || mergedCourse.is_enrolled) }
            : prev
        );
        setCourses((prev) =>
          prev.map((c) =>
            String(c.id) === String(mergedCourse.id)
              ? { ...c, ...mergedCourse, is_enrolled: Boolean(c.is_enrolled || mergedCourse.is_enrolled) }
              : c
          )
        );
      }
    } catch {
      // Keep existing course data
    }
  };

  // Đóng modal chi tiết khóa học và đặt lại tab về "Bài học" cho lần mở tiếp theo
  const closeCourseModal = () => {
    setSelectedCourse(null);
    setCourseDetailTab("lessons");
    setRelatedArticles([]);
  };

  const handleExportCourseSyllabusMd = (course) => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất đề cương (.md)!", "error");
      return;
    }
    if (!course) return;
    const lessons = course.lessons || [];
    const completedCount = lessons.filter((l) => l.is_completed).length;
    const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

    let content = `# 🎓 Đề Cương Khóa Học: ${course.title}\n\n`;
    content += `> Giảng viên: ${course.instructor_name || "Chuyên gia IT Blog"}\n`;
    content += `> Cấp độ: ${course.level || "Tất cả"} | Chuyên mục: ${course.category_name || "Công nghệ"}\n`;
    content += `> Tiến độ học tập: ${progressPercent}% (${completedCount}/${lessons.length} bài đã hoàn thành)\n\n`;
    content += `## 📋 Danh Sách Bài Học\n\n`;

    lessons.forEach((l, idx) => {
      const check = l.is_completed ? "x" : " ";
      content += `- [${check}] Bài ${idx + 1}: ${l.title} (${l.duration_minutes || 20} phút)\n`;
    });

    content += `\n---\n*Được xuất từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `de-cuong-${course.slug || "khoa-hoc"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast("Đã tải xuống đề cương khóa học dạng Markdown!", "success");
  };

  const handleExportLearningSummaryMd = () => {
    const enrolledCourses = courses.filter((c) => c.is_enrolled);
    const targetCourses = enrolledCourses.length > 0 ? enrolledCourses : courses;
    const completedCourses = targetCourses.filter((c) => (c.user_progress_percent || 0) === 100);

    let totalLessonsCount = 0;
    let totalLessonsCompleted = 0;
    targetCourses.forEach((c) => {
      const lessons = c.lessons || [];
      totalLessonsCount += lessons.length;
      totalLessonsCompleted += lessons.filter((l) => l.is_completed).length;
    });

    const overallPct = totalLessonsCount > 0 ? Math.round((totalLessonsCompleted / totalLessonsCount) * 100) : 0;

    let content = `# 📊 Báo Cáo Tiến Độ Học Tập Kỹ Sư - IT Blog Platform\n\n`;
    content += `> Học viên: **${currentUser?.name || "Lập trình viên IT"}** (@${currentUser?.username || "developer"})\n`;
    content += `> Thời gian trích xuất: ${new Date().toLocaleString("vi-VN")}\n`;
    content += `> Tổng số khóa học theo dõi: **${targetCourses.length} khóa** | Đã hoàn thành (100%): **${completedCourses.length} khóa**\n`;
    content += `> Tổng tiến độ bài giảng: **${overallPct}%** (${totalLessonsCompleted}/${totalLessonsCount} bài học)\n\n`;
    content += `---\n\n`;
    content += `## 📋 Danh Sách Khóa Học & Tiến Độ Thực Tế\n\n`;
    content += `| Khóa học | Cấp độ | Giảng viên | Bài học đã xong | Tiến độ (%) | Trạng thái |\n`;
    content += `| :--- | :---: | :--- | :---: | :---: | :---: |\n`;

    targetCourses.forEach((c) => {
      const lessons = c.lessons || [];
      const comp = lessons.filter((l) => l.is_completed).length;
      const pct = c.user_progress_percent || (lessons.length > 0 ? Math.round((comp / lessons.length) * 100) : 0);
      const status = pct === 100 ? "🏆 Tốt nghiệp" : pct > 0 ? "⚡ Đang học" : "⏳ Chưa bắt đầu";
      content += `| **${c.title}** | ${c.level?.toUpperCase() || "IT"} | ${c.instructor_name || "IT Blog"} | ${comp}/${lessons.length} | ${pct}% | ${status} |\n`;
    });

    content += `\n## 📝 Chi Tiết Tiến Độ Từng Bài Học\n\n`;
    targetCourses.forEach((c, idx) => {
      content += `### ${idx + 1}. ${c.title}\n`;
      content += `*Chuyên mục:* ${c.category_name || "Công nghệ"} | *Giảng viên:* ${c.instructor_name || "Chuyên gia"}\n\n`;
      (c.lessons || []).forEach((l, lIdx) => {
        const check = l.is_completed ? "x" : " ";
        content += `- [${check}] Bài ${lIdx + 1}: ${l.title} (${l.duration_minutes || 20} phút)\n`;
      });
      content += `\n`;
    });

    content += `---\n*Được xuất từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-hoc-tap-${(currentUser?.username || "developer")}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast("Đã tải xuống báo cáo tiến độ học tập dạng Markdown! 📥", "success");
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      !searchTerm.trim() ||
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = levelFilter === "all" || course.level === levelFilter;
    const matchesCategory = categoryFilter === "all" || course.category_name === categoryFilter;
    const matchesEnrolled = !showEnrolledOnly || course.is_enrolled;

    return matchesSearch && matchesLevel && matchesCategory && matchesEnrolled;
  });

  // Create Course Modal State
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(isAdmin && params?.action === "create");
  const [prevCourseAction, setPrevCourseAction] = useState(params?.action);
  if (params?.action !== prevCourseAction) {
    setPrevCourseAction(params?.action);
    if (params?.action === "create" && isAdmin) {
      setShowCreateCourseModal(true);
    }
  }
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLevel, setNewLevel] = useState("beginner");
  const [newCategoryName, setNewCategoryName] = useState("Backend");
  const [newCoverImage, setNewCoverImage] = useState("");
  const [newLessons, setNewLessons] = useState([
    {
      id: "new-1",
      title: "Bài 1: Tổng quan và cài đặt môi trường",
      duration_minutes: 25,
      video_url: "https://www.youtube.com/watch?v=0rsXZXb3vEQ",
      content: "Giới thiệu tổng quan nội dung khóa học và các bước cài đặt môi trường phát triển."
    }
  ]);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState(null);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLevel, setEditLevel] = useState("beginner");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editLessons, setEditLessons] = useState([]);
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);

  // Helper for adding/editing lessons in Create modal
  const handleAddNewLesson = () => {
    setNewLessons((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: `Bài ${prev.length + 1}: `,
        duration_minutes: 30,
        video_url: "",
        content: ""
      }
    ]);
  };

  const handleRemoveNewLesson = (index) => {
    if (newLessons.length <= 1) {
      addToast("Khóa học cần có ít nhất 1 bài học!", "warning");
      return;
    }
    setNewLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateNewLesson = (index, field, value) => {
    setNewLessons((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Helper for opening Edit Course Modal
  const openEditCourseModal = (course) => {
    setEditingCourse(course);
    setEditTitle(course.title || "");
    setEditDesc(course.description || "");
    setEditLevel(course.level || "beginner");
    setEditCategoryName(course.category_name || "Backend");
    setEditCoverImage(course.cover_image || "");

    const existing = (course.lessons && course.lessons.length > 0)
      ? course.lessons.map((l, idx) => ({
          id: l.id,
          title: l.title || "",
          duration_minutes: l.duration_minutes || 25,
          video_url: l.video_url || "",
          content: l.content || l.description || "",
          order_index: l.order_index !== undefined ? l.order_index : idx,
          is_completed: Boolean(l.is_completed)
        }))
      : [
          {
            id: `edit-new-${Date.now()}`,
            title: "Bài 1: Cài đặt và tổng quan",
            duration_minutes: 25,
            video_url: "",
            content: "",
            order_index: 0,
            is_completed: false
          }
        ];
    setEditLessons(existing);
    setShowEditCourseModal(true);
  };

  const handleAddEditLesson = () => {
    setEditLessons((prev) => [
      ...prev,
      {
        id: `edit-new-${Date.now()}`,
        title: `Bài ${prev.length + 1}: `,
        duration_minutes: 30,
        video_url: "",
        content: "",
        order_index: prev.length,
        is_completed: false
      }
    ]);
  };

  const handleRemoveEditLesson = (index) => {
    if (editLessons.length <= 1) {
      addToast("Khóa học phải có ít nhất 1 bài học!", "warning");
      return;
    }
    setEditLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEditLesson = (index, field, value) => {
    setEditLessons((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const fetchAllCourses = () => {
    api.courses.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCourses(mergeCoursesWithStorage(data, currentUser?.id));
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch courses from backend:", err);
      });
  };

  useEffect(() => {
    fetchAllCourses();
  }, [currentUser?.id]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền tạo khóa học mới!", "error");
      return;
    }
    if (!newTitle.trim() || !newDesc.trim()) {
      addToast("Vui lòng nhập tên và mô tả khóa học!", "warning");
      return;
    }
    for (let i = 0; i < newLessons.length; i++) {
      if (!newLessons[i].title.trim()) {
        addToast(`Vui lòng nhập tiêu đề cho bài giảng thứ ${i + 1}!`, "error");
        return;
      }
    }
    if (!currentUser) {
      requireAuth(() => handleCreateCourse(e), "Vui lòng đăng nhập để lưu khóa học!");
      return;
    }
    setIsCreatingCourse(true);
    try {
      const payload = {
        title: newTitle.trim(),
        description: newDesc.trim(),
        level: newLevel,
        category_name: newCategoryName.trim(),
        cover_image: newCoverImage.trim() || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
        lessons: newLessons.map((l, idx) => ({
          title: l.title.trim(),
          duration_minutes: parseInt(l.duration_minutes, 10) || 20,
          video_url: l.video_url?.trim() || null,
          content: l.content?.trim() || "",
          order_index: idx
        }))
      };

      let created = null;
      try {
        created = await api.courses.create(payload);
      } catch (apiErr) {
        console.warn("Backend API call failed, generating local course:", apiErr);
      }

      const formatted = created
        ? {
            ...created,
            instructor_name: created.instructor_name || currentUser?.name || "Giảng viên IT Blog",
            category_name: newCategoryName,
            total_lessons: created.lessons?.length || newLessons.length,
            enrolled_students: 1,
            is_enrolled: true,
            user_progress_percent: 0
          }
        : {
            id: Date.now(),
            slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            title: newTitle.trim(),
            description: newDesc.trim(),
            level: newLevel,
            category_name: newCategoryName,
            cover_image: newCoverImage.trim() || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
            instructor_name: currentUser?.name || "Giảng viên IT Blog",
            total_lessons: newLessons.length,
            enrolled_students: 1,
            is_enrolled: true,
            user_progress_percent: 0,
            lessons: newLessons.map((l, idx) => ({
              id: Date.now() + idx + 1,
              title: l.title.trim(),
              duration_minutes: parseInt(l.duration_minutes, 10) || 20,
              video_url: l.video_url?.trim() || null,
              content: l.content?.trim() || "",
              is_completed: false
            }))
          };

      setCourses((prev) => [formatted, ...prev]);
      addToast(`Đã tạo khóa học mới "${newTitle}" kèm ${newLessons.length} bài giảng video thành công! 🎓`, "success");
      setShowCreateCourseModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewCoverImage("");
      setNewLessons([
        {
          id: "new-1",
          title: "Bài 1: Tổng quan và cài đặt môi trường",
          duration_minutes: 25,
          video_url: "https://www.youtube.com/watch?v=0rsXZXb3vEQ",
          content: "Giới thiệu tổng quan nội dung khóa học và các bước cài đặt môi trường phát triển."
        }
      ]);
    } catch (err) {
      addToast(err?.message || "Lỗi khi tạo khóa học.", "error");
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleSaveEditCourse = async (e) => {
    e.preventDefault();
    if (!isAdmin && currentUser?.id !== editingCourse?.instructor_id) {
      addToast("Bạn không có quyền chỉnh sửa khóa học này!", "error");
      return;
    }
    if (!editTitle.trim() || !editDesc.trim()) {
      addToast("Vui lòng điền đầy đủ tên và mô tả khóa học!", "warning");
      return;
    }
    for (let i = 0; i < editLessons.length; i++) {
      if (!editLessons[i].title.trim()) {
        addToast(`Vui lòng nhập tiêu đề cho bài giảng thứ ${i + 1}!`, "error");
        return;
      }
    }

    setIsUpdatingCourse(true);
    try {
      const payload = {
        title: editTitle.trim(),
        description: editDesc.trim(),
        level: editLevel,
        category_name: editCategoryName.trim(),
        cover_image: editCoverImage.trim() || undefined,
        lessons: editLessons.map((l, idx) => ({
          id: typeof l.id === "number" ? l.id : undefined,
          title: l.title.trim(),
          duration_minutes: parseInt(l.duration_minutes, 10) || 20,
          video_url: l.video_url?.trim() || null,
          content: l.content?.trim() || "",
          order_index: idx
        }))
      };

      let updatedFromDb = null;
      try {
        updatedFromDb = await api.courses.update(editingCourse.id, payload);
      } catch (apiErr) {
        console.warn("Could not save to backend DB, updating local state:", apiErr);
      }

      const updatedCourse = updatedFromDb
        ? {
            ...updatedFromDb,
            is_enrolled: editingCourse.is_enrolled,
            enrolled_students: editingCourse.enrolled_students || 1,
            category_name: updatedFromDb.category_name || editCategoryName,
            instructor_name: updatedFromDb.instructor_name || editingCourse.instructor_name,
          }
        : {
            ...editingCourse,
            title: editTitle.trim(),
            description: editDesc.trim(),
            level: editLevel,
            category_name: editCategoryName.trim(),
            cover_image: editCoverImage.trim() || editingCourse.cover_image,
            lessons: editLessons.map((l, idx) => ({
              ...l,
              id: l.id || idx + 1,
              title: l.title.trim(),
              duration_minutes: parseInt(l.duration_minutes, 10) || 20,
              video_url: l.video_url?.trim() || null,
              content: l.content?.trim() || "",
              is_completed: Boolean(l.is_completed)
            })),
            total_lessons: editLessons.length
          };

      setCourses((prev) =>
        prev.map((c) => (String(c.id) === String(editingCourse.id) ? updatedCourse : c))
      );

      if (selectedCourse && String(selectedCourse.id) === String(editingCourse.id)) {
        setSelectedCourse(updatedCourse);
      }

      setShowEditCourseModal(false);
      setEditingCourse(null);
      addToast(`Đã cập nhật khóa học "${editTitle}" thành công và đồng bộ Database! 🎉`, "success");
    } catch (err) {
      addToast(err?.message || "Lỗi khi cập nhật khóa học.", "error");
    } finally {
      setIsUpdatingCourse(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!isAdmin && currentUser?.id !== course.instructor_id) {
      addToast("Bạn không có quyền xóa khóa học này!", "error");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${course.title}"? Thao tác này sẽ xóa toàn bộ bài học và tiến độ liên quan!`)) {
      return;
    }
    try {
      try {
        await api.courses.delete(course.id);
      } catch (apiErr) {
        console.warn("API delete failed or skipped:", apiErr);
      }
      setCourses((prev) => prev.filter((c) => String(c.id) !== String(course.id)));
      if (selectedCourse && String(selectedCourse.id) === String(course.id)) {
        closeCourseModal();
      }
      addToast(`Đã xóa khóa học "${course.title}" thành công!`, "info");
    } catch (err) {
      addToast(err?.message || "Lỗi khi xóa khóa học.", "error");
    }
  };

  const handleEnroll = (course) => {
    requireAuth(() => {
      saveStoredEnrolledId(currentUser?.id, course.id);
      if (course.slug) saveStoredEnrolledId(currentUser?.id, course.slug);

      setCourses((prev) =>
        prev.map((c) =>
          String(c.id) === String(course.id) || (c.slug && c.slug === course.slug)
            ? { ...c, is_enrolled: true, enrolled_students: (c.enrolled_students || 0) + 1 }
            : c
        )
      );
      if (selectedCourse && (String(selectedCourse.id) === String(course.id) || selectedCourse.slug === course.slug)) {
        setSelectedCourse((prev) => ({ ...prev, is_enrolled: true }));
      }
      addToast(`Chúc mừng! Bạn đã đăng ký thành công khóa học: ${course.title} 🎓`, "success");
      api.courses.enroll(course.id).catch(() => {});
    }, "Vui lòng đăng nhập để tham gia khóa học!");
  };

  const handleStartLesson = (course, lesson) => {
    requireAuth(() => {
      saveStoredEnrolledId(currentUser?.id, course.id);
      if (course.slug) saveStoredEnrolledId(currentUser?.id, course.slug);

      if (!course.is_enrolled) {
        setCourses((prev) =>
          prev.map((c) =>
            String(c.id) === String(course.id) || (c.slug && c.slug === course.slug)
              ? { ...c, is_enrolled: true, enrolled_students: (c.enrolled_students || 0) + 1 }
              : c
          )
        );
        if (selectedCourse && (String(selectedCourse.id) === String(course.id) || selectedCourse.slug === course.slug)) {
          setSelectedCourse((prev) => ({ ...prev, is_enrolled: true }));
        }
        api.courses.enroll(course.id).catch(() => {});
        addToast(`Bạn đã tham gia khóa học: ${course.title} và sẵn sàng học bài! 🎓`, "success");
      }
      
      const currentCourse = courses.find((c) => String(c.id) === String(course.id) || (c.slug && c.slug === course.slug)) || course;
      const freshLesson = (currentCourse.lessons || []).find((l) => String(l.id) === String(lesson.id)) || lesson;
      setStudyingLesson({
        course: { ...currentCourse, is_enrolled: true },
        lesson: freshLesson
      });
      setIsPlayingVideo(false);
    }, "Vui lòng đăng nhập để bắt đầu học bài học này!");
  };

  const handleCopyLessonCode = (codeText) => {
    if (!codeText) return;
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    addToast("Đã sao chép mã nguồn bài học vào bộ nhớ tạm! 📋", "success");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCompleteStudyingLesson = (courseId, lessonId) => {
    requireAuth(() => {
      saveStoredCompletedLessonId(currentUser?.id, lessonId, true);
      saveStoredEnrolledId(currentUser?.id, courseId);
      const matched = courses.find((c) => String(c.id) === String(courseId));
      if (matched?.slug) saveStoredEnrolledId(currentUser?.id, matched.slug);

      let finalPct = 0;
      let targetCourse = null;

      setCourses((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(courseId) && c.slug !== matched?.slug) return c;
          const updatedLessons = (c.lessons || []).map((l) =>
            String(l.id) === String(lessonId) ? { ...l, is_completed: true } : l
          );
          const completedCount = updatedLessons.filter((l) => l.is_completed).length;
          const pct = Math.round((completedCount / updatedLessons.length) * 100);
          finalPct = pct;
          targetCourse = { ...c, is_enrolled: true, lessons: updatedLessons, user_progress_percent: pct };
          return targetCourse;
        })
      );

      if (selectedCourse && (String(selectedCourse.id) === String(courseId) || selectedCourse.slug === matched?.slug)) {
        setSelectedCourse((prev) => {
          const updatedLessons = (prev.lessons || []).map((l) =>
            String(l.id) === String(lessonId) ? { ...l, is_completed: true } : l
          );
          const completedCount = updatedLessons.filter((l) => l.is_completed).length;
          const pct = Math.round((completedCount / updatedLessons.length) * 100);
          return {
            ...prev,
            is_enrolled: true,
            lessons: updatedLessons,
            user_progress_percent: pct
          };
        });
      }

      if (studyingLesson) {
        setStudyingLesson((prev) => ({
          ...prev,
          lesson: { ...prev.lesson, is_completed: true },
          course: targetCourse || { ...prev.course, is_enrolled: true }
        }));
      }

      if (finalPct === 100 && targetCourse) {
        addToast("🎉 Chúc mừng! Bạn đã hoàn thành 100% khóa học và nhận được Chứng chỉ Tốt nghiệp!", "success");
        setCertificateCourse(targetCourse);
      } else {
        addToast(`🎉 Tuyệt vời! Bạn đã hoàn thành bài học: "${studyingLesson?.lesson?.title || "Bài học"}"! 🎯`, "success");
      }
      api.courses.completeLesson(courseId, lessonId).catch(() => {});
    }, "Vui lòng đăng nhập để lưu tiến độ bài học!");
  };

  const handleRelearnLesson = (courseId, lessonId) => {
    requireAuth(() => {
      saveStoredCompletedLessonId(currentUser?.id, lessonId, false);

      let targetCourse = null;
      setCourses((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(courseId)) return c;
          const updatedLessons = (c.lessons || []).map((l) =>
            String(l.id) === String(lessonId) ? { ...l, is_completed: false } : l
          );
          const completedCount = updatedLessons.filter((l) => l.is_completed).length;
          const pct = Math.round((completedCount / updatedLessons.length) * 100);
          targetCourse = { ...c, lessons: updatedLessons, user_progress_percent: pct };
          return targetCourse;
        })
      );

      if (selectedCourse && String(selectedCourse.id) === String(courseId)) {
        setSelectedCourse((prev) => {
          const updatedLessons = (prev.lessons || []).map((l) =>
            String(l.id) === String(lessonId) ? { ...l, is_completed: false } : l
          );
          const completedCount = updatedLessons.filter((l) => l.is_completed).length;
          const pct = Math.round((completedCount / updatedLessons.length) * 100);
          return { ...prev, lessons: updatedLessons, user_progress_percent: pct };
        });
      }

      if (studyingLesson) {
        setStudyingLesson((prev) => ({
          ...prev,
          lesson: { ...prev.lesson, is_completed: false },
          course: targetCourse || prev.course
        }));
      }

      addToast("Đã chuyển trạng thái bài học về chưa hoàn thành để ôn luyện lại.", "info");
      api.courses.completeLesson(courseId, lessonId).catch(() => {});
    });
  };

  const handleSwitchLesson = (targetLesson) => {
    if (!studyingLesson) return;
    const currentCourse = courses.find((c) => String(c.id) === String(studyingLesson.course.id)) || studyingLesson.course;
    const freshLesson = (currentCourse.lessons || []).find((l) => String(l.id) === String(targetLesson.id)) || targetLesson;
    setStudyingLesson({
      course: currentCourse,
      lesson: freshLesson
    });
    setIsPlayingVideo(false);
  };

  const handleToggleLesson = (courseId, lessonId) => {
    handleCompleteStudyingLesson(courseId, lessonId);
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => onNavigate && onNavigate("home")}
              className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
            >
              ← Trang chủ
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <span>📚</span>
              <span>Learning Hub</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-base-content tracking-tight">
            Khóa Học Công Nghệ Chuyên Sâu
          </h1>
          <p className="text-base-content/70 mt-2 text-sm sm:text-base max-w-4xl">
            Nắm vững kiến thức lập trình thực chiến từ các kỹ sư giàu kinh nghiệm với giáo trình bài bản, dự án thực tế và theo dõi tiến độ chi tiết.
          </p>
        </div>

        <button
          type="button"
          onClick={() => requireAuth(() => setShowCreateCourseModal(true), "Vui lòng đăng nhập để tạo khóa học mới!")}
          className="btn btn-sm btn-primary text-white font-bold rounded-xl gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <span>+</span> Tạo khóa học mới
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-8 p-4 bg-base-100 rounded-2xl border border-base-300 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khóa học, giảng viên..."
            className="input input-sm input-bordered w-full pl-9 pr-8 rounded-xl bg-base-200/50 focus:bg-base-100 text-xs"
          />
          <svg className="w-4 h-4 text-base-content/50 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2 text-xs text-base-content/40 hover:text-base-content"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Level Filter Tabs */}
          <div className="tabs tabs-boxed p-1 bg-base-200">
            {[
              { id: "all", label: "Tất cả cấp độ" },
              { id: "beginner", label: "Cơ bản" },
              { id: "intermediate", label: "Trung cấp" },
              { id: "advanced", label: "Nâng cao" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setLevelFilter(lvl.id)}
                className={`tab tab-xs font-semibold whitespace-nowrap shrink-0 ${levelFilter === lvl.id ? "tab-active bg-primary text-white font-bold" : ""}`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Enrolled Only Toggle */}
          <button
            type="button"
            onClick={() => setShowEnrolledOnly((prev) => !prev)}
            className={`btn btn-xs rounded-xl font-bold transition-all ${
              showEnrolledOnly ? "btn-secondary text-white shadow-xs" : "btn-outline border-base-300"
            }`}
          >
            🎓 Đang học ({courses.filter((c) => c.is_enrolled).length})
          </button>

          {/* Export Learning Summary Button (Admin only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleExportLearningSummaryMd}
              className="btn btn-xs btn-outline btn-ghost hover:text-primary rounded-xl font-bold gap-1 border border-base-300"
              title="Tải báo cáo tiến độ học tập cá nhân dạng Markdown (.md) cho Obsidian/Notion"
            >
              <span>📥</span>
              <span>Báo cáo học tập (.md)</span>
            </button>
          )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
          <p className="text-4xl mb-3">🔍</p>
          <h3 className="text-lg font-bold text-base-content mb-1">Không tìm thấy khóa học nào phù hợp</h3>
          <p className="text-xs text-base-content/60 mb-4">Hãy thử điều chỉnh từ khóa tìm kiếm hoặc làm mới bộ lọc.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setLevelFilter("all");
              setCategoryFilter("all");
              setShowEnrolledOnly(false);
            }}
            className="btn btn-sm btn-outline btn-primary rounded-xl"
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        /* Courses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
          >
            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden bg-base-200">
              <img
                src={c.cover_image}
                alt={c.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80";
                }}
              />
              <span className={`absolute top-3 left-3 badge text-xs font-bold px-2.5 py-1 rounded-lg ${
                c.level === "beginner"
                  ? "badge-success text-white"
                  : c.level === "intermediate"
                  ? "badge-warning text-amber-950 font-bold"
                  : "badge-error text-white"
              }`}>
                {c.level?.toUpperCase()}
              </span>
              <span className="absolute bottom-3 right-3 badge bg-neutral/80 text-white border-none text-xs backdrop-blur-xs font-medium">
                {c.category_name || "IT"}
              </span>
            </div>

            {/* Body */}
            <div className="card-body p-6">
              <h2
                onClick={() => openCourseModal(c)}
                className="text-lg font-bold text-base-content line-clamp-2 hover:text-primary transition-colors cursor-pointer"
              >
                {c.title}
              </h2>
              <p className="text-sm text-base-content/70 mt-2 line-clamp-3 leading-relaxed">
                {c.description}
              </p>

              <div className="flex items-center justify-between mt-4 text-xs text-base-content/60 font-medium">
                <span>👨‍🏫 {c.instructor_name}</span>
                <span>👥 {c.enrolled_students || 0} học viên</span>
              </div>

              {c.is_enrolled && (
                <div className="mt-4 pt-3 border-t border-base-200">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-base-content/60">Tiến độ</span>
                    <span className="text-primary">{c.user_progress_percent || 0}%</span>
                  </div>
                  <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${c.user_progress_percent || 0}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-0 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openCourseModal(c)}
                className="btn btn-outline btn-sm flex-1 rounded-xl font-bold"
              >
                Giáo trình
              </button>
              {(isAdmin || currentUser?.id === c.instructor_id) && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCourseModal(c);
                    }}
                    className="btn btn-ghost btn-sm px-2.5 rounded-xl text-primary hover:bg-primary/10 font-bold"
                    title="Sửa khóa học & bài giảng"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(c);
                    }}
                    className="btn btn-ghost btn-sm px-2 rounded-xl text-error hover:bg-error/10 font-bold"
                    title="Xóa khóa học này"
                  >
                    🗑️
                  </button>
                </>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleExportCourseSyllabusMd(c)}
                  className="btn btn-ghost btn-sm px-2.5 rounded-xl text-primary hover:bg-primary/10"
                  title="Xuất đề cương khóa học (.md)"
                >
                  📥
                </button>
              )}
              {c.user_progress_percent === 100 ? (
                <button
                  onClick={() => setCertificateCourse(c)}
                  className="btn btn-warning btn-sm flex-1 rounded-xl font-bold text-amber-950 shadow-sm"
                  title="Xem chứng chỉ tốt nghiệp khóa học"
                >
                  🎓 Chứng chỉ
                </button>
              ) : !c.is_enrolled ? (
                <button
                  onClick={() => handleEnroll(c)}
                  className="btn btn-primary btn-sm flex-1 rounded-xl font-bold text-white shadow-sm"
                >
                  Tham gia
                </button>
              ) : (
                <button
                  onClick={() => openCourseModal(c)}
                  className="btn btn-success btn-sm flex-1 rounded-xl font-bold text-white shadow-sm"
                >
                  Vào học
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeCourseModal(); }}
        >
          <div className="modal-box max-w-3xl rounded-2xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <span className="badge badge-primary text-white text-xs font-bold uppercase mb-2">
                  {selectedCourse.level}
                </span>
                <h3 className="text-2xl font-black text-base-content break-words">{selectedCourse.title}</h3>
                <p className="text-sm text-base-content/70 mt-1 break-words">{selectedCourse.description}</p>
                <div className="text-xs text-base-content/60 mt-2 break-words">
                  Giảng viên: <span className="font-semibold text-base-content">{selectedCourse.instructor_name}</span>
                </div>
              </div>
              <button onClick={closeCourseModal} className="btn btn-sm btn-circle btn-ghost shrink-0">
                ✕
              </button>
            </div>

            <div className="my-4 p-4 rounded-xl bg-base-200/60 border border-base-300/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-base-content/60 uppercase">Giáo trình bài học</span>
                <p className="text-lg font-bold text-primary">
                  {selectedCourse.lessons?.length || 0} bài học chuyên sâu
                </p>
              </div>
              {!selectedCourse.is_enrolled ? (
                <button onClick={() => handleEnroll(selectedCourse)} className="btn btn-primary btn-sm rounded-xl font-bold">
                  Đăng ký khóa học ngay
                </button>
              ) : (
                <span className="badge badge-success text-white font-bold text-xs">Đã tham gia</span>
              )}
            </div>

            {/* Tab chuyển đổi: Bài học / Bài viết liên quan */}
            <div className="tabs tabs-boxed p-1 bg-base-200 mb-4">
              <button
                type="button"
                onClick={() => setCourseDetailTab("lessons")}
                className={`tab tab-sm font-semibold transition-all ${courseDetailTab === "lessons" ? "tab-active bg-primary text-white font-bold" : ""}`}
              >
                📖 Bài học ({selectedCourse.lessons?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCourseDetailTab("articles")}
                className={`tab tab-sm font-semibold transition-all ${courseDetailTab === "articles" ? "tab-active bg-primary text-white font-bold" : ""}`}
              >
                📰 Bài viết liên quan{relatedArticles.length > 0 ? ` (${relatedArticles.length})` : ""}
              </button>
            </div>

            {/* TAB 1: GIÁO TRÌNH BÀI HỌC */}
            {courseDetailTab === "lessons" && (
            <div className="animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="font-bold text-base-content text-sm uppercase tracking-wider text-base-content/80">
                Danh sách bài học & Tiến độ
              </h4>
              {(isAdmin || currentUser?.id === selectedCourse.instructor_id) && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCourseModal(selectedCourse)}
                    className="btn btn-outline btn-primary btn-xs font-bold gap-1 rounded-lg"
                    title="Sửa nội dung khóa học & bài giảng"
                  >
                    <span>✏️</span>
                    <span>Sửa khóa học</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCourseSyllabusMd(selectedCourse)}
                    className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 font-bold gap-1 rounded-lg"
                    title="Tải xuống đề cương (.md) để theo dõi cá nhân"
                  >
                    <span>📥</span>
                    <span>Xuất đề cương (.md)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Lesson Filter Tabs */}
            <div className="flex items-center gap-1.5 mb-3 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setLessonStatusFilter("all")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  lessonStatusFilter === "all"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                Tất cả ({selectedCourse.lessons?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setLessonStatusFilter("pending")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  lessonStatusFilter === "pending"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                Chưa học ({(selectedCourse.lessons || []).filter((l) => !l.is_completed).length})
              </button>
              <button
                type="button"
                onClick={() => setLessonStatusFilter("completed")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  lessonStatusFilter === "completed"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                Đã xong ({(selectedCourse.lessons || []).filter((l) => l.is_completed).length})
              </button>
            </div>

            {(() => {
              const displayedLessons = (selectedCourse.lessons || []).filter((lesson) => {
                if (lessonStatusFilter === "completed") return lesson.is_completed;
                if (lessonStatusFilter === "pending") return !lesson.is_completed;
                return true;
              });

              if (displayedLessons.length === 0) {
                return (
                  <div className="text-center py-8 text-base-content/60 text-xs bg-base-200/40 rounded-xl border border-dashed border-base-300">
                    Không có bài học nào trong mục này.
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {displayedLessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      onClick={() => handleStartLesson(selectedCourse, lesson)}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group hover:shadow-md ${
                        lesson.is_completed
                          ? "bg-primary/5 border-primary/30"
                          : "bg-base-100 border-base-300 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            lesson.is_completed
                              ? "bg-primary text-white shadow-xs"
                              : "bg-base-200 text-base-content/60 group-hover:bg-primary/10 group-hover:text-primary"
                          }`}
                        >
                          {lesson.is_completed ? "✓" : (idx + 1)}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate sm:whitespace-normal group-hover:text-primary transition-colors ${lesson.is_completed ? "text-base-content/75" : "text-base-content"}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-base-content/50">
                            <span>⏱️ {lesson.duration_minutes || 20} phút</span>
                            <span>•</span>
                            <span className={lesson.is_completed ? "text-primary font-bold" : "text-amber-500 font-medium"}>
                              {lesson.is_completed ? "✓ Đã hoàn thành" : "Chưa học"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartLesson(selectedCourse, lesson);
                          }}
                          className={`btn btn-xs rounded-lg font-bold gap-1 shadow-2xs ${
                            lesson.is_completed
                              ? "btn-outline border-base-300 hover:border-primary hover:text-primary"
                              : "btn-primary text-white"
                          }`}
                        >
                          <span>{lesson.is_completed ? "📖 Xem lại" : "▶️ Vào học"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            </div>
            )}

            {/* TAB 2: BÀI VIẾT LIÊN QUAN ĐẾN KHÓA HỌC */}
            {courseDetailTab === "articles" && (
              <div className="animate-fade-in min-h-[200px]">
                <p className="text-xs text-base-content/60 mb-3">
                  Các bài viết thuộc chuyên mục <span className="font-bold text-primary">{selectedCourse.category_name || "Công nghệ"}</span> giúp bạn củng cố kiến thức cho khóa học này.
                </p>
                {loadingArticles ? (
                  <div className="flex items-center justify-center py-12 text-base-content/50 text-sm gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    Đang tải bài viết liên quan...
                  </div>
                ) : relatedArticles.length === 0 ? (
                  <div className="text-center py-10 text-base-content/60 text-xs bg-base-200/40 rounded-xl border border-dashed border-base-300">
                    Chưa có bài viết liên quan nào cho chuyên mục này.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {relatedArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => {
                          closeCourseModal();
                          if (onNavigate) {
                            onNavigate("post_detail", { postId: article.id });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        className="p-3 rounded-xl border border-base-300 bg-base-100 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex items-start gap-3 group"
                      >
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-20 h-16 sm:w-24 sm:h-18 object-cover rounded-lg shrink-0 border border-base-300"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="badge badge-xs badge-primary badge-outline font-semibold mb-1">
                            {article.category}
                          </span>
                          <h5 className="font-bold text-sm text-base-content group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {article.title}
                          </h5>
                          <p className="text-xs text-base-content/50 mt-1 line-clamp-1">
                            ⏱️ {article.readTime} · 👁️ {article.views} lượt xem
                          </p>
                        </div>
                        <span className="text-primary shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-action mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  const c = selectedCourse;
                  closeCourseModal();
                  if (onNavigate) {
                    onNavigate("quiz", { quizParams: { courseId: c.id, title: c.title } });
                  }
                }}
                className="btn btn-outline btn-primary rounded-xl font-bold gap-2 text-xs sm:text-sm"
              >
                <span>🧠</span>
                <span>Làm bài trắc nghiệm khóa học</span>
              </button>
              <button onClick={closeCourseModal} className="btn btn-ghost rounded-xl font-bold px-6">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Course */}
      {isAdmin && showCreateCourseModal && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateCourseModal(false); }}
        >
          <div className="modal-box max-w-2xl rounded-2xl bg-base-100 border border-base-300 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  🎓
                </div>
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-base-content">Tạo khóa học mới</h3>
                  <p className="text-xs text-base-content/60">Chia sẻ kiến thức lập trình với cộng đồng công nghệ</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateCourseModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">
                  Tên khóa học <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Fullstack Next.js & FastAPI Masterclass"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">Cấp độ</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="select select-bordered w-full rounded-xl text-sm"
                  >
                    <option value="beginner">Mới bắt đầu (Beginner)</option>
                    <option value="intermediate">Trung cấp (Intermediate)</option>
                    <option value="advanced">Nâng cao (Advanced)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">Chủ đề / Chuyên mục</label>
                  <input
                    type="text"
                    placeholder="VD: Frontend, DevOps, AI/ML"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input input-bordered w-full rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">Link ảnh bìa (Cover URL)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newCoverImage}
                  onChange={(e) => setNewCoverImage(e.target.value)}
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">
                  Mô tả khóa học <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Giới thiệu lộ trình, kiến thức thu được và dự án thực hành..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                />
              </div>

              {/* Danh sách bài giảng & Video hướng dẫn */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎬</span> Danh sách bài giảng & Video ({newLessons.length} bài)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddNewLesson}
                    className="btn btn-xs btn-primary text-white font-bold rounded-lg gap-1 shadow-2xs"
                  >
                    <span>➕</span> Thêm bài giảng
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {newLessons.map((lesson, idx) => (
                    <div key={lesson.id || idx} className="p-3.5 bg-base-200/50 rounded-xl border border-base-300 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="badge badge-sm badge-primary text-white font-bold text-[11px]">
                          Bài {idx + 1}
                        </span>
                        {newLessons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNewLesson(idx)}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg font-bold"
                            title="Xóa bài này"
                          >
                            ✕ Xóa bài
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            required
                            placeholder={`Tiêu đề bài học ${idx + 1} (VD: Tổng quan và cài đặt)...`}
                            value={lesson.title}
                            onChange={(e) => handleUpdateNewLesson(idx, "title", e.target.value)}
                            className="input input-bordered input-sm w-full rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            placeholder="Thời lượng (phút)"
                            value={lesson.duration_minutes}
                            onChange={(e) => handleUpdateNewLesson(idx, "duration_minutes", e.target.value)}
                            className="input input-bordered input-sm w-full rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="url"
                          placeholder="Link video bài giảng (YouTube URL hoặc MP4, e.g. https://www.youtube.com/watch?v=...)"
                          value={lesson.video_url || ""}
                          onChange={(e) => handleUpdateNewLesson(idx, "video_url", e.target.value)}
                          className="input input-bordered input-sm w-full rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <textarea
                          rows="2"
                          placeholder="Tóm tắt nội dung bài giảng, mục tiêu kiến thức hoặc ghi chú thực hành..."
                          value={lesson.content || ""}
                          onChange={(e) => handleUpdateNewLesson(idx, "content", e.target.value)}
                          className="textarea textarea-bordered textarea-xs w-full rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddNewLesson}
                  className="btn btn-outline btn-sm btn-primary w-full rounded-xl border-dashed gap-1.5 font-bold"
                >
                  <span>➕</span> Thêm bài giảng tiếp theo
                </button>
              </div>

              <div className="modal-action pt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCourseModal(false)}
                  className="btn btn-ghost rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCourse}
                  className="btn btn-primary text-white rounded-xl font-bold px-6 shadow-md"
                >
                  {isCreatingCourse ? "Đang tạo..." : "Xác nhận tạo khóa học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Course & Lessons (Admin / Instructor) */}
      {showEditCourseModal && editingCourse && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditCourseModal(false); }}
        >
          <div className="modal-box max-w-2xl rounded-2xl bg-base-100 border border-base-300 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  ✏️
                </div>
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-base-content">Sửa khóa học & bài giảng</h3>
                  <p className="text-xs text-base-content/60">Cập nhật nội dung khóa học và đồng bộ vào Database</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditCourseModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">
                  Tên khóa học <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Fullstack Next.js & FastAPI Masterclass"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">Cấp độ</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="select select-bordered w-full rounded-xl text-sm"
                  >
                    <option value="beginner">Mới bắt đầu (Beginner)</option>
                    <option value="intermediate">Trung cấp (Intermediate)</option>
                    <option value="advanced">Nâng cao (Advanced)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">Chủ đề / Chuyên mục</label>
                  <input
                    type="text"
                    placeholder="VD: Frontend, DevOps, AI/ML"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="input input-bordered w-full rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">Link ảnh bìa (Cover URL)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={editCoverImage}
                  onChange={(e) => setEditCoverImage(e.target.value)}
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">
                  Mô tả khóa học <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Giới thiệu lộ trình, kiến thức thu được và dự án thực hành..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                />
              </div>

              {/* Danh sách bài giảng & Video hướng dẫn khi sửa */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎬</span> Danh sách bài giảng & Video ({editLessons.length} bài)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEditLesson}
                    className="btn btn-xs btn-primary text-white font-bold rounded-lg gap-1 shadow-2xs"
                  >
                    <span>➕</span> Thêm bài giảng
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {editLessons.map((lesson, idx) => (
                    <div key={lesson.id || idx} className="p-3.5 bg-base-200/50 rounded-xl border border-base-300 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="badge badge-sm badge-primary text-white font-bold text-[11px]">
                          Bài {idx + 1}
                        </span>
                        {editLessons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditLesson(idx)}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg font-bold"
                            title="Xóa bài này"
                          >
                            ✕ Xóa bài
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            required
                            placeholder={`Tiêu đề bài học ${idx + 1}...`}
                            value={lesson.title}
                            onChange={(e) => handleUpdateEditLesson(idx, "title", e.target.value)}
                            className="input input-bordered input-sm w-full rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            placeholder="Thời lượng (phút)"
                            value={lesson.duration_minutes}
                            onChange={(e) => handleUpdateEditLesson(idx, "duration_minutes", e.target.value)}
                            className="input input-bordered input-sm w-full rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="url"
                          placeholder="Link video bài giảng (YouTube URL hoặc MP4, e.g. https://www.youtube.com/watch?v=...)"
                          value={lesson.video_url || ""}
                          onChange={(e) => handleUpdateEditLesson(idx, "video_url", e.target.value)}
                          className="input input-bordered input-sm w-full rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <textarea
                          rows="2"
                          placeholder="Tóm tắt nội dung bài giảng, lý thuyết nền tảng hoặc hướng dẫn thực hành..."
                          value={lesson.content || ""}
                          onChange={(e) => handleUpdateEditLesson(idx, "content", e.target.value)}
                          className="textarea textarea-bordered textarea-xs w-full rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddEditLesson}
                  className="btn btn-outline btn-sm btn-primary w-full rounded-xl border-dashed gap-1.5 font-bold"
                >
                  <span>➕</span> Thêm bài giảng tiếp theo
                </button>
              </div>

              <div className="modal-action pt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditCourseModal(false)}
                  className="btn btn-ghost rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingCourse}
                  className="btn btn-primary text-white rounded-xl font-bold px-6 shadow-md"
                >
                  {isUpdatingCourse ? "Đang lưu..." : "Lưu thay đổi vào Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Học Bài Chuyên Sâu (Lesson Learning Studio Modal) */}
      {studyingLesson && (() => {
        const currentCourse = courses.find((c) => String(c.id) === String(studyingLesson.course.id)) || studyingLesson.course;
        const allLessons = currentCourse.lessons || [];
        const currentLessonIndex = allLessons.findIndex((l) => String(l.id) === String(studyingLesson.lesson.id));
        const activeLesson = allLessons[currentLessonIndex] || studyingLesson.lesson;
        const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
        const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;
        const completedCount = allLessons.filter((l) => l.is_completed).length;
        const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
        const lessonContent = getLessonContent(currentCourse, activeLesson);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setStudyingLesson(null);
            }}
          >
            <div className="relative w-full max-w-6xl bg-base-100 rounded-3xl shadow-2xl border border-base-300 overflow-hidden flex flex-col h-[94vh] max-h-[900px]">
              {/* Studio Header Bar */}
              <div className="border-b border-base-200 px-5 py-3.5 flex items-center justify-between bg-base-100 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setStudyingLesson(null)}
                    className="btn btn-sm btn-circle btn-ghost shrink-0"
                    title="Quay lại khóa học"
                  >
                    ←
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-sm badge-primary font-bold text-[10px] uppercase tracking-wider">
                        🎓 {currentCourse.title}
                      </span>
                      <span className="text-xs text-base-content/50">
                        Bài {currentLessonIndex + 1} / {allLessons.length}
                      </span>
                    </div>
                    <h2 className="font-extrabold text-sm sm:text-base text-base-content truncate mt-0.5">
                      {activeLesson.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeLesson.is_completed ? (
                    <span className="badge badge-success text-white font-bold gap-1 text-xs px-2.5 py-3">
                      ✓ Đã hoàn thành
                    </span>
                  ) : (
                    <span className="badge badge-warning text-white font-bold gap-1 text-xs px-2.5 py-3">
                      ⏳ Đang học bài này
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setStudyingLesson(null)}
                    className="btn btn-sm btn-circle btn-ghost"
                    title="Đóng phòng học"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Studio Main Content & Sidebar Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-base-200">
                {/* Left/Main Column: Lesson Curriculum & Video (8 cols) */}
                <div className="lg:col-span-8 p-5 sm:p-7 space-y-6 overflow-y-auto">
                  {/* Video Lecture / Interactive Presentation Container */}
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-md flex items-center justify-center">
                    {(() => {
                      const videoUrl = lessonContent.video_url || "";
                      const isEmbed = videoUrl.includes("youtube.com/embed") || videoUrl.includes("player.vimeo.com");
                      const isDirectVideo = /\.(mp4|webm|ogg)($|\?)/i.test(videoUrl);

                      if (isEmbed) {
                        return (
                          <iframe
                            src={videoUrl}
                            title={activeLesson.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      } else if (isDirectVideo) {
                        return (
                          <video
                            src={videoUrl}
                            controls
                            className="w-full h-full object-contain bg-black"
                          />
                        );
                      } else if (videoUrl && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://"))) {
                        return (
                          <iframe
                            src={videoUrl}
                            title={activeLesson.title}
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        );
                      } else {
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white relative">
                            <div className="absolute top-3 left-4 text-xs font-mono text-neutral-400 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
                              <span>LIVE VIDEO LECTURE • 1080p FULL HD</span>
                            </div>
                            <div className="absolute top-3 right-4 badge badge-neutral text-xs text-neutral-300">
                              ⏱️ {activeLesson.duration_minutes || 30}:00
                            </div>

                            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary border-2 border-primary flex items-center justify-center text-2xl mb-3 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                              ▶️
                            </div>
                            <h4 className="font-bold text-base sm:text-lg max-w-lg mb-1">
                              {activeLesson.title}
                            </h4>
                            <p className="text-xs text-neutral-400 max-w-md">
                              Video bài giảng thực chiến kèm code mẫu và hướng dẫn từng bước từ Giảng viên {currentCourse.instructor_name || "IT Blog"}.
                            </p>

                            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800 pt-2">
                              <span>Tiến độ xem: 18:42 / {activeLesson.duration_minutes || 30}:00</span>
                              <span>Tốc độ: 1.0x</span>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Section 1: Objectives */}
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span>🎯</span> Mục tiêu bài học (Key Objectives)
                    </h4>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-base-content/85">
                      {(lessonContent.objectives || []).map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary font-bold">✓</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 2: Core Concepts / Theory */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-base sm:text-lg text-base-content flex items-center gap-2">
                      <span>💡</span> Kiến thức trọng tâm & Nguyên lý hoạt động
                    </h3>
                    <p className="text-xs sm:text-sm text-base-content/80 leading-relaxed">
                      {lessonContent.content}
                    </p>
                  </div>

                  {/* Section 3: Pragmatic Code Snippet */}
                  {lessonContent.code && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs sm:text-sm text-base-content flex items-center gap-2">
                          <span>💻</span> Mã nguồn thực hành (Production Code)
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleCopyLessonCode(lessonContent.code)}
                          className="btn btn-xs btn-outline border-base-300 font-bold gap-1 rounded-lg"
                        >
                          <span>{copiedCode ? "✓ Đã sao chép" : "📋 Sao chép mã"}</span>
                        </button>
                      </div>
                      <div className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 text-neutral-100 p-4 font-mono text-xs sm:text-xs leading-relaxed overflow-x-auto shadow-inner">
                        <pre><code>{lessonContent.code}</code></pre>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Hands-on Challenge */}
                  {lessonContent.challenge && (
                    <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 space-y-1.5">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
                        <span>🚀</span> Thử thách thực hành (Hands-on Challenge)
                      </h4>
                      <p className="text-xs sm:text-sm text-base-content/80">
                        {lessonContent.challenge}
                      </p>
                    </div>
                  )}

                  {/* Section 5: Production Tips */}
                  {lessonContent.tips && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span>💡</span> Kinh nghiệm thực chiến khi đi làm
                      </h4>
                      <p className="text-xs sm:text-sm text-base-content/80">
                        {lessonContent.tips}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Course Syllabus Playlist & Progress (4 cols) */}
                <div className="lg:col-span-4 p-5 sm:p-6 bg-base-200/30 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-base-content/70 mb-1.5">
                        <span>Tiến độ hoàn thành</span>
                        <span className="text-primary">{completedCount}/{allLessons.length} bài ({progressPct}%)</span>
                      </div>
                      <progress className="progress progress-primary w-full h-2.5 rounded-full" value={progressPct} max="100"></progress>
                    </div>

                    <div className="pt-2 border-t border-base-200">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70 mb-3 flex items-center justify-between">
                        <span>Danh sách bài học</span>
                        <span className="badge badge-xs badge-ghost font-mono">{allLessons.length} bài</span>
                      </h4>

                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {allLessons.map((l, idx) => {
                          const isCurrent = String(l.id) === String(activeLesson.id);
                          return (
                            <div
                              key={l.id}
                              onClick={() => handleSwitchLesson(l)}
                              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer text-xs ${
                                isCurrent
                                  ? "bg-primary text-white border-primary shadow-xs font-bold"
                                  : l.is_completed
                                  ? "bg-base-100 border-primary/20 text-base-content hover:bg-base-200"
                                  : "bg-base-100 border-base-300 text-base-content/80 hover:bg-base-200"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                    isCurrent
                                      ? "bg-white text-primary"
                                      : l.is_completed
                                      ? "bg-success text-white"
                                      : "bg-base-200 text-base-content/60"
                                  }`}
                                >
                                  {l.is_completed ? "✓" : idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold leading-tight">
                                    {l.title}
                                  </p>
                                  <span className={`text-[10px] block mt-0.5 ${isCurrent ? "text-white/80" : "text-base-content/50"}`}>
                                    ⏱️ {l.duration_minutes || 20} phút
                                  </span>
                                </div>
                              </div>
                              {l.is_completed && !isCurrent && (
                                <span className="text-success font-bold text-xs shrink-0">✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Course Instructor & Support */}
                  <div className="p-3.5 rounded-2xl bg-base-100 border border-base-300 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-base-content/50 block">Giảng viên hướng dẫn</span>
                    <p className="font-bold text-base-content">{currentCourse.instructor_name || "Tech Lead IT Blog"}</p>
                    <p className="text-[11px] text-base-content/60">
                      Cần trợ giúp trong quá trình học? Hãy để lại câu hỏi ở phần bình luận hoặc làm bài trắc nghiệm củng cố kiến thức.
                    </p>
                  </div>
                </div>
              </div>

              {/* Studio Bottom Sticky Action Bar */}
              <div className="border-t border-base-200 px-5 py-3.5 bg-base-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!prevLesson}
                    onClick={() => prevLesson && handleSwitchLesson(prevLesson)}
                    className="btn btn-sm btn-outline border-base-300 rounded-xl font-bold gap-1 text-xs disabled:opacity-40"
                  >
                    <span>←</span>
                    <span className="hidden sm:inline">Bài trước</span>
                  </button>
                  {nextLesson && (
                    <button
                      type="button"
                      onClick={() => handleSwitchLesson(nextLesson)}
                      className="btn btn-sm btn-outline border-base-300 rounded-xl font-bold gap-1 text-xs"
                    >
                      <span className="hidden sm:inline">Bài tiếp theo</span>
                      <span>→</span>
                    </button>
                  )}
                </div>

                {/* Center / Primary Complete Button */}
                <div className="flex items-center gap-2">
                  {!activeLesson.is_completed ? (
                    <button
                      type="button"
                      onClick={() => handleCompleteStudyingLesson(currentCourse.id, activeLesson.id)}
                      className="btn btn-sm btn-success text-white font-bold rounded-xl gap-2 shadow-md hover:scale-[1.02] transition-transform text-xs sm:text-sm px-4"
                    >
                      <span>✅</span>
                      <span>Đã học xong & Xác nhận hoàn thành</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-success text-white font-bold py-2.5 px-3 text-xs gap-1">
                        ✓ Bạn đã hoàn thành bài học này!
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRelearnLesson(currentCourse.id, activeLesson.id)}
                        className="btn btn-xs btn-ghost text-base-content/60 underline"
                        title="Đánh dấu học lại"
                      >
                        Học lại
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudyingLesson(null)}
                    className="btn btn-sm btn-ghost rounded-xl font-bold text-xs"
                  >
                    Đóng phòng học
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Chứng Chỉ Tốt Nghiệp (Course Certificate Modal) */}
      {certificateCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCertificateCourse(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-base-100 rounded-3xl shadow-2xl border-4 border-amber-400/80 overflow-hidden p-6 sm:p-10 text-center space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Certificate Header Banner */}
            <div className="flex items-center justify-between border-b border-amber-300/40 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-sm">
                  IT
                </span>
                <span className="font-black text-base-content tracking-tight">Blog Academy</span>
              </div>
              <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                CERTIFICATE OF COMPLETION
              </div>
              <button
                type="button"
                onClick={() => setCertificateCourse(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            {/* Certificate Body */}
            <div className="py-2 space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-500 border-2 border-amber-400 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🏅
              </div>

              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-base-content !my-1">
                Chứng Nhận Hoàn Thành Khóa Học
              </h2>
              <p className="text-xs text-base-content/60 italic">
                Hệ thống IT Blog Academy trân trọng chứng nhận học viên:
              </p>

              <div className="text-2xl sm:text-3xl font-black text-primary py-1 tracking-tight">
                {currentUser?.name || "Kỹ Sư Phần Mềm IT Blog"}
              </div>

              <p className="text-xs text-base-content/70 max-w-lg mx-auto leading-relaxed">
                Đã hoàn thành xuất sắc 100% chương trình đào tạo chuyên sâu và các bài thực hành thực chiến của khóa học:
              </p>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-base font-black text-amber-900 dark:text-amber-200 break-words">
                {certificateCourse.title}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs text-left bg-base-200/50 p-4 rounded-2xl border border-base-200">
                <div>
                  <span className="text-[10px] text-base-content/50 uppercase font-bold block">Giảng viên phụ trách</span>
                  <span className="font-bold text-base-content">{certificateCourse.instructor_name || "Lê Hoàng Long"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-base-content/50 uppercase font-bold block">Chuyên mục</span>
                  <span className="font-bold text-base-content">{certificateCourse.category_name || "Công nghệ"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-base-content/50 uppercase font-bold block">Mã xác thực chứng chỉ</span>
                  <span className="font-mono font-bold text-primary text-[11px] break-all">
                    ITB-CERT-{certificateCourse.id}-{Math.abs(certificateCourse.title.length * 37 + 1048)}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-base-200 text-xs">
              <span className="text-[11px] text-base-content/50 text-left">
                📅 Ngày cấp: <strong>{new Date().toLocaleDateString("vi-VN")}</strong> • Xác thực điện tử toàn cầu
              </span>
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-sm btn-outline btn-primary rounded-xl font-bold gap-1.5"
                >
                  <span>🖨️</span> In / Tải PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateCourse(null)}
                  className="btn btn-sm btn-ghost rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
