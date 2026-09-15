import { useState } from "react";
import Login_page from "./pages/login";
import Logup_page from "./pages/logup";
import Menu_main from "./pages/main_menu";

export default function App() {
  const [currentPage, setCurrentPage] = useState("login");

  return (
    currentPage === "login" ? (
      <Login_page onNavigate={setCurrentPage} />
    ) : currentPage === "logup" ? (         
      <Logup_page onNavigate={setCurrentPage} />
    ) : (
      <Menu_main onNavigate={setCurrentPage} />
    )
  );
}