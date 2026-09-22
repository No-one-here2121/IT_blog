import { useEffect, useState } from "react";
import api from "../services/api";

const DEFAULT_FALLBACK_QUESTIONS = [
  {
    id: 1,
    language: "React",
    question: "Trong React 19, ref được truyền vào function component như thế nào?",
    options: ["Phải dùng forwardRef()", "Là một prop bình thường", "Chỉ dùng được với class component", "Bắt buộc phải qua useContext()"],
    answer_index: 1,
    explanation: "Từ React 19, ref đã trở thành một prop bình thường trong function component và không còn cần forwardRef().",
    difficulty: "easy"
  },
  {
    id: 2,
    language: "React",
    question: "Hook nào quản lý luồng gửi Form Action bất đồng bộ trong React 19?",
    options: ["useEffect", "useActionState", "useMemo", "useRef"],
    answer_index: 1,
    explanation: "Hook useActionState() tự động quản lý trạng thái loading, lỗi và kết quả khi thực hiện action bất đồng bộ.",
    difficulty: "medium"
  },
  {
    id: 3,
    language: "FastAPI",
    question: "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (data validation) và serialization?",
    options: ["Marshmallow", "Pydantic", "Django REST Serializer", "Cerberus"],
    answer_index: 1,
    explanation: "FastAPI tích hợp Pydantic chặt chẽ để validate request body, query params và response schema tự động.",
    difficulty: "easy"
  },
  {
    id: 4,
    language: "PostgreSQL",
    question: "Mục tiêu cốt lõi của Connection Pooling trong hệ thống Backend là gì?",
    options: ["Mã hóa dữ liệu tại chỗ", "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP/TLS", "Tự động phân vùng bảng lớn", "Tăng kích thước RAM của máy chủ"],
    answer_index: 1,
    explanation: "Khởi tạo kết nối PostgreSQL tốn kém chi phí handshake và auth. Connection Pooling duy trì nhóm kết nối sẵn sàng sử dụng ngay.",
    difficulty: "medium"
  },
  {
    id: 5,
    language: "DevOps",
    question: "Trong quy trình CI/CD với Docker, Multi-stage Build mang lại lợi ích quan trọng nào?",
    options: ["Cho phép chạy nhiều container cùng một port", "Giảm đáng kể kích thước image thành phẩm bằng cách loại bỏ compiler và dev dependencies", "Tự động backup dữ liệu container", "Thay thế hoàn toàn Kubernetes"],
    answer_index: 1,
    explanation: "Multi-stage build tách biệt giai đoạn build và runtime, chỉ copy artifact cần thiết vào image cuối, giúp tối ưu dung lượng và bảo mật.",
    difficulty: "easy"
  },
  {
    id: 6,
    language: "Python",
    question: "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60%?",
    options: ["Loại bỏ hoàn toàn GIL", "Dự án Faster CPython (Adaptive specializing interpreter)", "Chuyển sang JIT compiler của PyPy", "Bắt buộc biên dịch AOT"],
    answer_index: 1,
    explanation: "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    difficulty: "hard"
  }
];

/**
 * Lam bai trac nghiem tu ngan hang cau hoi trong PostgreSQL / FastAPI.
 * params: { courseId, postId, title }
 */
