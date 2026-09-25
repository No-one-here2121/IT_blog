/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { BlogProvider } from "./context/BlogContext";

import Menu_main from "./pages/main_menu";
import PostDetailPage from "./pages/post_detail";
import CreatePostPage from "./pages/create_post";
import ProfilePage from "./pages/profile";
import ModerationPage from "./pages/moderation";
import Login_page from "./pages/login";
import Logup_page from "./pages/logup";
import RoadmapsPage from "./pages/roadmaps";
import CoursesPage from "./pages/courses";
import JobsPage from "./pages/jobs";
import EventsPage from "./pages/events";
import LeaderboardPage from "./pages/leaderboard";
import QuizPage from "./pages/quiz";
import PolicyPage from "./pages/policy";

import AuthModal from "./components/AuthModal";
import OAuthModal from "./components/OAuthModal";
import Navbar from "./components/navigator";
import Foot from "./components/footer";

import { useAuth } from "./context/AuthContext";

// Ánh xạ trang & tham số sang đường link URL mới (clean URL routing)
export function getRouteUrl(page, params = null) {
  switch (page) {
    case "home":
    case "main_menu":
      return "/";
    case "post_detail": {
      const id = params?.postId || "post_001";
      const qs = params?.scroll ? `?scroll=${encodeURIComponent(params.scroll)}` : "";
      return `/posts/${encodeURIComponent(id)}${qs}`;
    }
    case "roadmaps":
      return "/roadmaps";
    case "courses":
      return "/courses";
    case "quiz":
      return "/quiz";
    case "jobs":
      return "/jobs";
    case "events":
      return "/events";
    case "leaderboard":
      return "/leaderboard";
    case "moderation":
      return "/moderation";
    case "create_post":
      return "/create-post";
    case "edit_post":
      return "/edit-post";
    case "profile":
      return params?.authorId ? `/profile/${encodeURIComponent(params.authorId)}` : "/profile";
    case "login":
      return "/login";
    case "logup":
      return "/logup";
    case "policy":
      return params?.section ? `/policy?section=${encodeURIComponent(params.section)}` : "/policy";
    default:
      return "/";
  }
}

