interface Announcement {
  id: string;
  text: string;
  highlight?: string;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "tagline",
    text: "✨ Discover more at HypeeeCart | Everyday favourites, thoughtful finds",
  },
  {
    id: "prepaid",
    text: "⚡ 10% Instant Discount on All Prepaid Orders (UPI / GPay / PhonePe / Cards)",
    highlight: "Auto-Applied",
  },
  {
    id: "shipping",
    text: "🚚 100% Free Express Delivery Across India on",
    highlight: "ALL Orders",
  },
  {
    id: "dispatch",
    text: "📦 Orders Dispatched Within 24 Hrs with Live WhatsApp Tracking —",
    highlight: "3–5 Day Delivery",
  },
  {
    id: "replacement",
    text: "🛡️ 5-Day Free Replacement Guarantee on all items",
  },
  {
    id: "cod",
    text: "💵 Cash on Delivery Available Pan-India",
  },
];

export function AnnouncementBar() {
  return (
    <div
      role="region"
      aria-label="Store Announcements"
      className="bg-[#2457D6] text-white py-2 text-[11px] sm:text-xs font-semibold tracking-wide border-b border-[#2457D6]/30 shadow-xs overflow-hidden select-none cursor-default"
    >
      <div className="flex overflow-hidden w-full">
        <div className="animate-marquee flex items-center shrink-0">
          {ANNOUNCEMENTS.map((item, idx) => (
            <div key={`track1-${item.id}-${idx}`} className="flex items-center shrink-0">
              <span className="text-white drop-shadow-2xs">{item.text}</span>
              {item.highlight ? (
                <span className="font-extrabold text-white underline decoration-white/80 decoration-1 underline-offset-2 ml-1">
                  {item.highlight}
                </span>
              ) : null}
              <span className="mx-6 sm:mx-8 text-white/40">•</span>
            </div>
          ))}
          {/* Duplicate set for 100% seamless, non-breaking continuous loop */}
          {ANNOUNCEMENTS.map((item, idx) => (
            <div
              key={`track2-${item.id}-${idx}`}
              className="flex items-center shrink-0"
              aria-hidden="true"
            >
              <span className="text-white drop-shadow-2xs">{item.text}</span>
              {item.highlight ? (
                <span className="font-extrabold text-white underline decoration-white/80 decoration-1 underline-offset-2 ml-1">
                  {item.highlight}
                </span>
              ) : null}
              <span className="mx-6 sm:mx-8 text-white/40">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