export default function QuizPage({ params = {}, onNavigate }) {
  const { courseId, postId, title } = params;
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Countdown Timer States (10 phút = 600 giây)
  const [timeLeft, setTimeLeft] = useState(600);
  const [timerActive, setTimerActive] = useState(true);

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
  const [showAiModal, setShowAiModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("React 19");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiCount, setAiCount] = useState(5);
  const [aiAlert, setAiAlert] = useState("");

  // Topic filter state
  const [topicFilter, setTopicFilter] = useState("all");

  const PRESET_TOPICS = [
    "React 19",
    "FastAPI & Python",
    "PostgreSQL",
    "DevOps & Docker",
    "System Design",
    "Microservices & K8s",
    "AI & LLM"
  ];

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
    setTimeLeft(600);
    setTimerActive(true);
    setFilterWrongOnly(false);
  };

  const handleExportQuizReportMd = () => {
    const total = questions.length;
    const correctCount = score;
    const percentage = Math.round((correctCount / (total || 1)) * 100);
    const passed = percentage >= 60;
    const rating = percentage >= 80 ? "Xuất sắc (Senior Level)" : percentage >= 60 ? "Khá (Mid Level)" : "Cần rèn luyện thêm (Junior Level)";

    const lines = [
      `# 🧠 Báo Cáo Kết Quả Thi Trắc Nghiệm - IT Blog`,
      ``,
      `> **Chủ đề:** ${title || aiTopic || "Kiến thức IT"} | **Điểm số:** ${correctCount}/${total} (${percentage}%) | **Xếp loại:** ${rating}`,
      `> **Trạng thái:** ${passed ? "✓ ĐẠT YÊU CẦU" : "✕ CHƯA ĐẠT"} | **Thời gian:** ${new Date().toLocaleString("vi-VN")}`,
      ``,
      `---`,
      `### Chi Tiết Từng Câu Hỏi & Lời Giải Thích`,
      ``,
      ...questions.map((q, idx) => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.answer_index;
        const mark = isCorrect ? "✅ [ĐÚNG]" : "❌ [SAI]";
        const userChoice = userAns !== undefined ? q.options[userAns] : "Chưa trả lời";
        const correctChoice = q.options[q.answer_index];

        return [
          `#### Câu ${idx + 1}: ${q.question} ${mark}`,
          `- **Câu trả lời của bạn:** ${userChoice}`,
          `- **Đáp án chính xác:** ${correctChoice}`,
          `- **Giải thích chuyên môn:** ${q.explanation || "Không có lời giải thích."}`,
          ``
        ].join("\n");
      }),
      `---`,
      `*Xuất từ Nền tảng Tri thức Kỹ sư IT Blog*`
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz_result_${(title || aiTopic || "it_quiz").toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const p = courseId ? { course_id: courseId } : postId ? { post_id: postId } : {};
    api.quiz
      .getQuestions(p)
      .then((r) => {
        const list = r?.questions || [];
        setQuestions(list.length > 0 ? list : DEFAULT_FALLBACK_QUESTIONS);
      })
      .catch((e) => {
        console.warn("Quiz API offline or returned error, using fallback questions:", e);
        setError(e.message || "");
        setQuestions(DEFAULT_FALLBACK_QUESTIONS);
      })
      .finally(() => setLoading(false));
  }, [courseId, postId]);

  const pick = (qid, idx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  };

  const handleScoreSubmit = async () => {
    setSubmitted(true);
    setTimerActive(false);

    const calculatedScore = questions.reduce(
      (acc, q) => acc + (answers[q.id] === q.answer_index ? 1 : 0),
      0
    );
    const newRecord = {
      id: Date.now(),
      topic: title || aiTopic || "Kiến thức IT",
      score: calculatedScore,
      total: questions.length,
      percentage: Math.round((calculatedScore / (questions.length || 1)) * 100),
      date: new Date().toLocaleString("vi-VN"),
      difficulty: aiDifficulty
    };

    setQuizHistory((prev) => {
      const next = [newRecord, ...prev].slice(0, 15);
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

  // Đếm ngược thời gian làm bài
  useEffect(() => {
    if (submitted || !timerActive || timeLeft <= 0 || loading) return;
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
  }, [submitted, timerActive, timeLeft, loading]);

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
      setTimeLeft(600);
      setTimerActive(true);
      setFilterWrongOnly(false);
      setShowAiModal(false);
      setAiAlert(`Đã tạo thành công bộ ${res?.count || aiCount} câu hỏi về ${aiTopic} bằng AI! Hãy thử sức ngay.`);
    } catch (err) {
      console.warn("AI Quiz generation error:", err);
      setError("Không thể tạo đề thi bằng AI lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDefault = () => {
    setLoading(true);
    setAnswers({});
    setSubmitted(false);
    setTimeLeft(600);
    setTimerActive(true);
    setFilterWrongOnly(false);
    setAiAlert("");
    setError("");
    api.quiz
      .getQuestions(courseId ? { course_id: courseId } : postId ? { post_id: postId } : {})
      .then((r) => {
        const list = r?.questions || [];
        setQuestions(list.length > 0 ? list : DEFAULT_FALLBACK_QUESTIONS);
      })
      .catch(() => {
        setQuestions(DEFAULT_FALLBACK_QUESTIONS);
      })
      .finally(() => setLoading(false));
  };

  const handleRetakeWrongQuestions = () => {
    if (wrongQuestions.length === 0) return;
    setQuestions([...wrongQuestions]);
    setAnswers({});
    setSubmitted(false);
    setTimeLeft(Math.max(120, wrongQuestions.length * 60));
    setTimerActive(true);
    setFilterWrongOnly(false);
    setAiAlert(`🎯 Bắt đầu luyện tập lại ${wrongQuestions.length} câu hỏi chưa đạt! Hãy tập trung tối đa.`);
  };

  const score = questions.reduce(
    (acc, q) => acc + (answers[q.id] === q.answer_index ? 1 : 0),
    0
  );

  const baseQuestions = topicFilter === "all"
    ? questions
    : questions.filter((q) => {
        const lang = (q.language || "").toLowerCase();
        const tf = topicFilter.toLowerCase();
        return lang.includes(tf) || (q.question || "").toLowerCase().includes(tf);
      });
  const wrongQuestions = baseQuestions.filter((q) => answers[q.id] !== q.answer_index);
  const displayedQuestions = filterWrongOnly && submitted ? wrongQuestions : baseQuestions;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate && onNavigate("home")}
          className="btn btn-ghost btn-sm gap-1.5 text-base-content/80 hover:text-base-content"
        >
          ← Về trang chủ
        </button>
      </div>

      {/* Header Banner */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent border border-base-300">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-base-content">
              {title ? `Trắc nghiệm: ${title}` : "Ngân hàng Trắc nghiệm Kiến thức IT"}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/70 mt-0.5">
              Hệ thống câu hỏi tuyển chọn bao gồm React 19, FastAPI, PostgreSQL và DevOps.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-base-content/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-md hover:scale-105 transition-all"
            >
              <span>⚡</span>
              <span>Tạo đề thi bằng AI</span>
            </button>
            <button
              onClick={handleShuffleQuestions}
              className="btn btn-sm btn-ghost gap-1.5"
              title="Xáo trộn thứ tự câu hỏi ngẫu nhiên"
            >
              <span>🔀</span>
              <span>Xáo trộn</span>
            </button>
            <button
              onClick={handleResetDefault}
              className="btn btn-sm btn-ghost gap-1.5"
            >
              <span>🔄</span>
              <span>Đề mặc định</span>
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

          {/* Countdown timer */}
          <div className="flex items-center gap-2">
            {!submitted ? (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold font-mono transition-colors ${
                timeLeft < 120
                  ? "bg-error/10 border-error/40 text-error animate-pulse"
                  : "bg-base-200/80 border-base-300 text-base-content"
              }`}>
                <span>⏱️</span>
                <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
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
              <span className="badge badge-success text-white text-xs font-bold gap-1 px-3 py-1">
                ✓ Đã hoàn thành
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Topic Filter Chips */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-base-content/60 shrink-0">Chủ đề:</span>
        {["all", "React", "FastAPI", "Python", "PostgreSQL", "DevOps"].map((top) => (
          <button
            key={top}
            type="button"
            onClick={() => setTopicFilter(top)}
            className={`btn btn-xs rounded-full font-semibold transition-all shrink-0 whitespace-nowrap ${
              topicFilter === top
                ? "btn-primary text-white shadow-2xs"
                : "btn-ghost text-base-content/70 hover:bg-base-200"
            }`}
          >
            {top === "all" ? "Tất cả" : top}
          </button>
        ))}
      </div>

      {aiAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-between animate-fade-in">
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

      {submitted && (
        <div className="mb-6 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div>
            <div className="text-xl sm:text-2xl font-black text-base-content">
              Kết quả: <span className={score >= questions.length * 0.8 ? "text-success" : score >= questions.length * 0.5 ? "text-warning" : "text-error"}>{score}/{questions.length}</span> câu đúng ({Math.round((score / (questions.length || 1)) * 100)}%)
            </div>
            <p className="text-xs text-base-content/60 mt-1">
              {score === questions.length ? "Xuất sắc! Bạn nắm rất vững kiến thức." : score >= questions.length * 0.5 ? "Khá tốt! Hãy ôn lại các câu trả lời sai." : "Cần rèn luyện thêm để làm chủ công nghệ này."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Wrong Answers Toggle */}
            <div className="join">
              <button
                type="button"
                onClick={() => setFilterWrongOnly(false)}
                className={`join-item btn btn-xs ${!filterWrongOnly ? "btn-primary text-white font-bold" : "btn-ghost"}`}
              >
                Tất cả ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterWrongOnly(true)}
                className={`join-item btn btn-xs ${filterWrongOnly ? "btn-error text-white font-bold" : "btn-ghost text-error"}`}
              >
                Chỉ câu sai ({wrongQuestions.length})
              </button>
            </div>

            {wrongQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleRetakeWrongQuestions}
                className="btn btn-xs btn-warning text-amber-950 font-bold rounded-xl gap-1 shadow-2xs hover:scale-105 transition-all"
                title="Luyện tập lại các câu hỏi trả lời chưa đúng"
              >
                <span>🎯</span>
                <span>Luyện lại câu sai ({wrongQuestions.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportQuizReportMd}
              className="btn btn-xs btn-outline btn-ghost hover:text-primary rounded-xl font-bold gap-1 border border-base-300"
              title="Tải báo cáo kết quả bài thi dạng Markdown (.md) cho Obsidian/Notion"
            >
              <span>📥</span>
              <span>Tải kết quả (.md)</span>
            </button>

            <button
              onClick={handleResetDefault}
              className="btn btn-xs btn-outline btn-primary rounded-xl font-bold ml-1"
            >
              🔄 Thi lại
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12 border border-dashed border-error/40 rounded-2xl">
          <p className="font-bold mb-2">Không tải được câu hỏi</p>
          <p className="text-sm text-base-content/60">{error}</p>
        </div>
      )}

      {!loading && !error && displayedQuestions.length === 0 && (
        <div className="text-center py-12 border border-dashed border-base-300 rounded-2xl">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-bold">{filterWrongOnly ? "Bạn không làm sai câu nào! Thật tuyệt vời." : "Chưa có câu hỏi nào"}</p>
        </div>
      )}

      <div className="space-y-4">
        {displayedQuestions.map((q, qi) => {
          const chosen = answers[q.id];
          return (
            <div key={q.id} className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-colors ${
              submitted
                ? chosen === q.answer_index
                  ? "border-success/60 bg-success/5"
                  : "border-error/60 bg-error/5"
                : "border-base-300 bg-base-100"
            }`}>
              <p className="font-bold text-sm sm:text-base mb-3">
                <span className="text-primary mr-1.5">Câu {qi + 1}.</span>
                {q.question}
                <span className="badge badge-xs badge-ghost ml-2 align-middle">{q.difficulty}</span>
                {q.language && (
                  <span className="badge badge-xs badge-outline text-primary ml-1.5 align-middle">
                    {q.language}
                  </span>
                )}
              </p>
              <div className="grid gap-2">
                {(q.options || []).map((opt, oi) => {
                  const chosenThis = chosen === oi;
                  const answerThis = q.answer_index === oi;
                  let cls = "border-base-300 bg-base-100 hover:border-primary/50";
                  if (submitted) {
                    if (answerThis) cls = "border-success bg-success/10";
                    else if (chosenThis) cls = "border-error bg-error/10";
                    else cls = "border-base-300 opacity-70";
                  } else if (chosenThis) {
                    cls = "border-primary bg-primary/10";
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(q.id, oi)}
                      className={`flex items-center gap-2.5 text-left rounded-xl border p-2.5 text-sm transition-colors ${cls}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-base-200 font-black text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                      {submitted && answerThis && <span className="ml-auto text-success font-bold text-xs">✓ Đáp án đúng</span>}
                      {submitted && chosenThis && !answerThis && <span className="ml-auto text-error font-bold text-xs">✗ Bạn chọn</span>}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p className="text-xs text-base-content/70 mt-3 border-l-4 border-primary/40 pl-3 italic">
                  💡 {q.explanation}
                </p>
              )}
              {submitted && q.post_ids?.length > 0 && (
                <p className="text-[11px] text-base-content/40 mt-1">Thuộc {q.post_ids.length} bài viết trong khóa học</p>
              )}
            </div>
          );
        })}
      </div>

      {questions.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {!submitted ? (
            <button
              onClick={handleScoreSubmit}
              disabled={Object.keys(answers).length < questions.length}
              className="btn btn-primary text-white font-bold px-8 shadow-md"
            >
              ✅ Nộp bài ({Object.keys(answers).length}/{questions.length})
            </button>
          ) : (
            <>
              <div className="stats shadow border border-base-300">
                <div className="stat">
                  <div className="stat-title text-xs">Kết quả bài làm</div>
                  <div className="stat-value text-primary text-2xl sm:text-3xl">{score}/{questions.length}</div>
                  <div className="stat-desc font-semibold">
                    {score === questions.length ? "Xuất sắc! 🏆 Đạt 100%" : score >= questions.length / 2 ? "Khá tốt! 👍 Đạt yêu cầu" : "Cần ôn tập thêm 📖"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="btn btn-outline btn-primary font-bold"
              >
                🔄 Làm lại bài thi
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal Tạo đề thi bằng AI */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => { if (!isGenerating && e.target === e.currentTarget) setShowAiModal(false); }}
        >
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
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

            {/* Modal Form */}
            <form onSubmit={handleGenerateAiQuiz} className="p-5 space-y-4">
              {/* Topic suggestions */}
              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1.5">
                  Chủ đề / Công nghệ mục tiêu:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {PRESET_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setAiTopic(topic)}
                      className={`badge badge-sm cursor-pointer py-2 px-2.5 transition-all ${
                        aiTopic === topic
                          ? "badge-primary text-white font-bold"
                          : "badge-outline hover:bg-primary hover:text-white hover:border-primary"
                      }`}
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
                  className="input input-bordered input-sm w-full text-xs focus:input-primary"
                  required
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold text-base-content/80 mb-1.5">
                  Độ khó câu hỏi:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easy", label: "🌱 Dễ (Cơ bản)" },
                    { id: "medium", label: "⚡ Trung bình" },
                    { id: "hard", label: "🔥 Nâng cao" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setAiDifficulty(d.id)}
                      className={`btn btn-sm text-xs font-semibold ${
                        aiDifficulty === d.id
                          ? "btn-primary text-white"
                          : "btn-outline border-base-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
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
                      className={`btn btn-sm flex-1 text-xs font-bold ${
                        aiCount === c ? "btn-primary text-white" : "btn-outline border-base-300"
                      }`}
                    >
                      {c} câu
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  disabled={isGenerating}
                  className="btn btn-sm btn-ghost"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !aiTopic.trim()}
                  className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-md"
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

      {/* Modal Lịch sử làm bài trắc nghiệm */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}
        >
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
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
                  <div key={item.id} className="p-3.5 bg-base-200/50 rounded-2xl border border-base-300 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-base-content">{item.topic}</h4>
                      <p className="text-[11px] text-base-content/60 mt-0.5">{item.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-base font-black ${
                        item.percentage >= 80 ? "text-success" : item.percentage >= 50 ? "text-warning" : "text-error"
                      }`}>
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
                    try { localStorage.removeItem("it_blog_quiz_history"); } catch { /* ignore */ }
                  }}
                  className="btn btn-xs btn-ghost text-error/80 hover:text-error cursor-pointer"
                >
                  Xóa lịch sử
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="btn btn-xs btn-primary text-white"
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
