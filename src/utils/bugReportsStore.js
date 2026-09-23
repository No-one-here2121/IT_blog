export const FEEDBACK_STORAGE_KEY = "itblog_user_feedback_history";

export const DEFAULT_BUG_REPORTS = [
  {
    id: 101,
    category: "bug",
    priority: "high",
    title: "Thanh tìm kiếm bị tràn và đè lên menu điều hướng trên màn hình nhỏ",
    description: "Khi mở giao diện trên laptop có độ phân giải 1366x768 hoặc thu nhỏ cửa sổ trình duyệt, thanh tìm kiếm chiếm diện tích lớn khiến các nút Lộ trình và Việc làm bị đè lên nhau.",
    reporter_name: "Hoàng Long",
    reporter_email: "long.hoang@techcorp.vn",
    status: "resolved",
    admin_notes: "Đã xử lý: Cấu hình ô tìm kiếm co giãn linh hoạt flex-1 max-w-xs xl:max-w-sm min-w-[160px], gắn shrink-0 và gom menu phụ vào dropdown Thêm.",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 102,
    category: "bug",
    priority: "high",
    title: "Khoảng trắng thừa quá nhiều ở 2 bên mép màn hình khi dùng màn hình lớn",
    description: "Các trang Trang chủ, Khóa học, Lộ trình và Bảng xếp hạng bị giới hạn khung hẹp (max-w-7xl / 1280px), khiến màn hình 1080p và 2K bị thừa diện tích trống lớn 2 bên mép.",
    reporter_name: "Nguyễn Minh Đức",
    reporter_email: "ducnm@devops.io",
    status: "resolved",
    admin_notes: "Đã xử lý: Mở rộng container toàn diện lên chuẩn max-w-[1720px], tăng số cột bài viết lên 4 cột dạng lưới và 3 cột kèm sidebar.",
    created_at: new Date(Date.now() - 129600000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 103,
    category: "bug",
    priority: "medium",
    title: "Lỗi tải ảnh đại diện khi tải ảnh định dạng WebP hoặc dung lượng trên 2MB",
    description: "Khi đổi avatar trong trang hồ sơ cá nhân với ảnh WebP chụp từ điện thoại, hệ thống đôi khi báo lỗi không nhận dạng được MIME type.",
    reporter_name: "Lê Thu Hà",
    reporter_email: "thuha.frontend@gmail.com",
    status: "in_progress",
    admin_notes: "Đang xử lý: Đội kỹ thuật đang bổ sung thư viện nén và chuẩn hóa ảnh tự động thành WebP/JPEG trước khi tải lên máy chủ.",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 28800000).toISOString()
  },
  {
    id: 104,
    category: "feature",
    priority: "medium",
    title: "Đề xuất hỗ trợ phím tắt Ctrl+Enter để gửi bình luận nhanh trong bài viết",
    description: "Rất mong Ban Quản trị bổ sung phím tắt Ctrl+Enter (hoặc Cmd+Enter trên macOS) khi viết bình luận để lập trình viên có thể thảo luận nhanh mà không phải rê chuột bấm nút Gửi.",
    reporter_name: "Phạm Hải Đăng",
    reporter_email: "haidang.dev@outlook.com",
    status: "pending",
    admin_notes: "Đã tiếp nhận yêu cầu, dự kiến cập nhật trong phiên bản tới.",
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: null
  },
  {
    id: 105,
    category: "bug",
    priority: "high",
    title: "Bộ đếm thời gian trong bài thi trắc nghiệm bị lùi giây khi chuyển tab",
    description: "Trong lúc làm bài trắc nghiệm ReactJS, nếu chuyển sang tab khác rồi quay lại thì đồng hồ đếm ngược có hiện tượng giật thời gian và cảnh báo mất tập trung.",
    reporter_name: "Đỗ Anh Tuấn",
    reporter_email: "tuan.do@edu.vn",
    status: "in_progress",
    admin_notes: "Đang tái hiện trên Chrome 124 và chuẩn bị áp dụng cơ chế Web Worker / Timestamp diff chính xác.",
    created_at: new Date(Date.now() - 21600000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 106,
    category: "content",
    priority: "low",
    title: "Đường dẫn tài liệu tham khảo chính thức trong bài viết Docker Swarm bị lỗi 404",
    description: "Link tài liệu Docker Swarm ở cuối bài viết hướng dẫn triển khai cụm dịch vụ trỏ tới URL cũ đã bị thay đổi trên docs.docker.com.",
    reporter_name: "Vũ Quốc Việt",
    reporter_email: "vietvq@fpt.com.vn",
    status: "resolved",
    admin_notes: "Đã thông báo tác giả bài viết và cập nhật URL tài liệu mới nhất.",
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export function getStoredBugReports() {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(DEFAULT_BUG_REPORTS));
      return DEFAULT_BUG_REPORTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(DEFAULT_BUG_REPORTS));
      return DEFAULT_BUG_REPORTS;
    }
    // Check if format needs normalization (some older items might have subject instead of title)
    const normalized = parsed.map((item) => ({
      id: item.id || Date.now(),
      category: item.category || item.type || "bug",
      priority: item.priority || "medium",
      title: item.title || item.subject || "Báo cáo sự cố không tên",
      description: item.description || item.content || "",
      reporter_name: item.reporter_name || item.name || "Thành viên",
      reporter_email: item.reporter_email || item.email || "",
      status: item.status || "pending",
      admin_notes: item.admin_notes || item.response || "",
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || null
    }));
    return normalized;
  } catch {
    return DEFAULT_BUG_REPORTS;
  }
}

export function saveStoredBugReports(reports) {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("Failed to save bug reports to localStorage", err);
  }
}

export function addStoredBugReport(report) {
  const current = getStoredBugReports();
  const newItem = {
    id: report.id || Date.now(),
    category: report.category || report.type || "bug",
    priority: report.priority || "medium",
    title: report.title || report.subject || "Báo cáo sự cố",
    description: report.description || report.content || "",
    reporter_name: report.reporter_name || report.name || "Khách",
    reporter_email: report.reporter_email || report.email || "",
    status: report.status || "pending",
    admin_notes: report.admin_notes || "",
    created_at: report.created_at || new Date().toISOString(),
    updated_at: null
  };
  const updated = [newItem, ...current];
  saveStoredBugReports(updated);
  return updated;
}

export function updateStoredBugReport(id, patch) {
  const current = getStoredBugReports();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...patch,
        updated_at: new Date().toISOString()
      };
    }
    return item;
  });
  saveStoredBugReports(updated);
  return updated;
}

export function deleteStoredBugReport(id) {
  const current = getStoredBugReports();
  const updated = current.filter((item) => item.id !== id);
  saveStoredBugReports(updated);
  return updated;
}
