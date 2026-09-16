/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { SEED_USERS } from "../data/seedData";
import { generateId } from "../utils/id";
import { useToast } from "./ToastContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { addToast } = useToast();

  // Khởi tạo danh sách người dùng từ storage hoặc seed data (tự động cập nhật nếu là dữ liệu cũ)
  const [users, setUsers] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.USERS, null);
    if (!saved || !saved.some((u) => u.id === "demo_user")) {
      storage.set(STORAGE_KEYS.USERS, SEED_USERS);
      return SEED_USERS;
    }
    return saved;
  });

  // Người dùng hiện tại (null nếu là khách - Guest, tự dọn dẹp tài khoản demo cũ)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demoLogin") === "true") {
        const demoUser = SEED_USERS.find((u) => u.id === "demo_user") || SEED_USERS[0];
        storage.set(STORAGE_KEYS.USER, demoUser);
        return demoUser;
      }
    } catch {
      // ignore
    }
    const saved = storage.get(STORAGE_KEYS.USER, null);
    if (saved && (saved.id === "demo_teacher" || saved.id === "demo_student")) {
      storage.remove(STORAGE_KEYS.USER);
      return null;
    }
    return saved;
  });

  // State điều khiển AuthModal và Pending Action
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // { callback, message }

  // Lưu danh sách users vào storage mỗi khi thay đổi
  useEffect(() => {
    storage.set(STORAGE_KEYS.USERS, users);
  }, [users]);

  // Lưu phiên đăng nhập vào storage mỗi khi thay đổi
  useEffect(() => {
    if (currentUser) {
      storage.set(STORAGE_KEYS.USER, currentUser);
    } else {
      storage.remove(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  /**
   * Chạy pending action sau khi đăng nhập thành công
   */
  const executePendingAction = () => {
    if (pendingAction && typeof pendingAction.callback === "function") {
      try {
        pendingAction.callback();
      } catch (err) {
        console.error("Lỗi khi thực thi pending action:", err);
      } finally {
        setPendingAction(null);
      }
    }
  };

  /**
   * Cổng chặn hành động cần quyền xác thực (Protected Action Interceptor)
   * @param {Function} callback - Hàm thực thi nếu đã đăng nhập
   * @param {string} message - Lời nhắn giải thích lý do cần đăng nhập
   * @returns {boolean}
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

  /**
   * Đóng Auth Modal và dọn dẹp pending action
   */
  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingAction(null);
    setModalMessage("");
  };

  /**
   * Đăng nhập thông thường bằng Email hoặc Username
   */
  const login = (identifier, password) => {
    const trimmedId = (identifier || "").trim().toLowerCase();
    if (!password) {
      addToast("Vui lòng nhập mật khẩu!", "warning");
      return false;
    }
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === trimmedId ||
        (u.username && u.username.toLowerCase() === trimmedId) ||
        (u.name && u.name.toLowerCase() === trimmedId)
    );

    if (!user) {
      addToast("Tên người dùng hoặc Email không tồn tại trong hệ thống!", "error");
      return false;
    }

    // Với môi trường demo/local: chấp nhận đăng nhập
    setCurrentUser(user);
    setAuthModalOpen(false);
    addToast(`Chào mừng ${user.name} trở lại!`, "success");

    // Tự động chạy hành động đang chờ
    setTimeout(() => {
      executePendingAction();
    }, 100);

    return true;
  };

  /**
   * Đăng nhập nhanh 1-chạm tài khoản Demo dùng thử
   */
  const loginDemo = () => {
    let targetUser = users.find((u) => u.id === "demo_user");

    if (!targetUser) {
      targetUser = SEED_USERS.find((u) => u.id === "demo_user") || SEED_USERS[0];
    }

    if (targetUser) {
      setCurrentUser(targetUser);
      setAuthModalOpen(false);
      addToast(`Đã đăng nhập tài khoản trải nghiệm: ${targetUser.name}`, "success");

      setTimeout(() => {
        executePendingAction();
      }, 100);
      return true;
    }
    return false;
  };

  /**
   * Đăng ký tài khoản mới
   */
  const register = ({ name, email, username }) => {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedUsername = (username || "").trim().toLowerCase();

    const existingEmail = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (existingEmail) {
      addToast("Email này đã được sử dụng!", "error");
      return false;
    }

    if (trimmedUsername) {
      const existingUser = users.find(
        (u) => u.username && u.username.toLowerCase() === trimmedUsername
      );
      if (existingUser) {
        addToast("Tên tài khoản này đã được sử dụng!", "error");
        return false;
      }
    }

    const newUser = {
      id: generateId("user"),
      name: name.trim(),
      username: trimmedUsername || trimmedEmail.split("@")[0],
      email: trimmedEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      bio: "Thành viên mới của cộng đồng IT Blog",
      following: [],
      createdAt: new Date().toISOString()
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);
    setAuthModalOpen(false);
    addToast(`Đăng ký thành công! Chào mừng ${newUser.name}.`, "success");

    setTimeout(() => {
      executePendingAction();
    }, 100);

    return true;
  };

  /**
   * Đăng xuất
   */
  const logout = () => {
    setCurrentUser(null);
    setPendingAction(null);
    addToast("Bạn đã đăng xuất tài khoản.", "info");
  };

  /**
   * Cập nhật thông tin cá nhân
   */
  const updateProfile = ({ name, bio, avatar }) => {
    if (!currentUser) return false;

    const updatedUser = {
      ...currentUser,
      name: name !== undefined ? name : currentUser.name,
      bio: bio !== undefined ? bio : currentUser.bio,
      avatar: avatar !== undefined ? avatar : currentUser.avatar
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    addToast("Cập nhật thông tin hồ sơ thành công!", "success");
    return true;
  };

  /**
   * Theo dõi / Bỏ theo dõi tác giả (Lưu trong currentUser.following)
   */
  const toggleFollow = (authorId) => {
    if (!currentUser) return false;
    if (currentUser.id === authorId) {
      addToast("Bạn không thể tự theo dõi chính mình!", "warning");
      return false;
    }

    const isFollowing = currentUser.following?.includes(authorId);
    let updatedFollowing;

    if (isFollowing) {
      updatedFollowing = currentUser.following.filter((id) => id !== authorId);
      addToast("Đã hủy theo dõi tác giả.", "info");
    } else {
      updatedFollowing = [...(currentUser.following || []), authorId];
      addToast("Đã theo dõi tác giả!", "success");
    }

    const updatedUser = {
      ...currentUser,
      following: updatedFollowing
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: !!currentUser,
        authModalOpen,
        modalMessage,
        pendingAction,
        requireAuth,
        closeAuthModal,
        login,
        loginDemo,
        register,
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
