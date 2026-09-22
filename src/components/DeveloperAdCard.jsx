import { useState, useEffect } from "react";
import { api } from "../services/api";

const FALLBACK_ADS = [
  {
    id: 1,
    title: "AWS Cloud Credits cho Nhà phát triển",
    description: "Nhận ngay $300 credit trải nghiệm triển khai hệ thống phân tán, Docker & K8s trên AWS Cloud.",
    creative_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
    target_url: "https://aws.amazon.com/free",
    category: "cloud"
  },
  {
    id: 2,
    title: "JetBrains All Products Pack - Dev & Sinh viên",
    description: "Bộ công cụ IDE hàng đầu thế giới dành cho lập trình viên Python, Go, Java, Rust và Web.",
    creative_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
    target_url: "https://www.jetbrains.com",
    category: "tools"
  }
];

export default function DeveloperAdCard({ category }) {
  const [ads, setAds] = useState(FALLBACK_ADS);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let isMounted = true;
    api.ads.active(category)
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setAds(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [category]);

  const currentAd = ads[activeIdx % ads.length] || FALLBACK_ADS[0];

  const handleClick = (e) => {
    e.preventDefault();
    if (currentAd?.id) {
      api.ads.click(currentAd.id).catch(() => {});
    }
    if (currentAd?.target_url) {
      window.open(currentAd.target_url, "_blank", "noopener,noreferrer");
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % ads.length);
  };

  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden shadow-sm transition-all hover:border-primary/40 group">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
            <span>⚡</span> Tài trợ & Cơ hội Dev
          </span>
        </div>
        {ads.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="text-[11px] text-base-content/50 hover:text-primary transition-colors font-medium cursor-pointer"
            title="Xem ưu đãi tiếp theo"
          >
            Đổi tin ({activeIdx + 1}/{ads.length}) ↻
          </button>
        )}
      </div>

      <div onClick={handleClick} className="cursor-pointer block p-4 pt-1">
        {currentAd.creative_url && (
          <div className="w-full h-28 rounded-xl overflow-hidden mb-3 bg-base-200">
            <img
              src={currentAd.creative_url}
              alt={currentAd.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80";
              }}
            />
          </div>
        )}

        <h4 className="font-bold text-xs sm:text-sm text-base-content group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {currentAd.title}
        </h4>

        <p className="text-xs text-base-content/65 mt-1 line-clamp-2 leading-relaxed">
          {currentAd.description}
        </p>

        <div className="mt-3 pt-2.5 border-t border-base-200 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-primary group-hover:underline flex items-center gap-1">
            <span>Khám phá ưu đãi</span>
            <span>↗</span>
          </span>
          <span className="text-[10px] text-base-content/40">Quảng bá kỹ thuật</span>
        </div>
      </div>
    </div>
  );
}
