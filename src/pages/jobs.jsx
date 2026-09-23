import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const INITIAL_JOBS = [
  {
    id: 1,
    title: "Senior Backend Developer (FastAPI / PostgreSQL)",
    company_name: "FPT Software AI Lab",
    location: "Hà Nội / Hybrid",
    work_type: "hybrid",
    salary_range: "35M - 55M VND",
    description: "Phát triển hệ thống AI Agent Platform và Microservices phục vụ hàng triệu người dùng. Tối ưu hóa hiệu năng cơ sở dữ liệu và latency mạng.",
    requirements: "Tối thiểu 3 năm kinh nghiệm Python/FastAPI, thành thạo SQLAlchemy, Docker, Redis và Kubernetes.",
    skills: "Python, FastAPI, PostgreSQL, Docker, Redis",
    application_url: "https://careers.fpt.com/apply"
  },
  {
    id: 2,
    title: "Fullstack Engineer (React 19 / Node.js)",
    company_name: "VNG Corporation",
    location: "Hồ Chí Minh",
    work_type: "full-time",
    salary_range: "25M - 40M VND",
    description: "Xây dựng tính năng mạng xã hội và hệ thống nội dung video. Tối ưu trải nghiệm người dùng trên cả web và mobile.",
    requirements: "Thành thạo React, TypeScript, Tailwind CSS và kiến trúc REST/GraphQL API.",
    skills: "React, TypeScript, Tailwind CSS, Node.js",
    application_url: "https://vng.com.vn/careers"
  },
  {
    id: 3,
    title: "DevOps / Cloud Infrastructure Engineer",
    company_name: "Viettel Digital",
    location: "Hà Nội / Remote",
    work_type: "remote",
    salary_range: "30M - 50M VND",
    description: "Quản trị cụm Kubernetes đa vùng, triển khai CI/CD pipeline và hệ thống giám sát cảnh báo tự động 24/7.",
    requirements: "Kinh nghiệm thực chiến với K8s, Terraform, Prometheus, Grafana và Cloud Provider (AWS/GCP).",
    skills: "Kubernetes, Docker, CI/CD, AWS, Terraform",
    application_url: "https://viettel.vn/tuyen-dung"
  }
];

const POPULAR_SKILL_TAGS = ["Tất cả", "Python", "FastAPI", "React", "TypeScript", "Docker", "Kubernetes", "Node.js", "AWS"];

