import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  badge?: string;
  text: string;
  highlight?: string;
}

// Configurable promotional and shipping announcements for Indian customers
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "shipping",
    badge: "PAN-INDIA",
    text: "Free Express Delivery across India on orders above ₹999",
    highlight: "COD & UPI Available",
  },
  {
    id: "dispatch",
    badge: "FAST DISPATCH",
    text: "Orders dispatch within 24 hours with live WhatsApp tracking updates",
    highlight: "3–5 Day Delivery",
  },
  {
    id: "discount",
    badge: "FIRST ORDER",
    text: "Get Flat ₹150 OFF on your first prepaid order with code",
    highlight: "VARENYA150",
  },
];

export function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (ANNOUNCEMENTS.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  if (ANNOUNCEMENTS.length === 0) return null;
  const current = ANNOUNCEMENTS[currentIndex];

  return (
    <div
      role="region"
      aria-label="Store Announcements"
      className="bg-[#282720] text-[#F7F3EC] px-4 py-2 border-b border-[#3D3A32] text-xs transition-colors"
    >
      <div className="max-w-page mx-auto flex items-center justify-center gap-2 text-center font-normal tracking-wide">
        {current.badge ? (
          <span className="hidden sm:inline-block uppercase tracking-wider text-[10px] font-semibold bg-[#B77943] text-white px-2 py-0.5 rounded-full">
            {current.badge}
          </span>
        ) : null}
        <span className="opacity-95">{current.text}</span>
        {current.highlight ? (
          <span className="font-semibold text-[#D7A84C] underline decoration-[#D7A84C]/50 decoration-1 underline-offset-2">
            {current.highlight}
          </span>
        ) : null}
      </div>
    </div>
  );
}
