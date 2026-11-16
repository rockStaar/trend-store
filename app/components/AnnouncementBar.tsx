import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  text: string;
  highlight?: string;
}

// Store promotional and shipping announcements
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "tagline",
    text: "Discover more at HypeeeCart | Everyday favourites, thoughtful finds",
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
    id: "cod",
    text: "💵 Cash on Delivery (COD) Available across all Indian pin codes",
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
      className="bg-[#F8F7F3] border-b border-[#E4E7ED] text-[#192A46] px-4 py-2 text-xs font-medium"
    >
      <div
        className={`max-w-page mx-auto flex items-center justify-center gap-1.5 text-center tracking-wide transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-[#64748B]">{current.text}</span>
        {current.highlight ? (
          <span className="font-bold text-[#2457D6]">{current.highlight}</span>
        ) : null}
      </div>
    </div>
  );
}
