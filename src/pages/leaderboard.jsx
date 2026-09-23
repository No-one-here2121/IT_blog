import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const DEFAULT_LEADERBOARD = [
  { rank: 1, user_id: 1, name: "Nguyễn Văn Tuấn", username: "tuan_techlead", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", reputation_points: 1250, badges_count: 5, posts_count: 24 },
  { rank: 2, user_id: 2, name: "Lê Hoàng Long", username: "long_devops", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", reputation_points: 890, badges_count: 4, posts_count: 18 },
  { rank: 3, user_id: 3, name: "Trần Mai Anh", username: "maianh_frontend", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", reputation_points: 760, badges_count: 3, posts_count: 15 },
  { rank: 4, user_id: 4, name: "Phạm Minh Đức", username: "duc_fastapi", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", reputation_points: 540, badges_count: 3, posts_count: 11 },
  { rank: 5, user_id: 5, name: "Hoàng Gia Bảo", username: "bao_security", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150", reputation_points: 420, badges_count: 2, posts_count: 8 }
];

const PLATFORM_BADGES = [
  { name: "Thực tập sinh tiềm năng", slug: "junior-dev", description: "Đăng ký tài khoản và hoàn thành bài viết kỹ thuật đầu tiên.", icon: "🌱", points_required: 10 },
  { name: "Tác giả uy tín (Verified Author)", slug: "verified-author", description: "Có bài viết được chuyên gia kiểm chứng đạt chuẩn kỹ thuật.", icon: "🛡️", points_required: 50 },
  { name: "Chiến thần đóng góp (Top Contributor)", slug: "top-contributor", description: "Đạt mốc 100 điểm uy tín từ các bài viết chất lượng cao.", icon: "⭐", points_required: 100 },
  { name: "Bậc thầy giải thuật (Algorithm Master)", slug: "algorithm-master", description: "Có câu trả lời kỹ thuật được tác giả đánh dấu Accepted Answer.", icon: "⚡", points_required: 250 },
  { name: "Kiến trúc sư hệ thống (Architecture Guru)", slug: "tech-guru", description: "Đạt mốc 1,000 điểm uy tín với các đóng góp cốt lõi cho cộng đồng.", icon: "👑", points_required: 1000 }
];

export default function LeaderboardPage({ onNavigate }) {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const [leaderboard, setLeaderboard] = useState(DEFAULT_LEADERBOARD);
  const [badges, setBadges] = useState(PLATFORM_BADGES);
  const [timeframe, setTimeframe] = useState("reputation"); // "reputation" | "badges" | "posts"
  const [authorSearch, setAuthorSearch] = useState("");
  const [selectedBadge, setSelectedBadge] = useState(null);

  useEffect(() => {
    api.gamification.leaderboard(10)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLeaderboard(data);
        }
      })
      .catch(() => {});

    api.gamification.badges()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBadges(data);
        }
      })
      .catch(() => {});
  }, []);

  const sortedAndFilteredLeaderboard = [...leaderboard]
    .filter((user) => {
      const q = authorSearch.toLowerCase().trim();
      return !q || user.name?.toLowerCase().includes(q) || user.username?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (timeframe === "posts") return (b.posts_count || 0) - (a.posts_count || 0);
      if (timeframe === "badges") return (b.badges_count || 0) - (a.badges_count || 0);
      return (b.reputation_points || 0) - (a.reputation_points || 0);
    })
    .map((user, idx) => ({ ...user, displayRank: idx + 1 }));

  const handleExportLeaderboardMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất bảng xếp hạng (.md)!", "error");
      return;
    }
    const criteriaName =
      timeframe === "posts"
        ? "Số Lượng Bài Viết"
        : timeframe === "badges"
        ? "Số Lượng Huy Hiệu"
        : "Điểm Uy Tín (Reputation)";

    let content = `# 🏆 Bảng Xếp Hạng & Vinh Danh Tác Giả - IT Blog Platform\n\n`;
    content += `> Thời gian xuất bản: ${new Date().toLocaleString("vi-VN")}\n`;
    content += `> Tiêu chí xếp hạng: **${criteriaName}**\n`;
    content += `> Tổng số tác giả trong danh sách: ${sortedAndFilteredLeaderboard.length}\n\n`;
    content += `| Hạng | Tác giả | Tài khoản | Điểm Uy Tín | Huy hiệu | Bài viết |\n`;
    content += `| :---: | :--- | :--- | :---: | :---: | :---: |\n`;

    sortedAndFilteredLeaderboard.forEach((u) => {
      const medal = u.displayRank === 1 ? "🥇 " : u.displayRank === 2 ? "🥈 " : u.displayRank === 3 ? "🥉 " : "";
      content += `| ${medal}${u.displayRank} | ${u.name} | @${u.username} | ${u.reputation_points || 0} pts | ${u.badges_count || 0} | ${u.posts_count || 0} |\n`;
    });

    content += `\n---\n*Được xuất từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bang-xep-hang-itblog-${timeframe}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast("Đã tải bảng xếp hạng tác giả dạng Markdown!", "success");
  };

  const handleExportBadgesCatalogMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất danh mục huy hiệu (.md)!", "error");
      return;
    }
    let content = `# 🏅 Danh Mục Huy Hiệu Nền Tảng & Đặc Quyền Tác Giả - IT Blog\n\n`;
    content += `> Thời gian trích xuất: ${new Date().toLocaleString("vi-VN")}\n`;
    content += `> Tổng số huy hiệu: **${badges.length} huy hiệu**\n\n`;
    content += `---\n\n`;
    content += `## 📋 Bảng Tổng Hợp Huy Hiệu & Điểm Uy Tín Yêu Cầu\n\n`;
    content += `| Biểu tượng | Tên Huy Hiệu | Điểm Uy Tín Yêu Cầu | Tiêu Chuẩn & Điều Kiện Đạt Được |\n`;
    content += `| :---: | :--- | :---: | :--- |\n`;

    badges.forEach((b) => {
      content += `| ${b.icon || "🎖️"} | **${b.name}** | **${b.points_required} pts** | ${b.description} |\n`;
    });

    content += `\n## 🎁 Đặc Quyền Dành Cho Tác Giả Sở Hữu Huy Hiệu\n\n`;
    content += `1. **Huy hiệu hồ sơ nổi bật:** Biểu tượng hiển thị trang trọng bên cạnh tên tác giả trên mọi bài viết và bình luận.\n`;
    content += `2. **Tăng trọng số AI Recommendation:** Các bài viết của tác giả đạt huy hiệu được ưu tiên đẩy lên top trang chủ và bảng tin Khám phá.\n`;
    content += `3. **Vinh danh thường trực:** Ghi danh vĩnh viễn trên Bảng vinh danh tác giả xuất sắc của cộng đồng IT Blog.\n\n`;
    content += `## ⚡ Cách Tích Lũy Điểm Uy Tín Nhanh Chóng\n\n`;
    content += `- **+10 điểm:** Xuất bản một bài viết kỹ thuật mới được duyệt.\n`;
    content += `- **+50 điểm:** Bài viết được Ban Quản Trị / Chuyên gia gắn nhãn Verified Author.\n`;
    content += `- **+20 điểm:** Câu trả lời hoặc phản hồi trong thảo luận được chọn làm Accepted Answer.\n`;
    content += `- **+5 điểm:** Nhận được một lượt Thích (Like) từ cộng đồng lập trình viên.\n\n`;
    content += `---\n*Được xuất từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `danh-muc-huy-hieu-itblog-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast("Đã tải danh mục huy hiệu dạng Markdown! 📥", "success");
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
            <span>🏆</span>
            <span>Gamification & Rankings</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-base-content tracking-tight">
          Bảng Xếp Hạng & Vinh Danh Tác Giả
        </h1>
        <p className="text-base-content/70 mt-2 text-sm sm:text-base max-w-4xl">
          Tôn vinh những tác giả và chuyên gia có đóng góp xuất sắc nhất cho cộng đồng công nghệ qua hệ thống điểm Uy Tín (Reputation) và Huy Hiệu Thành Tựu (Badges).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Leaderboard Table */}
        <div className="lg:col-span-2">
          <div className="bg-base-100 border border-base-300 rounded-2xl shadow-xs overflow-hidden">
            {/* Header & Search */}
            <div className="p-5 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
                  <span>🥇</span>
                  <span>Bảng Vinh Danh Tác Giả</span>
                </h2>
                <p className="text-xs text-base-content/60 mt-0.5">Xếp hạng theo đóng góp thực tế trong cộng đồng</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-52">
                  <input
                    type="text"
                    placeholder="Tìm tác giả..."
                    value={authorSearch}
                    onChange={(e) => setAuthorSearch(e.target.value)}
                    className="input input-xs input-bordered w-full rounded-lg pl-7 text-xs"
                  />
                  <span className="absolute left-2 top-1.5 text-xs text-base-content/40">🔍</span>
                  {authorSearch && (
                    <button
                      type="button"
                      onClick={() => setAuthorSearch("")}
                      className="absolute right-2 top-1 text-xs text-base-content/50 hover:text-base-content"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleExportLeaderboardMd}
                    className="btn btn-xs btn-outline btn-primary rounded-lg font-bold gap-1 shrink-0"
                    title="Tải bảng xếp hạng dạng Markdown (.md)"
                  >
                    <span>📥</span>
                    <span>Xuất .md</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metric Tabs */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-base-200/40 border-b border-base-300 overflow-x-auto text-xs">
              <span className="text-base-content/60 font-semibold mr-1">Xếp theo:</span>
              {[
                { id: "reputation", label: "⚡ Điểm Uy Tín" },
                { id: "badges", label: "🏅 Nhiều Huy Hiệu" },
                { id: "posts", label: "✍️ Số Bài Viết" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeframe(tab.id)}
                  className={`btn btn-xs rounded-lg font-semibold transition-all shrink-0 whitespace-nowrap ${
                    timeframe === tab.id
                      ? "btn-primary text-white shadow-2xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-base-300 text-xs text-base-content/60">
                    <th className="w-16 text-center">Hạng</th>
                    <th>Tác giả</th>
                    <th className="text-center">Điểm Uy Tín</th>
                    <th className="text-center">Huy hiệu</th>
                    <th className="text-center">Bài viết</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-base-content/60 text-sm">
                        🔍 Không tìm thấy tác giả nào phù hợp với &quot;{authorSearch}&quot;
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredLeaderboard.map((user) => (
                      <tr key={user.user_id} className="hover:bg-base-200/50 transition-colors border-b border-base-200">
                        <td className="text-center font-bold">
                          {user.displayRank === 1 && <span className="text-2xl">🥇</span>}
                          {user.displayRank === 2 && <span className="text-2xl">🥈</span>}
                          {user.displayRank === 3 && <span className="text-2xl">🥉</span>}
                          {user.displayRank > 3 && <span className="text-base-content/60 text-sm">#{user.displayRank}</span>}
                        </td>
                        <td
                          onClick={() => onNavigate && onNavigate("profile", { authorId: user.user_id })}
                          className="cursor-pointer group/user"
                          title={`Xem hồ sơ của ${user.name}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="w-10 h-10 rounded-full ring-2 ring-primary/20 group-hover/user:ring-primary transition-all">
                                <img
                                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || user.name || "dev")}`;
                                  }}
                                />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-base-content group-hover/user:text-primary transition-colors truncate max-w-[130px] sm:max-w-[200px]">
                                {user.name}
                              </p>
                              <p className="text-xs text-base-content/50 truncate max-w-[130px] sm:max-w-[200px]">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge text-xs font-bold px-2.5 py-1 rounded-lg ${
                            timeframe === "reputation"
                              ? "badge-primary text-white"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}>
                            ⚡ {(user.reputation_points ?? 0).toLocaleString()} pts
                          </span>
                        </td>
                        <td className={`text-center font-bold text-sm ${timeframe === "badges" ? "text-primary font-black" : "text-amber-500"}`}>
                          🏅 {user.badges_count || 0}
                        </td>
                        <td className={`text-center text-sm font-semibold ${timeframe === "posts" ? "text-primary font-bold" : "text-base-content/70"}`}>
                          {user.posts_count || 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Badges Showcase */}
        <div className="space-y-6">
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                <span>🏅</span>
                <span>Bộ Huy Hiệu Nền Tảng</span>
              </h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleExportBadgesCatalogMd}
                  className="btn btn-xs btn-outline btn-ghost hover:text-primary rounded-lg font-bold gap-1"
                  title="Tải danh mục huy hiệu dạng Markdown (.md)"
                >
                  <span>📥</span>
                  <span>Xuất .md</span>
                </button>
              )}
            </div>
            <p className="text-xs text-base-content/60 mb-4 leading-relaxed">
              Tích lũy điểm Uy tín bằng cách viết bài hữu ích, được chuyên gia kiểm chứng chuẩn kỹ thuật hoặc có câu trả lời chuẩn (Accepted Answer).
            </p>

            <div className="space-y-3">
              {badges.map((badge, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedBadge(badge)}
                  className="p-3.5 rounded-xl border border-base-300 bg-base-200/30 flex items-start gap-3 hover:border-primary/40 hover:bg-base-200/60 cursor-pointer transition-all hover:scale-[1.01]"
                  title="Nhấp để xem chi tiết & điều kiện nhận huy hiệu"
                >
                  <div className="text-2xl p-2 rounded-xl bg-base-100 border border-base-300 shadow-2xs">
                    {badge.icon || "🎖️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-base-content break-words">{badge.name}</p>
                      <span className="badge badge-xs badge-ghost text-xs font-semibold shrink-0">
                        {badge.points_required} pts
                      </span>
                    </div>
                    <p className="text-xs text-base-content/60 mt-1 leading-relaxed break-words">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <span className="text-3xl">💡</span>
            <h4 className="font-bold text-base-content text-sm mt-2">Làm sao để thăng hạng?</h4>
            <ul className="text-xs text-base-content/70 text-left mt-3 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Đăng bài viết kỹ thuật: <strong>+10 điểm</strong></li>
              <li>Bài viết được kiểm chứng Verified: <strong>+50 điểm</strong></li>
              <li>Câu trả lời được chọn Accepted Answer: <strong>+20 điểm</strong></li>
              <li>Nhận lượt thích từ cộng đồng: <strong>+5 điểm</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal: Badge Detail & Criteria */}
      {selectedBadge && (
        <div
          className="modal modal-open bg-black/60 backdrop-blur-xs z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBadge(null);
          }}
        >
          <div className="modal-box max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-base-100 border border-base-300 shadow-2xl text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-4xl mb-4 shadow-inner">
              {selectedBadge.icon || "🎖️"}
            </div>
            <span className="badge badge-primary badge-sm text-white font-bold uppercase mb-2">
              Huy hiệu thành tựu
            </span>
            <h3 className="text-xl font-black text-base-content break-words">{selectedBadge.name}</h3>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black my-3">
              <span>⚡ Yêu cầu:</span>
              <span>{selectedBadge.points_required} Điểm Uy Tín</span>
            </div>
            <p className="text-sm text-base-content/80 leading-relaxed px-2 mb-5 break-words">
              {selectedBadge.description}
            </p>

            <div className="bg-base-200/50 p-4 rounded-2xl border border-base-200 text-left text-xs space-y-2 mb-6">
              <h4 className="font-bold text-base-content flex items-center gap-1.5">
                <span>🎁</span> Đặc quyền & Quyền lợi tác giả:
              </h4>
              <ul className="text-base-content/70 space-y-1 list-disc list-inside">
                <li>Hiển thị biểu tượng huy hiệu nổi bật cạnh tên tài khoản</li>
                <li>Tăng trọng số ưu tiên khi hệ thống AI đề xuất bài viết</li>
                <li>Ghi danh vĩnh viễn trên Bảng vinh danh cộng đồng IT Blog</li>
              </ul>
            </div>

            <div className="modal-action justify-center">
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="btn btn-primary btn-sm rounded-xl px-8 text-white font-bold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
