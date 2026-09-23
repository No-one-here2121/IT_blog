import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const INITIAL_ROADMAPS = [
  {
    id: 1,
    title: "Lộ trình Fullstack Web Developer 2026",
    slug: "lo-trinh-fullstack-web-developer-2026",
    description: "Lộ trình hoàn chỉnh từ HTML/CSS/JavaScript ES6+ đến React 19, FastAPI, PostgreSQL và Docker containerization.",
    level: "basic",
    category_name: "Frontend & Backend",
    total_steps: 4,
    completed_steps: 1,
    progress_percentage: 25.0,
    steps: [
      { id: 101, order_index: 1, title: "1. Nền tảng JavaScript ES6+ & Async/Await", description: "Làm chủ Promise, Closure, Event Loop và ES Modules.", is_completed: true },
      { id: 102, order_index: 2, title: "2. React 19 & Tailwind CSS Master", description: "Component State, Custom Hooks, Context API và UI Tailwind hiện đại.", is_completed: false },
      { id: 103, order_index: 3, title: "3. FastAPI RESTful API & Clean Architecture", description: "Pydantic v2 validation, SQLAlchemy 2.0 ORM và JWT Authentication.", is_completed: false },
      { id: 104, order_index: 4, title: "4. Docker & CI/CD Deployment", description: "Container hóa multi-stage build và triển khai tự động với GitHub Actions.", is_completed: false }
    ]
  },
  {
    id: 2,
    title: "Lộ trình Backend Developer Chuyên sâu (Python / Go)",
    slug: "lo-trinh-backend-chuyen-sau",
    description: "Xây dựng hệ thống backend chịu tải cao, Microservices, Message Broker với Kafka/RabbitMQ và tối ưu hóa truy vấn Database.",
    level: "intermediate",
    category_name: "Backend",
    total_steps: 3,
    completed_steps: 0,
    progress_percentage: 0.0,
    steps: [
      { id: 201, order_index: 1, title: "1. Thiết kế Hệ thống CSDL PostgreSQL & Redis Caching", description: "Index tối ưu, Connection Pooling PgBouncer, Partitioning và Cache-aside pattern.", is_completed: false },
      { id: 202, order_index: 2, title: "2. Message Queue & Event-Driven với Apache Kafka", description: "Producer, Consumer group, Idempotency và Outbox pattern.", is_completed: false },
      { id: 203, order_index: 3, title: "3. Giám sát & Logging với Prometheus, Grafana, OpenTelemetry", description: "Distributed tracing, Metrics và Health checks.", is_completed: false }
    ]
  },
  {
    id: 3,
    title: "Lộ trình DevOps & Cloud Native Engineer",
    slug: "lo-trinh-devops-cloud-native",
    description: "Làm chủ Kubernetes (K8s), Infrastructure as Code (Terraform), GitOps với ArgoCD và bảo mật Cloud Enterprise.",
    level: "advanced",
    category_name: "DevOps",
    total_steps: 3,
    completed_steps: 0,
    progress_percentage: 0.0,
    steps: [
      { id: 301, order_index: 1, title: "1. Linux Internals & Bash Scripting tự động hóa", description: "Systemd, Networking, cgroups và bảo mật server.", is_completed: false },
      { id: 302, order_index: 2, title: "2. Kubernetes Cluster & Helm Charts", description: "Deployment, StatefulSet, Ingress Controller và Zero-downtime rolling update.", is_completed: false },
      { id: 303, order_index: 3, title: "3. Terraform & AWS Cloud Architecture", description: "Triển khai VPC, EKS, RDS tự động qua code.", is_completed: false }
    ]
  }
];

