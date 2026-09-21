import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import { featureApi } from "../utils/dbApi";

export default function CoursesPage({ onNavigate, openCourseId, onOpenCourse, onOpenQuiz }) {
  const { currentUser } = useAuth();
  const { posts } = useBlog();
  const { addToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [adminTab, setAdminTab] = useState("course");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("C++");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [picked, setPicked] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [genCourseId, setGenCourseId] = useState("");
  const [genPostId, setGenPostId] = useState("");
  const [genPosts, setGenPosts] = useState([]);
  const [genCount, setGenCount] = useState(5);
  const [genDiff, setGenDiff] = useState("mixed");
  const [generating, setGenerating] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState("");
  const isManager = currentUser && ["admin", "manager"].includes(currentUser.role)
    || currentUser?.id === "demo_user";

  const load = async () => {
    setLoading(true);
    try {
      setCourses(await featureApi.listCourses());
      setOffline(false);
    } catch {
      setOffline(true);
      addToast("Chưa kết nối API — hãy chạy npm run api", "warning", 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!genCourseId) {
      setGenPosts([]);
      return;
    }
    const listedPosts = courses.find((course) => course.id === genCourseId)?.posts;
    if (Array.isArray(listedPosts)) {
      setGenPosts(listedPosts);
      return;
    }
    let alive = true;
    featureApi.getCourse(genCourseId)
      .then((result) => {
        if (alive) setGenPosts(result.posts || []);
      })
      .catch(() => {
        if (alive) setGenPosts([]);
      });
    return () => { alive = false; };
  }, [genCourseId, courses]);

  const approvedPosts = posts.filter((p) => !p.status || p.status === "approved");

  // Nhóm các bài viết theo tag để quản trị viên chọn làm bài học.
  const tagGroups = useMemo(() => {
    const map = {};
    for (const p of approvedPosts) {
      for (const t of p.tags || []) {
        map[t] = map[t] || [];
        map[t].push(p);
      }
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [approvedPosts]);

  const togglePick = (id) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const pickGroup = (tag, groupPosts) => {
    setShowCreate(true);
    setPicked(groupPosts.map((p) => p.id));
    setAdminTab("course");
    setSelectedTag(tag);
    setTitle("");
    setDescription(`Nhóm các bài viết cùng tag "${tag}" (${groupPosts.length} bài).`);
    addToast(`Đã chọn ${groupPosts.length} bài tag "${tag}"`, "success");
  };

  const postsForCourse = selectedTag
    ? approvedPosts.filter((post) => post.tags?.includes(selectedTag))
    : approvedPosts;

  const move = (id, dir) =>
    setPicked((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleCreate = async () => {
    if (!title.trim()) {
      addToast("Nhập tên khóa học trước!", "warning");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        language,
        author_id: currentUser?.id,
        post_ids: picked
      };
      if (editingCourseId) {
        await featureApi.updateCourse(editingCourseId, payload);
        addToast("Đã cập nhật khóa học thành công!", "success");
      } else {
        await featureApi.createCourse(payload);
        addToast("Đã tạo khóa học thành công! 🎉", "success");
      }
      setTitle("");
      setDescription("");
      setLanguage("C++");
      setPicked([]);
      setEditingCourseId("");
      setShowCreate(false);
      await load();
    } catch (e) {
      addToast(e.message || "Tạo khóa học thất bại", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    setTitle(course.title || "");
    setDescription(course.description || "");
    setLanguage(course.language || "C++");
    setPicked((course.posts || []).map((post) => post.id));
    setSelectedTag("");
    setAdminTab("course");
    setShowCreate(true);
  };

  const handleGenerate = async () => {
    if (!genCourseId) {
      addToast("Chọn khóa học để AI tạo câu hỏi", "warning");
      return;
    }
    if (!genPostId) {
      addToast("Chọn bài học để AI tạo câu hỏi", "warning");
      return;
    }
    setGenerating(true);
    try {
      const r = await featureApi.generateQuiz({
        course_id: genCourseId,
        post_id: genPostId,
        count: genCount,
        difficulty: genDiff,
        created_by: currentUser?.id
      });
      addToast(`🤖 AI đã tạo ${r.created?.length || 0} câu hỏi và lưu vào ngân hàng câu hỏi!`, "success", 5000);
      await load();
    } catch (e) {
      addToast(e.message || "AI tạo câu hỏi thất bại", "error", 6000);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${course.title}" không?`)) return;
    setDeletingCourseId(course.id);
    try {
      await featureApi.deleteCourse(course.id);
      if (genCourseId === course.id) {
        setGenCourseId("");
        setGenPostId("");
      }
      addToast("Đã xóa khóa học.", "info");
      await load();
    } catch (e) {
      addToast(e.message || "Xóa khóa học thất bại", "error");
    } finally {
      setDeletingCourseId("");
    }
  };

  if (openCourseId) {
    return (
      <CourseDetail
        courseId={openCourseId}
        onNavigate={onNavigate}
        onOpenQuiz={onOpenQuiz}
        onBack={() => onOpenCourse(null)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate && onNavigate("home")} className="btn btn-ghost btn-sm">
          ← Về trang chủ
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-black">Khóa học 🎓</h1>
        <p className="text-sm text-base-content/70 mt-1">
          Học theo lộ trình từ các bài viết, kèm ngân hàng câu hỏi trắc nghiệm (có AI tạo).
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36" />)}
        </div>
      ) : offline ? (
        <div className="text-center py-12 border border-dashed border-warning/50 rounded-2xl">
          <p className="font-bold mb-2">API chưa chạy</p>
          <p className="text-sm text-base-content/60 mb-4">Chạy <code>npm run api</code> để xem khóa học từ database thật</p>
          <button onClick={load} className="btn btn-sm btn-outline">Thử lại</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.length === 0 && <p className="text-sm text-base-content/60">Chưa có khóa học nào.</p>}
          {courses.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenCourse(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onOpenCourse(c.id);
              }}
              role="button"
              tabIndex={0}
              className="text-left rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                <span className="badge badge-primary badge-sm font-bold">{c.language}</span>
                <span className="text-xs text-base-content/50">📘 {c.post_count} bài học</span>
                <span className="text-xs text-base-content/50">📝 {c.question_count} câu hỏi</span>
                </div>
                {isManager && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCourse(c);
                      }}
                      className="btn btn-xs btn-ghost text-primary hover:bg-primary/10"
                      title="Sửa khóa học"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(c);
                      }}
                      disabled={deletingCourseId === c.id}
                      className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                      title="Xóa khóa học"
                    >
                      {deletingCourseId === c.id ? "..." : "🗑️"}
                    </button>
                  </div>
                )}
              </div>
              <h3 className="font-black text-base-content">{c.title}</h3>
              <p className="text-xs text-base-content/60 mt-1">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* ============ QUAN TRI: TAO KHOA HOC + AI TAO CAU HOI ============ */}
      {isManager && (
        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-black text-lg">🛠️ Khu vực quản trị</h2>
          </div>

          <div role="tablist" className="tabs tabs-boxed mt-4 w-fit">
            <button
              role="tab"
              className={`tab ${adminTab === "course" ? "tab-active" : ""}`}
              onClick={() => { setAdminTab("course"); setShowCreate(true); }}
            >
              🎓 Tạo khóa học
            </button>
            <button
              role="tab"
              className={`tab ${adminTab === "quiz" ? "tab-active" : ""}`}
              onClick={() => { setAdminTab("quiz"); setShowCreate(false); }}
            >
              🤖 Tạo câu hỏi AI
            </button>
          </div>

          {adminTab === "course" && showCreate && (
            <div className="mt-4 space-y-3">
              {tagGroups.length > 0 && (
                <div>
                  <label className="text-xs font-bold">Chọn bài viết theo tag</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button
                      onClick={() => setSelectedTag("")}
                      className={`btn btn-sm ${selectedTag ? "btn-outline" : "btn-primary text-white"}`}
                    >
                      Tất cả bài viết
                    </button>
                    {tagGroups.map(([tag, list]) => (
                      <button
                        key={tag}
                        onClick={() => pickGroup(tag, list)}
                        className={`btn btn-sm ${selectedTag === tag ? "btn-primary text-white" : "btn-outline"}`}
                      >
                        #{tag} <span className="text-xs">({list.length} bài)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Tên khóa học cụ thể *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="input input-bordered w-full" placeholder="Quản trị nhập tên khóa học" />
                </div>
                <div>
                  <label className="text-xs font-bold">Ngôn ngữ / công nghệ *</label>
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    list="course-language-options"
                    className="input input-bordered w-full"
                    placeholder="Ví dụ: DevOps, Rust, TypeScript"
                    required
                  />
                  <datalist id="course-language-options">
                    {["C++", "JavaScript", "React", "Java", "Python", "Go", "SQL", "DevOps"].map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Mô tả</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="textarea textarea-bordered w-full" />
              </div>
              <div>
                <label className="text-xs font-bold">
                  Chọn bài viết{selectedTag ? ` theo tag #${selectedTag}` : ""} ({picked.length} đã chọn — thứ tự chọn là thứ tự bài học, dùng ↑↓ để đổi)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-base-300 divide-y divide-base-200 bg-base-100 mt-1">
                  {postsForCourse.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs checkbox-primary"
                        checked={picked.includes(p.id)}
                        onChange={() => togglePick(p.id)}
                      />
                      <span className="text-xs flex-1 truncate">{p.title}</span>
                      {picked.includes(p.id) && (
                        <div className="flex gap-1">
                          <button onClick={() => move(p.id, -1)} className="btn btn-ghost btn-xs">↑</button>
                          <button onClick={() => move(p.id, 1)} className="btn btn-ghost btn-xs">↓</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={creating} className="btn btn-primary text-white font-bold">
                {creating ? "Đang lưu..." : editingCourseId ? "💾 Lưu thay đổi" : "🎓 Tạo khóa học"}
              </button>
            </div>
          )}

          {adminTab === "quiz" && <div className="mt-6 border-t border-primary/20 pt-4">
            <h3 className="font-bold text-sm mb-2">🤖 Tạo ngân hàng câu hỏi trắc nghiệm bằng AI</h3>
            <div className="grid sm:grid-cols-4 gap-2">
              <select
                value={genCourseId}
                onChange={(e) => { setGenCourseId(e.target.value); setGenPostId(""); }}
                className="select select-bordered"
              >
                <option value="">— Chọn khóa học —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select
                value={genPostId}
                onChange={(e) => setGenPostId(e.target.value)}
                className="select select-bordered"
                disabled={!genCourseId}
              >
                <option value="">— Chọn bài học —</option>
                {genPosts.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <select value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="select select-bordered">
                {[5, 8, 10, 15, 20, 25, 30].map((n) => <option key={n} value={n}>{n} câu hỏi</option>)}
              </select>
              <select value={genDiff} onChange={(e) => setGenDiff(e.target.value)} className="select select-bordered">
                <option value="mixed">Độ khó: trộn</option>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary text-white font-bold mt-2 w-full sm:w-auto">
              {generating ? "🤖 AI đang đọc bài viết..." : "✨ Tạo câu hỏi bằng AI"}
            </button>
            <p className="text-[11px] text-base-content/50 mt-1">
              AI sinh câu hỏi từ đúng bài học đã chọn và lưu vào khóa học tương ứng.
            </p>
          </div>}
        </div>
      )}
    </div>
  );
}

function CourseDetail({ courseId, onNavigate, onOpenQuiz, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    featureApi
      .getCourse(courseId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [courseId]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="font-bold text-lg mb-2">Không tải được khóa học</p>
        <p className="text-sm text-base-content/60 mb-4">{error}</p>
        <button onClick={onBack} className="btn btn-sm btn-outline">← Quay lại danh sách</button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
      </div>
    );
  }

  const { course, posts, questions } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={onBack} className="btn btn-ghost btn-sm mb-4">← Tất cả khóa học</button>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge badge-primary font-bold">{course.language}</span>
          <span className="text-xs text-base-content/50">📘 {posts.length} bài học • 📝 {questions.length} câu hỏi</span>
        </div>
        <h1 className="text-2xl font-black">{course.title}</h1>
        <p className="text-sm text-base-content/70 mt-1">{course.description}</p>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm mb-6">
        <h2 className="font-black mb-3">📖 Lộ trình bài học</h2>
        <div className="space-y-2">
          {posts.length === 0 && <p className="text-sm text-base-content/60">Khóa học chưa có bài học.</p>}
          {posts.map((p, i) => (
            <div
              key={p.id}
              className="w-full flex items-center gap-3 text-left rounded-xl border border-base-300 bg-base-100 p-3 transition-colors"
            >
              <button
                onClick={() => onNavigate && onNavigate("post_detail", { postId: p.id })}
                className="flex items-center gap-3 text-left min-w-0 flex-1 hover:text-primary transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="font-bold text-sm truncate block">{p.title}</span>
                  <span className="text-[11px] text-base-content/50">{p.read_time} • {p.views} lượt xem</span>
                </span>
              </button>
              <button
                onClick={() => onOpenQuiz && onOpenQuiz({ courseId: course.id, postId: p.id, title: `${course.title} - ${p.title}` })}
                disabled={Number(p.question_count) === 0}
                className="btn btn-primary btn-sm text-white shrink-0"
                title={Number(p.question_count) > 0 ? "Làm bài trắc nghiệm của bài học" : "Bài học chưa có câu hỏi"}
              >
                📝 Quiz {Number(p.question_count) > 0 ? `(${p.question_count})` : ""}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-black mb-1">📝 Bài trắc nghiệm khóa học</h2>
        <p className="text-xs text-base-content/60 mb-3">
          {questions.length > 0
            ? `${questions.length} câu hỏi trong ngân hàng (gồm cả câu hỏi do AI tạo).`
            : "Khóa học chưa có câu hỏi. Quản trị có thể dùng AI tạo trong danh sách khóa học."}
        </p>
        <button
          onClick={() => onOpenQuiz && onOpenQuiz({ courseId: course.id, title: course.title })}
          disabled={questions.length === 0}
          className="btn btn-primary text-white font-bold"
        >
          🚀 Làm bài trắc nghiệm
        </button>
      </div>
    </div>
  );
}

