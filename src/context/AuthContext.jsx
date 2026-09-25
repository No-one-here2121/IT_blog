/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { SEED_USERS } from "../data/seedData";
import { useToast } from "./ToastContext";
import { api } from "../services/api";

const AuthContext = createContext();

// Chuan hoa du lieu user dong bo giua Backend FastAPI va Frontend React
export const normalizeUser = (u) => {
  if (!u) return null;
  const roleName = u.roles?.[0]?.name || (u.is_superuser ? "admin" : (u.role || "user"));
  const roleList = Array.isArray(u.roles)
    ? u.roles.map((r) => (typeof r === "object" ? r.name : r))
    : [roleName];

  return {
    ...u,
    id: String(u.id),
    name: u.name || u.username || "Thành viên IT Blog",
    username: u.username || `user_${u.id}`,
    email: u.email || "",
    role: roleName,
    roles: roleList,
    avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username || u.name || "dev")}`,
    bio: u.bio || "Thành viên cộng đồng IT Blog",
    following: Array.isArray(u.following) ? u.following : [],
    createdAt: u.created_at || u.createdAt || new Date().toISOString()
  };
};

export function AuthProvider({ children }) {
  const { addToast } = useToast();

  // Khoi tao danh sach nguoi dung tu storage hoac seed data
  const [users, setUsers] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.USERS, null);
    if (!saved || !saved.some((u) => u.id === "demo_user")) {
      storage.set(STORAGE_KEYS.USERS, SEED_USERS);
      return SEED_USERS;
    }
    return saved;
  });

  // Nguoi dung hien tai
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get("auth_token") || urlParams.get("token") || urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");
      if (authToken) {
        localStorage.setItem("it_blog_token", authToken);
        if (refreshToken) {
          localStorage.setItem("it_blog_refresh_token", refreshToken);
        }
      }
      if (urlParams.get("demoLogin") === "true") {
        const demoUser = SEED_USERS.find((u) => u.id === "demo_user") || SEED_USERS[0];
        storage.set(STORAGE_KEYS.USER, demoUser);
        return demoUser;
      }
    } catch {
      // ignore
    }
    const saved = storage.get(STORAGE_KEYS.USER, null);
    return saved ? normalizeUser(saved) : null;
  });

  // State dieu khien AuthModal va Pending Action
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  // State OAuth Modal (Google, GitHub, Facebook)
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthProvider, setOauthProvider] = useState("google");

  const openOAuthModal = (provider = "google") => {
    setOauthProvider(provider);
    setOauthModalOpen(true);
  };

  const closeOAuthModal = () => {
    setOauthModalOpen(false);
  };

  // Khoi phuc phien dang nhap that tu backend qua JWT token khi tai trang
  useEffect(() => {
    let token = localStorage.getItem("it_blog_token");
    let justLoggedInViaOAuth = false;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get("auth_token") || urlParams.get("token") || urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");
      if (authToken) {
        token = authToken;
        justLoggedInViaOAuth = true;
        localStorage.setItem("it_blog_token", authToken);
        if (refreshToken) {
          localStorage.setItem("it_blog_refresh_token", refreshToken);
        }
        urlParams.delete("auth_token");
        urlParams.delete("token");
        urlParams.delete("access_token");
        urlParams.delete("refresh_token");
        urlParams.delete("oauth_success");
        const remainingQuery = urlParams.toString();
        const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "");
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // ignore
    }

    if (token) {
      api.auth.getMe()
        .then((fetchedUser) => {
          if (fetchedUser && fetchedUser.id) {
            const normalized = normalizeUser(fetchedUser);
            setCurrentUser(normalized);
            storage.set(STORAGE_KEYS.USER, normalized);
            if (justLoggedInViaOAuth) {
              addToast(`Đăng nhập Google thành công! Chào mừng ${normalized.name}. 🎉`, "success");
            }
          }
        })
        .catch(() => {
          localStorage.removeItem("it_blog_token");
          localStorage.removeItem("it_blog_refresh_token");
          storage.remove(STORAGE_KEYS.USER);
          setCurrentUser(null);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Luu danh sach users vao storage moi khi thay doi
  useEffect(() => {
    storage.set(STORAGE_KEYS.USERS, users);
  }, [users]);

  // Luu phien dang nhap vao storage moi khi thay doi
  useEffect(() => {
    if (currentUser) {
      storage.set(STORAGE_KEYS.USER, currentUser);
    } else {
      storage.remove(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  /**
   * Chay pending action sau khi dang nhap thanh cong
   */
  const executePendingAction = () => {
    if (pendingAction && typeof pendingAction.callback === "function") {
      try {
        pendingAction.callback();
      } catch (err) {
        console.error("Loi khi thuc thi pending action:", err);
      } finally {
        setPendingAction(null);
      }
    }
  };

  /**
   * Cong chan hanh dong can quyen xac thuc (Protected Action Interceptor)
   */
  const requireAuth = (callback, message = "Vui lòng đăng nhập để tiếp tục") => {
    if (currentUser) {
      if (typeof callback === "function") {
        callback();
      }
      return true;
    }

    setPendingAction({
      callback,
      message
    });
    setModalMessage(message);
    setAuthModalOpen(true);
    return false;
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingAction(null);
    setModalMessage("");
  };

  /**
   * Dang nhap that bang Email hoac Username + Password vao Backend CSDL
   */
  const login = async (identifier, password) => {
    const trimmedId = (identifier || "").trim();
    if (!trimmedId) {
      addToast("Vui lòng nhập tên đăng nhập hoặc email!", "warning");
      return false;
    }
    if (!password) {
      addToast("Vui lòng nhập mật khẩu!", "warning");
      return false;
    }

    try {
      const data = await api.auth.login(trimmedId, password);
      if (data?.user) {
        const normalized = normalizeUser(data.user);
        setCurrentUser(normalized);
        setAuthModalOpen(false);
        addToast(`Chào mừng ${normalized.name} trở lại! 🎉`, "success");
        setTimeout(() => executePendingAction(), 100);
        return true;
      }
    } catch (err) {
      // Neu loi tra ve tu Backend (sai pass, tk ko ton tai) -> bao loi that
      const msg = err.message || "Tên đăng nhập hoặc mật khẩu không chính xác.";
      addToast(msg, "error");
      return false;
    }
  };

  /**
   * Dang ky tai khoan moi that tren Backend CSDL
   */
  const register = async ({ name, email, username, password }) => {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedUsername = (username || "").trim().toLowerCase();
    const trimmedName = (name || "").trim();

    if (!trimmedEmail) {
      addToast("Email không được để trống!", "warning");
      return false;
    }
    if (!trimmedName) {
      addToast("Họ và tên không được để trống!", "warning");
      return false;
    }

    try {
      const data = await api.auth.register({
        email: trimmedEmail,
        username: trimmedUsername || trimmedEmail.split("@")[0],
        name: trimmedName,
        password: password || "Password123!"
      });

      if (data?.user) {
        const normalized = normalizeUser(data.user);
        setCurrentUser(normalized);
        setUsers((prev) => [normalized, ...prev.filter((u) => String(u.id) !== String(normalized.id))]);
        setAuthModalOpen(false);
        addToast(`Đăng ký tài khoản thành công! Chào mừng ${normalized.name}. 🎉`, "success");
        setTimeout(() => executePendingAction(), 100);
        return true;
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Email này đã được đăng ký") || msg.toLowerCase().includes("tồn tại") || msg.toLowerCase().includes("email")) {
        addToast("Tài khoản này đã được đăng ký trong hệ thống! Vui lòng chuyển sang Đăng nhập. 🔐", "info");
      } else {
        addToast(msg || "Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.", "error");
      }
      return false;
    }
  };

  /**
   * Dang nhap / Dang ky that qua OAuth 2.0 (Google, GitHub, Facebook)
   */
  const loginOAuth = async (provider, oauthData) => {
    try {
      const data = await api.auth.oauth(provider, oauthData);
      if (data?.user) {
        const normalized = normalizeUser(data.user);
        setCurrentUser(normalized);
        setUsers((prev) => [normalized, ...prev.filter((u) => String(u.id) !== String(normalized.id))]);
        setAuthModalOpen(false);
        setOauthModalOpen(false);
        addToast(`Đăng nhập thành công qua ${provider.toUpperCase()}! Chào mừng ${normalized.name}. 🎉`, "success");
        setTimeout(() => executePendingAction(), 100);
        return true;
      }
    } catch (err) {
      addToast(err.message || `Đăng nhập qua ${provider} thất bại.`, "error");
      return false;
    }
  };

  /**
   * Dang nhap nhanh 1-cham tai khoan Demo danh cho muc dich xem thu
   */
  /**
   * Thiet lap phien dang nhap tu OAuth callback hoac Token
   */
  /**
   * Chuyen huong truc tiep toi trang dang nhap Google Account chinh thuc
   */
  const loginWithGoogle = async () => {
    try {
      const state = window.location.origin;
      const res = await api.auth.getOAuthAuthorizeUrl("google", undefined, state);
      if (res?.authorize_url) {
        window.location.href = res.authorize_url;
        return;
      }
    } catch (err) {
      console.warn("Could not get google auth url via API, fallback direct:", err);
    }

    const clientId = "1001936616569-q7g5t7hnjqmkl63p89uankkgtl531p8b.apps.googleusercontent.com";
    const redirectUri = "http://localhost:8000/auth/google/callback";
    const state = encodeURIComponent(window.location.origin);
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account&state=${state}`;
    window.location.href = googleUrl;
  };

  /**
   * Chuyen huong truc tiep toi trang dang nhap GitHub chinh thuc
   */
  const loginWithGithub = async () => {
    try {
      const state = window.location.origin;
      const res = await api.auth.getOAuthAuthorizeUrl("github", undefined, state);
      if (res?.authorize_url) {
        window.location.href = res.authorize_url;
        return;
      }
    } catch {
      // fallback
    }
    const clientId = "Iv1.b507a6f87d4efb63";
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`;
  };

  const setAuthenticatedSession = (accessToken, refreshToken, rawUser) => {
    if (accessToken) {
      localStorage.setItem("it_blog_token", accessToken);
    }
    if (refreshToken) {
      localStorage.setItem("it_blog_refresh_token", refreshToken);
    }
    if (rawUser) {
      const normalized = normalizeUser(rawUser);
      setCurrentUser(normalized);
      setUsers((prev) => [normalized, ...prev.filter((u) => String(u.id) !== String(normalized.id))]);
      storage.set(STORAGE_KEYS.USER, normalized);
      setAuthModalOpen(false);
      setOauthModalOpen(false);
      addToast(`Đăng nhập thành công! Chào mừng ${normalized.name}. 🎉`, "success");
      setTimeout(() => executePendingAction(), 100);
      return normalized;
    }
    return null;
  };

  const loginDemo = async (role = "admin") => {
    let email = "admin@itblog.dev";
    let password = "AdminPassword123!";
    let roleLabel = "Quản trị viên (Admin) 👑";
    let fallbackId = "demo_admin";

    if (role === "moderator") {
      email = "mod@itblog.dev";
      password = "ModPassword123!";
      roleLabel = "Kiểm duyệt viên (Moderator) 🛡️";
      fallbackId = "demo_moderator";
    } else if (role === "user") {
      email = "hoang.dev@itblog.vn";
      password = "DevPassword123!";
      roleLabel = "Thành viên Kỹ sư (User) 👤";
      fallbackId = "demo_user";
    }

    try {
      const data = await api.auth.login(email, password);
      if (data?.user) {
        const normalized = normalizeUser(data.user);
        setCurrentUser(normalized);
        setAuthModalOpen(false);
        addToast(`Đã đăng nhập thành công vai trò: ${roleLabel}`, "success");
        setTimeout(() => executePendingAction(), 100);
        return true;
      }
    } catch {
      // Backend offline fallback
    }

    let targetUser = SEED_USERS.find((u) => u.id === fallbackId || u.role === role);
    if (!targetUser) targetUser = SEED_USERS[0];

    if (targetUser) {
      const normalized = normalizeUser(targetUser);
      setCurrentUser(normalized);
      setAuthModalOpen(false);
      addToast(`Đã đăng nhập tài khoản trải nghiệm: ${normalized.name} (${roleLabel})`, "success");
      setTimeout(() => executePendingAction(), 100);
      return true;
    }
    return false;
  };

  /**
   * Dang xuat tai khoan
   */
  const logout = () => {
    try {
      api.auth.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("it_blog_token");
    localStorage.removeItem("it_blog_refresh_token");
    storage.remove(STORAGE_KEYS.USER);
    setCurrentUser(null);
    setPendingAction(null);
    addToast("Bạn đã đăng xuất tài khoản thành công.", "info");
  };

  /**
   * Cap nhat thong tin ca nhan
   */
  const updateProfile = async ({ name, bio, avatar }) => {
    if (!currentUser) return false;

    const updatedUser = {
      ...currentUser,
      name: name !== undefined ? name : currentUser.name,
      bio: bio !== undefined ? bio : currentUser.bio,
      avatar: avatar !== undefined ? avatar : currentUser.avatar
    };

    try {
      await api.users.updateProfile({ name, bio, avatar });
    } catch {
      // ignore
    }

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (String(u.id) === String(updatedUser.id) ? updatedUser : u)));
    addToast("Cập nhật thông tin hồ sơ thành công!", "success");
    return true;
  };

  /**
   * Theo doi / Bo theo doi tac gia
   */
  const toggleFollow = async (authorId) => {
    if (!currentUser) return false;
    if (String(currentUser.id) === String(authorId)) {
      addToast("Bạn không thể tự theo dõi chính mình!", "warning");
      return false;
    }

    const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : [];
    const isFollowing = currentFollowing.includes(authorId);
    let updatedFollowing;

    if (isFollowing) {
      updatedFollowing = currentFollowing.filter((id) => id !== authorId);
      addToast("Đã hủy theo dõi tác giả.", "info");
    } else {
      updatedFollowing = [...currentFollowing, authorId];
      addToast("Đã theo dõi tác giả!", "success");
    }

    try {
      await api.interactions.toggleFollowUser(authorId);
    } catch {
      // ignore
    }

    const updatedUser = {
      ...currentUser,
      following: updatedFollowing
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (String(u.id) === String(updatedUser.id) ? updatedUser : u)));
    return true;
  };

  const isAdmin = Boolean(
    currentUser && (
      currentUser.role === "admin" ||
      currentUser.is_superuser ||
      currentUser.id === "demo_admin" ||
      String(currentUser.id) === "1" ||
      currentUser.email === "admin@itblog.dev" ||
      currentUser.username === "admin" ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("admin") ||
        currentUser.roles.some((r) =>
          typeof r === "string" ? r === "admin" : r?.name === "admin"
        )
      ))
    )
  );

  const isModerator = Boolean(
    currentUser && (
      isAdmin ||
      currentUser.role === "moderator" ||
      currentUser.id === "demo_moderator" ||
      String(currentUser.id) === "11" ||
      currentUser.email === "mod@itblog.dev" ||
      currentUser.username === "mod_dev" ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("moderator") ||
        currentUser.roles.some((r) =>
          typeof r === "string" ? r === "moderator" : r?.name === "moderator"
        )
      ))
    )
  );

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: !!currentUser,
        isAdmin,
        isModerator,
        authModalOpen,
        modalMessage,
        pendingAction,
        requireAuth,
        closeAuthModal,
        login,
        loginDemo,
        register,
        loginOAuth,
        loginWithGoogle,
        loginWithGithub,
        setAuthenticatedSession,
        oauthModalOpen,
        oauthProvider,
        openOAuthModal,
        closeOAuthModal,
        logout,
        updateProfile,
        toggleFollow
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
