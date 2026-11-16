import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  text: string;
  highlight?: string;
}

// Store promotional and shipping announcements with COD leading
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "cod",
    text: "💵 Cash on Delivery (COD) Available across all Indian pin codes",
  },
  {
    id: "shipping",
    text: "🚚 100% Free Express Delivery across India on",
    highlight: "ALL Orders",
  },
  {
    id: "dispatch",
    text: "⚡ Orders dispatched within 24 hrs with live WhatsApp tracking —",
    highlight: "3–5 Day Delivery",
  },
  {
    id: "tagline",
    text: "✨ Discover more at HypeeeCart | Everyday favourites, thoughtful finds",
  },
];

export function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ANNOUNCEMENTS.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
        setVisible(true);
      }, 200);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  if (ANNOUNCEMENTS.length === 0) return null;
  const current = ANNOUNCEMENTS[currentIndex];

  return (
    <div
      role="region"
      aria-label="Store Announcements"
      className="bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold tracking-wide border-b border-[#155EEF]/30 shadow-xs transition-colors"
    >
      <div
        className={`max-w-page mx-auto flex items-center justify-center gap-1.5 text-center transition-opacity duration-200 text-white ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-white drop-shadow-2xs">{current.text}</span>
        {current.highlight ? (
          <span className="font-extrabold text-white underline decoration-white/70 decoration-1 underline-offset-2">
            {current.highlight}
          </span>
        ) : null}
      </div>
    </div>
  );
}
