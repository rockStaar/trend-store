import { useState } from "react";

export type CustomerReviewItem = {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  verified: boolean;
  setName?: string;
  photo?: string;
  helpfulCount: number;
};

export const MANTRA_CUSTOMER_REVIEWS: CustomerReviewItem[] = [
  {
    id: "rev-1",
    author: "Parag",
    rating: 5,
    date: "13 October 2026",
    title: "Hanuman Chalisa- Good",
    content: "Good Bhajan devices. The audio is clear and gives a very peaceful atmosphere during morning puja.",
    verified: true,
    setName: "Hanuman-Chalisa",
    photo: "/uploads/reviews/customer-mantra-2.jpg",
    helpfulCount: 14,
  },
  {
    id: "rev-2",
    author: "Lankala Maheshwari reddy",
    rating: 5,
    date: "6 July 2026",
    title: "Totally recommended",
    content: "It’s giving sooooo much peace the best! Build quality is solid, fits right into any standard socket.",
    verified: true,
    setName: "Hanuman-Chalisa",
    photo: "/uploads/reviews/customer-mantra-1.jpg",
    helpfulCount: 9,
  },
  {
    id: "rev-3",
    author: "Aman saini",
    rating: 5,
    date: "7 December 2025",
    title: "Value for money",
    content: "Nice product. Works as expected. The volume controller knob rotates smoothly without any static noise.",
    verified: true,
    setName: "Hanuman-Chalisa",
    helpfulCount: 12,
  },
  {
    id: "rev-4",
    author: "Geeta",
    rating: 5,
    date: "3 July 2026",
    title: "Beautiful Audio Quality & Spiritually Uplifting",
    content:
      "I’m very pleased with this chant device. The audio is clear, soothing, and beautifully recited, creating a peaceful and devotional atmosphere. It’s perfect for daily prayers, meditation, or simply bringing a sense of calm and positivity to the day. The quality exceeded my expectations.",
    verified: true,
    helpfulCount: 28,
  },
  {
    id: "rev-5",
    author: "Sarika Chaurasia",
    rating: 4,
    date: "3 November 2026",
    title: "Good buy",
    content: "Good buy. Very peaceful sound for daily prayer. Plugs in easily and runs continuously without any heating issues.",
    verified: true,
    setName: "Hanuman-Chalisa",
    helpfulCount: 6,
  },
  {
    id: "rev-6",
    author: "Rajesh K.",
    rating: 5,
    date: "18 October 2026",
    title: "Brings positive energy to home",
    content: "Very easy to use, just plug into any 2-pin socket and switch on. Chants are crystal clear and peaceful. The volume controller works smoothly.",
    verified: true,
    helpfulCount: 19,
  },
];

export function ProductCustomerReviews() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const r of MANTRA_CUSTOMER_REVIEWS) {
      initial[r.id] = r.helpfulCount;
    }
    return initial;
  });
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  const handleHelpful = (id: string) => {
    if (voted[id]) return;
    setHelpfulCounts((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    setVoted((prev) => ({ ...prev, [id]: true }));
  };

  const photoReviews = MANTRA_CUSTOMER_REVIEWS.filter((r) => Boolean(r.photo));

  return (
    <section
      id="customer-reviews"
      aria-labelledby="customer-reviews-heading"
      className="max-w-page px-margin mx-auto w-full py-8"
    >
      <div className="bg-white border border-[#E2DBD0] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Header & Rating Breakdown */}
        <div className="border-b border-[#F0EBE1] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base text-[#B77943]">⭐</span>
              <span className="text-[11px] uppercase font-bold tracking-widest text-[#B77943]">
                Verified Buyer Feedback
              </span>
            </div>
            <h2
              id="customer-reviews-heading"
              className="text-xl sm:text-2xl font-extrabold text-[#282720] mt-1 tracking-tight"
            >
              Customer Reviews (6)
            </h2>
          </div>

          {/* Rating Summary Badge */}
          <div className="flex items-center gap-3 bg-[#FAF6F0] border border-[#E2DBD0] px-4 py-2.5 rounded-xl">
            <span className="text-2xl font-black text-[#282720]">4.8</span>
            <div>
              <div className="flex text-[#D7A84C] text-sm tracking-widest leading-none">
                ★★★★★
              </div>
              <span className="text-[11px] text-[#7D786D] font-medium mt-0.5 block">
                Based on 6 verified reviews
              </span>
            </div>
          </div>
        </div>

        {/* Customer Photos Gallery */}
        {photoReviews.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#282720]">
              <span>📸</span>
              <span>Customer Photos ({photoReviews.length})</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {photoReviews.map((rev) => (
                <button
                  key={rev.id}
                  type="button"
                  onClick={() => setSelectedPhoto(rev.photo!)}
                  className="size-20 sm:size-24 rounded-xl overflow-hidden border-2 border-[#E2DBD0] hover:border-[#B77943] bg-[#FAF6F0] p-1 shrink-0 transition-transform hover:scale-[1.03] cursor-pointer"
                  aria-label={`View photo from ${rev.author}`}
                >
                  <img
                    src={rev.photo!}
                    alt={`Customer photo from ${rev.author}`}
                    className="h-full w-full object-cover rounded-lg"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Reviews List */}
        <div className="divide-y divide-[#F0EBE1] pt-2">
          {MANTRA_CUSTOMER_REVIEWS.map((rev) => (
            <article key={rev.id} className="py-5 first:pt-0 last:pb-0 space-y-2.5">
              {/* Author & Verification */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#282720]">{rev.author}</span>
                  {rev.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <span>✓</span>
                      <span>Verified Purchase</span>
                    </span>
                  ) : null}
                </div>
                <time className="text-xs text-[#8A8478]">{rev.date}</time>
              </div>

              {/* Star Rating & Review Title */}
              <div className="flex items-center gap-2">
                <div className="flex text-[#D7A84C] text-xs tracking-wider">
                  {"★".repeat(rev.rating)}
                  {"☆".repeat(5 - rev.rating)}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-[#282720]">
                  {rev.title}
                </h3>
              </div>

              {/* Review Content */}
              <p className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed">
                {rev.content}
              </p>

              {/* Customer Photo Thumbnail in Review Card */}
              {rev.photo ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(rev.photo!)}
                    className="size-20 sm:size-24 rounded-xl overflow-hidden border border-[#E2DBD0] bg-[#FAF6F0] p-1 hover:border-[#B77943] transition-all cursor-pointer inline-block"
                  >
                    <img
                      src={rev.photo}
                      alt="Customer review attachment"
                      className="h-full w-full object-cover rounded-lg"
                      loading="lazy"
                    />
                  </button>
                </div>
              ) : null}

              {/* Helpful Action */}
              <div className="flex items-center gap-3 pt-1 text-xs text-[#7D786D]">
                <button
                  type="button"
                  onClick={() => handleHelpful(rev.id)}
                  disabled={voted[rev.id]}
                  className={`border rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    voted[rev.id]
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-[#E2DBD0] bg-white hover:bg-[#FAF6F0] text-[#282720]"
                  }`}
                >
                  {voted[rev.id] ? "✓ Helpful" : "Helpful"}
                </button>
                <span>
                  {helpfulCounts[rev.id] || 0} people found this helpful
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Lightbox Modal for Customer Photo */}
      {selectedPhoto ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-2xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm font-bold z-10 hover:bg-black transition-colors cursor-pointer"
              aria-label="Close photo preview"
            >
              ✕
            </button>
            <img
              src={selectedPhoto}
              alt="Customer photo enlarged"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

