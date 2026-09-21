import { useEffect, useState } from "react";
import { featureApi } from "../utils/dbApi";
import ThemeToggle from "../components/ThemeToggle";

/**
 * Lam bai trac nghiem tu ngan hang cau hoi trong PostgreSQL.
 * params: { courseId, postId, title }
 */
export default function QuizPage({ params = {}, onNavigate }) {
  const { courseId, postId } = params;
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = courseId ? { course_id: courseId } : postId ? { post_id: postId } : {};
    featureApi
      .getQuestions(p)
      .then((r) => setQuestions(r.questions || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, postId]);

  const pick = (qid, idx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  };

  const score = questions.reduce(
    (acc, q) => acc + (answers[q.id] === q.answer_index ? 1 : 0),
    0
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate && onNavigate("home")} className="btn btn-ghost btn-sm">
          ← Về trang chủ
        </button>
        <ThemeToggle />
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 w-full" />)}
        </div>
      )}

      {error && (
        <div className="text-center py-12 border border-dashed border-error/40 rounded-2xl">
          <p className="font-bold mb-2">Không tải được câu hỏi</p>
          <p className="text-sm text-base-content/60">{error}</p>
        </div>
      )}

      {!loading && !error && questions.length === 0 && (
        <div className="text-center py-12 border border-dashed border-base-300 rounded-2xl">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-bold">Chưa có câu hỏi nào</p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, qi) => {
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
                      {submitted && answerThis && <span className="ml-auto text-success font-bold text-xs">✓ Đáp án</span>}
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
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length < questions.length}
              className="btn btn-primary text-white font-bold px-8"
            >
              ✅ Nộp bài ({Object.keys(answers).length}/{questions.length})
            </button>
          ) : (
            <>
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">Kết quả</div>
                  <div className="stat-value text-primary">{score}/{questions.length}</div>
                  <div className="stat-desc">
                    {score === questions.length ? "Xuất sắc! 🎉" : score >= questions.length / 2 ? "Khá tốt! 👍" : "Cần ôn lại 📖"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="btn btn-outline font-bold"
              >
                🔄 Làm lại
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
