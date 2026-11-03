import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  text: string;
  highlight?: string;
}

// Grow&Glow promotional and shipping announcements
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "shipping",
    text: "🚚 Free Express Delivery across India on orders above",
    highlight: "₹999",
  },
  {
    id: "dispatch",
    text: "⚡ Orders dispatched within 24 hrs with live WhatsApp tracking —",
    highlight: "3–5 Day Delivery",
  },
  {
    id: "discount",
    text: "✨ Flat ₹150 OFF on your first prepaid order — use code",
    highlight: "GROWGLOW150",
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
      className="bg-[#282720] text-[#F7F3EC] px-4 py-1.5 text-xs"
    >
      <div
        className={`max-w-page mx-auto flex items-center justify-center gap-1.5 text-center tracking-wide transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="opacity-90">{current.text}</span>
        {current.highlight ? (
          <span className="font-bold text-[#D7A84C]">{current.highlight}</span>
        ) : null}
      </div>
    </div>
  );
}