export default function JobsPage({ onNavigate, params }) {
  const { requireAuth, currentUser, loginDemo, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [searchTerm, setSearchTerm] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState("Tất cả");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isFollowingCompany, setIsFollowingCompany] = useState(false);

  // Saved Jobs State
  const [savedJobIds, setSavedJobIds] = useState(() => {
    try {
      const saved = localStorage.getItem("it_blog_saved_jobs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const handleToggleSaveJob = (jobId, jobTitle) => {
    requireAuth(() => {
      setSavedJobIds((prev) => {
        const exists = prev.includes(jobId);
        const next = exists ? prev.filter((id) => id !== jobId) : [...prev, jobId];
        try {
          localStorage.setItem("it_blog_saved_jobs", JSON.stringify(next));
        } catch {
          // ignore
        }
        addToast(
          exists
            ? `Đã bỏ lưu tin tuyển dụng "${jobTitle}".`
            : `Đã lưu tin tuyển dụng "${jobTitle}" vào danh sách! 🔖`,
          exists ? "info" : "success"
        );
        return next;
      });
    }, "Vui lòng đăng nhập để lưu tin tuyển dụng!");
  };

  const handleExportJobMd = (job) => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    if (!job) return;
    let content = `# 💼 ${job.title}\n\n`;
    content += `> **Công ty:** ${job.company_name}\n`;
    content += `> **Mức lương:** ${job.salary_range || "Thỏa thuận"}\n`;
    content += `> **Địa điểm:** ${job.location || "Việt Nam"} | **Hình thức:** ${job.work_type || "Toàn thời gian"}\n`;
    if (job.skills) {
      content += `> **Kỹ năng chính:** ${job.skills}\n`;
    }
    content += `\n## 📝 Mô tả công việc\n\n${job.description || "Chưa có mô tả chi tiết."}\n\n`;
    if (job.requirements) {
      content += `## 🎯 Yêu cầu ứng viên\n\n${job.requirements}\n\n`;
    }
    if (job.application_url) {
      content += `## 🔗 Đường dẫn ứng tuyển\n\n[Ứng tuyển trực tiếp tại đây](${job.application_url})\n\n`;
    }
    content += `---\n*Được lưu từ Nền tảng Việc làm IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = (job.title || "viec-lam-it")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    link.download = `jd-${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast(`Đã tải bản mô tả công việc (.md) cho "${job.title}"!`, "success");
  };

  const handleExportSavedJobsMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    const savedJobsList = jobs.filter((j) => savedJobIds.includes(j.id));
    if (savedJobsList.length === 0) {
      addToast("Chưa có tin tuyển dụng nào trong danh sách đã lưu để xuất! ℹ️", "info");
      return;
    }

    const rows = savedJobsList.map((j, idx) => {
      const title = (j.title || "Vị trí tuyển dụng").replace(/\|/g, "\\|");
      const company = (j.company_name || "Doanh nghiệp").replace(/\|/g, "\\|");
      const salary = j.salary_range || "Thỏa thuận";
      const location = j.location || "Việt Nam";
      const skills = (j.skills || "—").replace(/\|/g, "\\|");
      const apply = j.application_url ? `[Ứng tuyển](${j.application_url})` : "—";
      return `| ${idx + 1} | ${title} | ${company} | ${salary} | ${location} | ${skills} | ${apply} |`;
    }).join("\n");

    const content = `# DANH SÁCH CƠ HỘI VIỆC LÀM IT ĐÃ LƯU - ${currentUser?.name || "Ứng viên"}
*Thời gian xuất:* ${new Date().toLocaleString("vi-VN")}
*Tổng số vị trí đã lưu:* ${savedJobsList.length}

| STT | Vị trí công việc | Công ty tuyển dụng | Mức đãi ngộ | Địa điểm | Kỹ năng yêu cầu | Ứng tuyển |
|---|---|---|---|---|---|---|
${rows}

---
*Bảng theo dõi hồ sơ ứng tuyển được xuất từ Nền tảng Tuyển dụng Kỹ sư IT Blog.*
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `it_blog_saved_jobs_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Đã tải xuống danh sách việc làm đã lưu dạng Markdown (.md)! 📥", "success");
  };

  const handleExportAllJobsMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    if (filteredJobs.length === 0) {
      addToast("Không có tin tuyển dụng nào phù hợp với bộ lọc hiện tại để xuất! ℹ️", "info");
      return;
    }

    const filterCriteria = [
      searchTerm ? `Từ khóa: "${searchTerm}"` : null,
      workTypeFilter !== "all" ? `Hình thức: ${workTypeFilter}` : null,
      salaryFilter !== "all" ? `Mức lương: ${salaryFilter}` : null,
      selectedSkill !== "Tất cả" ? `Kỹ năng: #${selectedSkill}` : null,
      showSavedOnly ? "Chỉ việc làm đã lưu" : null
    ].filter(Boolean).join(" | ") || "Tất cả cơ hội việc làm IT";

    const rows = filteredJobs.map((j, idx) => {
      const title = (j.title || "Vị trí tuyển dụng").replace(/\|/g, "\\|");
      const company = (j.company_name || "Doanh nghiệp").replace(/\|/g, "\\|");
      const salary = j.salary_range || "Thỏa thuận";
      const location = j.location || "Việt Nam";
      const workType = j.work_type || "Full-time";
      const skills = (j.skills || "—").replace(/\|/g, "\\|");
      const apply = j.application_url ? `[Ứng tuyển ngay](${j.application_url})` : "—";
      return `| ${idx + 1} | ${title} | ${company} | ${salary} | ${location} (${workType}) | ${skills} | ${apply} |`;
    }).join("\n");

    const content = `# 💼 THỊ TRƯỜNG VIỆC LÀM IT & TUYỂN DỤNG DEVELOPER - IT BLOG
*Thời gian xuất:* ${new Date().toLocaleString("vi-VN")}
*Bộ lọc đang áp dụng:* ${filterCriteria}
*Tổng số cơ hội việc làm:* ${filteredJobs.length} vị trí

| STT | Vị trí tuyển dụng | Công ty / Doanh nghiệp | Mức đãi ngộ | Địa điểm & Hình thức | Kỹ năng yêu cầu | Ứng tuyển |
|---|---|---|---|---|---|---|
${rows}

---
*Báo cáo thị trường tuyển dụng được xuất tự động từ Nền tảng Việc làm IT Blog.*
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `it_blog_job_market_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Đã xuất danh sách ${filteredJobs.length} việc làm IT (.md) thành công! 📥`, "success");
  };

  // Post a Job Modal States
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  useEffect(() => {
    if (params?.action === "create") {
      setShowCreateJobModal(true);
    }
  }, [params]);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobLocation, setJobLocation] = useState("Hà Nội / Hybrid");
  const [jobWorkType, setJobWorkType] = useState("full-time");
  const [jobSalary, setJobSalary] = useState("30M - 50M VND");
  const [jobSkills, setJobSkills] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  // Apply Modal States
  const [applyingJob, setApplyingJob] = useState(null);
  const [applyFullName, setApplyFullName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyResumeUrl, setApplyResumeUrl] = useState("");
  const [applyCoverLetter, setApplyCoverLetter] = useState("");
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  useEffect(() => {
    api.jobs.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setJobs(data.map((j) => ({
            ...j,
            company_name: j.company?.name || j.company_name || "Công ty Công nghệ"
          })));
        }
      })
      .catch(() => {});
  }, []);

  const matchesSalary = (salaryStr) => {
    if (salaryFilter === "all") return true;
    if (!salaryStr) return false;
    const nums = (salaryStr.match(/\d+/g) || []).map(Number);
    if (nums.length === 0) return true;
    const minVal = nums[0];
    const maxVal = nums.length > 1 ? nums[1] : minVal;
    if (salaryFilter === "under_30") {
      return minVal < 30 || maxVal <= 30;
    }
    if (salaryFilter === "30_to_45") {
      return (minVal >= 30 && minVal <= 45) || (maxVal >= 30 && maxVal <= 45) || (minVal <= 30 && maxVal >= 45);
    }
    if (salaryFilter === "above_45") {
      return maxVal >= 45 || minVal >= 45;
    }
    return true;
  };

  const filteredJobs = jobs.filter((j) => {
    if (showSavedOnly && !savedJobIds.includes(j.id)) {
      return false;
    }

    const matchesSearch =
      searchTerm === "" ||
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.skills?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWorkType =
      workTypeFilter === "all" || j.work_type?.toLowerCase() === workTypeFilter.toLowerCase();

    const matchesSkill =
      selectedSkill === "Tất cả" ||
      j.skills?.toLowerCase().includes(selectedSkill.toLowerCase()) ||
      j.title?.toLowerCase().includes(selectedSkill.toLowerCase());

    return matchesSearch && matchesWorkType && matchesSkill && matchesSalary(j.salary_range);
  });

  const handleOpenApplyModal = (job) => {
    requireAuth(() => {
      setApplyingJob(job);
      setApplyFullName(currentUser?.name || "");
      setApplyEmail(currentUser?.email || "");
      setApplyPhone("");
      setApplyResumeUrl("");
      setApplyCoverLetter(`Tôi quan tâm đến vị trí ${job.title} tại ${job.company_name} và mong muốn được gia nhập đội ngũ.`);
    }, "Vui lòng đăng nhập để nộp hồ sơ ứng tuyển!");
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!applyingJob) return;
    setIsSubmittingApply(true);
    try {
      await api.jobs.apply(applyingJob.id, {
        full_name: applyFullName.trim(),
        email: applyEmail.trim(),
        phone: applyPhone.trim() || undefined,
        resume_url: applyResumeUrl.trim() || undefined,
        cover_letter: applyCoverLetter.trim() || undefined,
      });
      addToast(`Đã nộp hồ sơ ứng tuyển vị trí "${applyingJob.title}" tại ${applyingJob.company_name}! Chúc bạn may mắn 🚀`, "success");
      setApplyingJob(null);
    } catch (err) {
      addToast(err?.message || "Lỗi khi nộp hồ sơ ứng tuyển.", "error");
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setIsCreatingJob(true);
    try {
      const created = await api.jobs.create({
        title: jobTitle.trim(),
        company_name: companyName.trim(),
        location: jobLocation.trim(),
        work_type: jobWorkType,
        salary_range: jobSalary.trim() || "Thương lượng",
        skills: jobSkills.trim(),
        description: jobDescription.trim(),
        requirements: jobRequirements.trim() || undefined,
        application_url: jobUrl.trim() || undefined,
      });
      const formatted = {
        ...created,
        company_name: created.company?.name || companyName.trim()
      };
      setJobs((prev) => [formatted, ...prev]);
      addToast(`Đã đăng tin tuyển dụng "${jobTitle}" thành công! 💼`, "success");
      setShowCreateJobModal(false);
      setJobTitle("");
      setCompanyName("");
      setJobLocation("Hà Nội / Hybrid");
      setJobSalary("30M - 50M VND");
      setJobSkills("");
      setJobDescription("");
      setJobRequirements("");
      setJobUrl("");
    } catch (err) {
      addToast(err?.message || "Lỗi khi đăng tin tuyển dụng.", "error");
    } finally {
      setIsCreatingJob(false);
    }
  };


  const handleOpenCompany = async (job) => {
    const compIdOrSlug = job.company?.id || job.company_id || job.company_name;
    try {
      const detail = await api.jobs.getCompanyDetail(compIdOrSlug);
      setSelectedCompany(detail);
    } catch {
      setSelectedCompany({
        id: job.company?.id || 1,
        name: job.company_name,
        location: job.location,
        website: "https://careers.fpt.com",
        logo: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80",
        description: `Doanh nghiệp công nghệ tiên phong nghiên cứu và phát triển hệ sinh thái giải pháp CNTT, AI, Cloud và ứng dụng quy mô lớn cho hàng triệu người dùng tại Việt Nam và quốc tế.`,
        tech_stack: job.skills || "Python, React, FastAPI, Docker, Kubernetes, AWS",
        jobs: jobs.filter((j) => j.company_name === job.company_name)
      });
    }
  };

  const handleToggleFollowCompany = () => {
    requireAuth(async () => {
      if (!selectedCompany) return;
      try {
        await api.jobs.followCompany(selectedCompany.id);
      } catch {
        // Handled silently
      }
      setIsFollowingCompany(!isFollowingCompany);
      addToast(
        !isFollowingCompany
          ? `Đã theo dõi ${selectedCompany.name}! Bạn sẽ nhận được thông báo khi có tin tuyển dụng mới 🔔`
          : `Đã hủy theo dõi ${selectedCompany.name}.`,
        "info"
      );
    }, "Vui lòng đăng nhập để theo dõi nhà tuyển dụng!");
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
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
              <span>💼</span>
              <span>IT Job Board</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-base-content tracking-tight">
            Việc Làm IT & Tuyển Dụng Developer
          </h1>
          <p className="text-base-content/70 mt-2 text-sm sm:text-base max-w-4xl">
            Kết nối trực tiếp với các doanh nghiệp công nghệ hàng đầu. Tìm kiếm cơ hội việc làm lập trình viên với đãi ngộ hấp dẫn và môi trường chuyên nghiệp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => requireAuth(() => setShowCreateJobModal(true), "Vui lòng đăng nhập để đăng tin tuyển dụng!")}
          className="btn btn-sm btn-primary text-white font-bold rounded-xl gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <span>+</span> Đăng tin tuyển dụng
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-4 mb-8 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] w-full">
            <input
              type="text"
              placeholder="Tìm theo kỹ năng, vị trí (FastAPI, React, DevOps, FPT...)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full rounded-xl pl-10 text-sm"
            />
            <span className="absolute left-3 top-3 text-base-content/40">🔍</span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-xs text-base-content/50 hover:text-base-content"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="select select-bordered rounded-xl text-sm font-semibold w-full sm:w-44"
          >
            <option value="all">Tất cả hình thức</option>
            <option value="full-time">Toàn thời gian (Full-time)</option>
            <option value="hybrid">Linh hoạt (Hybrid)</option>
            <option value="remote">Làm từ xa (Remote)</option>
          </select>

          <select
            value={salaryFilter}
            onChange={(e) => setSalaryFilter(e.target.value)}
            className="select select-bordered rounded-xl text-sm font-semibold w-full sm:w-44"
          >
            <option value="all">Tất cả mức lương</option>
            <option value="under_30">Dưới 30M VND</option>
            <option value="30_to_45">30M - 45M VND</option>
            <option value="above_45">Trên 45M VND</option>
          </select>

          <button
            type="button"
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`btn btn-sm rounded-xl font-bold transition-all w-full sm:w-auto shrink-0 ${
              showSavedOnly
                ? "btn-primary text-white shadow-xs"
                : "btn-outline border-base-300 text-base-content/80 hover:bg-base-200"
            }`}
            title="Lọc các việc làm bạn đã lưu"
          >
            <span>🔖</span>
            <span>Đã lưu ({savedJobIds.length})</span>
          </button>

          {isAdmin && savedJobIds.length > 0 && (
            <button
              type="button"
              onClick={handleExportSavedJobsMd}
              className="btn btn-sm btn-outline border-base-300 rounded-xl font-bold gap-1 text-xs hover:border-primary hover:text-primary transition-all w-full sm:w-auto shrink-0 shadow-2xs"
              title="Xuất bảng danh sách các việc làm đã lưu ra tệp Markdown (.md)"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Xuất đã lưu (.md)</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleExportAllJobsMd}
              className="btn btn-sm btn-outline border-base-300 rounded-xl font-bold gap-1 text-xs hover:border-primary hover:text-primary transition-all w-full sm:w-auto shrink-0 shadow-2xs"
              title="Xuất bảng danh sách tất cả các cơ hội việc làm đang lọc ra tệp Markdown (.md)"
            >
              <span>📥</span>
              <span>Xuất danh sách (.md)</span>
            </button>
          )}
        </div>

        {/* Popular Tech Stack Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-base-200/60 text-xs">
          <span className="text-base-content/60 font-semibold mr-1">Kỹ năng hot:</span>
          {POPULAR_SKILL_TAGS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSelectedSkill(skill)}
              className={`badge badge-sm py-2 px-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedSkill === skill
                  ? "badge-primary text-white font-bold"
                  : "bg-base-200 hover:bg-base-300 text-base-content/70"
              }`}
            >
              #{skill}
            </button>
          ))}
          {(searchTerm || workTypeFilter !== "all" || salaryFilter !== "all" || selectedSkill !== "Tất cả" || showSavedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setWorkTypeFilter("all");
                setSalaryFilter("all");
                setSelectedSkill("Tất cả");
                setShowSavedOnly(false);
              }}
              className="btn btn-ghost btn-xs text-error font-semibold hover:underline ml-auto"
            >
              Đặt lại bộ lọc ✕
            </button>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-base-100 border border-base-300 rounded-2xl">
            <span className="text-4xl">🔍</span>
            <p className="font-bold text-base-content mt-2">
              {showSavedOnly ? "Bạn chưa lưu tin tuyển dụng nào" : "Không tìm thấy công việc phù hợp"}
            </p>
            <p className="text-sm text-base-content/60 mt-1">
              {showSavedOnly ? "Bấm biểu tượng 🔖 Lưu trên tin tuyển dụng để xem lại sau." : "Hãy thử tìm kiếm với từ khóa kỹ năng khác"}
            </p>
            {showSavedOnly && (
              <button
                type="button"
                onClick={() => setShowSavedOnly(false)}
                className="btn btn-sm btn-primary text-white font-bold rounded-xl mt-4"
              >
                Xem tất cả việc làm
              </button>
            )}
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="card bg-base-100 border border-base-300 shadow-xs hover:shadow-md transition-all rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="badge badge-primary text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                    {job.salary_range}
                  </span>
                  <span className="badge bg-neutral/80 text-white border-none font-medium text-xs">
                    📍 {job.location}
                  </span>
                  <span className="badge badge-ghost text-xs font-semibold capitalize">
                    {job.work_type}
                  </span>
                  {savedJobIds.includes(job.id) && (
                    <span className="badge badge-warning text-amber-950 font-bold text-[10px]">
                      🔖 Đã lưu
                    </span>
                  )}
                </div>

                <h2
                  onClick={() => setSelectedJob(job)}
                  className="text-xl font-bold text-base-content hover:text-primary transition-colors cursor-pointer"
                >
                  {job.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenCompany(job)}
                    className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    title="Xem hồ sơ doanh nghiệp và các vị trí đang tuyển"
                  >
                    🏢 {job.company_name}
                    <span className="badge badge-outline badge-xs text-[10px]">Hồ sơ</span>
                  </button>
                </div>

                <p className="text-sm text-base-content/70 mt-2 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Skills tags */}
                {job.skills && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.skills.split(",").map((s, idx) => (
                      <span key={idx} className="badge badge-outline badge-sm text-xs rounded-md">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0 items-stretch sm:items-end">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSaveJob(job.id, job.title);
                    }}
                    className={`btn btn-sm rounded-xl font-medium transition-all ${
                      savedJobIds.includes(job.id)
                        ? "btn-soft btn-warning text-amber-950 font-bold text-xs"
                        : "btn-ghost text-xs text-base-content/60 hover:text-base-content"
                    }`}
                    title={savedJobIds.includes(job.id) ? "Bỏ lưu tin tuyển dụng" : "Lưu tin tuyển dụng"}
                  >
                    <span>{savedJobIds.includes(job.id) ? "🔖 Đã lưu" : "🏷️ Lưu"}</span>
                  </button>
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="btn btn-outline btn-sm rounded-xl font-bold flex-1 sm:flex-initial"
                  >
                    Chi tiết
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleExportJobMd(job)}
                      className="btn btn-ghost btn-sm px-2.5 rounded-xl text-primary hover:bg-primary/10"
                      title="Tải bản mô tả công việc JD (.md)"
                    >
                      📥
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleOpenApplyModal(job)}
                  className="btn btn-primary btn-sm rounded-xl font-bold text-white shadow-xs w-full sm:w-auto"
                >
                  Ứng tuyển ngay
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedJob(null); }}
        >
          <div className="modal-box max-w-2xl rounded-2xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="badge badge-primary text-white font-bold text-xs mb-2">
                  {selectedJob.salary_range}
                </span>
                <h3 className="text-2xl font-black text-base-content">{selectedJob.title}</h3>
                <p className="text-sm font-bold text-primary mt-1">🏢 {selectedJob.company_name}</p>
                <div className="flex gap-2 text-xs text-base-content/60 mt-2">
                  <span>📍 {selectedJob.location}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedJob.work_type}</span>
                </div>
              </div>
              <button onClick={() => setSelectedJob(null)} className="btn btn-sm btn-circle btn-ghost">
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <h4 className="font-bold text-base-content text-sm uppercase tracking-wider mb-2">Mô tả công việc</h4>
                <p className="text-sm text-base-content/80 leading-relaxed">{selectedJob.description}</p>
              </div>

              {selectedJob.requirements && (
                <div>
                  <h4 className="font-bold text-base-content text-sm uppercase tracking-wider mb-2">Yêu cầu ứng viên</h4>
                  <p className="text-sm text-base-content/80 leading-relaxed">{selectedJob.requirements}</p>
                </div>
              )}

              {selectedJob.skills && (
                <div>
                  <h4 className="font-bold text-base-content text-sm uppercase tracking-wider mb-2">Kỹ năng chuyên môn</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.split(",").map((s, idx) => (
                      <span key={idx} className="badge bg-primary/10 text-primary border border-primary/20 font-bold text-xs p-3 rounded-lg">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-action mt-6 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSaveJob(selectedJob.id, selectedJob.title)}
                  className={`btn btn-sm rounded-xl font-bold gap-1.5 ${
                    savedJobIds.includes(selectedJob.id)
                      ? "btn-soft btn-warning text-amber-950 font-bold"
                      : "btn-ghost text-base-content/70"
                  }`}
                >
                  <span>{savedJobIds.includes(selectedJob.id) ? "🔖 Đã lưu tin" : "🏷️ Lưu tin này"}</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleExportJobMd(selectedJob)}
                    className="btn btn-ghost btn-sm rounded-xl font-bold text-primary hover:bg-primary/10 gap-1"
                    title="Tải bản mô tả JD (.md) về máy để chuẩn bị phỏng vấn"
                  >
                    <span>📥</span>
                    <span>Tải JD (.md)</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedJob(null)} className="btn btn-ghost rounded-xl font-bold">
                  Đóng
                </button>
                <button
                  onClick={() => {
                    const j = selectedJob;
                    setSelectedJob(null);
                    handleOpenApplyModal(j);
                  }}
                  className="btn btn-primary rounded-xl font-bold px-6 text-white shadow-sm"
                >
                  Nộp hồ sơ ứng tuyển 🚀
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Profile Modal (Section 45) */}
      {selectedCompany && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCompany(null); }}
        >
          <div className="modal-box max-w-2xl rounded-3xl p-6 sm:p-8 bg-base-100 border border-base-300 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                  {selectedCompany.logo ? (
                    <img
                      src={selectedCompany.logo}
                      alt={selectedCompany.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    "🏢"
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-base-content break-words">{selectedCompany.name}</h3>
                    <span className="badge badge-success badge-xs font-bold text-white">Đối tác IT</span>
                  </div>
                  <p className="text-xs text-base-content/60 mt-0.5 break-all">
                    📍 {selectedCompany.location || "Việt Nam"} {selectedCompany.website && `• `}
                    {selectedCompany.website && (
                      <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {selectedCompany.website.replace(/^https?:\/\//, "")} ↗
                      </a>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="btn btn-sm btn-circle btn-ghost">
                ✕
              </button>
            </div>

            {/* Giới thiệu doanh nghiệp */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70">Giới thiệu doanh nghiệp</h4>
              <p className="text-sm text-base-content/80 leading-relaxed bg-base-200/50 p-4 rounded-2xl border border-base-200 break-words">
                {selectedCompany.description || "Doanh nghiệp công nghệ hàng đầu với môi trường làm việc năng động và chế độ đãi ngộ vượt trội dành cho các kỹ sư tài năng."}
              </p>
            </div>

            {/* Tech Stack công ty */}
            {selectedCompany.tech_stack && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70">Công nghệ cốt lõi</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCompany.tech_stack.split(",").map((tech, idx) => (
                    <span key={idx} className="badge badge-outline text-xs font-semibold py-2 px-3 rounded-lg">
                      ⚡ {tech.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Vị trí đang tuyển dụng của công ty */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70">
                  Vị trí đang tuyển dụng ({selectedCompany.jobs?.length || 0})
                </h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(selectedCompany.jobs || []).map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-base-100 border border-base-300 hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-xs text-base-content">{j.title}</p>
                      <p className="text-[11px] text-base-content/50">
                        {j.salary_range || "Thương lượng"} • {j.work_type || "Full-time"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const target = j;
                        setSelectedCompany(null);
                        handleOpenApplyModal(target);
                      }}
                      className="btn btn-xs btn-primary text-white font-bold"
                    >
                      Ứng tuyển
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-action mt-6 flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-base-200">
              <button onClick={() => setSelectedCompany(null)} className="btn btn-ghost rounded-xl font-bold">
                Đóng
              </button>
              <button
                onClick={handleToggleFollowCompany}
                className={`btn btn-sm rounded-xl font-bold gap-2 ${
                  isFollowingCompany ? "btn-outline border-base-300 text-base-content/80 hover:bg-base-200" : "btn-primary text-white"
                }`}
              >
                <span>{isFollowingCompany ? "✓ Đang theo dõi" : "⭐ Theo dõi tuyển dụng"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đăng Tin Tuyển Dụng Mới (Employer Post a Job) */}
      {showCreateJobModal && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateJobModal(false); }}
        >
          <div className="modal-box max-w-2xl rounded-3xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💼</span>
                <div>
                  <h3 className="text-lg font-bold text-base-content">Đăng Tin Tuyển Dụng IT Mới</h3>
                  <p className="text-xs text-base-content/60">Tiếp cận hàng nghìn lập trình viên tiềm năng trên nền tảng IT Blog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateJobModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

                        {/* Guest Banner */}
            {!currentUser && (
              <div className="my-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-amber-950 dark:text-amber-200">
                  💡 Bạn cần đăng nhập để quản lý và gắn quyền tác giả cho tin tuyển dụng.
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
            <form onSubmit={handleCreateJob} className="space-y-4 my-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Vị trí tuyển dụng <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="VD: Senior React & TypeScript Developer"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Tên công ty / Doanh nghiệp <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="VD: VNG Tech Lab"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="VD: Hà Nội / Hybrid"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">Hình thức</label>
                  <select
                    value={jobWorkType}
                    onChange={(e) => setJobWorkType(e.target.value)}
                    className="select select-bordered select-sm w-full text-xs font-semibold"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                    <option value="part-time">Part-time</option>
                  </select>
                </div>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">Mức lương</label>
                  <input
                    type="text"
                    value={jobSalary}
                    onChange={(e) => setJobSalary(e.target.value)}
                    placeholder="VD: 30M - 50M VND"
                    className="input input-bordered input-sm w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Kỹ năng yêu cầu (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  placeholder="VD: React, TypeScript, Next.js, Tailwind CSS, REST API"
                  className="input input-bordered input-sm w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Mô tả công việc <span className="text-error">*</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Chi tiết trách nhiệm công việc, cơ hội phát triển..."
                  rows={3}
                  className="textarea textarea-bordered w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">Yêu cầu ứng viên</label>
                <textarea
                  value={jobRequirements}
                  onChange={(e) => setJobRequirements(e.target.value)}
                  placeholder="Kinh nghiệm, bằng cấp hoặc chứng chỉ cần thiết..."
                  rows={2}
                  className="textarea textarea-bordered w-full text-xs"
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">Link ứng tuyển ngoài hoặc Website công ty</label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://company.com/careers/job-123"
                  className="input input-bordered input-sm w-full text-xs"
                />
              </div>

              <div className="modal-action border-t border-base-200 pt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateJobModal(false)}
                  className="btn btn-sm btn-ghost rounded-xl"
                  disabled={isCreatingJob}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingJob}
                  className="btn btn-sm btn-primary text-white font-bold rounded-xl px-5"
                >
                  {isCreatingJob ? "Đang đăng..." : "Đăng tin ngay 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nộp Hồ Sơ Ứng Tuyển (Interactive Job Application Modal) */}
      {applyingJob && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setApplyingJob(null); }}
        >
          <div className="modal-box max-w-lg rounded-3xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-base-200 gap-2">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-bold text-base-content break-words">
                  Ứng Tuyển: <span className="text-primary">{applyingJob.title}</span>
                </h3>
                <p className="text-xs text-base-content/60 break-words">🏢 {applyingJob.company_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingJob(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-3 my-4">
              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Họ và tên ứng viên <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={applyFullName}
                  onChange={(e) => setApplyFullName(e.target.value)}
                  className="input input-bordered input-sm w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Email liên hệ <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    value={applyEmail}
                    onChange={(e) => setApplyEmail(e.target.value)}
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={applyPhone}
                    onChange={(e) => setApplyPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="input input-bordered input-sm w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Đường dẫn CV / Portfolio (Google Drive / GitHub / LinkedIn)
                </label>
                <input
                  type="url"
                  value={applyResumeUrl}
                  onChange={(e) => setApplyResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/your-cv.pdf"
                  className="input input-bordered input-sm w-full text-xs"
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Thư ngỏ / Giới thiệu bản thân
                </label>
                <textarea
                  value={applyCoverLetter}
                  onChange={(e) => setApplyCoverLetter(e.target.value)}
                  rows={3}
                  className="textarea textarea-bordered w-full text-xs"
                  placeholder="Chia sẻ lý do bạn phù hợp với vị trí này..."
                />
              </div>

              <div className="modal-action border-t border-base-200 pt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="btn btn-sm btn-ghost rounded-xl"
                  disabled={isSubmittingApply}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApply}
                  className="btn btn-sm btn-primary text-white font-bold rounded-xl px-5"
                >
                  {isSubmittingApply ? "Đang gửi hồ sơ..." : "Nộp hồ sơ ngay 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
