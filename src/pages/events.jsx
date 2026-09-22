import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const INITIAL_EVENTS = [
  {
    id: 1,
    title: "Webinar: Thiết kế Hệ thống Microservices với Clean Architecture 2026",
    slug: "webinar-thiet-ke-microservices-clean-architecture",
    description: "Chia sẻ kinh nghiệm thiết kế Domain Driven Design (DDD), phân rã dịch vụ và triển khai CI/CD chuẩn Enterprise.",
    organizer: "Cộng đồng Python Việt Nam",
    event_type: "webinar",
    start_time: "2026-09-28T19:30:00Z",
    location: "Online qua Zoom",
    banner_image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
    status: "upcoming"
  },
  {
    id: 2,
    title: "Workshop: Tối ưu hiệu năng PostgreSQL Chuyên sâu & Partitioning",
    slug: "workshop-toi-uu-postgresql",
    description: "Thực hành trực tiếp tối ưu hóa câu lệnh truy vấn phức tạp, lập chỉ mục BRIN/GIN và phân vùng bảng dữ liệu lớn.",
    organizer: "PostgreSQL User Group Hanoi",
    event_type: "workshop",
    start_time: "2026-10-05T09:00:00Z",
    location: "Keangnam Landmark 72, Hà Nội",
    banner_image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    status: "upcoming"
  },
  {
    id: 3,
    title: "AI Engineer Conference: Xây dựng AI Agent với LangChain & Gemini",
    slug: "ai-engineer-conference-2026",
    description: "Hội thảo quy tụ các chuyên gia hàng đầu về AI, LLM và kỹ thuật Prompt Engineering nâng cao.",
    organizer: "Vietnam AI Summit",
    event_type: "conference",
    start_time: "2026-10-18T08:30:00Z",
    location: "Trung tâm Hội nghị Quốc gia, Hà Nội & Online",
    banner_image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80",
    status: "upcoming"
  }
];

