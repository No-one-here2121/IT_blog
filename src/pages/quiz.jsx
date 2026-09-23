import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../services/api";
import { DEFAULT_QUIZ_TOPICS, DEFAULT_QUIZ_QUESTIONS } from "../data/quizBank";

/**
 * Trang Ngan hang Trac nghiem Kien thuc IT chuyen sau
 * UX:
 * 1. Man hinh chon de tai & cau hinh so cau can on tap.
 * 2. Chi khi nguoi dung bam vao 1 chuyen de hoac "Bat dau lam bai", cac cau hoi va dong ho moi hien ra.
 * 3. Ho tro luyen lai cau sai, xuat Markdown, tao de bang AI.
 */
export default function QuizPage({ params = {}, onNavigate }) {
  const { currentUser, requireAuth, isAdmin } = useAuth();
  const { addToast } = useToast();
  const { courseId, postId, title } = params;

  // Topics & Questions Data States
  const [topics, setTopics] = useState(DEFAULT_QUIZ_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedCount, setSelectedCount] = useState(10); // 5, 10, 15, 20, "all"
  const [selectedDifficulty, setSelectedDifficulty] = useState("all"); // "all", "easy", "medium", "hard"

  // Trang thai bat dau lam bai: Chi hien thi cau hoi khi nguoi dung bam vao de tai hoac bam "Bat dau"
  const [isExamStarted, setIsExamStarted] = useState(Boolean(courseId || postId));

  const [allPoolQuestions, setAllPoolQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Countdown Timer States
  const [timeLeft, setTimeLeft] = useState(600);
  const [timerActive, setTimerActive] = useState(false);

  // Review Wrong Answers Filter State
  const [filterWrongOnly, setFilterWrongOnly] = useState(false);

  // Quiz History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [quizHistory, setQuizHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("it_blog_quiz_history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // AI Quiz Generator States
  // Manual Quiz Creation Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCode, setNewQuestionCode] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanation, setNewExplanation] = useState("");
  const [newLanguage, setNewLanguage] = useState("React");
  const [newDifficulty, setNewDifficulty] = useState("intermediate");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("React 19");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiCount, setAiCount] = useState(5);
  const [aiAlert, setAiAlert] = useState("");

  useEffect(() => {
    if (params?.action === "create") {
      setShowCreateModal(true);
    }
  }, [params]);

  // 1. Tai danh sach chuyen de kem so luong cau hoi tu backend
  useEffect(() => {
    api.quiz
      .getTopics()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setTopics(res);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch quiz topics from API, using fallback:", e);
      });
  }, []);

  // 2. Tai toan bo cau hoi cua chu de da chon tu backend hoac fallback
  const fetchQuestionsForTopic = useCallback(async (topicId) => {
    setLoading(true);
    setError("");
    try {
      const queryParams = {
        limit: 200,
        randomize: false,
      };
      if (courseId) queryParams.course_id = courseId;
      if (postId) queryParams.post_id = postId;
      if (topicId && topicId !== "all") queryParams.language = topicId;

      const res = await api.quiz.getQuestions(queryParams);
      let list = res?.questions || [];

      if (!list || list.length === 0) {
        if (topicId === "all") {
          list = DEFAULT_QUIZ_QUESTIONS;
        } else {
          list = DEFAULT_QUIZ_QUESTIONS.filter(
            (q) => (q.language || "").toLowerCase().includes(topicId.toLowerCase())
          );
        }
      }
      setAllPoolQuestions(list);
    } catch (err) {
      console.warn("Quiz questions fetch error, using local fallback data:", err);
      if (topicId === "all") {
        setAllPoolQuestions(DEFAULT_QUIZ_QUESTIONS);
      } else {
        setAllPoolQuestions(
          DEFAULT_QUIZ_QUESTIONS.filter(
            (q) => (q.language || "").toLowerCase().includes(topicId.toLowerCase())
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, postId]);

  useEffect(() => {
    fetchQuestionsForTopic(selectedTopic);
  }, [selectedTopic, fetchQuestionsForTopic]);

  // 3. Chuan bi bo cau hoi
  const prepareExamQuestions = useCallback(() => {
    if (!allPoolQuestions || allPoolQuestions.length === 0) {
      setQuestions([]);
      return;
    }

    let filtered = [...allPoolQuestions];
    if (selectedDifficulty && selectedDifficulty !== "all") {
      filtered = filtered.filter(
        (q) => (q.difficulty || "medium").toLowerCase() === selectedDifficulty.toLowerCase()
      );
      if (filtered.length === 0) {
        filtered = [...allPoolQuestions];
      }
    }

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());

    let finalSlice = shuffled;
    if (selectedCount !== "all") {
      const targetCount = Number(selectedCount) || 10;
      finalSlice = shuffled.slice(0, targetCount);
    }

    setQuestions(finalSlice);
    setAnswers({});
    setSubmitted(false);
    setFilterWrongOnly(false);

    const allottedSeconds = Math.max(180, finalSlice.length * 60);
    setTimeLeft(allottedSeconds);
  }, [allPoolQuestions, selectedCount, selectedDifficulty]);

  useEffect(() => {
    if (isExamStarted) {
      prepareExamQuestions();
      setTimerActive(true);
    }
  }, [allPoolQuestions, isExamStarted, prepareExamQuestions]);

  const handleStartExam = (topicId) => {
    if (topicId) {
      setSelectedTopic(topicId);
    }
    setIsExamStarted(true);
    prepareExamQuestions();
    setTimerActive(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExitToTopics = () => {
    setIsExamStarted(false);
    setTimerActive(false);
    setSubmitted(false);
    setAnswers({});
  };

  const handleShuffleQuestions = () => {
    setQuestions((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setAnswers({});
    setSubmitted(false);
    setTimeLeft(Math.max(180, questions.length * 60));
    setTimerActive(true);
    setFilterWrongOnly(false);
  };

  const pickAnswer = (qid, optionIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: optionIdx }));
  };

  const handleScoreSubmit = async () => {
    setSubmitted(true);
    setTimerActive(false);

    const calculatedScore = questions.reduce(
      (acc, q) => acc + (answers[q.id] === q.answer_index ? 1 : 0),
      0
    );

    const activeTopicObj = topics.find((t) => t.id === selectedTopic);
    const newRecord = {
      id: Date.now(),
      topic: title || activeTopicObj?.title || "Kiến thức IT",
      score: calculatedScore,
      total: questions.length,
      percentage: Math.round((calculatedScore / (questions.length || 1)) * 100),
      date: new Date().toLocaleString("vi-VN"),
      difficulty: selectedDifficulty
    };

    setQuizHistory((prev) => {
      const next = [newRecord, ...prev].slice(0, 20);
      try {
        localStorage.setItem("it_blog_quiz_history", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    try {
      await api.quiz.submit(answers);
    } catch (e) {
      console.warn("Quiz submit sync fallback:", e);
    }
  };

  useEffect(() => {
    if (!isExamStarted || submitted || !timerActive || timeLeft <= 0 || loading) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleScoreSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamStarted, submitted, timerActive, timeLeft, loading]);

  const handleRetakeWrongQuestions = () => {
    const wrongOnes = questions.filter((q) => answers[q.id] !== q.answer_index);
    if (wrongOnes.length === 0) return;
    setQuestions([...wrongOnes]);
    setAnswers({});
    setSubmitted(false);
    setTimeLeft(Math.max(120, wrongOnes.length * 60));
    setTimerActive(true);
    setFilterWrongOnly(false);
    setAiAlert("🎯 Đang ôn tập lại " + wrongOnes.length + " câu hỏi chưa chính xác. Hãy chú ý đọc kỹ giải thích!");
  };

  const handleExportQuizReportMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất báo cáo Markdown (.md)!", "error");
      return;
    }
    const total = questions.length;
    const correctCount = score;
    const percentage = Math.round((correctCount / (total || 1)) * 100);
    const passed = percentage >= 60;
    const rating =
      percentage >= 80
        ? "Xuất sắc (Senior Level)"
        : percentage >= 60
        ? "Khá (Mid Level)"
        : "Cần rèn luyện thêm (Junior Level)";

    const activeTopicObj = topics.find((t) => t.id === selectedTopic);

    const lines = [
      "# 🧠 Báo Cáo Kết Quả Thi Trắc Nghiệm - IT Blog",
      "",
      "> **Chủ đề:** " + (title || activeTopicObj?.title || "Kiến thức IT") + " | **Điểm số:** " + correctCount + "/" + total + " (" + percentage + "%) | **Xếp loại:** " + rating,
      "> **Trạng thái:** " + (passed ? "✓ ĐẠT YÊU CẦU" : "✕ CHƯA ĐẠT") + " | **Thời gian hoàn thành:** " + new Date().toLocaleString("vi-VN"),
      "",
      "---",
      "### Chi Tiết Từng Câu Hỏi & Lời Giải Thích Kỹ Thuật",
      "",
      ...questions.map((q, idx) => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.answer_index;
        const mark = isCorrect ? "✅ [ĐÚNG]" : "❌ [SAI]";
        const userChoice = userAns !== undefined ? q.options[userAns] : "Chưa trả lời";
        const correctChoice = q.options[q.answer_index];

        return [
          "#### Câu " + (idx + 1) + " (" + (q.language || "IT") + " - " + q.difficulty + "): " + q.question + " " + mark,
          "- **Đáp án của bạn:** " + userChoice,
          "- **Đáp án chính xác:** " + correctChoice,
          "- **Giải thích chuyên sâu:** " + (q.explanation || "Không có giải thích chi tiết."),
          ""
        ].join("\n");
      }),
      "---",
      "*Xuất tự động từ Nền tảng Tri thức Kỹ sư IT Blog*"
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz_result_" + (selectedTopic || "it_quiz").toLowerCase() + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      addToast("Vui lòng nhập nội dung câu hỏi!", "warning");
      return;
    }
    if (newOptions.some((opt) => !opt.trim())) {
      addToast("Vui lòng nhập đầy đủ cả 4 phương án trả lời (A, B, C, D)!", "warning");
      return;
    }
    setIsSubmittingQuestion(true);
    const payload = {
      question: newQuestionText.trim(),
      code_snippet: newQuestionCode.trim() || undefined,
      options: newOptions.map((o) => o.trim()),
      correct_index: newCorrectIndex,
      explanation: newExplanation.trim() || undefined,
      language: newLanguage,
      difficulty: newDifficulty
    };

    try {
      await api.quiz.create(payload);
    } catch {
      // offline fallback
    }

    const newQ = {
      id: Date.now(),
      ...payload,
      correct_answer: payload.options[newCorrectIndex]
    };

    setQuestions((prev) => [newQ, ...prev]);
    addToast("Đã thêm câu hỏi trắc nghiệm mới thành công! 🧠", "success");
    setShowCreateModal(false);
    setNewQuestionText("");
    setNewQuestionCode("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
    setNewExplanation("");
    setIsSubmittingQuestion(false);
  };

  const handleGenerateAiQuiz = async (e) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setError("");
    try {
      const res = await api.quiz.generate({
        language: aiTopic.trim() || "IT",
        difficulty: aiDifficulty,
        count: Number(aiCount),
        post_ids: postId ? [postId] : undefined,
        course_id: courseId || undefined,
      });

      if (res?.created && res.created.length > 0 && res.created[0].options?.length > 0) {
        setQuestions(res.created);
      } else {
        const fresh = await api.quiz.getQuestions({ language: aiTopic, limit: Number(aiCount) });
        if (fresh?.questions?.length > 0) {
          setQuestions(fresh.questions);
        }
      }
      setAnswers({});
      setSubmitted(false);
      setTimeLeft(Number(aiCount) * 60);
      setTimerActive(true);
      setFilterWrongOnly(false);
      setShowAiModal(false);
      setIsExamStarted(true);
      setAiAlert("Đã sinh thành công " + (res?.count || aiCount) + " câu hỏi về " + aiTopic + " bằng AI! Hãy thử sức ngay.");
    } catch (err) {
      console.warn("AI Quiz generation error:", err);
      setError("Không thể tạo đề thi bằng AI lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsGenerating(false);
    }
  };

  const score = useMemo(() => {
    return questions.reduce(
      (acc, q) => acc + (answers[q.id] === q.answer_index ? 1 : 0),
      0
    );
  }, [questions, answers]);

  const wrongQuestions = useMemo(() => {
    return questions.filter((q) => answers[q.id] !== q.answer_index);
  }, [questions, answers]);

  const displayedQuestions = filterWrongOnly && submitted ? wrongQuestions : questions;
  const currentTopicMeta = topics.find((t) => t.id === selectedTopic) || topics[0];

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
      {/* Nut quay lai trang chu hoac quay lai danh sach de tai */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onNavigate && onNavigate("home")}
          className="btn btn-ghost btn-sm gap-1.5 text-base-content/80 hover:text-base-content font-semibold"
        >
          ← Về trang chủ
        </button>

        {isExamStarted && (
          <button
            onClick={handleExitToTopics}
            className="btn btn-outline btn-sm gap-1.5 rounded-xl font-bold"
          >
            ← Chọn đề tài khác
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GIAO DIEN 1: MAN HINH CHON DE TAI (KHI CHUA BAM VAO BAT DAU LAM BAI)       */}
      {/* ========================================================================= */}
      {!isExamStarted && (
        <div className="space-y-8 animate-fade-in">
          {/* Header Banner Gioi thieu */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary/15 via-purple-500/10 to-transparent border border-base-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <span className="text-5xl sm:text-6xl shrink-0">🧠</span>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
                  Ngân hàng Trắc nghiệm & Kiểm tra Năng lực IT
                </h1>
                <p className="text-xs sm:text-sm text-base-content/70 mt-1.5 max-w-3xl leading-relaxed">
                  Hệ thống hơn 90 câu hỏi trắc nghiệm chuyên sâu chia theo từng đề tài công nghệ thực tế.
                  Chọn đề tài bạn muốn ôn tập, số lượng câu hỏi và bắt đầu thử sức ngay!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => requireAuth(() => setShowCreateModal(true), "Vui lòng đăng nhập để thêm câu hỏi trắc nghiệm!")}
                className="btn btn-sm btn-outline btn-primary font-bold gap-1.5 rounded-xl shadow-xs cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm câu hỏi trắc nghiệm</span>
              </button>
              <button
                onClick={() => requireAuth(() => setShowAiModal(true), "Vui lòng đăng nhập để tạo đề thi bằng AI!")}
                className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-md hover:scale-105 transition-all rounded-xl"
              >
                <span>⚡</span>
                <span>Tạo đề bằng AI</span>
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="btn btn-sm btn-outline btn-ghost gap-1.5 rounded-xl font-semibold"
              >
                <span>📜</span>
                <span>Lịch sử thi ({quizHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Thanh Chon So Cau Can On Tap & Do Kho */}
          <div className="p-5 rounded-3xl bg-base-100 border border-base-300 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-base-content flex items-center gap-1.5 shrink-0">
                <span className="text-primary">🎯</span>
                <span>Số câu cần ôn tập:</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 5, label: "5 câu", desc: "Nhanh (~5 phút)" },
                  { id: 10, label: "10 câu", desc: "Tiêu chuẩn (~10 phút)" },
                  { id: 15, label: "15 câu", desc: "Nâng cao (~15 phút)" },
                  { id: 20, label: "20 câu", desc: "Thử thách (~20 phút)" },
                  { id: "all", label: "Tất cả câu", desc: "Toàn bộ ngân hàng đề" },
                ].map((cnt) => {
                  const isPicked = selectedCount === cnt.id;
                  return (
                    <button
                      key={cnt.id}
                      type="button"
                      onClick={() => setSelectedCount(cnt.id)}
                      className={"btn btn-sm rounded-xl font-bold transition-all " + (
                        isPicked
                          ? "btn-primary text-white shadow-xs scale-105"
                          : "btn-ghost border border-base-300 hover:bg-base-200"
                      )}
                      title={cnt.desc}
                    >
                      {cnt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-base-content flex items-center gap-1 shrink-0">
                <span>🎚️</span>
                <span>Độ khó:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "easy", label: "🌱 Dễ" },
                  { id: "medium", label: "⚡ Vừa" },
                  { id: "hard", label: "🔥 Khó" },
                ].map((diff) => {
                  const isPicked = selectedDifficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={"btn btn-sm rounded-xl font-semibold transition-all " + (
                        isPicked
                          ? "btn-neutral text-white shadow-xs"
                          : "btn-ghost border border-base-300"
                      )}
                    >
                      {diff.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Danh Sach Cac De Tai Chuyen De (Topic Cards Grid) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-base-content flex items-center gap-2">
                <span>📚</span>
                <span>Chọn 1 Đề tài để Bắt đầu Làm Bài:</span>
              </h2>
              <span className="text-xs text-base-content/60">
                Bấm vào ô đề tài hoặc nút "Vào thi" để mở câu hỏi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {topics.map((top) => {
                const isSelected = selectedTopic === top.id;
                return (
                  <div
                    key={top.id}
                    onClick={() => setSelectedTopic(top.id)}
                    className={"p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:shadow-lg " + (
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                        : "bg-base-100 hover:bg-base-200/50 border-base-300"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-base-200/80 group-hover:scale-110 transition-transform">
                            {top.icon}
                          </span>
                          <div>
                            <span className="badge badge-sm badge-outline text-primary font-bold">
                              {top.badge}
                            </span>
                            <h3 className="font-extrabold text-base text-base-content mt-0.5">
                              {top.title}
                            </h3>
                          </div>
                        </div>
                        <span className="badge badge-neutral text-white font-bold text-xs">
                          {top.question_count || 0} câu
                        </span>
                      </div>
                      <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                        {top.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-base-200 flex items-center justify-between">
                      <span className="text-[11px] text-base-content/50 font-medium">
                        {selectedCount === "all" ? "Thi tất cả " + top.question_count + " câu" : "Ôn " + selectedCount + " câu ngẫu nhiên"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartExam(top.id);
                        }}
                        className={"btn btn-sm rounded-xl font-bold gap-1 shadow-xs " + (
                          isSelected ? "btn-primary text-white" : "btn-outline btn-primary"
                        )}
                      >
                        <span>Vào thi</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner Bat dau lam bai thi */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-primary to-purple-600 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{currentTopicMeta?.icon}</span>
                <h3 className="font-black text-xl sm:text-2xl">
                  {currentTopicMeta?.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-white/90">
                Đã chọn: <span className="font-bold">{selectedCount === "all" ? allPoolQuestions.length : selectedCount} câu hỏi</span> • Thời gian: <span className="font-bold">{Math.round((Number(selectedCount) || allPoolQuestions.length) * 1)} phút</span>
              </p>
            </div>
            <button
              onClick={() => handleStartExam(selectedTopic)}
              className="btn btn-lg bg-white text-primary hover:bg-white/90 font-black rounded-2xl px-8 shadow-md shrink-0 border-none hover:scale-105 transition-all text-base"
            >
              🚀 Bắt đầu làm bài thi ngay
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GIAO DIEN 2: MAN HINH BAI THI CHI TIET (CHI HIEN KHI DA BAM VAO LAM BAI)  */}
      {/* ========================================================================= */}
      {isExamStarted && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner Bai Thi */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-primary/15 via-purple-500/10 to-transparent border border-base-300 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <span className="text-4xl sm:text-5xl shrink-0">{currentTopicMeta?.icon || "🧠"}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-base-content">
                      {title ? ("Trắc nghiệm: " + title) : currentTopicMeta?.title || "Ngân hàng Trắc nghiệm IT"}
                    </h1>
                    {currentTopicMeta?.badge && (
                      <span className="badge badge-primary text-white font-bold text-xs">
                        {currentTopicMeta.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-base-content/70 mt-1 max-w-2xl leading-relaxed">
                    {currentTopicMeta?.description || "Hệ thống câu hỏi tuyển chọn thực tế từ các kỹ sư công nghệ cao cấp."}
                  </p>
                </div>
              </div>

              {/* Dong ho dem nguoc */}
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                {!submitted ? (
                  <div
                    className={"flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-black font-mono shadow-xs transition-colors " + (
                      timeLeft < 120
                        ? "bg-error/15 border-error/50 text-error animate-pulse"
                        : "bg-base-100 border-base-300 text-base-content"
                    )}
                  >
                    <span>⏱️</span>
                    <span>
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTimerActive((prev) => !prev)}
                      className="ml-1 hover:text-primary cursor-pointer text-xs"
                      title={timerActive ? "Tạm dừng đồng hồ" : "Tiếp tục đếm giờ"}
                    >
                      {timerActive ? "⏸️" : "▶️"}
                    </button>
                  </div>
                ) : (
                  <span className="badge badge-success text-white text-xs sm:text-sm font-bold gap-1 px-4 py-3 rounded-2xl shadow-xs">
                    ✓ Đã nộp bài
                  </span>
                )}
              </div>
            </div>

            {/* Thanh cong cu */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-base-content/10">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExitToTopics}
                  className="btn btn-sm btn-ghost gap-1.5"
                  title="Quay lại danh sách đề tài"
                >
                  <span>←</span>
                  <span>Đổi đề tài</span>
                </button>
                <button
                  onClick={handleShuffleQuestions}
                  className="btn btn-sm btn-ghost gap-1.5"
                  title="Xáo trộn thứ tự các câu hỏi"
                >
                  <span>🔀</span>
                  <span>Xáo trộn</span>
                </button>
                <button
                  onClick={() => {
                    prepareExamQuestions();
                    setTimerActive(true);
                  }}
                  className="btn btn-sm btn-ghost gap-1.5"
                  title="Lấy lượt câu hỏi ngẫu nhiên khác"
                >
                  <span>🔄</span>
                  <span>Đổi câu hỏi khác</span>
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="btn btn-sm btn-outline btn-ghost gap-1.5"
                  title="Xem lịch sử các lần thi trước"
                >
                  <span>📜</span>
                  <span>Lịch sử ({quizHistory.length})</span>
                </button>
              </div>

              <div className="text-xs text-base-content/60 font-semibold">
                Đang làm: <span className="text-primary font-bold">{questions.length} câu</span> / {allPoolQuestions.length} câu trong kho
              </div>
            </div>
          </div>

          {/* Thong bao */}
          {aiAlert && (
            <div className="p-4 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-success font-semibold">
                <span>✨</span>
                <span>{aiAlert}</span>
              </div>
              <button
                onClick={() => setAiAlert("")}
                className="btn btn-xs btn-ghost btn-circle text-success"
              >
                ✕
              </button>
            </div>
          )}

          {/* Ket qua sau khi nop bai */}
          {submitted && (
            <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 animate-fade-in">
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-base-content">
                  Kết quả:{" "}
                  <span
                    className={
                      score >= questions.length * 0.8
                        ? "text-success"
                        : score >= questions.length * 0.5
                        ? "text-warning"
                        : "text-error"
                    }
                  >
                    {score}/{questions.length}
                  </span>{" "}
                  câu đúng ({Math.round((score / (questions.length || 1)) * 100)}%)
                </div>
                <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                  {score === questions.length
                    ? "Xuất sắc! Bạn nắm rất vững kiến thức và kỹ năng thực tế. 🏆"
                    : score >= questions.length * 0.5
                    ? "Khá tốt! Bạn đã đạt yêu cầu chuẩn. Hãy ôn lại những câu làm chưa đúng. 👍"
                    : "Cần trau dồi thêm lý thuyết và bài tập để củng cố kỹ năng. 📖"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="join">
                  <button
                    type="button"
                    onClick={() => setFilterWrongOnly(false)}
                    className={"join-item btn btn-xs sm:btn-sm " + (
                      !filterWrongOnly ? "btn-primary text-white font-bold" : "btn-ghost"
                    )}
                  >
                    Tất cả ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterWrongOnly(true)}
                    className={"join-item btn btn-xs sm:btn-sm " + (
                      filterWrongOnly ? "btn-error text-white font-bold" : "btn-ghost text-error"
                    )}
                  >
                    Chỉ câu sai ({wrongQuestions.length})
                  </button>
                </div>

                {wrongQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRetakeWrongQuestions}
                    className="btn btn-xs sm:btn-sm btn-warning text-amber-950 font-bold rounded-xl gap-1 shadow-2xs hover:scale-105 transition-all"
                    title="Luyện tập lại các câu hỏi trả lời chưa đúng"
                  >
                    <span>🎯</span>
                    <span>Luyện lại câu sai ({wrongQuestions.length})</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleExportQuizReportMd}
                    className="btn btn-xs sm:btn-sm btn-outline btn-ghost hover:text-primary rounded-xl font-bold gap-1 border border-base-300"
                    title="Tải báo cáo kết quả bài thi dạng Markdown (.md)"
                  >
                    <span>📥</span>
                    <span>Xuất (.md)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    prepareExamQuestions();
                    setTimerActive(true);
                  }}
                  className="btn btn-xs sm:btn-sm btn-outline btn-primary rounded-xl font-bold ml-1"
                >
                  🔄 Thi lại
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-32 w-full rounded-3xl" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-12 border border-dashed border-error/40 rounded-3xl">
              <p className="font-bold text-error mb-2">Không tải được câu hỏi</p>
              <p className="text-sm text-base-content/60">{error}</p>
            </div>
          )}

          {!loading && !error && displayedQuestions.length === 0 && (
            <div className="text-center py-12 border border-dashed border-base-300 rounded-3xl">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-bold">
                {filterWrongOnly
                  ? "Bạn không làm sai câu nào! Thật tuyệt vời."
                  : "Chưa có câu hỏi nào phù hợp với bộ lọc này."}
              </p>
            </div>
          )}

          {/* Bo cuc 2 cot: Trai cau hoi, Phai Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4 min-w-0">
              <div className="space-y-4">
                {displayedQuestions.map((q, qi) => {
                  const chosen = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      id={"question-" + q.id}
                      className={"scroll-mt-24 rounded-3xl border p-5 sm:p-6 shadow-xs transition-all " + (
                        submitted
                          ? chosen === q.answer_index
                            ? "border-success/60 bg-success/5"
                            : "border-error/60 bg-error/5"
                          : "border-base-300 bg-base-100"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="font-bold text-base sm:text-lg leading-snug break-words">
                          <span className="text-primary mr-2 font-black">Câu {qi + 1}.</span>
                          {q.question}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {q.language && (
                          <span className="badge badge-sm badge-outline text-primary font-bold">
                            {q.language}
                          </span>
                        )}
                        <span className="badge badge-sm badge-ghost text-xs">
                          {q.difficulty === "easy"
                            ? "🌱 Cơ bản"
                            : q.difficulty === "hard"
                            ? "🔥 Nâng cao"
                            : "⚡ Trung bình"}
                        </span>
                      </div>

                      {/* Danh sach dap an */}
                      <div className="grid gap-2.5">
                        {(q.options || []).map((opt, oi) => {
                          const chosenThis = chosen === oi;
                          const answerThis = q.answer_index === oi;
                          let cls =
                            "border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200/50";
                          if (submitted) {
                            if (answerThis) cls = "border-success bg-success/15 font-semibold";
                            else if (chosenThis) cls = "border-error bg-error/15 font-semibold";
                            else cls = "border-base-300 opacity-60";
                          } else if (chosenThis) {
                            cls = "border-primary bg-primary/10 font-semibold ring-2 ring-primary/20";
                          }

                          return (
                            <button
                              key={oi}
                              type="button"
                              onClick={() => pickAnswer(q.id, oi)}
                              className={"flex items-center gap-3 text-left rounded-2xl border p-3.5 text-sm transition-all cursor-pointer " + cls}
                            >
                              <span
                                className={"w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 " + (
                                  chosenThis
                                    ? "bg-primary text-white shadow-2xs"
                                    : "bg-base-200 text-base-content/80"
                                )}
                              >
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="break-words flex-1 min-w-0">{opt}</span>
                              {submitted && answerThis && (
                                <span className="ml-auto text-success font-bold text-xs shrink-0 flex items-center gap-1">
                                  ✓ Đáp án đúng
                                </span>
                              )}
                              {submitted && chosenThis && !answerThis && (
                                <span className="ml-auto text-error font-bold text-xs shrink-0 flex items-center gap-1">
                                  ✗ Bạn đã chọn
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Giai thich */}
                      {submitted && q.explanation && (
                        <div className="mt-4 p-3.5 rounded-2xl bg-base-200/70 border border-base-300 text-xs text-base-content/80 leading-relaxed">
                          <span className="font-bold text-primary flex items-center gap-1 mb-1">
                            <span>💡</span>
                            <span>Giải thích chuyên sâu:</span>
                          </span>
                          <p className="italic">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Nut nop bai */}
              {questions.length > 0 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {!submitted ? (
                    <button
                      onClick={handleScoreSubmit}
                      disabled={Object.keys(answers).length === 0}
                      className="btn btn-primary text-white font-bold px-10 rounded-2xl shadow-lg hover:scale-105 transition-all text-base"
                    >
                      ✅ Hoàn thành & Nộp bài ({Object.keys(answers).length}/{questions.length})
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          prepareExamQuestions();
                          setTimerActive(true);
                        }}
                        className="btn btn-outline btn-primary font-bold rounded-2xl px-8"
                      >
                        🔄 Làm lại đề này
                      </button>
                      <button
                        onClick={handleExitToTopics}
                        className="btn btn-primary text-white font-bold rounded-2xl px-8"
                      >
                        ← Trở về danh sách đề tài
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar tien do */}
            <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
              <div className="bg-base-100 rounded-3xl border border-base-300 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-base-200">
                  <h3 className="font-bold text-sm text-base-content uppercase tracking-wider flex items-center gap-2">
                    <span>🎯</span>
                    <span>Tiến độ bài thi</span>
                  </h3>
                  <span className="badge badge-primary text-white font-bold font-mono text-xs">
                    {Object.keys(answers).length}/{questions.length} câu
                  </span>
                </div>

                {/* Thanh tien do */}
                <div>
                  <div className="flex justify-between text-xs text-base-content/60 mb-1.5">
                    <span>Tỷ lệ hoàn thành</span>
                    <span className="font-bold font-mono">
                      {Math.round((Object.keys(answers).length / (questions.length || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-base-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-purple-500 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: (Math.round(
                          (Object.keys(answers).length / (questions.length || 1)) * 100
                        )) + "%",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Grid cau hoi */}
                <div>
                  <p className="text-xs font-semibold text-base-content/70 mb-2.5">
                    Danh sách câu hỏi:
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {displayedQuestions.map((q, qi) => {
                      const isAnswered = answers[q.id] !== undefined;
                      const isCorrect = submitted && answers[q.id] === q.answer_index;
                      const isWrong = submitted && isAnswered && !isCorrect;

                      let btnCls = "bg-base-200 text-base-content/70 hover:bg-base-300";
                      if (submitted) {
                        if (isCorrect) btnCls = "bg-success text-white font-bold shadow-2xs";
                        else if (isWrong) btnCls = "bg-error text-white font-bold shadow-2xs";
                        else btnCls = "bg-base-200 text-base-content/40";
                      } else if (isAnswered) {
                        btnCls = "bg-primary text-white font-bold shadow-2xs";
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("question-" + q.id);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className={"h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer " + btnCls}
                          title={"Chuyển đến Câu " + (qi + 1)}
                        >
                          {qi + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nut nop bai nhanh */}
                <div className="pt-3 border-t border-base-200 space-y-2">
                  {!submitted ? (
                    <button
                      type="button"
                      onClick={handleScoreSubmit}
                      disabled={Object.keys(answers).length === 0}
                      className="btn btn-primary text-white font-bold w-full rounded-2xl shadow-xs"
                    >
                      ✅ Nộp bài ({Object.keys(answers).length}/{questions.length})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExitToTopics}
                      className="btn btn-outline btn-primary font-bold w-full rounded-2xl"
                    >
                      ← Trở về danh sách đề tài
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Modal Tao de thi bang AI */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (!isGenerating && e.target === e.currentTarget) setShowAiModal(false);
          }}
        >
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  ⚡
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-base-content">Tạo đề thi IT bằng AI</h3>
                  <p className="text-[11px] text-base-content/60">Tự động sinh câu hỏi thực tế qua Google Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => !isGenerating && setShowAiModal(false)}
                disabled={isGenerating}
                className="btn btn-sm btn-ghost btn-circle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAiQuiz} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1.5">
                  Chủ đề / Công nghệ mục tiêu:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    "React 19",
                    "FastAPI & Python",
                    "PostgreSQL",
                    "DevOps & Docker",
                    "Web Security",
                    "System Design",
                    "Microservices & K8s"
                  ].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setAiTopic(topic)}
                      className={"badge badge-sm cursor-pointer py-2 px-2.5 transition-all " + (
                        aiTopic === topic
                          ? "badge-primary text-white font-bold"
                          : "badge-outline hover:bg-primary hover:text-white hover:border-primary"
                      )}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Hoặc nhập chủ đề tùy chỉnh (ví dụ: Next.js 15, Redis Caching, Kubernetes...)"
                  className="input input-bordered input-sm w-full text-xs focus:input-primary rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1.5">
                  Độ khó câu hỏi:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easy", label: "🌱 Dễ" },
                    { id: "medium", label: "⚡ Vừa" },
                    { id: "hard", label: "🔥 Khó" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setAiDifficulty(d.id)}
                      className={"btn btn-sm text-xs font-semibold rounded-xl " + (
                        aiDifficulty === d.id
                          ? "btn-primary text-white"
                          : "btn-outline border-base-300"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1.5">
                  Số lượng câu hỏi:
                </label>
                <div className="flex gap-2">
                  {[3, 5, 10].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAiCount(c)}
                      className={"btn btn-sm flex-1 text-xs font-bold rounded-xl " + (
                        aiCount === c ? "btn-primary text-white" : "btn-outline border-base-300"
                      )}
                    >
                      {c} câu
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  disabled={isGenerating}
                  className="btn btn-sm btn-ghost rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !aiTopic.trim()}
                  className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-md rounded-xl"
                >
                  {isGenerating ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Đang tạo câu hỏi...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Bắt đầu tạo đề thi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lich su lam bai */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (!isGenerating && e.target === e.currentTarget) setShowHistoryModal(false);
          }}
        >
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  📜
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-base-content">Lịch sử Làm Bài Trắc Nghiệm</h3>
                  <p className="text-[11px] text-base-content/60">Lưu vết kết quả điểm thi và tiến độ ôn tập</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {quizHistory.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="font-semibold text-sm">Chưa có kết quả làm bài nào được lưu.</p>
                </div>
              ) : (
                quizHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-base-200/50 rounded-2xl border border-base-300 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-base-content">{item.topic}</h4>
                      <p className="text-[11px] text-base-content/60 mt-0.5">{item.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={"text-base font-black " + (
                          item.percentage >= 80
                            ? "text-success"
                            : item.percentage >= 50
                            ? "text-warning"
                            : "text-error"
                        )}
                      >
                        {item.score}/{item.total}
                      </span>
                      <span className="text-xs text-base-content/60 block font-semibold">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {quizHistory.length > 0 && (
              <div className="p-4 border-t border-base-200 bg-base-200/30 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setQuizHistory([]);
                    try {
                      localStorage.removeItem("it_blog_quiz_history");
                    } catch {
                      // ignore
                    }
                  }}
                  className="btn btn-xs btn-ghost text-error/80 hover:text-error cursor-pointer"
                >
                  Xóa lịch sử
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="btn btn-xs btn-primary text-white rounded-xl"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
