/**
 * IT Blog API Client
 * Connects React Frontend with FastAPI Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Helper for HTTP requests
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("it_blog_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.detail || `Lỗi máy chủ (${response.status})`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Authentication & User
  auth: {
    login: async (identifier, password) => {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      if (data?.access_token) {
        localStorage.setItem("it_blog_token", data.access_token);
        localStorage.setItem("it_blog_refresh_token", data.refresh_token);
      }
      return data;
    },

    register: async (userData) => {
      const data = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      if (data?.access_token) {
        localStorage.setItem("it_blog_token", data.access_token);
        localStorage.setItem("it_blog_refresh_token", data.refresh_token);
      }
      return data;
    },

    getMe: () => request("/auth/me"),

    changePassword: (data) =>
      request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    forgotPassword: (email) =>
      request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token, newPassword) =>
      request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      }),

    logout: () => {
      localStorage.removeItem("it_blog_token");
      localStorage.removeItem("it_blog_refresh_token");
    },
  },


  // Users
  users: {
    updateProfile: (profileData) =>
      request("/users/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      }),
    getProfile: (identifier) => request(`/users/${identifier}`),
  },

  // Posts CRUD & Verification
  posts: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.append("page", params.page);
      if (params.limit) query.append("limit", params.limit);
      if (params.category && params.category !== "Tất cả") query.append("category", params.category);
      if (params.tag) query.append("tag", params.tag);
      if (params.search) query.append("search", params.search);
      if (params.sortBy) query.append("sort_by", params.sortBy);
      if (params.status) query.append("status_filter", params.status);

      const qs = query.toString();
      return request(`/posts${qs ? `?${qs}` : ""}`);
    },

    get: (idOrSlug) => request(`/posts/${idOrSlug}`),

    create: (postData) =>
      request("/posts", {
        method: "POST",
        body: JSON.stringify(postData),
      }),

    update: (id, postData) =>
      request(`/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify(postData),
      }),

    delete: (id) =>
      request(`/posts/${id}`, {
        method: "DELETE",
      }),

    verify: (id, verifyData) =>
      request(`/posts/${id}/verify`, {
        method: "POST",
        body: JSON.stringify(verifyData),
      }),

    getVideos: (id) => request(`/posts/${id}/videos`),

    triggerBotComment: (id) =>
      request(`/posts/${id}/bot-comment`, {
        method: "POST",
      }),

    getRevisions: (id) => request(`/posts/${id}/revisions`),

    share: (id) =>
      request(`/posts/${id}/share`, {
        method: "POST",
      }),
  },


  // Categories & Tags
  categories: {
    list: () => request("/categories"),
    create: (data) =>
      request("/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  tags: {
    list: () => request("/tags"),
  },

  // Social Interactions (Like, Bookmark, Follow)
  interactions: {
    toggleLikePost: (postId) =>
      request(`/posts/${postId}/like`, { method: "POST" }),

    toggleBookmarkPost: (postId) =>
      request(`/posts/${postId}/bookmark`, { method: "POST" }),

    getMyBookmarks: () => request("/users/me/bookmarks"),

    toggleFollowUser: (userId) =>
      request(`/users/${userId}/follow`, { method: "POST" }),

    getFollowers: (userId) => request(`/users/${userId}/followers`),

    getFollowing: (userId) => request(`/users/${userId}/following`),
  },

  // Comments & Technical Discussion
  comments: {
    list: (postId) => request(`/posts/${postId}/comments`),

    create: (postId, commentData) =>
      request(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify(commentData),
      }),

    update: (commentId, content) =>
      request(`/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),

    delete: (commentId) =>
      request(`/comments/${commentId}`, {
        method: "DELETE",
      }),

    toggleLike: (commentId) =>
      request(`/comments/${commentId}/like`, { method: "POST" }),

    pin: (commentId) =>
      request(`/comments/${commentId}/pin`, { method: "POST" }),

    accept: (commentId) =>
      request(`/comments/${commentId}/accept`, { method: "POST" }),
  },

  // Notifications & Realtime WebSocket
  notifications: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.type) query.append("type_filter", params.type);
      if (params.unreadOnly) query.append("unread_only", "true");
      if (params.page) query.append("page", params.page);
      if (params.limit) query.append("limit", params.limit);

      const qs = query.toString();
      return request(`/notifications${qs ? `?${qs}` : ""}`);
    },

    unreadCount: () => request("/notifications/unread-count"),

    markRead: (id) =>
      request(`/notifications/${id}/read`, { method: "PUT" }),

    markAllRead: () =>
      request("/notifications/read-all", { method: "PUT" }),

    clearAll: () =>
      request("/notifications/clear-all", { method: "DELETE" }),

    delete: (id) =>
      request(`/notifications/${id}`, { method: "DELETE" }),

    createWebSocket: (onMessage) => {
      const token = localStorage.getItem("it_blog_token");
      if (!token) return null;
      try {
        const wsUrl = (API_BASE_URL.replace(/^http/, "ws")) + `/notifications/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          if (event.data === "pong") return;
          try {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
          } catch (e) {
            console.error("WS Parse error:", e);
          }
        };
        ws.onerror = (e) => {
          console.warn("WebSocket connection warning:", e);
        };
        return ws;
      } catch (err) {
        console.warn("WebSocket initialization failed:", err);
        return null;
      }
    },
  },

  // Discovery Feeds
  feeds: {
    following: (page = 1, limit = 9) =>
      request(`/feeds/following?page=${page}&limit=${limit}`),

    trending: (limit = 5) => request(`/feeds/trending?limit=${limit}`),

    forYou: (page = 1, limit = 9) =>
      request(`/feeds/for-you?page=${page}&limit=${limit}`),

    related: (postId, limit = 4) =>
      request(`/posts/${postId}/related?limit=${limit}`),
  },

  // Full-Text Search
  search: {
    query: (params = {}) => {
      const query = new URLSearchParams();
      if (params.q) query.append("q", params.q);
      if (params.author) query.append("author", params.author);
      if (params.category && params.category !== "Tất cả") query.append("category", params.category);
      if (params.tag) query.append("tag", params.tag);
      if (params.sortBy) query.append("sort_by", params.sortBy);
      if (params.page) query.append("page", params.page);
      if (params.limit) query.append("limit", params.limit);

      const qs = query.toString();
      return request(`/search${qs ? `?${qs}` : ""}`);
    },
  },

  // Moderation, Reports & Admin
  moderation: {
    createReport: (reportData) =>
      request("/reports", {
        method: "POST",
        body: JSON.stringify(reportData),
      }),

    getReports: (statusFilter) =>
      request(`/admin/reports${statusFilter ? `?status_filter=${statusFilter}` : ""}`),

    resolveReport: (reportId, resolveData) =>
      request(`/admin/reports/${reportId}`, {
        method: "PUT",
        body: JSON.stringify(resolveData),
      }),

    getAdminStats: () => request("/admin/stats"),
    getStats: () => request("/admin/stats"),

    getAuditLogs: (limit = 50) => request(`/admin/audit-logs?limit=${limit}`),

    getUsers: (params = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.append("search", params.search);
      if (params.role) query.append("role_filter", params.role);
      if (params.limit) query.append("limit", params.limit);
      const qs = query.toString();
      return request(`/admin/users${qs ? `?${qs}` : ""}`);
    },

    updateUserRole: (userId, role) =>
      request(`/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }),

    updateUserStatus: (userId, isActive) =>
      request(`/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: isActive }),
      }),
  },

  // AI Assistant (Code Explain, Context Q&A, Summarize)
  ai: {
    explainCode: (data) => {
      const payload = {
        code_snippet: data.code_snippet || data.code || "",
        language: data.language || data.context || "python",
        action: data.action || "explain"
      };
      return request("/ai/explain-code", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    askArticle: (data) => {
      const payload = {
        post_id: data.post_id || data.postId,
        question: data.question,
        selected_text: data.selected_text || data.article_content || ""
      };
      return request("/ai/ask-article", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    summarize: (dataOrId) => {
      const postId = typeof dataOrId === "object" ? (dataOrId.post_id || dataOrId.postId || dataOrId.id) : dataOrId;
      return request("/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
      });
    },

    moderate: (data) =>
      request("/ai/moderate", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    optimizePost: (data) =>
      request("/ai/optimize-post", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getKeys: () => request("/ai/keys"),

    updateKeys: (keys) =>
      request("/ai/keys", {
        method: "POST",
        body: JSON.stringify({ keys }),
      }),

    testKey: (key) =>
      request("/ai/keys/test", {
        method: "POST",
        body: JSON.stringify({ key }),
      }),
  },

  // Learning Roadmaps
  roadmaps: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.level) query.append("level", params.level);
      if (params.category_id) query.append("category_id", params.category_id);
      const qs = query.toString();
      return request(`/roadmaps${qs ? `?${qs}` : ""}`);
    },

    get: (idOrSlug) => request(`/roadmaps/${idOrSlug}`),

    create: (data) =>
      request("/roadmaps", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    toggleStep: (roadmapId, stepId) =>
      request(`/roadmaps/${roadmapId}/steps/${stepId}/toggle`, {
        method: "POST",
      }),
  },

  // Gamification, Badges & Leaderboard
  gamification: {
    badges: () => request("/gamification/badges"),

    leaderboard: (limit = 10) =>
      request(`/gamification/leaderboard?limit=${limit}`),

    userReputation: (userId) =>
      request(`/gamification/users/${userId}/reputation`),
  },

  // IT Job Board & Tech Companies
  jobs: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.skill) query.append("skill", params.skill);
      if (params.location) query.append("location", params.location);
      if (params.work_type) query.append("work_type", params.work_type);
      if (params.search) query.append("search", params.search);
      const qs = query.toString();
      return request(`/jobs${qs ? `?${qs}` : ""}`);
    },

    get: (id) => request(`/jobs/${id}`),

    create: (jobData) =>
      request("/jobs", {
        method: "POST",
        body: JSON.stringify(jobData),
      }),

    companies: () => request("/companies"),

    createCompany: (companyData) =>
      request("/companies", {
        method: "POST",
        body: JSON.stringify(companyData),
      }),

    getCompanyDetail: (idOrSlug) => request(`/companies/${idOrSlug}`),

    followCompany: (id) =>
      request(`/companies/${id}/follow`, {
        method: "POST",
      }),

    apply: (id, applicationData) =>
      request(`/jobs/${id}/apply`, {
        method: "POST",
        body: JSON.stringify(applicationData),
      }),

    getMyApplications: () => request("/jobs/applications/me"),

    getApplications: (id) => request(`/jobs/${id}/applications`),
  },

  // IT Events & Workshops
  events: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.event_type) query.append("event_type", params.event_type);
      if (params.status) query.append("status", params.status);
      const qs = query.toString();
      return request(`/events${qs ? `?${qs}` : ""}`);
    },

    get: (idOrSlug) => request(`/events/${idOrSlug}`),

    create: (eventData) =>
      request("/events", {
        method: "POST",
        body: JSON.stringify(eventData),
      }),

    register: (id, registrationData) =>
      request(`/events/${id}/register`, {
        method: "POST",
        body: JSON.stringify(registrationData),
      }),

    getMyRegistrations: () => request("/events/registrations/me"),

    getRegistrations: (id) => request(`/events/${id}/registrations`),

    cancelRegistration: (id) =>
      request(`/events/${id}/register`, {
        method: "DELETE",
      }),
  },


  // Crawler & Content Ingestion
  crawler: {
    sources: () => request("/crawler/sources"),
    createSource: (data) =>
      request("/crawler/sources", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    jobs: () => request("/crawler/jobs"),
    trigger: (data = {}) =>
      request("/crawler/trigger", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // User Behavior Events & Recommendations
  behavior: {
    track: (eventData) =>
      request("/behavior/events", {
        method: "POST",
        body: JSON.stringify(eventData),
      }),
  },

  recommendations: {
    recordEvent: (eventData) =>
      request("/behavior/events", {
        method: "POST",
        body: JSON.stringify(eventData),
      }),
    feed: (limit = 9) => request(`/recommendations/feed?limit=${limit}`),
    authors: (limit = 5) => request(`/recommendations/authors?limit=${limit}`),
    topics: (limit = 6) => request(`/recommendations/topics?limit=${limit}`),
  },

  // Learning Hub & Courses
  courses: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.level) query.append("level", params.level);
      if (params.category_id) query.append("category_id", params.category_id);
      const qs = query.toString();
      return request(`/courses${qs ? `?${qs}` : ""}`);
    },
    get: (idOrSlug) => request(`/courses/${idOrSlug}`),
    create: (data) =>
      request("/courses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    enroll: (id) =>
      request(`/courses/${id}/enroll`, {
        method: "POST",
      }),
    completeLesson: (courseId, lessonId) =>
      request(`/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: "POST",
      }),
  },

  // IT Ads & Developer Promotions
  ads: {
    active: (category) =>
      request(`/ads/active${category ? `?category=${category}` : ""}`),
    listActive: (category) =>
      request(`/ads/active${category ? `?category=${category}` : ""}`),
    listAll: (params = {}) => {
      const query = new URLSearchParams();
      if (params.category) query.append("category", params.category);
      if (params.status) query.append("status_filter", params.status);
      const qs = query.toString();
      return request(`/ads${qs ? `?${qs}` : ""}`);
    },
    click: (id) =>
      request(`/ads/${id}/click`, {
        method: "POST",
      }),
    trackClick: (id) =>
      request(`/ads/${id}/click`, {
        method: "POST",
      }),
    create: (data) =>
      request("/ads", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id, status) =>
      request(`/ads/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    delete: (id) =>
      request(`/ads/${id}`, {
        method: "DELETE",
      }),
  },

  // Analytics Dashboard
  analytics: {
    overview: () => request("/analytics/overview"),
    post: (postId) => request(`/analytics/posts/${postId}`),
  },

  // File Uploads & Media Assets (Section 16)
  uploads: {
    uploadImage: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return request("/uploads/image", {
        method: "POST",
        body: formData,
      });
    },
  },

  // SEO, Sitemap & RSS Feed (Section 15)
  seo: {
    getSitemapUrl: () => `${API_BASE_URL.replace("/api/v1", "")}/sitemap.xml`,
    getRobotsUrl: () => `${API_BASE_URL.replace("/api/v1", "")}/robots.txt`,
    getRssUrl: () => `${API_BASE_URL.replace("/api/v1", "")}/rss.xml`,
  },

  // IT Quiz & Knowledge Testing
  quiz: {
    getQuestions: (params = {}) => {
      const query = new URLSearchParams();
      if (params.course_id || params.courseId) query.append("course_id", params.course_id || params.courseId);
      if (params.post_id || params.postId) query.append("post_id", params.post_id || params.postId);
      if (params.language) query.append("language", params.language);
      if (params.difficulty) query.append("difficulty", params.difficulty);
      if (params.limit) query.append("limit", params.limit);
      const qs = query.toString();
      return request(`/quiz/questions${qs ? `?${qs}` : ""}`);
    },
    create: (questionData) =>
      request("/quiz/questions", {
        method: "POST",
        body: JSON.stringify(questionData),
      }),
    delete: (id) =>
      request(`/quiz/questions/${id}`, {
        method: "DELETE",
      }),
    generate: (generateData) =>
      request("/quiz/generate", {
        method: "POST",
        body: JSON.stringify(generateData),
      }),
    submit: (answers) =>
      request("/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
  },

  // Healthcheck
  health: () => request("/health"),
};

export default api;
