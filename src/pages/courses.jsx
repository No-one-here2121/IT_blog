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
      { id: 31, title: "Bài 1: Docker Multi-Stage Build tối ưu hoá dung lượng", duration_minutes: 25, is_completed: false },
      { id: 32, title: "Bài 2: Thiết lập K8s Deployment, Service và HPA", duration_minutes: 45, is_completed: false }
    ]
  }
];

export default function CoursesPage({ onNavigate, params }) {
  const { currentUser, requireAuth, loginDemo, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [courses, setCourses] = useState(INITIAL_COURSES);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [certificateCourse, setCertificateCourse] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const [lessonStatusFilter, setLessonStatusFilter] = useState("all");

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
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  useEffect(() => {
    if (params?.action === "create") {
      setShowCreateCourseModal(true);
    }
  }, [params]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLevel, setNewLevel] = useState("beginner");
  const [newCategoryName, setNewCategoryName] = useState("Backend");
  const [newCoverImage, setNewCoverImage] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState(25);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  useEffect(() => {
    api.courses.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    if (!currentUser) {
      requireAuth(() => handleCreateCourse(e), "Vui lòng đăng nhập để lưu khóa học!");
      return;
    }
    setIsCreatingCourse(true);
    try {
      const created = await api.courses.create({
        title: newTitle.trim(),
        description: newDesc.trim(),
        level: newLevel,
        cover_image: newCoverImage.trim() || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
        lessons: [
          {
            title: newLessonTitle.trim() || "Bài 1: Tổng quan và cài đặt môi trường",
            duration_minutes: parseInt(newLessonDuration, 10) || 20,
            order_index: 0
          }
        ]
      });

      const formatted = {
        ...created,
        instructor_name: created.instructor_name || "Giảng viên IT Blog",
        category_name: newCategoryName,
        total_lessons: created.lessons?.length || 1,
        enrolled_students: 1,
        is_enrolled: true,
        user_progress_percent: 0
      };

      setCourses((prev) => [formatted, ...prev]);
      addToast(`Đã tạo khóa học mới "${newTitle}" thành công! 🎓`, "success");
      setShowCreateCourseModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewCoverImage("");
      setNewLessonTitle("");
    } catch (err) {
      addToast(err?.message || "Lỗi khi tạo khóa học.", "error");
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleEnroll = (course) => {
    requireAuth(() => {
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_enrolled: true, enrolled_students: (c.enrolled_students || 0) + 1 } : c))
      );
      if (selectedCourse && selectedCourse.id === course.id) {
        setSelectedCourse((prev) => ({ ...prev, is_enrolled: true }));
      }
      addToast(`Chúc mừng! Bạn đã đăng ký thành công khóa học: ${course.title} 🎓`, "success");
      api.courses.enroll(course.id).catch(() => {});
    }, "Vui lòng đăng nhập để tham gia khóa học!");
  };

  const handleToggleLesson = (courseId, lessonId) => {
    requireAuth(() => {
      let finalPct = 0;
      let targetCourse = null;

      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          const updatedLessons = (c.lessons || []).map((l) =>
            l.id === lessonId ? { ...l, is_completed: !l.is_completed } : l
          );
          const completedCount = updatedLessons.filter((l) => l.is_completed).length;
          const pct = Math.round((completedCount / updatedLessons.length) * 100);
          finalPct = pct;
          targetCourse = { ...c, lessons: updatedLessons, user_progress_percent: pct };
          return targetCourse;
        })
      );

      if (selectedCourse && selectedCourse.id === courseId) {
        setSelectedCourse((prev) => {
          const updatedLessons = (prev.lessons || []).map((l) =>
            l.id === lessonId ? { ...l, is_completed: !l.is_completed } : l
          );
          const completedCount = updatedLessons.filter((l) => l.is_completed).length;
          const pct = Math.round((completedCount / updatedLessons.length) * 100);
          return {
            ...prev,
            lessons: updatedLessons,
            user_progress_percent: pct
          };
        });
      }

      if (finalPct === 100 && targetCourse) {
        addToast("🎉 Chúc mừng! Bạn đã hoàn thành 100% khóa học và nhận được Chứng chỉ Tốt nghiệp!", "success");
        setCertificateCourse(targetCourse);
      } else {
        addToast("Đã ghi nhận hoàn thành bài học! 🎯", "success");
      }
      api.courses.completeLesson(courseId, lessonId).catch(() => {});
    }, "Vui lòng đăng nhập để lưu tiến độ bài học!");
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

          {/* Export Learning Summary Button */}
          <button
            type="button"
            onClick={handleExportLearningSummaryMd}
            className="btn btn-xs btn-outline btn-ghost hover:text-primary rounded-xl font-bold gap-1 border border-base-300"
            title="Tải báo cáo tiến độ học tập cá nhân dạng Markdown (.md) cho Obsidian/Notion"
          >
            <span>📥</span>
            <span>Báo cáo học tập (.md)</span>
          </button>
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
                onClick={() => setSelectedCourse(c)}
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
            <div className="px-6 pb-6 pt-0 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse(c);
                  setLessonStatusFilter("all");
                }}
                className="btn btn-outline btn-sm flex-1 rounded-xl font-bold"
              >
                Giáo trình
              </button>
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
                  onClick={() => {
                    setSelectedCourse(c);
                    setLessonStatusFilter("all");
                  }}
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
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCourse(null); }}
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
              <button onClick={() => setSelectedCourse(null)} className="btn btn-sm btn-circle btn-ghost shrink-0">
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

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="font-bold text-base-content text-sm uppercase tracking-wider text-base-content/80">
                Danh sách bài học & Tiến độ
              </h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleExportCourseSyllabusMd(selectedCourse)}
                  className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 font-bold gap-1 rounded-lg"
                  title="Tải xuống đề cương (.md) để theo dõi cá nhân"
                >
                  <span>📥</span>
                  <span>Xuất đề cương (.md)</span>
                </button>
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
                      onClick={() => selectedCourse.is_enrolled && handleToggleLesson(selectedCourse.id, lesson.id)}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        selectedCourse.is_enrolled ? "cursor-pointer" : ""
                      } ${
                        lesson.is_completed
                          ? "bg-primary/5 border-primary/30"
                          : "bg-base-100 border-base-300 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={lesson.is_completed}
                          disabled={!selectedCourse.is_enrolled}
                          readOnly
                          className="checkbox checkbox-primary checkbox-sm mt-0.5 pointer-events-none"
                        />
                        <div>
                          <p className={`font-bold text-sm ${lesson.is_completed ? "line-through text-base-content/50" : "text-base-content"}`}>
                            {lesson.title}
                          </p>
                          <span className="text-xs text-base-content/50">⏱️ {lesson.duration_minutes || 20} phút</span>
                        </div>
                      </div>
                      <span className="badge badge-ghost badge-sm text-xs">Bài {idx + 1}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="modal-action mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  const c = selectedCourse;
                  setSelectedCourse(null);
                  if (onNavigate) {
                    onNavigate("quiz", { quizParams: { courseId: c.id, title: c.title } });
                  }
                }}
                className="btn btn-outline btn-primary rounded-xl font-bold gap-2 text-xs sm:text-sm"
              >
                <span>🧠</span>
                <span>Làm bài trắc nghiệm khóa học</span>
              </button>
              <button onClick={() => setSelectedCourse(null)} className="btn btn-ghost rounded-xl font-bold px-6">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Course */}
      {showCreateCourseModal && (
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

              <div className="p-4 bg-base-200/50 rounded-xl border border-base-300/50 space-y-3">
                <p className="text-xs font-bold text-base-content/80 flex items-center gap-1.5">
                  <span>📖</span> Bài giảng khởi đầu (Lesson 1)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Tiêu đề bài 1 (VD: Cài đặt môi trường)"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      placeholder="Thời lượng (phút)"
                      value={newLessonDuration}
                      onChange={(e) => setNewLessonDuration(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-lg text-xs"
                    />
                  </div>
                </div>
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
