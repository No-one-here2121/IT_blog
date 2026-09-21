import { useEffect, useMemo, useState } from "react";
import { featureApi } from "../utils/dbApi";
import { useToast } from "../context/ToastContext";

const TYPE_BADGES = {
  internship: { label: "Thực tập", cls: "badge-info" },
  fulltime: { label: "Full-time", cls: "badge-success" },
  parttime: { label: "Part-time", cls: "badge-warning" },
  remote: { label: "Remote", cls: "badge-secondary" }
};

export default function JobsPage({ onNavigate }) {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [lastFilters, setLastFilters] = useState(null);
  const [offline, setOffline] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationJob, setApplicationJob] = useState(null);
  const [application, setApplication] = useState({ name: "", email: "", phone: "", cv_name: "", cv_data: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setJobs(await featureApi.listJobs());
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

  const doAiSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const aiResult = await featureApi.aiSearchJobs(q);
      let resultJobs = Array.isArray(aiResult.jobs) ? aiResult.jobs : [];
      let resultCount = resultJobs.length;

      if (resultJobs.length === 0) {
        const googleResult = await featureApi.googleSearchJobs(q);
        resultJobs = Array.isArray(googleResult.jobs) ? googleResult.jobs : [];
        resultCount = resultJobs.length;
        setAiUsed(false);
        setLastFilters(null);
      } else {
        setAiUsed(Boolean(aiResult.ai_used));
        setLastFilters(aiResult.filters || null);
      }

      setJobs(resultJobs);
      addToast(`Đã tìm thấy ${resultCount} tin tuyển dụng`, "success", 4000);
    } catch (e) {
      addToast(
        e.status === 503
          ? "Chưa cấu hình nguồn dữ liệu việc làm. Hãy thêm thông tin API vào database/.env."
          : (e.message || "Tìm kiếm thất bại"),
        e.status === 503 ? "warning" : "error"
      );
    } finally {
      setSearching(false);
    }
  };

  const shown = useMemo(() => jobs, [jobs]);

  const chooseCv = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("CV không được vượt quá 5MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setApplication((prev) => ({
      ...prev,
      cv_name: file.name,
      cv_data: String(reader.result).split(",")[1] || ""
    }));
    reader.readAsDataURL(file);
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!application.cv_data) {
      addToast("Vui lòng chọn file CV", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await featureApi.submitJobApplication(applicationJob.id, application);
      addToast("Đã nộp CV thành công!", "success");
      setApplicationJob(null);
      setApplication({ name: "", email: "", phone: "", cv_name: "", cv_data: "" });
    } catch (e) {
      addToast(e.message || "Nộp CV thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate && onNavigate("home")} className="btn btn-ghost btn-sm">
          ← Về trang chủ
        </button>
      </div>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black">Tìm việc làm IT 🚀</h1>
        <p className="text-sm text-base-content/70 mt-1">
          Tìm tin tuyển dụng thật từ các nguồn công khai, luôn kèm link gốc.
        </p>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doAiSearch()}
            placeholder="VD: thực tập IT ở Hà Nội về React, internship C++ Đà Nẵng..."
            className="input input-bordered flex-1"
          />
          <button onClick={doAiSearch} disabled={searching} className="btn btn-primary text-white font-bold">
            {searching ? "Đang tìm việc..." : "🔍 Tìm việc làm"}
          </button>
          <button
            onClick={() => {
              setQuery("");
              setAiUsed(false);
              setLastFilters(null);
              load();
            }}
            className="btn btn-ghost"
          >
            Tất cả
          </button>
        </div>
        {aiUsed && lastFilters && (
          <p className="text-xs text-primary mt-2">
            🤖 Bộ lọc AI: loại <b>{lastFilters.job_type || "any"}</b>
            {lastFilters.location ? <> • nơi <b>{lastFilters.location}</b></> : null}
            {(lastFilters.keywords || []).length ? <> • từ khóa <b>{lastFilters.keywords.join(", ")}</b></> : null}
          </p>
        )}
        {offline && <p className="text-xs text-warning mt-2">⚠️ API chưa chạy: hãy mở terminal và chạy <code>npm run api</code></p>}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-base-300 rounded-2xl">
          <p className="text-4xl mb-3">🕵️</p>
          <p className="font-bold text-lg">Chưa có tin tuyển dụng đã xác minh</p>
          <p className="text-sm text-base-content/60">Tin chỉ được hiển thị khi có URL tuyển dụng thật từ nhà tuyển dụng hoặc nền tảng việc làm.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((j) => {
            const badge = TYPE_BADGES[j.job_type] || TYPE_BADGES.internship;
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedJob(j)}
                className="w-full text-left rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-5 shadow-sm hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge badge-sm ${badge.cls} font-bold`}>{badge.label}</span>
                      <span className="text-xs text-base-content/50">
                        {new Date(j.posted_at).toLocaleDateString("vi-VN")}
                      </span>
                      {j.link && j.link !== "#" ? (
                        <span className="badge badge-sm badge-success badge-outline">Có nguồn</span>
                      ) : (
                        <span className="badge badge-sm badge-ghost">Tin mẫu chưa xác minh</span>
                      )}
                    </div>
                    <h3 className="font-black text-base-content">{j.title}</h3>
                    <p className="text-sm text-base-content/70">
                      🏢 {j.company} • 📍 {j.location || "—"} {j.salary ? <> • 💰 {j.salary}</> : null}
                    </p>
                    <p className="text-xs text-base-content/60 mt-1">{j.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(j.tags || []).map((t) => (
                        <span key={t} className="badge badge-sm border border-base-300 bg-base-200/60 text-xs">#{t}</span>
                      ))}
                    </div>
                  </div>
                  {j.link && j.link !== "#" && (
                    <span className="btn btn-sm btn-primary text-white font-bold" onClick={(e) => e.stopPropagation()}>
                      {j.source === "google" ? "Xem nguồn" : "Ứng tuyển"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div className="modal modal-open" role="dialog" aria-modal="true">
          <div className="modal-box max-w-2xl">
            <button type="button" onClick={() => setSelectedJob(null)} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge badge-sm ${TYPE_BADGES[selectedJob.job_type]?.cls || "badge-info"} font-bold`}>
                {TYPE_BADGES[selectedJob.job_type]?.label || selectedJob.job_type}
              </span>
              <span className="text-xs text-base-content/50">{new Date(selectedJob.posted_at).toLocaleDateString("vi-VN")}</span>
            </div>
            <h2 className="text-2xl font-black pr-8">{selectedJob.title}</h2>
            <p className="mt-2 text-base-content/70">🏢 {selectedJob.company} • 📍 {selectedJob.location || "—"}</p>
            {selectedJob.address && <p className="mt-1 text-sm text-base-content/70">📌 {selectedJob.address}</p>}
            {selectedJob.phone && <p className="mt-1 text-sm text-base-content/70">☎️ {selectedJob.phone}</p>}
            {!selectedJob.address && !selectedJob.phone && <p className="mt-1 text-sm text-base-content/50">Địa chỉ và số điện thoại chưa được công khai.</p>}
            {selectedJob.salary && <p className="mt-1 text-base-content/70">💰 {selectedJob.salary}</p>}
            <p className="mt-5 whitespace-pre-line text-sm leading-6">{selectedJob.description || "Chưa có mô tả chi tiết."}</p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {(selectedJob.tags || []).map((tag) => <span key={tag} className="badge badge-sm">#{tag}</span>)}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {selectedJob.source !== "google" && selectedJob.link && selectedJob.link !== "#" && (
                <>
                  <button type="button" onClick={() => setApplicationJob(selectedJob)} className="btn btn-primary text-white font-bold">
                    📄 Nộp CV
                  </button>
                  <a href={selectedJob.link} target="_blank" rel="noreferrer" className="btn btn-outline font-bold">
                    Xem nguồn tuyển dụng
                  </a>
                </>
              )}
              {selectedJob.source === "google" && selectedJob.link && (
                <a href={selectedJob.link} target="_blank" rel="noreferrer" className="btn btn-primary text-white font-bold">
                  Mở tin tuyển dụng gốc
                </a>
              )}
              {selectedJob.source === "google" && (
                <p className="text-sm text-success">Tin có nguồn gốc. Hãy mở website tuyển dụng để xem chi tiết và ứng tuyển.</p>
              )}
              {selectedJob.source !== "google" && (!selectedJob.link || selectedJob.link === "#") && (
                <p className="text-sm text-warning">Tin mẫu chưa có nguồn tuyển dụng để nộp CV.</p>
              )}
            </div>
          </div>
          <button type="button" className="modal-backdrop" onClick={() => setSelectedJob(null)} aria-label="Đóng chi tiết việc làm">Đóng</button>
        </div>
      )}

      {applicationJob && (
        <div className="modal modal-open" role="dialog" aria-modal="true">
          <form onSubmit={submitApplication} className="modal-box max-w-lg space-y-3">
            <button type="button" onClick={() => setApplicationJob(null)} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
            <h2 className="text-xl font-black pr-8">Nộp CV: {applicationJob.title}</h2>
            <p className="text-sm text-base-content/60">Hồ sơ sẽ được gửi đến nhà tuyển dụng {applicationJob.company}.</p>
            <input required className="input input-bordered w-full" placeholder="Họ và tên *" value={application.name} onChange={(e) => setApplication({ ...application, name: e.target.value })} />
            <input required type="email" className="input input-bordered w-full" placeholder="Email *" value={application.email} onChange={(e) => setApplication({ ...application, email: e.target.value })} />
            <input className="input input-bordered w-full" placeholder="Số điện thoại" value={application.phone} onChange={(e) => setApplication({ ...application, phone: e.target.value })} />
            <input required type="file" accept=".pdf,.doc,.docx" onChange={chooseCv} className="file-input file-input-bordered w-full" />
            {application.cv_name && <p className="text-xs text-success">Đã chọn: {application.cv_name}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary text-white font-bold w-full">
              {submitting ? "Đang gửi CV..." : "Gửi hồ sơ ứng tuyển"}
            </button>
          </form>
          <button type="button" className="modal-backdrop" onClick={() => setApplicationJob(null)} aria-label="Đóng form nộp CV">Đóng</button>
        </div>
      )}
    </div>
  );
}
