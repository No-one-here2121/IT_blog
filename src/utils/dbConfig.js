/**
 * Cau hinh database dung chung cho frontend.
 * Che do mac dinh: localStorage (giua nguyen app cu, khong can server).
 * Khi nao co backend thi bat POSTGRES_ENABLED=true va tro cac ham duoi ve API/server.
 *
 * Thong tin ket noi that chi nam trong database/.env (.env.example),
 * KHONG hardcode mat khau 123456 vao source code.
 */
export const DB_CONFIG = {
  enabled: import.meta.env?.VITE_DB_ENABLED === "true",
  host: import.meta.env?.VITE_DB_HOST || "localhost",
  port: import.meta.env?.VITE_DB_PORT || "5432",
  name: import.meta.env?.VITE_DB_NAME || "it_blog",
  user: import.meta.env?.VITE_DB_USER || "postgres"
};

export function getDatabaseUrl() {
  return `postgresql://${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.name}`;
}