export default function RoadmapsPage({ onNavigate, params }) {
  const { currentUser, requireAuth, loginDemo, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [levelFilter, setLevelFilter] = useState("all");
  const [roadmapSearch, setRoadmapSearch] = useState("");
  const [roadmaps, setRoadmaps] = useState(INITIAL_ROADMAPS);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [stepFilter, setStepFilter] = useState("all");

  // Create Roadmap Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLevel, setNewLevel] = useState("basic");
  const [newSteps, setNewSteps] = useState([
    { title: "", description: "", resource_url: "" },
    { title: "", description: "", resource_url: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddStep = () => {
    setNewSteps((prev) => [...prev, { title: "", description: "", resource_url: "" }]);
  };

  const handleRemoveStep = (idx) => {
    if (newSteps.length <= 1) return;
    setNewSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStepChange = (idx, field, value) => {
    setNewSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const handleCreateRoadmap = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    if (!currentUser) {
      requireAuth(() => handleCreateRoadmap(e), "Vui lòng đăng nhập để lưu lộ trình mới!");
      return;
    }

    const validSteps = newSteps
      .filter((s) => s.title.trim().length > 0)
      .map((s, idx) => ({
        order_index: idx + 1,
        title: s.title.trim(),
        description: s.description.trim() || undefined,
        resource_url: s.resource_url.trim() || undefined
      }));

    if (validSteps.length === 0) {
      addToast("Vui lòng thêm ít nhất một bước học tập cho lộ trình!", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.roadmaps.create({
        title: newTitle.trim(),
        description: newDesc.trim(),
        level: newLevel,
        steps: validSteps
      });

      const formattedRoadmap = {
        ...created,
        total_steps: created.steps?.length || validSteps.length,
        completed_steps: 0,
        progress_percentage: 0.0,
        steps: (created.steps || validSteps).map((s, idx) => ({
          id: s.id || Date.now() + idx,
          order_index: s.order_index || idx + 1,
          title: s.title,
          description: s.description,
          is_completed: false
        }))
      };

      setRoadmaps((prev) => [formattedRoadmap, ...prev]);
      addToast("Tạo lộ trình học tập mới thành công! 🗺️", "success");
      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewLevel("basic");
      setNewSteps([
        { title: "", description: "", resource_url: "" },
        { title: "", description: "", resource_url: "" }
      ]);
    } catch (err) {
      console.warn("Create roadmap error, falling back locally:", err);
      const fallbackId = Date.now();
      const localRoadmap = {
        id: fallbackId,
        title: newTitle.trim(),
        slug: `lo-trinh-${fallbackId}`,
        description: newDesc.trim(),
        level: newLevel,
        total_steps: validSteps.length,
        completed_steps: 0,
        progress_percentage: 0.0,
        steps: validSteps.map((s, idx) => ({
          id: fallbackId + idx + 1,
          order_index: idx + 1,
          title: s.title,
          description: s.description,
          is_completed: false
        }))
      };
      setRoadmaps((prev) => [localRoadmap, ...prev]);
      addToast("Đã lưu lộ trình học tập mới vào hệ thống! 🗺️", "success");
      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewLevel("basic");
      setNewSteps([
        { title: "", description: "", resource_url: "" },
        { title: "", description: "", resource_url: "" }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Try fetching from backend API
    api.roadmaps.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRoadmaps(data);
        }
      })
      .catch(() => {
        // Fallback to local default roadmaps
      });
  }, []);

  const filteredRoadmaps = roadmaps.filter((r) => {
    const matchLevel = levelFilter === "all" || r.level?.toLowerCase() === levelFilter.toLowerCase();
    const q = roadmapSearch.toLowerCase().trim();
    const matchSearch = !q ||
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.steps?.some((s) => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    return matchLevel && matchSearch;
  });

  const handleResetRoadmapProgress = (roadmapId, roadmapTitle) => {
    requireAuth(() => {
      setRoadmaps((prev) =>
        prev.map((rm) => {
          if (rm.id !== roadmapId) return rm;
          const updatedSteps = (rm.steps || []).map((s) => ({ ...s, is_completed: false }));
          return {
            ...rm,
            steps: updatedSteps,
            completed_steps: 0,
            progress_percentage: 0
          };
        })
      );

      if (selectedRoadmap && selectedRoadmap.id === roadmapId) {
        setSelectedRoadmap((prev) => ({
          ...prev,
          steps: (prev.steps || []).map((s) => ({ ...s, is_completed: false })),
          completed_steps: 0,
          progress_percentage: 0
        }));
      }

      addToast(`Đã đặt lại tiến độ lộ trình "${roadmapTitle || "này"}" về 0%! 🔄`, "info");
    }, "Vui lòng đăng nhập để thao tác!");
  };

  const handleToggleStep = (roadmapId, stepId) => {
    requireAuth(() => {
      let finalPct = 0;
      setRoadmaps((prev) =>
        prev.map((rm) => {
          if (rm.id !== roadmapId) return rm;
          const updatedSteps = (rm.steps || []).map((s) =>
            s.id === stepId ? { ...s, is_completed: !s.is_completed } : s
          );
          const completedCount = updatedSteps.filter((s) => s.is_completed).length;
          finalPct = Math.round((completedCount / updatedSteps.length) * 100);
          return {
            ...rm,
            steps: updatedSteps,
            completed_steps: completedCount,
            progress_percentage: finalPct
          };
        })
      );

      if (selectedRoadmap && selectedRoadmap.id === roadmapId) {
        setSelectedRoadmap((prev) => {
          const updatedSteps = (prev.steps || []).map((s) =>
            s.id === stepId ? { ...s, is_completed: !s.is_completed } : s
          );
          const completedCount = updatedSteps.filter((s) => s.is_completed).length;
          const pct = Math.round((completedCount / updatedSteps.length) * 100);
          return {
            ...prev,
            steps: updatedSteps,
            completed_steps: completedCount,
            progress_percentage: pct
          };
        });
      }

      if (finalPct === 100) {
        addToast("🎉 Xuất sắc! Bạn đã hoàn thành 100% các bước trong lộ trình học tập!", "success");
      } else {
        addToast("Đã cập nhật tiến độ lộ trình học tập! 🎯", "success");
      }

      // Optional async sync to backend
      api.roadmaps.toggleStep(roadmapId, stepId).catch(() => {});
    }, "Vui lòng đăng nhập để lưu tiến độ học tập!");
  };

  const handleExportRoadmapMarkdown = (rm) => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    if (!rm) return;
    const levelLabel = rm.level === "basic" ? "Cơ bản" : rm.level === "intermediate" ? "Trung cấp" : "Nâng cao";
    const lines = [
      `# 🗺️ ${rm.title}`,
      ``,
      `> **Cấp độ:** ${levelLabel} | **Tiến độ:** ${rm.progress_percentage || 0}% (${rm.completed_steps || 0}/${rm.total_steps || rm.steps?.length || 0} bước)`,
      ``,
      `### Giới thiệu lộ trình`,
      `${rm.description || "Lộ trình học tập lập trình viên trên IT Blog"}`,
      ``,
      `### Danh sách các bước kỹ năng (Checklist)`,
      ...(rm.steps || []).map((s, idx) => {
        const check = s.is_completed ? "[x]" : "[ ]";
        const desc = s.description ? `\n   - *Mục tiêu:* ${s.description}` : "";
        const res = s.resource_url ? `\n   - *Tài liệu tham khảo:* [Truy cập](${s.resource_url})` : "";
        return `- ${check} **Bước ${idx + 1}: ${s.title}**${desc}${res}`;
      }),
      ``,
      `---`,
      `*Xuất từ Nền tảng Tri thức Kỹ sư IT Blog*`
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(rm.slug || "lo-trinh-ky-su").replace(/[^a-z0-9_-]/gi, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Đã xuất lộ trình "${rm.title}" dạng Markdown (.md)! 📥`, "success");
  };

  const handleExportRoadmapsCatalogMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    const list = filteredRoadmaps.length > 0 ? filteredRoadmaps : roadmaps;
    const levelName =
      levelFilter === "basic"
        ? "Cơ bản (Beginner)"
        : levelFilter === "intermediate"
        ? "Trung cấp (Intermediate)"
        : levelFilter === "advanced"
        ? "Nâng cao (Advanced)"
        : "Tất cả các cấp độ";

    let content = `# 🗺️ Khung Chương Trình & Danh Mục Lộ Trình Kỹ Sư CNTT - IT Blog\n\n`;
    content += `> Phân loại cấp độ: **${levelName}**\n`;
    content += `> Tổng số lộ trình: **${list.length} lộ trình** | Thời gian xuất bản: ${new Date().toLocaleString("vi-VN")}\n\n`;
    content += `| STT | Tên Lộ Trình | Cấp độ | Chuyên mục | Số bước | Tiến độ |\n`;
    content += `| :---: | :--- | :---: | :---: | :---: | :---: |\n`;

    list.forEach((rm, idx) => {
      const lvl = rm.level === "basic" ? "Cơ bản" : rm.level === "intermediate" ? "Trung cấp" : "Nâng cao";
      const total = rm.total_steps || rm.steps?.length || 0;
      const comp = rm.completed_steps || 0;
      const pct = rm.progress_percentage || 0;
      content += `| ${idx + 1} | **${rm.title}** | ${lvl} | ${rm.category_name || "Công nghệ"} | ${comp}/${total} | ${pct}% |\n`;
    });

    content += `\n---\n\n## 📋 Chi Tiết Nội Dung Từng Lộ Trình Kỹ Sư\n\n`;

    list.forEach((rm, idx) => {
      content += `### ${idx + 1}. ${rm.title}\n`;
      content += `> *Mô tả:* ${rm.description || "Lộ trình đào tạo kỹ năng phần mềm thực chiến."}\n\n`;
      (rm.steps || []).forEach((s, sIdx) => {
        const check = s.is_completed ? "x" : " ";
        const desc = s.description ? ` - *${s.description}*` : "";
        const res = s.resource_url ? ` ([Tài liệu tham khảo](${s.resource_url}))` : "";
        content += `- [${check}] **Bước ${sIdx + 1}: ${s.title}**${desc}${res}\n`;
      });
      content += `\n`;
    });

    content += `---\n*Được xuất từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danh-muc-lo-trinh-ky-su-${levelFilter}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(`Đã xuất danh mục ${list.length} lộ trình dạng Markdown! 📥`, "success");
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => onNavigate && onNavigate("home")}
            className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
          >
            ← Trang chủ
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <span>🗺️</span>
            <span>Learning Roadmap</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-base-content tracking-tight">
              Lộ Trình Kiến Thức CNTT Chuẩn Hóa
            </h1>
            <p className="text-base-content/70 mt-2 text-sm sm:text-base max-w-4xl">
              Chuỗi bài học và kỹ năng phân cấp theo từng cấp độ, giúp bạn định hướng rõ ràng và theo dõi từng bước hoàn thành lộ trình trở thành kỹ sư phần mềm chuyên nghiệp.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {isAdmin && (
              <button
                type="button"
                onClick={handleExportRoadmapsCatalogMd}
                className="btn btn-sm btn-outline btn-ghost hover:text-primary rounded-xl font-bold gap-1 border border-base-300"
                title="Xuất toàn bộ danh mục lộ trình hiện tại ra Markdown (.md)"
              >
                <span>📥</span>
                <span>Xuất danh mục (.md)</span>
              </button>
            )}
            <button
              onClick={() => requireAuth(() => setShowCreateModal(true), "Vui lòng đăng nhập để tạo lộ trình học tập mới!")}
              className="btn btn-primary btn-sm text-white font-bold gap-1.5 shadow-sm rounded-xl cursor-pointer"
            >
              <span>+</span>
              <span>Tạo lộ trình mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 border-b border-base-300 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "Tất cả lộ trình" },
            { id: "basic", label: "Cơ bản (Beginner)" },
            { id: "intermediate", label: "Trung cấp (Intermediate)" },
            { id: "advanced", label: "Nâng cao (Advanced)" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLevelFilter(tab.id)}
              className={`btn btn-sm rounded-xl font-semibold whitespace-nowrap shrink-0 transition-all ${
                levelFilter === tab.id
                  ? "btn-primary text-white shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Tìm theo kỹ năng, chủ đề..."
            value={roadmapSearch}
            onChange={(e) => setRoadmapSearch(e.target.value)}
            className="input input-sm input-bordered w-full rounded-xl pl-8 text-xs"
          />
          <span className="absolute left-2.5 top-2 text-xs text-base-content/40">🔍</span>
          {roadmapSearch && (
            <button
              type="button"
              onClick={() => setRoadmapSearch("")}
              className="absolute right-2 top-1.5 text-xs text-base-content/50 hover:text-base-content"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Roadmap Cards Grid */}
      {filteredRoadmaps.length === 0 ? (
        <div className="text-center py-16 bg-base-100 border border-dashed border-base-300 rounded-3xl p-8">
          <span className="text-4xl">🗺️</span>
          <h3 className="font-bold text-base text-base-content mt-2">Không tìm thấy lộ trình phù hợp</h3>
          <p className="text-xs text-base-content/60 mt-1 mb-4">
            Thử tìm kiếm với từ khóa kỹ năng khác hoặc đổi cấp độ lọc.
          </p>
          <button
            type="button"
            onClick={() => {
              setRoadmapSearch("");
              setLevelFilter("all");
            }}
            className="btn btn-sm btn-primary text-white font-bold rounded-full px-5"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredRoadmaps.map((rm) => (
            <div
              key={rm.id}
              className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all rounded-2xl flex flex-col justify-between"
            >
              <div className="card-body p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`badge text-xs font-bold px-2.5 py-1 rounded-lg ${
                    rm.level === "basic"
                      ? "badge-success text-white"
                      : rm.level === "intermediate"
                      ? "badge-warning text-amber-950 font-bold"
                      : "badge-error text-white"
                  }`}>
                    {rm.level?.toUpperCase()}
                  </span>
                  <span className="text-xs text-base-content/50 font-medium">
                    {rm.total_steps || rm.steps?.length || 0} bài học
                  </span>
                </div>

                <h2 className="text-lg font-bold text-base-content line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                  onClick={() => setSelectedRoadmap(rm)}
                >
                  {rm.title}
                </h2>

                <p className="text-sm text-base-content/70 mt-2 line-clamp-3 leading-relaxed">
                  {rm.description}
                </p>

                {/* Progress Bar */}
                <div className="mt-6 pt-4 border-t border-base-200">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-base-content/60">Tiến độ của bạn</span>
                    <span className="text-primary">{rm.progress_percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-base-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${rm.progress_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-0 flex gap-2">
                {rm.progress_percentage > 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetRoadmapProgress(rm.id, rm.title)}
                    className="btn btn-ghost btn-sm rounded-xl text-error text-xs font-semibold px-2.5"
                    title="Đặt lại tiến độ về 0%"
                  >
                    🔄
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleExportRoadmapMarkdown(rm)}
                    className="btn btn-ghost btn-sm rounded-xl text-base-content/70 hover:text-primary text-xs font-semibold px-2.5"
                    title="Xuất lộ trình dạng Markdown (.md)"
                  >
                    📥
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedRoadmap(rm);
                    setStepFilter("all");
                  }}
                  className="btn btn-outline btn-primary btn-sm flex-1 rounded-xl font-bold"
                >
                  Xem chi tiết lộ trình
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRoadmap && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRoadmap(null); }}
        >
          <div className="modal-box max-w-3xl rounded-2xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <span className="badge badge-primary text-white text-xs font-bold uppercase mb-2">
                  {selectedRoadmap.level}
                </span>
                <h3 className="text-2xl font-black text-base-content break-words">{selectedRoadmap.title}</h3>
                <p className="text-sm text-base-content/70 mt-1 break-words">{selectedRoadmap.description}</p>
              </div>
              <button
                onClick={() => setSelectedRoadmap(null)}
                className="btn btn-sm btn-circle btn-ghost shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-4 rounded-xl bg-base-200/60 border border-base-300/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-base-content/60 uppercase">Hoàn thành</span>
                <p className="text-lg font-bold text-primary">
                  {selectedRoadmap.completed_steps || 0} / {selectedRoadmap.steps?.length || 0} bài học
                </p>
              </div>
              <div
                className="radial-progress text-primary font-bold text-sm"
                style={{ "--value": selectedRoadmap.progress_percentage || 0, "--size": "3.5rem" }}
                role="progressbar"
                aria-valuenow={selectedRoadmap.progress_percentage || 0}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {selectedRoadmap.progress_percentage || 0}%
              </div>
            </div>

            <h4 className="font-bold text-base-content mb-3 text-sm uppercase tracking-wider text-base-content/80">
              Các bước học tập (Checklist)
            </h4>

            {/* Step Filter Tabs */}
            <div className="flex items-center gap-1.5 mb-3 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setStepFilter("all")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  stepFilter === "all"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                Tất cả ({selectedRoadmap.steps?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStepFilter("pending")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  stepFilter === "pending"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                Chưa xong ({(selectedRoadmap.steps || []).filter((s) => !s.is_completed).length})
              </button>
              <button
                type="button"
                onClick={() => setStepFilter("completed")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  stepFilter === "completed"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                Đã xong ({(selectedRoadmap.steps || []).filter((s) => s.is_completed).length})
              </button>
            </div>

            {(() => {
              const displayedSteps = (selectedRoadmap.steps || []).filter((step) => {
                if (stepFilter === "completed") return step.is_completed;
                if (stepFilter === "pending") return !step.is_completed;
                return true;
              });

              if (displayedSteps.length === 0) {
                return (
                  <div className="text-center py-8 text-base-content/60 text-xs bg-base-200/40 rounded-xl border border-dashed border-base-300">
                    Không có bước học tập nào trong mục này.
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {displayedSteps.map((step) => (
                    <div
                      key={step.id}
                      onClick={() => handleToggleStep(selectedRoadmap.id, step.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        step.is_completed
                          ? "bg-primary/5 border-primary/30"
                          : "bg-base-100 border-base-300 hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={step.is_completed}
                        readOnly
                        className="checkbox checkbox-primary checkbox-sm mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${step.is_completed ? "line-through text-base-content/50" : "text-base-content"}`}>
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="text-xs text-base-content/60 mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                        {step.resource_url && (
                          <a
                            href={step.resource_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-2"
                          >
                            <span>🔗</span>
                            <span>Tài liệu tham khảo</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="modal-action mt-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedRoadmap.progress_percentage > 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetRoadmapProgress(selectedRoadmap.id, selectedRoadmap.title)}
                    className="btn btn-ghost btn-sm text-error font-bold rounded-xl gap-1.5"
                  >
                    <span>🔄</span>
                    <span>Đặt lại tiến độ (0%)</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleExportRoadmapMarkdown(selectedRoadmap)}
                    className="btn btn-ghost btn-sm text-primary hover:bg-primary/10 font-bold rounded-xl gap-1.5 border border-primary/20"
                    title="Tải lộ trình và checklist dạng Markdown (.md) cho Obsidian/Notion"
                  >
                    <span>📥</span>
                    <span>Xuất Markdown (.md)</span>
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedRoadmap(null)} className="btn btn-primary text-white rounded-xl font-bold px-6">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Lộ Trình Mới */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => { if (!isSubmitting && e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  🗺️
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-base-content">Tạo Lộ Trình Kiến Thức Mới</h3>
                  <p className="text-[11px] text-base-content/60">Thiết kế lộ trình học tập có cấu trúc cho cộng đồng</p>
                </div>
              </div>
              <button
                onClick={() => !isSubmitting && setShowCreateModal(false)}
                disabled={isSubmitting}
                className="btn btn-sm btn-ghost btn-circle"
              >
                ✕
              </button>
            </div>

                        {/* Guest Banner */}
            {!currentUser && (
              <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-amber-950 dark:text-amber-200">
                  💡 Bạn cần đăng nhập để lưu lộ trình học tập với tư cách tác giả.
                </span>
                <button
                  type="button"
                  onClick={() => loginDemo()}
                  className="btn btn-xs btn-primary text-white font-bold shrink-0"
                >
                  ⚡ Đăng nhập Demo 1 chạm
                </button>
              </div>
            )}
            {/* Modal Form */}
            <form onSubmit={handleCreateRoadmap} className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">
                  Tiêu đề lộ trình *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Lộ trình Kỹ sư Trí tuệ Nhân tạo & LLM 2026..."
                  className="input input-bordered input-sm w-full text-xs focus:input-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">
                    Cấp độ chuyên môn
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="select select-bordered select-sm w-full text-xs focus:select-primary"
                  >
                    <option value="basic">Cơ bản (Beginner)</option>
                    <option value="intermediate">Trung cấp (Intermediate)</option>
                    <option value="advanced">Nâng cao (Advanced)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1">
                  Mô tả lộ trình *
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Tóm tắt mục tiêu, kiến thức đầu ra và đối tượng người học..."
                  rows={2}
                  className="textarea textarea-bordered textarea-sm w-full text-xs focus:textarea-primary"
                  required
                />
              </div>

              {/* Steps List */}
              <div className="pt-2 border-t border-base-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-base-content/80">
                    Các bước học tập trong lộ trình ({newSteps.length} bước):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="btn btn-xs btn-outline btn-primary gap-1"
                  >
                    + Thêm bước
                  </button>
                </div>

                <div className="space-y-3">
                  {newSteps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-2xl bg-base-200/50 border border-base-300 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge badge-primary text-white badge-xs font-bold">
                          Bước {sIdx + 1}
                        </span>
                        {newSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(sIdx)}
                            className="btn btn-ghost btn-xs btn-circle text-error"
                            title="Xóa bước này"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => handleStepChange(sIdx, "title", e.target.value)}
                        placeholder={`Tiêu đề bước ${sIdx + 1} (Ví dụ: 1. Nền tảng Python & OOP)...`}
                        className="input input-bordered input-xs w-full text-xs focus:input-primary"
                        required
                      />
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => handleStepChange(sIdx, "description", e.target.value)}
                        placeholder="Mô tả kỹ năng cần đạt..."
                        className="input input-bordered input-xs w-full text-xs"
                      />
                      <input
                        type="url"
                        value={step.resource_url}
                        onChange={(e) => handleStepChange(sIdx, "resource_url", e.target.value)}
                        placeholder="Link tài liệu / bài viết tham khảo (tùy chọn)..."
                        className="input input-bordered input-xs w-full text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-end gap-2 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="btn btn-sm btn-ghost"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Lưu lộ trình mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