const getGoogleCalendarUrl = (evt) => {
  const title = encodeURIComponent(evt.title || evt.event_title || "Sự kiện IT Blog");
  const details = encodeURIComponent(evt.description || "Tham gia sự kiện công nghệ trên IT Blog!");
  const location = encodeURIComponent(evt.location || "Online");
  const validStartTime = evt.start_time && !isNaN(new Date(evt.start_time).getTime())
    ? new Date(evt.start_time)
    : new Date();
  const endTime = new Date(validStartTime.getTime() + 2 * 60 * 60 * 1000);
  const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, "");
  const dates = `${formatGCalDate(validStartTime)}/${formatGCalDate(endTime)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
};

export default function EventsPage({ onNavigate }) {
  const { requireAuth, currentUser } = useAuth();
  const { addToast } = useToast();
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [typeFilter, setTypeFilter] = useState("all");
  const [eventSearch, setEventSearch] = useState("");

  // My Tickets State
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketForModal, setSelectedTicketForModal] = useState(null);

  // Host Event Modal State
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("workshop");
  const [eventOrganizer, setEventOrganizer] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventLocation, setEventLocation] = useState("Online qua Zoom / Google Meet");
  const [eventOnlineUrl, setEventOnlineUrl] = useState("");
  const [eventBanner, setEventBanner] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  useEffect(() => {
    api.events.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
        }
      })
      .catch(() => {});

    if (currentUser) {
      api.events.getMyRegistrations()
        .then((data) => {
          if (Array.isArray(data)) setMyTickets(data);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const loadMyTickets = () => {
    setLoadingTickets(true);
    api.events.getMyRegistrations()
      .then((data) => setMyTickets(Array.isArray(data) ? data : []))
      .catch(() => {
        setMyTickets([
          {
            id: 1,
            event_id: 1,
            event_title: "Webinar: Thiết kế Hệ thống Microservices với Clean Architecture 2026",
            start_time: "2026-09-28T19:30:00Z",
            full_name: currentUser?.name || "Lập trình viên",
            email: currentUser?.email || "dev@example.com",
            notes: "Vé mời trực tuyến đã được kích hoạt",
            created_at: new Date().toISOString()
          }
        ]);
      })
      .finally(() => setLoadingTickets(false));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventOrganizer.trim()) return;
    setIsCreatingEvent(true);
    try {
      const created = await api.events.create({
        title: eventTitle.trim(),
        description: eventDescription.trim() || "Workshop & Hội thảo chia sẻ kỹ thuật chuyên sâu.",
        organizer: eventOrganizer.trim(),
        event_type: eventType,
        start_time: eventStartTime ? new Date(eventStartTime).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
        location: eventLocation.trim(),
        online_url: eventOnlineUrl.trim() || undefined,
        banner_image: eventBanner.trim() || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"
      });
      setEvents((prev) => [created, ...prev]);
      addToast(`Đã xuất bản sự kiện "${eventTitle}" thành công! 🎟️`, "success");
      setShowCreateEventModal(false);
      setEventTitle("");
      setEventOrganizer("");
      setEventStartTime("");
      setEventDescription("");
      setEventOnlineUrl("");
      setEventBanner("");
    } catch (err) {
      addToast(err?.message || "Lỗi khi đăng ký sự kiện.", "error");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchType = typeFilter === "all" || e.event_type?.toLowerCase() === typeFilter.toLowerCase();
    const q = eventSearch.toLowerCase().trim();
    const matchSearch = !q ||
      e.title?.toLowerCase().includes(q) ||
      e.organizer?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const handleRegister = (event) => {
    requireAuth(async () => {
      try {
        const reg = await api.events.register(event.id, {
          full_name: currentUser?.name || "Người tham dự",
          email: currentUser?.email || "attendee@example.com",
          notes: "Đăng ký từ giao diện web IT Blog",
        });

        const newTicket = {
          id: reg?.id || Date.now(),
          event_id: event.id,
          event_title: event.title,
          start_time: event.start_time,
          full_name: currentUser?.name || "Người tham dự",
          email: currentUser?.email || "attendee@example.com",
          notes: "Vé mời trực tuyến đã được kích hoạt",
          created_at: new Date().toISOString()
        };
        setMyTickets((prev) => [newTicket, ...prev.filter((t) => t.event_id !== event.id)]);

        addToast(`Đăng ký thành công tham gia sự kiện "${event.title}"! Chúng tôi đã ghi nhận vé tham dự của bạn 🎟️`, "success");
      } catch (err) {
        addToast(err?.message || "Lỗi khi đăng ký sự kiện.", "error");
      }
    }, "Vui lòng đăng nhập để đăng ký tham gia sự kiện!");
  };

  const handleCancelTicket = async (eventId, eventTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đăng ký vé tham gia "${eventTitle}"?`)) return;
    try {
      await api.events.cancelRegistration(eventId);
      setMyTickets((prev) => prev.filter((t) => t.event_id !== eventId));
      addToast(`Đã hủy vé tham gia "${eventTitle}".`, "info");
    } catch {
      setMyTickets((prev) => prev.filter((t) => t.event_id !== eventId));
      addToast(`Đã hủy vé tham gia "${eventTitle}".`, "info");
    }
  };

  const handleExportEventMd = (evt) => {
    const validStartTime = evt.start_time && !isNaN(new Date(evt.start_time).getTime())
      ? new Date(evt.start_time).toLocaleString("vi-VN")
      : "Sắp diễn ra";

    const content = `# THÔNG TIN SỰ KIỆN CÔNG NGHỆ: ${evt.title}
*Nền tảng:* IT Blog - Mạng xã hội Tri thức Kỹ sư
*Hình thức:* ${evt.event_type?.toUpperCase() || "SỰ KIỆN"}

---

## 📌 THÔNG TIN TỔNG QUAN
- **Chủ đề:** ${evt.title}
- **Thời gian diễn ra:** ${validStartTime}
- **Địa điểm / Nền tảng:** ${evt.location || "Online"}
- **Đơn vị tổ chức:** ${evt.organizer || "Cộng đồng Công nghệ"}
- **Trạng thái:** ${evt.status || "Đang mở đăng ký"}

## 📝 NỘI DUNG & LỊCH TRÌNH DỰ KIẾN
${evt.description || "Tham gia buổi hội thảo để cập nhật các xu hướng kiến trúc, công nghệ và phương pháp thực hành tốt nhất."}

---
*Lưu ý: Bạn có thể đăng ký vé tham dự trực tuyến miễn phí tại nền tảng IT Blog.*
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (evt.title || "event")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 30);
    link.href = url;
    link.setAttribute("download", `${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Đã xuất thông tin sự kiện "${evt.title}" dạng Markdown (.md)! 📥`, "success");
  };

  const handleExportMyTicketsMd = () => {
    if (myTickets.length === 0) {
      addToast("Chưa có vé sự kiện nào để xuất! ℹ️", "info");
      return;
    }
    const rows = myTickets.map((t, idx) => {
      const time = t.start_time && !isNaN(new Date(t.start_time).getTime())
        ? new Date(t.start_time).toLocaleString("vi-VN")
        : (t.created_at ? new Date(t.created_at).toLocaleDateString("vi-VN") : "Sắp diễn ra");
      const title = (t.event_title || "Sự kiện").replace(/\|/g, "\\|");
      const passId = `IT-PASS-${String(t.event_id || 1).padStart(4, "0")}`;
      const attendee = t.full_name || currentUser?.name || "Đại biểu";
      return `| ${idx + 1} | ${title} | ${time} | \`${passId}\` | ${attendee} | ${t.email || "—"} |`;
    }).join("\n");

    const content = `# LỊCH TRÌNH VÉ THAM DỰ SỰ KIỆN CÔNG NGHỆ - ${currentUser?.name || "Đại biểu"}
*Thời gian xuất:* ${new Date().toLocaleString("vi-VN")}
*Tổng số vé:* ${myTickets.length}

| STT | Tên sự kiện | Thời gian | Mã vé (Pass ID) | Người nhận vé | Email xác nhận |
|---|---|---|---|---|---|
${rows}

---
*Vé mời điện tử chính thức được phát hành bởi Nền tảng IT Blog.*
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `it_blog_my_tickets_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Đã tải xuống lịch trình vé sự kiện dạng Markdown (.md)! 📥", "success");
  };

  const handleExportEventsScheduleMd = () => {
    const list = filteredEvents.length > 0 ? filteredEvents : events;
    if (list.length === 0) {
      addToast("Không có sự kiện nào để xuất lịch! ℹ️", "info");
      return;
    }

    const typeLabel =
      typeFilter === "webinar"
        ? "Webinar Trực Tuyến"
        : typeFilter === "workshop"
        ? "Workshop Thực Hành"
        : typeFilter === "conference"
        ? "Hội Nghị (Conference)"
        : typeFilter === "meetup"
        ? "Gặp Gỡ (Meetup)"
        : "Tất Cả Thể Loại";

    let content = `# 📅 Lịch Trình Sự Kiện & Hội Thảo Công Nghệ - IT Blog\n\n`;
    content += `> Phân loại: **${typeLabel}**\n`;
    content += `> Tổng số sự kiện: **${list.length} sự kiện** | Xuất bản: ${new Date().toLocaleString("vi-VN")}\n\n`;
    content += `| STT | Tên Sự Kiện | Hình Thức | Đơn Vị Tổ Chức | Thời Gian | Địa Điểm / Kênh |\n`;
    content += `| :---: | :--- | :---: | :--- | :---: | :--- |\n`;

    list.forEach((evt, idx) => {
      const time = evt.start_time && !isNaN(new Date(evt.start_time).getTime())
        ? new Date(evt.start_time).toLocaleString("vi-VN")
        : "Sắp diễn ra";
      content += `| ${idx + 1} | **${evt.title}** | ${evt.event_type?.toUpperCase() || "SỰ KIỆN"} | ${evt.organizer || "Cộng đồng IT"} | ${time} | ${evt.location || "Online"} |\n`;
    });

    content += `\n---\n\n## 📝 Chi Tiết Chương Trình Từng Sự Kiện\n\n`;

    list.forEach((evt, idx) => {
      const time = evt.start_time && !isNaN(new Date(evt.start_time).getTime())
        ? new Date(evt.start_time).toLocaleString("vi-VN")
        : "Sắp diễn ra";
      content += `### ${idx + 1}. ${evt.title}\n`;
      content += `- **Hình thức:** ${evt.event_type?.toUpperCase() || "SỰ KIỆN"}\n`;
      content += `- **Đơn vị tổ chức:** ${evt.organizer || "Ban tổ chức"}\n`;
      content += `- **Thời gian:** ${time}\n`;
      content += `- **Địa điểm:** ${evt.location || "Online"}\n`;
      content += `- **Nội dung:** ${evt.description || "Hội thảo chia sẻ kinh nghiệm kỹ thuật chuyên sâu."}\n\n`;
    });

    content += `---\n*Được xuất từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lich-su-kien-itblog-${typeFilter}-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast(`Đã xuất lịch ${list.length} sự kiện công nghệ dạng Markdown! 📥`, "success");
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
              <span>📅</span>
              <span>IT Events & Workshops</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-base-content tracking-tight">
            Hội Thảo & Sự Kiện Công Nghệ
          </h1>
          <p className="text-base-content/70 mt-2 text-sm sm:text-base max-w-2xl">
            Tham gia các buổi workshop thực chiến, webinar trực tuyến và hội thảo chuyên sâu để nâng cao kỹ năng và mở rộng mạng lưới quan hệ trong ngành CNTT.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            requireAuth(() => setShowCreateEventModal(true), "Vui lòng đăng nhập để tổ chức sự kiện!");
          }}
          className="btn btn-sm btn-primary text-white font-bold rounded-xl gap-1.5 shadow-sm shrink-0"
        >
          <span>+</span> Tổ chức sự kiện mới
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 border-b border-base-300 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "Tất cả sự kiện" },
            { id: "webinar", label: "Webinar Trực tuyến" },
            { id: "workshop", label: "Workshop Thực hành" },
            { id: "conference", label: "Hội thảo (Conference)" },
            { id: "my_tickets", label: `🎟️ Vé của tôi (${myTickets.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setTypeFilter(tab.id);
                if (tab.id === "my_tickets") loadMyTickets();
              }}
              className={`btn btn-sm rounded-xl font-semibold transition-all ${
                typeFilter === tab.id
                  ? "btn-primary text-white shadow-xs"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {typeFilter !== "my_tickets" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportEventsScheduleMd}
              className="btn btn-sm btn-outline btn-ghost hover:text-primary rounded-xl font-bold gap-1 border border-base-300 shrink-0"
              title="Xuất danh sách sự kiện hiện tại ra Markdown (.md)"
            >
              <span>📥</span>
              <span>Xuất lịch (.md)</span>
            </button>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm theo tên sự kiện, đơn vị..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="input input-sm input-bordered w-full rounded-xl pl-8 text-xs"
              />
              <span className="absolute left-2.5 top-2 text-xs text-base-content/40">🔍</span>
              {eventSearch && (
                <button
                  type="button"
                  onClick={() => setEventSearch("")}
                  className="absolute right-2 top-1.5 text-xs text-base-content/50 hover:text-base-content"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Events Grid or My Tickets */}
      {typeFilter === "my_tickets" ? (
        <div className="space-y-4">
          {loadingTickets ? (
            <div className="text-center py-16">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-xs text-base-content/60 mt-2">Đang tải danh sách vé tham dự...</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="text-center py-16 bg-base-100 border border-dashed border-base-300 rounded-3xl p-8">
              <span className="text-4xl">🎟️</span>
              <h3 className="font-bold text-base text-base-content mt-2">Bạn chưa đăng ký vé sự kiện nào</h3>
              <p className="text-xs text-base-content/60 mt-1 mb-4">
                Khám phá các buổi webinar và workshop công nghệ miễn phí để nhận vé tham gia.
              </p>
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className="btn btn-sm btn-primary text-white font-bold rounded-full px-6"
              >
                Xem tất cả sự kiện
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-base-100 rounded-2xl border border-base-300 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-base-content">
                    🎟️ Vé tham dự đã đăng ký ({myTickets.length})
                  </span>
                  <span className="text-xs text-base-content/60 hidden sm:inline">
                    • Quản lý mã vé và lịch trình tham gia sự kiện
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportMyTicketsMd}
                  className="btn btn-xs btn-outline btn-primary rounded-xl font-bold gap-1 shadow-2xs"
                  title="Tải lịch trình toàn bộ vé tham dự dưới dạng Markdown (.md)"
                >
                  <span>📥</span>
                  <span>Xuất lịch trình (.md)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-base-100 border-2 border-primary/20 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Vé Hợp Lệ ✓
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <span>🎟️ Vé #{ticket.id}</span>
                      <span>•</span>
                      <span>
                        {(() => {
                          const raw = ticket.start_time || ticket.created_at;
                          const parsed = raw ? new Date(raw) : null;
                          return parsed && !isNaN(parsed.getTime()) ? parsed.toLocaleDateString("vi-VN") : "Sắp diễn ra";
                        })()}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-base-content leading-snug">
                      {ticket.event_title || "Sự kiện Công nghệ"}
                    </h3>

                    <div className="text-xs text-base-content/70 space-y-1 bg-base-200/40 p-3 rounded-xl border border-base-200">
                      <p>👤 Người nhận: <strong>{ticket.full_name}</strong></p>
                      <p>📧 Email: {ticket.email}</p>
                      {ticket.notes && <p className="text-primary font-medium">📝 {ticket.notes}</p>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-base-200 mt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-success text-white font-bold badge-xs">
                        Đã xác nhận
                      </span>
                      <span className="text-base-content/50 font-mono text-[11px]">
                        Mã vé: IT-{(ticket.id || ticket.event_id || 1) * 892}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTicketForModal(ticket)}
                        className="btn btn-ghost btn-xs text-secondary hover:bg-secondary/10 font-semibold gap-1"
                        title="Xem vé mời điện tử & In vé"
                      >
                        <span>🎫</span>
                        <span>Xem vé</span>
                      </button>
                      <a
                        href={getGoogleCalendarUrl({
                          title: ticket.event_title,
                          description: ticket.notes || "Tham gia sự kiện công nghệ",
                          start_time: ticket.start_time
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 font-semibold gap-1"
                        title="Thêm vào Google Calendar"
                      >
                        <span>📅</span>
                        <span>Lịch</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCancelTicket(ticket.event_id, ticket.event_title)}
                        className="btn btn-ghost btn-xs text-error hover:bg-error/10 font-semibold"
                        title="Hủy đăng ký vé này"
                      >
                        Hủy vé
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-base-100 border border-dashed border-base-300 rounded-3xl p-8">
          <span className="text-4xl">🔍</span>
          <h3 className="font-bold text-base text-base-content mt-2">Không tìm thấy sự kiện phù hợp</h3>
          <p className="text-xs text-base-content/60 mt-1 mb-4">
            Thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục sự kiện khác.
          </p>
          <button
            type="button"
            onClick={() => {
              setEventSearch("");
              setTypeFilter("all");
            }}
            className="btn btn-sm btn-primary text-white font-bold rounded-full px-5"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const hasTicket = myTickets.some((t) => t.event_id === evt.id);

            return (
              <div
                key={evt.id}
                className="card bg-base-100 border border-base-300 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-44 w-full overflow-hidden bg-base-200">
                  <img
                    src={evt.banner_image || "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80"}
                    alt={evt.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80";
                    }}
                  />
                  <span className="absolute top-3 left-3 badge badge-primary text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1">
                    {evt.event_type}
                  </span>
                </div>

                <div className="card-body p-6">
                  <div className="text-xs font-bold text-primary mb-1">
                    📅 {(() => {
                      const parsed = evt.start_time ? new Date(evt.start_time) : null;
                      return parsed && !isNaN(parsed.getTime())
                        ? parsed.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        : "Sắp diễn ra";
                    })()}
                  </div>

                  <h2 className="text-lg font-bold text-base-content line-clamp-2 hover:text-primary transition-colors">
                    {evt.title}
                  </h2>

                  <p className="text-sm text-base-content/70 mt-2 line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="space-y-1.5 mt-4 pt-3 border-t border-base-200 text-xs text-base-content/60">
                    <p>📍 <span className="font-semibold text-base-content/80">{evt.location}</span></p>
                    <p>🎙️ Đơn vị tổ chức: <span className="font-semibold text-base-content/80">{evt.organizer}</span></p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-0 flex gap-2">
                  <a
                    href={getGoogleCalendarUrl(evt)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline border-base-300 btn-sm rounded-xl font-bold px-3 hover:border-primary hover:text-primary"
                    title="Thêm sự kiện vào Google Calendar"
                  >
                    📅
                  </a>
                  <button
                    type="button"
                    onClick={() => handleExportEventMd(evt)}
                    className="btn btn-outline border-base-300 btn-sm rounded-xl font-bold px-3 hover:border-primary hover:text-primary"
                    title="Xuất thông tin sự kiện ra Markdown (.md)"
                  >
                    📥
                  </button>
                  {hasTicket ? (
                    <button
                      onClick={() => {
                        setTypeFilter("my_tickets");
                        loadMyTickets();
                      }}
                      className="btn btn-soft btn-success text-emerald-950 dark:text-emerald-300 btn-sm flex-1 rounded-xl font-bold gap-1.5"
                    >
                      <span>✓</span> Đã có vé (Xem vé)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(evt)}
                      className="btn btn-primary btn-sm flex-1 rounded-xl font-bold text-white shadow-xs"
                    >
                      Đăng ký tham gia 🎟️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tổ chức Sự kiện Mới */}
      {showCreateEventModal && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateEventModal(false); }}
        >
          <div className="modal-box max-w-xl rounded-3xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <div>
                  <h3 className="text-lg font-bold text-base-content">Tổ Chức Sự Kiện Công Nghệ</h3>
                  <p className="text-xs text-base-content/60">Đăng tải webinar, workshop hoặc meetup đến cộng đồng IT Blog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 my-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Tiêu đề sự kiện <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="VD: Webinar: Clean Architecture trong Node.js & Go"
                  className="input input-bordered input-sm w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Đơn vị tổ chức <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventOrganizer}
                    onChange={(e) => setEventOrganizer(e.target.value)}
                    placeholder="VD: Google Developer Group Hanoi"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Hình thức sự kiện
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="select select-bordered select-sm w-full text-xs font-semibold"
                  >
                    <option value="workshop">Workshop Thực hành</option>
                    <option value="webinar">Webinar Trực tuyến</option>
                    <option value="conference">Hội thảo (Conference)</option>
                    <option value="meetup">Meetup Gặp gỡ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Thời gian diễn ra
                  </label>
                  <input
                    type="datetime-local"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="input input-bordered input-sm w-full text-xs"
                  />
                </div>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Địa điểm / Nền tảng
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Online qua Zoom / Hà Nội"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Đường dẫn tham gia trực tuyến (Zoom / Google Meet URL)
                </label>
                <input
                  type="url"
                  value={eventOnlineUrl}
                  onChange={(e) => setEventOnlineUrl(e.target.value)}
                  placeholder="https://zoom.us/j/123456789"
                  className="input input-bordered input-sm w-full text-xs"
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Ảnh bìa sự kiện (Banner URL)
                </label>
                <input
                  type="url"
                  value={eventBanner}
                  onChange={(e) => setEventBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="input input-bordered input-sm w-full text-xs"
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Mô tả nội dung chương trình
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={3}
                  className="textarea textarea-bordered w-full text-xs"
                  placeholder="Tóm tắt nội dung chính và diễn giả tham gia..."
                />
              </div>

              <div className="modal-action border-t border-base-200 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="btn btn-sm btn-ghost rounded-xl"
                  disabled={isCreatingEvent}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="btn btn-sm btn-primary text-white font-bold rounded-xl px-5"
                >
                  {isCreatingEvent ? "Đang tạo..." : "Xuất bản sự kiện 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Boarding Pass / Event Ticket */}
      {selectedTicketForModal && (
        <div
          className="modal modal-open bg-black/60 backdrop-blur-xs z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTicketForModal(null);
          }}
        >
          <div className="modal-box max-w-xl rounded-3xl p-0 overflow-hidden bg-base-100 border border-base-300 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Ticket Header Ribbon */}
            <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎫</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">IT BLOG EVENT BOARDING PASS</h3>
                  <p className="text-[11px] opacity-80 font-mono">VÉ MỜI ĐIỆN TỬ CHÍNH THỨC</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForModal(null)}
                className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Ticket Content */}
            <div className="p-6 space-y-5">
              {/* Event Info */}
              <div className="border-b border-dashed border-base-300 pb-4">
                <span className="badge badge-primary badge-sm text-white font-bold uppercase mb-2">
                  Sự kiện IT Blog
                </span>
                <h2 className="text-xl font-black text-base-content leading-snug">
                  {selectedTicketForModal.event_title || "Sự kiện Công nghệ"}
                </h2>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-base-200/50 p-3.5 rounded-2xl">
                  <div>
                    <span className="text-base-content/60 font-semibold block">⏰ Thời gian</span>
                    <strong className="text-base-content text-sm">
                      {(() => {
                        const raw = selectedTicketForModal.start_time;
                        const parsed = raw ? new Date(raw) : null;
                        return parsed && !isNaN(parsed.getTime())
                          ? `${parsed.toLocaleDateString("vi-VN")} lúc ${parsed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                          : "Theo thông báo sự kiện";
                      })()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-base-content/60 font-semibold block">📍 Địa điểm / Hình thức</span>
                    <strong className="text-base-content text-sm">
                      {selectedTicketForModal.location || "Online qua Zoom / Livestream"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Attendee Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-base-content/60 font-semibold">👤 Đại biểu / Người tham dự:</span>
                  <p className="font-bold text-sm text-base-content">
                    {selectedTicketForModal.full_name || currentUser?.full_name || "Lập trình viên"}
                  </p>
                  <p className="text-base-content/70">
                    📧 {selectedTicketForModal.email || currentUser?.email || "dev@itblog.vn"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-base-content/60 font-semibold">🔖 Trạng thái & Ghi chú:</span>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success text-white font-bold text-xs">
                      ✓ ĐÃ XÁC NHẬN
                    </span>
                    <span className="badge badge-ghost text-xs">Vé VIP Miễn phí</span>
                  </div>
                  {selectedTicketForModal.notes && (
                    <p className="text-primary italic mt-1 font-medium">
                      "{selectedTicketForModal.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Barcode & Ticket Code Section */}
              <div className="bg-base-200/40 p-4 rounded-2xl border border-base-200 flex flex-col items-center justify-center text-center">
                {/* Visual Barcode Pattern */}
                <div className="flex items-center justify-center gap-[3px] h-12 py-1 px-4 bg-white rounded-lg border border-slate-300 w-full max-w-sm mb-2 shadow-inner">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4].map((width, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 h-full rounded-[1px]"
                      style={{ width: `${width * 2}px` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black tracking-widest text-base-content/80">
                    IT-PASS-{(selectedTicketForModal.id || selectedTicketForModal.event_id || 1) * 892}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const code = `IT-PASS-${(selectedTicketForModal.id || selectedTicketForModal.event_id || 1) * 892}`;
                      navigator.clipboard.writeText(code);
                      addToast(`Đã sao chép mã vé ${code}!`, "success");
                    }}
                    className="btn btn-ghost btn-xs text-primary font-bold"
                    title="Sao chép mã vé"
                  >
                    📋 Sao chép
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-base-200/50 p-4 border-t border-base-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary btn-sm rounded-xl font-bold gap-2 text-white shadow-xs"
              >
                <span>🖨️</span>
                <span>In vé / Lưu PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicketForModal(null)}
                className="btn btn-ghost btn-sm rounded-xl font-bold px-5"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
