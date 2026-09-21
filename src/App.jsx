import { useState } from "react";
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
import JobsPage from "./pages/jobs";
import CoursesPage from "./pages/courses";
import QuizPage from "./pages/quiz";

import AuthModal from "./components/AuthModal";
import Navbar from "./components/navigator";
import Foot from "./components/footer";

import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";

function AppContent() {
  const { loginDemo, requireAuth, currentUser } = useAuth();

  // Mặc định khi vào web là Trang chủ công khai ('home') hoặc theo query param ?page=
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("page") || "home";
    } catch {
      return "home";
    }
  });

  const [selectedPostId, setSelectedPostId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("postId") || "post_001";
    } catch {
      return "post_001";
    }
  });

  const [editPostData, setEditPostData] = useState(null);
  const [openCourseId, setOpenCourseId] = useState("");
  const [quizParams, setQuizParams] = useState({ postId: selectedPostId });

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

  const navigateTo = (page, params = null) => {
    if (params?.postId) setSelectedPostId(params.postId);
    if (params?.postData) setEditPostData(params.postData);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isAuthPage = currentPage === "login" || currentPage === "logup";

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col font-sans">
      {/* Auth Modal toàn cục sẵn sàng chặn và xử lý mọi hành động cần xác thực */}
      <AuthModal />

      {!isAuthPage && <Navbar onNavigate={navigateTo} currentPage={currentPage} />}

      <div className="flex-1 flex flex-col">
        {currentPage === "home" && (
          <Menu_main
            onNavigate={navigateTo}
            onSelectPost={(id) => setSelectedPostId(id)}
          />
        )}

        {currentPage === "post_detail" && (
          <PostDetailPage
            postId={selectedPostId}
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
            onNavigate={navigateTo}
            onSelectPost={(id) => setSelectedPostId(id)}
            onEditPost={(post) => setEditPostData(post)}
          />
        )}

        {currentPage === "moderation" && (
          <ModerationPage
            onNavigate={navigateTo}
            onSelectPost={(id) => setSelectedPostId(id)}
          />
        )}

        {currentPage === "login" && (
          <Login_page onNavigate={navigateTo} />
        )}

        {currentPage === "logup" && (
          <Logup_page onNavigate={navigateTo} />
        )}

        {currentPage === "jobs" && (
          <JobsPage onNavigate={navigateTo} />
        )}

        {currentPage === "courses" && (
          <CoursesPage
            onNavigate={navigateTo}
            openCourseId={openCourseId}
            onOpenCourse={setOpenCourseId}
            onOpenQuiz={(p) => {
              setQuizParams(p);
              navigateTo("quiz");
            }}
          />
        )}

        {currentPage === "quiz" && (
          <QuizPage onNavigate={navigateTo} params={quizParams} />
        )}
      </div>

      {!isAuthPage && <Foot />}
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