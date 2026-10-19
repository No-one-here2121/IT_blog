import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Key, Sparkles, CheckCircle2, AlertCircle, ExternalLink, X, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ApiKeyModal({ isOpen, onClose }) {
  const { addToast } = useToast();
  const [keysInput, setKeysInput] = useState("");
  const [poolStatus, setPoolStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const fetchKeys = async () => {
    try {
      const data = await api.ai.getKeys();
      if (data) {
        setPoolStatus(data);
      }
    } catch {
      // Backend có thể chưa phản hồi
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setTestResult(null);

      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSaveKeys = async () => {
    const rawKeys = keysInput
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (rawKeys.length === 0) {
      addToast("Vui lòng nhập ít nhất một Gemini API Key!", "warning");
      return;
    }

    const isGeminiKey = (k) => k.length >= 20 && (k.startsWith("AIza") || k.startsWith("AQ."));
    const badKeys = rawKeys.filter((k) => !isGeminiKey(k));
    if (badKeys.length > 0) {
      addToast(`Key '${badKeys[0].slice(0, 10)}...' không hợp lệ. Phải bắt đầu bằng 'AIza...' hoặc 'AQ.'`, "error");
      return;
    }

    setLoading(true);
    try {
      const data = await api.ai.updateKeys(rawKeys);
      setPoolStatus(data);
      setKeysInput("");
      addToast(`🎉 Đã lưu thành công ${data.total_keys} Gemini API Key vào hệ thống!`, "success");
    } catch (err) {
      addToast(`Lỗi lưu API Key: ${err.message || "Không thể kết nối backend"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTestKey = async () => {
    const key = keysInput.trim().split(/[\n,;]+/)[0]?.trim();
    if (!key) {
      addToast("Vui lòng nhập API Key để kiểm tra!", "warning");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.ai.testKey(key);
      setTestResult(res);
      if (res.valid) {
        addToast("✅ Khóa API Gemini hoạt động rất tốt!", "success");
      } else {
        addToast(`❌ Khóa API không hợp lệ: ${res.message}`, "error");
      }
    } catch (err) {
      setTestResult({ valid: false, message: err.message || "Lỗi kiểm tra" });
      addToast(`Lỗi: ${err.message}`, "error");
    } finally {
      setTesting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-base-100 dark:bg-slate-900 rounded-2xl shadow-2xl border border-base-300 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-200 dark:border-slate-800 bg-base-200/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Key size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-base-content flex items-center gap-2">
                Cài đặt Gemini AI Key
                <span className="badge badge-primary badge-sm">Free</span>
              </h3>
              <p className="text-xs text-base-content/60">Tự động kích hoạt các tính năng AI & Kiểm duyệt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle text-base-content/60 hover:text-base-content"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Trạng thái hiện tại */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-base-200 dark:bg-slate-800/80 border border-base-300 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-amber-500 shrink-0" />
              <div>
                <div className="text-xs text-base-content/60">Trạng thái hệ thống AI</div>
                <div className="text-sm font-semibold text-base-content">
                  {poolStatus && poolStatus.active_keys > 0 ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Đang hoạt động ({poolStatus.active_keys} key sẵn sàng)
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertCircle size={14} /> Chưa cài đặt Key (Dùng giả lập)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={fetchKeys}
              className="btn btn-xs btn-ghost gap-1 text-base-content/70"
              title="Làm mới trạng thái"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Hướng dẫn lấy key */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-500" />
              Cách lấy API Key miễn phí (30 giây):
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-base-content/80">
              <li>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink size={11} /></a></li>
              <li>Bấm <b>Create API Key</b> rồi Copy key (bắt đầu bằng <code>AIzaSy...</code> hoặc <code>AQ.</code>)</li>
              <li>Dán vào ô bên dưới rồi bấm <b>Lưu Key</b>. Key sẽ được lưu vĩnh viễn!</li>
            </ol>
          </div>

          {/* Ô nhập Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/80 flex justify-between">
              <span>Dán Gemini API Key vào đây:</span>
              <span className="text-base-content/50 font-normal">Hỗ trợ nhiều key (mỗi dòng 1 key)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full font-mono text-xs h-24 focus:textarea-primary"
              placeholder="AIzaSyB...&#10;AQ.Abc..."
              value={keysInput}
              onChange={(e) => setKeysInput(e.target.value)}
            />
          </div>

          {/* Kết quả kiểm tra nếu có */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${testResult.valid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
              {testResult.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 border-t border-base-200 dark:border-slate-800 bg-base-200/30 dark:bg-slate-800/30 shrink-0">
          <button
            onClick={handleTestKey}
            disabled={testing || !keysInput.trim()}
            className="btn btn-sm btn-outline gap-1.5"
          >
            {testing ? <span className="loading loading-spinner loading-xs" /> : <RefreshCw size={14} />}
            Kiểm tra
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-sm btn-ghost">
              Đóng
            </button>
            <button
              onClick={handleSaveKeys}
              disabled={loading || !keysInput.trim()}
              className="btn btn-sm btn-primary gap-1.5"
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : <CheckCircle2 size={14} />}
              Lưu API Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
