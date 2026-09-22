/**
 * Tiện ích truy xuất localStorage an toàn
 */
export const STORAGE_KEYS = {
  USER: 'it_blog_user',
  USERS: 'it_blog_users',
  POSTS: 'it_blog_posts',
  THEME: 'theme',
  POST_DRAFT: 'it_blog_post_draft'
};

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Lỗi đọc localStorage với key "${key}":`, error);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Lỗi ghi localStorage với key "${key}":`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Lỗi xóa localStorage với key "${key}":`, error);
      return false;
    }
  }
};
