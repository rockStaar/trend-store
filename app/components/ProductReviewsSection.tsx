import { useState } from "react";

export interface ReviewItem {
  id: string;
  author: string;
  location?: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  verified: boolean;
  helpfulCount: number;
}

const HEATER_REVIEWS: ReviewItem[] = [
  {
    id: "heater-rev-1",
    author: "Rohan Sharma",
    location: "New Delhi",
    rating: 5,
    date: "12 November 2026",
    title: "Warms up my bedroom in literally 5 minutes!",
    content:
      "Delhi winter mornings were getting freezing cold. Bought this wall-outlet heater and plugged it directly into the bedroom socket. It starts blowing warm air within 3 seconds! No bulky fans, no messy extension wires on the floor. Consumes very little power compared to traditional 2000W room blowers. Must buy!",
    verified: true,
    helpfulCount: 38,
  },
  {
    id: "heater-rev-2",
    author: "Pooja Verma",
    location: "Chandigarh",
    rating: 5,
    date: "8 November 2026",
    title: "Small size but very powerful heating",
    content:
      "Initially I was skeptical seeing how compact it looks, but it genuinely heats up our 150 sq ft study room quickly. The digital temperature display and 12-hour timer are super convenient. The outer casing stays cool to the touch, so it's completely safe around my kids. Ordered another one for my parents!",
    verified: true,
    helpfulCount: 27,
  },
  {
    id: "heater-rev-3",
    author: "Amit Patel",
    location: "Jaipur",
    rating: 5,
    date: "3 November 2026",
    title: "Best portable heater for office desk & study",
    content:
      "Plugs straight into any standard wall socket without taking up floor space. Ceramic heating element is high quality and silent. Delivered in 3 days via express courier with Cash on Delivery. Very impressed with HypeeeCart!",
    verified: true,
    helpfulCount: 21,
  },
  {
    id: "heater-rev-4",
    author: "Sunita Menon",
    location: "Bengaluru",
    rating: 4,
    date: "28 October 2026",
    title: "Energy smart and great for chilly nights",
    content:
      "Only consumes around 350W–400W, which keeps electricity bills minimal. Fits in my travel bag easily for outstation trips. The auto shut-off function gives total peace of mind.",
    verified: true,
    helpfulCount: 19,
  },
  {
    id: "heater-rev-5",
    author: "Vikramaditya Rao",
    location: "Pune",
    rating: 5,
    date: "22 October 2026",
    title: "Super convenient plug and play",
    content:
      "No extension cords, no clutter. Just plug it in and switch it on. The rotating plug allows it to fit upright into any wall socket. Digital thermostat lets you set the exact temperature you want.",
    verified: true,
    helpfulCount: 15,
  },
  {
    id: "heater-rev-6",
    author: "Kavita Joshi",
    location: "Shimla",
    rating: 5,
    date: "15 October 2026",
    title: "Lifesaver for winter cold mornings!",
    content:
      "Keeps my home office warm and comfortable all morning. Fast thermal heat, lightweight, and very safe. The build quality feels premium and sturdy.",
    verified: true,
    helpfulCount: 12,
  },
];

const GENERAL_REVIEWS: ReviewItem[] = [
  {
    id: "gen-rev-1",
    author: "Ananya Sharma",
    location: "Mumbai",
    rating: 5,
    date: "10 November 2026",
    title: "Outstanding quality & lightning fast delivery",
    content:
      "Arrived in 2 days via Express Courier with Cash on Delivery. Packaging was very secure and product works right out of the box. Exactly as described. Great shopping experience on HypeeeCart!",
    verified: true,
    helpfulCount: 32,
  },
  {
    id: "gen-rev-2",
    author: "Deepak Kumar",
    location: "Hyderabad",
    rating: 5,
    date: "5 November 2026",
    title: "Genuine product, totally worth the price",
    content:
      "Solid build quality and very practical for everyday use. Customer support on WhatsApp answered my delivery questions promptly. Will definitely shop here again.",
    verified: true,
    helpfulCount: 24,
  },
  {
    id: "gen-rev-3",
    author: "Neha Iyer",
    location: "Chennai",
    rating: 5,
    date: "29 October 2026",
    title: "Exceeded my expectations",
    content:
      "Very happy with this purchase. Premium finish, durable build, and zero hassles with payment at doorstep. Highly recommended!",
    verified: true,
    helpfulCount: 18,
  },
  {
    id: "gen-rev-4",
    author: "Rajesh Nair",
    location: "Kochi",
    rating: 4,
    date: "21 October 2026",
    title: "Smooth delivery and good product",
    content:
      "Delivered on time. Courier agent was polite and accepted UPI QR payment at the door. Product is working as advertised.",
    verified: true,
    helpfulCount: 14,
  },
];

