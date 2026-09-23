import { useState, useEffect } from "react";
import bannerPic from "../assets/A17D7EBB-77F8-4B0C-9E70-EE3358319308.jpg";

export default function Banner_full({ onNavigate }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = [
    {
      id: 1,
      tag: "🔥 Đồ Án Môn CNPM",
      title: "Cộng Đồng Lập Trình Viên & Kỹ Sư Phần Mềm IT Blog",
      description: "Khám phá kiến thức mới nhất về React 19, FastAPI, Microservices, DevOps và thực chiến dự án.",
      image: bannerPic,
      buttonText: "Khám phá bài viết",
      badgeColor: "badge-primary"
    },
    {
      id: 2,
      tag: "🤖 Xu Hướng AI 2026",
      title: "Làm Chủ Kỷ Nguyên Agentic AI & RAG Architecture",
      description: "Tích hợp mô hình ngôn ngữ lớn (LLM) vào hệ thống doanh nghiệp với Vector Database và Function Calling.",
      image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1400&q=80",
      buttonText: "Xem chủ đề AI",
      badgeColor: "badge-secondary"
    },
    {
      id: 3,
      tag: "☁️ Cloud & System Design",
      title: "Tối Ưu Hiệu Năng Hệ Thống Lớn Với Docker & Redis",
      description: "Chiến lược Rate Limiting, tối ưu hóa Database Index và xây dựng CI/CD Pipeline tự động hóa 100%.",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80",
      buttonText: "Xem System Design",
      badgeColor: "badge-accent"
    }
  ];

  const totalSlides = slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Tự động chuyển slide sau 5 giây
  useEffect(() => {
    if (!isPaused) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isPaused, totalSlides]);

  return (
    <div
      className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 pb-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-base-300 shadow-md min-h-[250px] sm:min-h-[320px] sm:aspect-[21/9] max-h-[380px] bg-neutral-900 group">
        {/* Slides list */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Background Image full-width & ratio */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                e.currentTarget.src = bannerPic;
              }}
            />

            {/* Gradient Overlay để chữ luôn đọc rõ ràng */}
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/95 via-black/70 sm:via-black/60 to-transparent flex items-center p-5 sm:p-10 md:p-14">
              <div className="max-w-xl text-white space-y-2 sm:space-y-3">
                <span className={`badge ${slide.badgeColor} text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider py-2 px-2.5 sm:py-2.5 sm:px-3 border-none shadow-sm`}>
                  {slide.tag}
                </span>

                <h2 className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight drop-shadow-md text-white break-words">
                  {slide.title}
                </h2>

                <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-sm break-words">
                  {slide.description}
                </p>

                <div className="pt-1 sm:pt-2">
                  <button
                    onClick={() => {
                      // Cuộn mượt xuống phần danh sách bài viết
                      const element = document.getElementById("posts-container");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      } else if (onNavigate) {
                        onNavigate("home");
                      }
                    }}
                    className="btn btn-primary btn-sm sm:btn-md text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform"
                  >
                    {slide.buttonText} &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Nút điều hướng Prev (ẩn trên mobile để không che chữ) */}
        <button
          onClick={prevSlide}
          type="button"
          aria-label="Previous Slide"
          className="hidden sm:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Nút điều hướng Next (ẩn trên mobile để không che chữ) */}
        <button
          onClick={nextSlide}
          type="button"
          aria-label="Next Slide"
          className="hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 border border-white/20 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dấu chấm chỉ số Slide (Dots indicator) */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full ${
                idx === currentSlide
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-white/50 hover:bg-white/90"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}