// Phân giải thông tin trang từ thanh URL trình duyệt hiện tại
export function parseRouteFromLocation() {
  if (typeof window === "undefined") {
    return { page: "home", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  }

  const rawPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Tương thích ngược nếu người dùng truy cập dạng ?page=
  const queryPage = searchParams.get("page");
  if (queryPage) {
    return {
      page: queryPage,
      postId: searchParams.get("postId") || "post_001",
      authorId: searchParams.get("authorId") || null,
      tab: searchParams.get("tab") || "my_posts",
      section: searchParams.get("section") || "terms"
    };
  }

  // 2. Định tuyến theo đường dẫn link mới
  // - Chi tiết bài viết: /posts/:id hoặc /post/:id
  const postMatch = rawPath.match(/^\/(?:posts|post)\/([^/]+)/);
  if (postMatch) {
    return {
      page: "post_detail",
      postId: decodeURIComponent(postMatch[1]),
      authorId: null,
      tab: "my_posts",
      section: "terms"
    };
  }

  // - Trang cá nhân / tác giả: /profile hoặc /profile/:authorId
  const profileMatch = rawPath.match(/^\/profile(?:\/([^/]+))?/);
  if (profileMatch) {
    return {
      page: "profile",
      authorId: profileMatch[1] ? decodeURIComponent(profileMatch[1]) : null,
      tab: searchParams.get("tab") || "my_posts",
      section: "terms"
    };
  }

  // - Các tab tính năng chính
  if (rawPath === "/roadmaps") return { page: "roadmaps", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/courses") return { page: "courses", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/quiz") return { page: "quiz", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/jobs") return { page: "jobs", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/events") return { page: "events", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/leaderboard") return { page: "leaderboard", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/moderation") return { page: "moderation", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/create-post" || rawPath === "/create") return { page: "create_post", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/edit-post") return { page: "edit_post", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/login") return { page: "login", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/logup" || rawPath === "/register") return { page: "logup", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
  if (rawPath === "/policy" || rawPath === "/terms" || rawPath === "/privacy" || rawPath === "/copyright") {
    let section = "terms";
    if (rawPath === "/privacy") section = "privacy";
    else if (rawPath === "/copyright") section = "copyright";
    else if (searchParams.get("section")) section = searchParams.get("section");
    return { page: "policy", postId: "post_001", authorId: null, tab: "my_posts", section };
  }

  // Mặc định là Trang chủ
  return { page: "home", postId: "post_001", authorId: null, tab: "my_posts", section: "terms" };
}

function AppContent() {
  const { loginDemo, requireAuth, currentUser, oauthModalOpen, oauthProvider, closeOAuthModal } = useAuth();

  const initialRoute = parseRouteFromLocation();
  const [currentPage, setCurrentPage] = useState(() => {
    if (currentUser && (initialRoute.page === "login" || initialRoute.page === "logup")) {
      if (typeof window !== "undefined" && (window.location.pathname === "/login" || window.location.pathname === "/logup" || window.location.pathname === "/register")) {
        window.history.replaceState({ page: "home" }, "", "/");
      }
      return "home";
    }
    return initialRoute.page;
  });
  const [selectedPostId, setSelectedPostId] = useState(initialRoute.postId);
  const [editPostData, setEditPostData] = useState(null);
  const [quizParams, setQuizParams] = useState({});
  const [pageParams, setPageParams] = useState({});
  const [selectedAuthorId, setSelectedAuthorId] = useState(initialRoute.authorId);
  const [profileTab, setProfileTab] = useState(initialRoute.tab || "my_posts");
  const [policySection, setPolicySection] = useState(initialRoute.section || "terms");

  const navigateTo = useCallback((page, params = null) => {
    if (page === "main_menu") page = "home";
    // Chặn người dùng đã đăng nhập truy cập vào trang login hoặc logup
    if (currentUser && (page === "login" || page === "logup")) {
      page = "home";
      params = null;
    }
    const nextUrl = getRouteUrl(page, params);
    const currentFullUrl = window.location.pathname + window.location.search;

    setPageParams(params || {});
    if (currentFullUrl !== nextUrl) {
      window.history.pushState({ page, params }, "", nextUrl);
    }

    if (params?.postId) setSelectedPostId(params.postId);
    if (params?.postData) setEditPostData(params.postData);
    if (params?.quizParams) setQuizParams(params.quizParams);
    if (params?.tab) setProfileTab(params.tab);
    else if (page === "profile" && !params?.tab) setProfileTab("my_posts");
    if (params?.section) setPolicySection(params.section);
    if (params?.authorId !== undefined) {
      setSelectedAuthorId(params.authorId);
    } else if (page === "profile" && !params?.authorId) {
      setSelectedAuthorId(null);
    }
    setCurrentPage(page);
    if (params?.scroll !== "comments" && params?.scroll !== "comment") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentUser]);

  // Đồng bộ URL với nút Back/Forward của trình duyệt (HTML5 History API)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      if (currentUser && (route.page === "login" || route.page === "logup")) {
        if (typeof window !== "undefined") {
          window.history.replaceState({ page: "home" }, "", "/");
        }
        setCurrentPage("home");
        return;
      }
      setCurrentPage(route.page);
      if (route.postId) setSelectedPostId(route.postId);
      if (route.authorId !== undefined) setSelectedAuthorId(route.authorId);
      if (route.tab) setProfileTab(route.tab);
      if (route.section) setPolicySection(route.section);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser]);

  // Chặn người dùng đã đăng nhập truy cập vào trang login / logup
  useEffect(() => {
    if (currentUser && (currentPage === "login" || currentPage === "logup")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      navigateTo("home");
    }
  }, [currentUser, currentPage, navigateTo]);

  // Xử lý các query param đặc biệt như demoLogin hoặc modal
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demoLogin") === "true" && !currentUser) {
        loginDemo();
      }
      if (params.get("modal") === "true") {
        setTimeout(() => {
          requireAuth(() => {}, "Vui lòng đăng nhập để bình luận bài viết!");
        }, 150);
      }
      const scrollY = parseInt(params.get("scroll") || "0", 10);
      if (scrollY > 0) {
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: "instant" });
        }, 250);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, loginDemo, requireAuth]);



  const handleSelectPost = useCallback((id) => {
    setSelectedPostId(id);
    navigateTo("post_detail", { postId: id });
  }, [navigateTo]);

  const isAuthPage = !currentUser && (currentPage === "login" || currentPage === "logup");

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col font-sans">
      {/* Auth Modal toàn cục sẵn sàng chặn và xử lý mọi hành động cần xác thực */}
      <AuthModal />
      <OAuthModal isOpen={oauthModalOpen} onClose={closeOAuthModal} provider={oauthProvider} />

      {!isAuthPage && <Navbar onNavigate={navigateTo} currentPage={currentPage} />}

      <div className="flex-1 flex flex-col">
        {currentPage === "home" && (
          <Menu_main
            onNavigate={navigateTo}
            onSelectPost={handleSelectPost}
            onEditPost={(post) => {
              setEditPostData(post);
              navigateTo("edit_post");
            }}
          />
        )}

        {currentPage === "post_detail" && (
          <PostDetailPage
            key={`${selectedPostId}-${pageParams?.scroll || "default"}`}
            postId={selectedPostId}
            params={pageParams}
            onNavigate={navigateTo}
            onEditPost={(post) => setEditPostData(post)}
          />
        )}

        {currentPage === "create_post" && (
          <CreatePostPage
            onNavigate={navigateTo}
            onPostCreated={(newId) => setSelectedPostId(newId)}
          />
        )}

        {currentPage === "edit_post" && (
          <CreatePostPage
            editPostData={editPostData}
            onNavigate={navigateTo}
            onPostCreated={(id) => setSelectedPostId(id)}
          />
        )}

        {currentPage === "profile" && (
          <ProfilePage
            key={`${selectedAuthorId || "me"}-${profileTab}`}
            authorId={selectedAuthorId}
            initialTab={profileTab}
            onNavigate={navigateTo}
            onSelectPost={handleSelectPost}
            onEditPost={(post) => setEditPostData(post)}
          />
        )}

        {currentPage === "moderation" && (
          <ModerationPage
            onNavigate={navigateTo}
            onSelectPost={handleSelectPost}
          />
        )}

        {currentPage === "roadmaps" && (
          <RoadmapsPage onNavigate={navigateTo} params={pageParams} />
        )}

        {currentPage === "courses" && (
          <CoursesPage onNavigate={navigateTo} params={pageParams} />
        )}

        {currentPage === "jobs" && (
          <JobsPage onNavigate={navigateTo} params={pageParams} />
        )}

        {currentPage === "events" && (
          <EventsPage onNavigate={navigateTo} params={pageParams} />
        )}

        {currentPage === "leaderboard" && (
          <LeaderboardPage onNavigate={navigateTo} />
        )}

        {currentPage === "quiz" && (
          <QuizPage onNavigate={navigateTo} params={{ ...quizParams, ...pageParams }} />
        )}

        {(currentPage === "login" || currentPage === "logup") && (
          currentUser ? (
            <Menu_main
              onNavigate={navigateTo}
              onSelectPost={handleSelectPost}
              onEditPost={(post) => {
                setEditPostData(post);
                navigateTo("edit_post");
              }}
            />
          ) : currentPage === "login" ? (
            <Login_page onNavigate={navigateTo} />
          ) : (
            <Logup_page onNavigate={navigateTo} />
          )
        )}

        {currentPage === "policy" && (
          <PolicyPage key={policySection} onNavigate={navigateTo} initialSection={policySection} />
        )}

        {!["home", "post_detail", "create_post", "edit_post", "profile", "moderation", "roadmaps", "courses", "jobs", "events", "leaderboard", "quiz", "login", "logup", "policy"].includes(currentPage) && (
          <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-4 animate-fade-in">
            <div className="text-6xl select-none">🔍</div>
            <h2 className="text-2xl font-black text-base-content">Không tìm thấy trang (404)</h2>
            <p className="text-sm text-base-content/60">Trang bạn đang truy cập không tồn tại hoặc đã được di dời sang địa chỉ khác.</p>
            <button
              type="button"
              onClick={() => navigateTo("home")}
              className="btn btn-primary rounded-xl text-white font-bold shadow-md hover:scale-105 transition-all"
            >
              Quay lại Trang chủ
            </button>
          </div>
        )}
      </div>

      {!isAuthPage && <Foot onNavigate={navigateTo} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BlogProvider>
            <AppContent />
          </BlogProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}