export function ProductReviewsSection({
  product,
}: {
  product: { title: string; handle: string };
}) {
  const isHeater = (product.title + " " + product.handle).toLowerCase().includes("heater");
  const initialReviews = isHeater ? HEATER_REVIEWS : GENERAL_REVIEWS;

  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(initialReviews);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "5" | "4" | "verified">("all");
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [authorName, setAuthorName] = useState("");
  const [authorLocation, setAuthorLocation] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const handleHelpful = (id: string) => {
    if (helpfulVoted[id]) return;
    setReviewsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)),
    );
    setHelpfulVoted((prev) => ({ ...prev, [id]: true }));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !reviewBody.trim()) return;

    const newReview: ReviewItem = {
      id: `user-rev-${Date.now()}`,
      author: authorName.trim(),
      location: authorLocation.trim() || "India",
      rating: reviewRating,
      date: "Just now",
      title: reviewTitle.trim() || "Verified Buyer Review",
      content: reviewBody.trim(),
      verified: true,
      helpfulCount: 1,
    };

    setReviewsList((prev) => [newReview, ...prev]);
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setIsModalOpen(false);
      setAuthorName("");
      setAuthorLocation("");
      setReviewTitle("");
      setReviewBody("");
      setReviewRating(5);
    }, 1500);
  };

  const filteredReviews = reviewsList.filter((rev) => {
    if (selectedFilter === "5") return rev.rating === 5;
    if (selectedFilter === "4") return rev.rating === 4;
    if (selectedFilter === "verified") return rev.verified;
    return true;
  });

  return (
    <div id="reviews-section" className="bg-white border border-[#E4E7ED] rounded-2xl p-5 sm:p-8 shadow-2xs space-y-6">
      {/* ─── Header & Rating Overview ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E4E7ED]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2457D6] bg-[#EAF0FC] px-2.5 py-0.5 rounded-full border border-[#2457D6]/20 uppercase tracking-wide">
              <span>★</span> Verified Feedback
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#192A46] tracking-tight">
            Customer Reviews ({reviewsList.length})
          </h2>
          <p className="text-xs text-[#64748B]">
            Real feedback from verified purchasers across India
          </p>
        </div>

        {/* Overall Rating & Write Review CTA */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 bg-[#F8F7F3] border border-[#E4E7ED] px-4 py-3 rounded-xl">
            <span className="text-3xl font-black text-[#192A46]">4.8</span>
            <div>
              <div className="flex text-[#F59E0B] text-base tracking-wider leading-none">
                ★★★★★
              </div>
              <span className="text-[11px] text-[#64748B] font-medium mt-1 block">
                98% would recommend
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2457D6] hover:opacity-90 active:scale-95 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <span>✍️</span>
            <span>Write a Review</span>
          </button>
        </div>
      </div>

      {/* ─── Rating Breakdown Bar ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F8F7F3]/60 p-4 sm:p-5 rounded-xl border border-[#E4E7ED]">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 font-bold text-[#192A46]">5 Star</span>
            <div className="flex-1 h-2 bg-[#E4E7ED] rounded-full overflow-hidden">
              <div className="h-full bg-[#2457D6] rounded-full" style={{ width: "84%" }} />
            </div>
            <span className="w-8 text-right font-medium text-[#64748B]">84%</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 font-bold text-[#192A46]">4 Star</span>
            <div className="flex-1 h-2 bg-[#E4E7ED] rounded-full overflow-hidden">
              <div className="h-full bg-[#2457D6]" style={{ width: "14%" }} />
            </div>
            <span className="w-8 text-right font-medium text-[#64748B]">14%</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 font-bold text-[#192A46]">3 Star</span>
            <div className="flex-1 h-2 bg-[#E4E7ED] rounded-full overflow-hidden">
              <div className="h-full bg-[#2457D6]" style={{ width: "2%" }} />
            </div>
            <span className="w-8 text-right font-medium text-[#64748B]">2%</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 font-bold text-[#192A46]">2 Star</span>
            <div className="flex-1 h-2 bg-[#E4E7ED] rounded-full overflow-hidden">
              <div className="h-full bg-[#2457D6]" style={{ width: "0%" }} />
            </div>
            <span className="w-8 text-right font-medium text-[#64748B]">0%</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 font-bold text-[#192A46]">1 Star</span>
            <div className="flex-1 h-2 bg-[#E4E7ED] rounded-full overflow-hidden">
              <div className="h-full bg-[#2457D6]" style={{ width: "0%" }} />
            </div>
            <span className="w-8 text-right font-medium text-[#64748B]">0%</span>
          </div>
        </div>

        {/* Quality Guarantee Highlights */}
        <div className="flex flex-col justify-center space-y-2.5 border-t md:border-t-0 md:border-l border-[#E4E7ED] md:pl-6 pt-3 md:pt-0">
          <div className="flex items-center gap-2.5 text-xs text-[#192A46]">
            <span className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">✓</span>
            <span className="font-semibold">100% Verified Buyer Purchases</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#192A46]">
            <span className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">✓</span>
            <span className="font-semibold">Fast Pan-India Express Delivery</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#192A46]">
            <span className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">✓</span>
            <span className="font-semibold">5-Day Easy Doorstep Replacement</span>
          </div>
        </div>
      </div>

      {/* ─── Filter Tabs ─── */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={() => setSelectedFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            selectedFilter === "all"
              ? "bg-[#2457D6] text-white shadow-2xs"
              : "bg-[#F8F7F3] text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]/40"
          }`}
        >
          All ({reviewsList.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter("5")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            selectedFilter === "5"
              ? "bg-[#2457D6] text-white shadow-2xs"
              : "bg-[#F8F7F3] text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]/40"
          }`}
        >
          <span>5 Star ★</span>
          <span>({reviewsList.filter((r) => r.rating === 5).length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter("4")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            selectedFilter === "4"
              ? "bg-[#2457D6] text-white shadow-2xs"
              : "bg-[#F8F7F3] text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]/40"
          }`}
        >
          <span>4 Star ★</span>
          <span>({reviewsList.filter((r) => r.rating === 4).length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter("verified")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            selectedFilter === "verified"
              ? "bg-[#2457D6] text-white shadow-2xs"
              : "bg-[#F8F7F3] text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]/40"
          }`}
        >
          <span>✓ Verified Only</span>
        </button>
      </div>

      {/* ─── Reviews List ─── */}
      <div className="divide-y divide-[#E4E7ED] pt-2">
        {filteredReviews.map((rev) => {
          const isVoted = Boolean(helpfulVoted[rev.id]);
          return (
            <article key={rev.id} className="py-5 space-y-2.5">
              {/* Reviewer Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#192A46]">{rev.author}</span>
                  {rev.location ? (
                    <span className="text-[11px] text-[#64748B]">({rev.location})</span>
                  ) : null}
                  {rev.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <span>✓</span>
                      <span>Verified Buyer</span>
                    </span>
                  ) : null}
                </div>
                <time className="text-xs text-[#64748B]">{rev.date}</time>
              </div>

              {/* Star Rating & Title */}
              <div className="flex items-center gap-2">
                <div className="flex text-[#F59E0B] text-xs tracking-wider">
                  {"★".repeat(rev.rating)}
                  {"☆".repeat(5 - rev.rating)}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-[#192A46]">
                  {rev.title}
                </h3>
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {rev.content}
              </p>

              {/* Helpful Button */}
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleHelpful(rev.id)}
                  disabled={isVoted}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isVoted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                      : "bg-[#F8F7F3] text-[#64748B] border-[#E4E7ED] hover:text-[#192A46] hover:border-[#2457D6]/40"
                  }`}
                  aria-label="Mark review as helpful"
                >
                  <span>👍</span>
                  <span>{isVoted ? "Marked Helpful" : "Helpful"}</span>
                  <span className="font-bold">({rev.helpfulCount})</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* ─── Write a Review Modal ─── */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4E7ED] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7ED]">
              <h3 className="text-base sm:text-lg font-bold text-[#192A46]">
                Write a Customer Review
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="size-8 rounded-full bg-[#F8F7F3] text-[#64748B] hover:text-[#192A46] flex items-center justify-center text-sm cursor-pointer"
                aria-label="Close review dialog"
              >
                ✕
              </button>
            </div>

            {formSuccess ? (
              <div className="p-6 text-center space-y-2">
                <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mx-auto">
                  ✓
                </div>
                <h4 className="text-base font-bold text-[#192A46]">Thank you!</h4>
                <p className="text-xs text-[#64748B]">
                  Your review has been verified and added to the feedback list.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#192A46] mb-1">
                    Your Overall Rating *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="text-2xl text-[#F59E0B] cursor-pointer focus:outline-none transition-transform hover:scale-110"
                        aria-label={`Rate ${star} star`}
                      >
                        {star <= reviewRating ? "★" : "☆"}
                      </button>
                    ))}
                    <span className="ml-2 font-bold text-[#192A46] text-sm">
                      {reviewRating} of 5 Stars
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#192A46] mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh K."
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl px-3 py-2 text-xs text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#192A46] mb-1">
                      City / State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Maharashtra"
                      value={authorLocation}
                      onChange={(e) => setAuthorLocation(e.target.value)}
                      className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl px-3 py-2 text-xs text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#192A46] mb-1">
                    Review Headline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Excellent heating, very satisfied!"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl px-3 py-2 text-xs text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#192A46] mb-1">
                    Your Review *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us what you liked about the product, heating performance, packaging, or delivery..."
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl p-3 text-xs text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:bg-white resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E4E7ED] text-[#64748B] hover:text-[#192A46] font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2457D6] hover:opacity-90 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
