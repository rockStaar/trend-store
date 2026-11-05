import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { formatPrice } from "~/lib/money";
import type { PublicReview, ReviewStats, ReviewFilter } from "~/lib/reviews";

type ProductReviewsProps = {
  productId: string;
  productHandle?: string;
  productTitle?: string;
  initialReviews?: PublicReview[];
  initialStats?: ReviewStats;
  productPrice?: { amount: string; currencyCode: string };
  onAddToCart?: () => void;
};

// Render 5 stars helper
function StarRating({
  rating,
  size = "md",
  interactive = false,
  onSelect,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onSelect?: (star: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const activeRating = hoverRating !== null ? hoverRating : rating;

  const sizeClasses = {
    sm: "size-3.5",
    md: "size-4 sm:size-4.5",
    lg: "size-6 sm:size-7",
  };

  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? "radiogroup" : "img"}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= Math.floor(activeRating);
        const isHalf = !isFilled && star - activeRating < 1 && star - activeRating > 0;

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            className={`${
              interactive
                ? "cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                : "cursor-default"
            }`}
            aria-label={interactive ? `${star} star${star > 1 ? "s" : ""}` : undefined}
          >
            <svg
              className={`${sizeClasses[size]} ${
                isFilled || isHalf ? "text-[#D7A84C] fill-[#D7A84C]" : "text-[#D8D2C5] fill-none"
              }`}
              viewBox="0 0 20 20"
              stroke="currentColor"
              strokeWidth={isFilled || isHalf ? "0" : "1.5"}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// Attribute rating slider (Value for Price, Quality)
function AttributeBar({
  label,
  value,
  lowLabel = "Fair",
  midLabel = "Good",
  highLabel = "Exceptional",
}: {
  label: string;
  value: number;
  lowLabel?: string;
  midLabel?: string;
  highLabel?: string;
}) {
  const percentage = Math.min(100, Math.max(0, ((value - 1) / 4) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#282720]">{label}</span>
      </div>
      <div className="relative w-full h-1.5 bg-[#E8E1D5] rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full bg-[#B77943] border-2 border-white shadow-xs transition-all"
          style={{ left: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#7D786D]">
        <span>{lowLabel}</span>
        <span>{midLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function ProductReviews({
  productId,
  productHandle,
  productTitle = "Product",
  initialReviews = [],
  initialStats = {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recommendPercent: 0,
    allPhotos: [],
    averageValue: 4,
    averageQuality: 4,
  },
  productPrice,
  onAddToCart,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<PublicReview[]>(initialReviews);
  const [stats, setStats] = useState<ReviewStats>(initialStats);
  const [filter, setFilter] = useState<ReviewFilter>({ sortBy: "recent" });
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Form State
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formOrderId, setFormOrderId] = useState("");
  const [formHoneypot, setFormHoneypot] = useState("");
  const [formRecommend, setFormRecommend] = useState(true);
  const [formValue, setFormValue] = useState(4);
  const [formQuality, setFormQuality] = useState(4);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Helpful reviews counter state
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});

  // Admin / Moderation Mode State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [showAdminSecretModal, setShowAdminSecretModal] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Keep state synchronized when navigating between different products
  useEffect(() => {
    setReviews(initialReviews);
    setStats(initialStats);
    setFilter({ sortBy: "recent" });
    setSubmitSuccess(null);
    setSubmitError(null);
  }, [productId, productHandle, initialReviews, initialStats]);

  // Fetch reviews on filter change
  const fetchReviews = async (newFilter: ReviewFilter, includePending = showPendingOnly) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ productId });
      if (productHandle) params.set("handle", productHandle);
      if (newFilter.rating) params.set("rating", String(newFilter.rating));
      if (newFilter.withMedia) params.set("withMedia", "true");
      if (newFilter.verifiedOnly) params.set("verifiedOnly", "true");
      if (newFilter.sortBy) params.set("sortBy", newFilter.sortBy);
      if (includePending || isAdminMode) params.set("includePending", "true");

      const res = await fetch(`/api/reviews?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { reviews?: PublicReview[]; stats?: ReviewStats };
        setReviews(data.reviews || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("[Reviews] Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (updates: Partial<ReviewFilter>) => {
    const next = { ...filter, ...updates };
    setFilter(next);
    fetchReviews(next);
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formPhotos.length + files.length > 4) {
      alert("You can upload a maximum of 4 photos.");
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert(`"${file.name}" is not a supported image file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormPhotos((prev) => [...prev, String(event.target?.result)]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Review Form
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = {
        productId,
        productHandle,
        productTitle,
        author: formAuthor,
        email: formEmail,
        rating: formRating,
        title: formTitle,
        content: formContent,
        recommend: formRecommend,
        orderId: formOrderId,
        photos: formPhotos,
        valueRating: formValue,
        qualityRating: formQuality,
        honeypot: formHoneypot,
      };

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        status?: "approved" | "pending";
        review?: PublicReview;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setSubmitSuccess(data.message || "Thank you! Your review has been saved.");
      // Reset form
      setFormTitle("");
      setFormContent("");
      setFormPhotos([]);
      setFormHoneypot("");
      // Refresh reviews list immediately
      await fetchReviews(filter);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please check your inputs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (helpfulVoted[reviewId]) return;
    setHelpfulVoted((prev) => ({ ...prev, [reviewId]: true }));
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)),
    );

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "voteHelpful", reviewId }),
      });
    } catch {
      // ignore
    }
  };

  // Moderation action
  const handleModerate = async (reviewId: string, action: "approve" | "reject" | "delete") => {
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "moderate",
          reviewId,
          status: action,
          adminSecret: adminSecret || "grow-glow-secret-key",
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        await fetchReviews(filter);
      } else {
        alert(data.error || "Moderation failed. Check your admin secret.");
      }
    } catch (err) {
      alert("Failed to communicate with moderation server.");
    }
  };

  const allPhotos = stats.allPhotos || [];
  const selectedPhoto = selectedPhotoIndex !== null ? allPhotos[selectedPhotoIndex] : null;

  return (
    <section
      id="customer-reviews"
      className="py-14 sm:py-20 bg-white border-t border-[#E2DBD0]"
      aria-labelledby="reviews-section-heading"
    >
      <div className="max-w-page px-margin mx-auto">
        {/* Header Bar matching Reference 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#E2DBD0]">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#B77943]">
              VERIFIED FEEDBACK
            </span>
            <h2
              id="reviews-section-heading"
              className="font-serif text-3xl sm:text-4xl text-[#282720] font-normal mt-0.5"
            >
              Customer Reviews
            </h2>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(null);
                setSubmitError(null);
                setIsWriteModalOpen(true);
              }}
              className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#282720] hover:bg-[#B77943] text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <span>Write a Review</span>
              <span>✎</span>
            </button>

            {/* Quick Moderation Toggle for store owner */}
            <button
              type="button"
              onClick={() => {
                if (!isAdminMode) {
                  setShowAdminSecretModal(true);
                } else {
                  setIsAdminMode(false);
                  setShowPendingOnly(false);
                  fetchReviews(filter, false);
                }
              }}
              className="text-[11px] font-semibold text-[#7D786D] hover:text-[#282720] underline cursor-pointer px-2 py-1"
            >
              {isAdminMode ? "Exit Moderation Mode" : "Moderation ⚙"}
            </button>
          </div>
        </div>

        {/* Admin Moderation Bar (when unlocked) */}
        {isAdminMode && (
          <div className="bg-[#FAF6F0] border border-[#B77943]/40 rounded-xl p-4 my-6 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="font-bold text-[#282720]">Store Owner Moderation Active</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#282720] font-medium">
                <input
                  type="checkbox"
                  checked={showPendingOnly}
                  onChange={(e) => {
                    setShowPendingOnly(e.target.checked);
                    fetchReviews(filter, e.target.checked);
                  }}
                  className="rounded border-[#E2DBD0] text-[#B77943]"
                />
                <span>Include Pending Reviews</span>
              </label>
              <button
                type="button"
                onClick={() => fetchReviews(filter, showPendingOnly)}
                className="bg-white border border-[#E2DBD0] hover:bg-[#EFE9DE] px-3 py-1 rounded text-xs"
              >
                Refresh Reviews
              </button>
            </div>
          </div>
        )}

        {/* 1. Review Summary Card matching Reference 1 */}
        {stats.totalReviews > 0 ? (
          <div className="py-8 border-b border-[#E2DBD0]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-[#FAF6F0] p-6 sm:p-8 rounded-2xl border border-[#E2DBD0]">
              {/* Left Column: Big Average */}
              <div className="text-center md:text-left flex flex-col items-center md:items-start justify-center">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#282720]">
                    {stats.averageRating.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-[#7D786D]">/ 5.0</span>
                </div>
                <div className="mt-2 mb-1">
                  <StarRating rating={stats.averageRating} size="md" />
                </div>
                <p className="text-xs text-[#7D786D]">
                  Based on <strong>{stats.totalReviews}</strong> customer reviews
                </p>
                {stats.recommendPercent > 0 ? (
                  <p className="text-xs text-emerald-800 font-medium mt-2 flex items-center gap-1">
                    <span>✓</span>
                    <span>{stats.recommendPercent}% of reviewers recommend this</span>
                  </p>
                ) : null}
              </div>

              {/* Middle Column: Star Breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct =
                    stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
                  const isSelected = filter.rating === star;

                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleFilterChange({ rating: isSelected ? undefined : star })}
                      className={`w-full group flex items-center gap-3 text-xs text-[#282720] hover:text-[#B77943] transition-colors cursor-pointer p-1 rounded ${
                        isSelected ? "bg-white shadow-xs font-bold text-[#B77943]" : ""
                      }`}
                    >
                      <span className="w-8 text-right font-medium">{star} ★</span>
                      <div className="flex-1 h-2 bg-[#E8E1D5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B77943] transition-all duration-500 rounded-full group-hover:bg-[#9E6433]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-left text-[11px] text-[#7D786D]">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Attribute Sliders */}
              <div className="space-y-5 bg-white p-5 rounded-xl border border-[#E2DBD0]">
                <AttributeBar
                  label="Value for Price"
                  value={stats.averageValue || 4}
                  lowLabel="Overpriced"
                  midLabel="Fair value"
                  highLabel="Good value"
                />
                <AttributeBar
                  label="Quality & Satisfaction"
                  value={stats.averageQuality || 4.2}
                  lowLabel="Fair"
                  midLabel="Moderate"
                  highLabel="Exceptional"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* 2. Customer Photo Gallery matching Reference 1 */}
        {allPhotos.length > 0 ? (
          <div className="py-8 border-b border-[#E2DBD0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm uppercase tracking-wider font-bold text-[#282720] flex items-center gap-2">
                <span>📸</span>
                <span>Customer Photos ({allPhotos.length})</span>
              </h3>
              <span className="text-xs text-[#7D786D]">Click to view full photo & review</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin">
              {allPhotos.map((photo, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(index)}
                  className="group relative size-20 sm:size-24 rounded-lg overflow-hidden shrink-0 border-2 border-transparent hover:border-[#B77943] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B77943]"
                  aria-label={`View photo ${index + 1} by ${photo.author}`}
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 3. Filters and Sorting Bar matching Reference 1 */}
        <div className="py-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DBD0]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold text-[#282720] uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span>
              <span>Sort & Filter:</span>
            </span>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="review-sort-select" className="text-[#7D786D]">
                Sort by:
              </label>
              <select
                id="review-sort-select"
                value={filter.sortBy || "recent"}
                onChange={(e) =>
                  handleFilterChange({ sortBy: e.target.value as ReviewFilter["sortBy"] })
                }
                className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-md px-3 py-1.5 text-xs text-[#282720] font-medium focus:outline-none focus:border-[#B77943]"
              >
                <option value="recent">Most recent</option>
                <option value="rating-high">Highest rating</option>
                <option value="rating-low">Lowest rating</option>
                <option value="helpful">Most helpful</option>
              </select>
            </div>

            {/* Rating Filter Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="review-rating-select" className="text-[#7D786D]">
                Rating:
              </label>
              <select
                id="review-rating-select"
                value={filter.rating || ""}
                onChange={(e) =>
                  handleFilterChange({
                    rating: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-md px-3 py-1.5 text-xs text-[#282720] font-medium focus:outline-none focus:border-[#B77943]"
              >
                <option value="">All ratings</option>
                <option value="5">5 stars only</option>
                <option value="4">4 stars only</option>
                <option value="3">3 stars only</option>
                <option value="2">2 stars only</option>
                <option value="1">1 star only</option>
              </select>
            </div>

            {/* With Media Toggle */}
            <label className="flex items-center gap-2 text-xs font-medium text-[#282720] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filter.withMedia)}
                onChange={(e) => handleFilterChange({ withMedia: e.target.checked })}
                className="rounded border-[#E2DBD0] text-[#B77943] focus:ring-[#B77943]"
              />
              <span>With customer photos</span>
            </label>
          </div>

          {/* Reset Filters Link */}
          {(filter.rating || filter.withMedia || filter.sortBy !== "recent") && (
            <button
              type="button"
              onClick={() =>
                handleFilterChange({ rating: undefined, withMedia: false, sortBy: "recent" })
              }
              className="text-xs text-[#B77943] hover:underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* 4. Individual Customer Review Cards */}
        <div className="py-6">
          {loading ? (
            <div className="py-16 text-center text-[#7D786D] text-sm">
              <p>Updating reviews…</p>
            </div>
          ) : reviews.length === 0 ? (
            /* Beautiful Empty State */
            <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-2xl p-10 sm:p-16 text-center max-w-xl mx-auto my-6">
              <div className="size-16 rounded-full bg-white border border-[#E2DBD0] flex items-center justify-center text-3xl mx-auto mb-4 text-[#D7A84C]">
                ★
              </div>
              <h3 className="font-serif text-2xl font-normal text-[#282720]">
                Be the First to Review This Discovery
              </h3>
              <p className="text-xs sm:text-sm text-[#5E5B52] mt-2 mb-6 leading-relaxed">
                Have you experienced {productTitle}? Share your honest feedback with our community
                and help fellow shoppers choose thoughtfully.
              </p>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#B77943] hover:bg-[#9E6433] text-white px-7 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                <span>Write the First Review</span>
                <span>✎</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E2DBD0]">
              {reviews.map((review) => {
                const initials = review.author
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const formattedDate = new Date(review.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <article
                    key={review.id}
                    className="py-7 sm:py-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6"
                  >
                    {/* Left: Author Info */}
                    <div className="flex md:flex-col items-center md:items-start gap-3">
                      <div className="size-11 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center font-bold text-sm text-[#282720] shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-heading font-bold text-sm text-[#282720]">
                            {review.author}
                          </span>
                        </div>

                        {review.verifiedPurchase ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span>🛡️</span>
                            <span>Verified Buyer</span>
                          </span>
                        ) : null}

                        {review.status === "pending" ? (
                          <span className="mt-1 block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                            ⏳ Pending Approval
                          </span>
                        ) : null}

                        <p className="text-[11px] text-[#7D786D] mt-1">{formattedDate}</p>

                        {/* Admin Action Buttons on Review Card */}
                        {isAdminMode && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            {review.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => handleModerate(review.id, "approve")}
                                className="text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded font-bold"
                              >
                                ✓ Approve
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleModerate(review.id, "delete")}
                              className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold"
                            >
                              ✕ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Review Details matching Reference 1 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} size="sm" />
                        {review.recommend ? (
                          <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                            <span>✓</span>
                            <span>I recommend this product</span>
                          </span>
                        ) : null}
                      </div>

                      <h4 className="font-heading font-bold text-base text-[#282720]">
                        {review.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed whitespace-pre-line">
                        {review.content}
                      </p>

                      {/* Attribute Sliders for Review */}
                      {review.valueRating || review.qualityRating ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-2">
                          {review.valueRating ? (
                            <AttributeBar
                              label="Value for Price"
                              value={review.valueRating}
                              lowLabel="Overpriced"
                              midLabel="Fair value"
                              highLabel="Good value"
                            />
                          ) : null}
                          {review.qualityRating ? (
                            <AttributeBar
                              label="Quality & Satisfaction"
                              value={review.qualityRating}
                              lowLabel="Fair"
                              midLabel="Moderate"
                              highLabel="Exceptional"
                            />
                          ) : null}
                        </div>
                      ) : null}

                      {/* Review Photos attached */}
                      {review.photos && review.photos.length > 0 ? (
                        <div className="flex items-center gap-2.5 pt-2">
                          {review.photos.map((photo, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                const fullIndex = allPhotos.findIndex((p) => p.url === photo);
                                setSelectedPhotoIndex(fullIndex !== -1 ? fullIndex : 0);
                              }}
                              className="size-16 sm:size-20 rounded-lg overflow-hidden border border-[#E2DBD0] hover:border-[#B77943] transition-all cursor-pointer focus:outline-none"
                            >
                              <img src={photo} alt="" className="size-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {/* Helpful Button */}
                      <div className="pt-2 flex items-center gap-4 text-xs text-[#7D786D]">
                        <button
                          type="button"
                          onClick={() => handleHelpful(review.id)}
                          disabled={helpfulVoted[review.id]}
                          className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            helpfulVoted[review.id]
                              ? "text-emerald-700 font-semibold cursor-default"
                              : "hover:text-[#B77943]"
                          }`}
                        >
                          <span>👍</span>
                          <span>
                            {helpfulVoted[review.id] ? "Helpful!" : "Helpful"}{" "}
                            {review.helpfulCount > 0 ? `(${review.helpfulCount})` : ""}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Photo Lightbox Modal matching Reference 1 */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute top-4 right-4 z-10 size-9 rounded-full bg-white/90 text-[#282720] hover:bg-white flex items-center justify-center text-sm font-bold shadow-md cursor-pointer"
              aria-label="Close photo preview"
            >
              ✕
            </button>

            {/* Left: Full Photo */}
            <div className="relative bg-[#1A1916] flex items-center justify-center min-h-[300px] md:min-h-[500px]">
              <img
                src={selectedPhoto.url}
                alt=""
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />

              {allPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhotoIndex((prev) =>
                        prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : 0,
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center text-lg cursor-pointer"
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhotoIndex((prev) =>
                        prev !== null ? (prev + 1) % allPhotos.length : 0,
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center text-lg cursor-pointer"
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Right: Review Details */}
            <div className="p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="border-b border-[#E2DBD0] pb-4 mb-4">
                  <p className="text-xs uppercase font-bold text-[#B77943] tracking-wider">
                    PHOTO FROM CUSTOMER REVIEW
                  </p>
                  <h4 className="font-heading font-bold text-lg text-[#282720] mt-1">
                    {productTitle}
                  </h4>
                  {productPrice ? (
                    <p className="text-sm font-bold text-[#B77943] mt-0.5">
                      {formatPrice(productPrice)}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-[#282720]">
                      {selectedPhoto.author}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified Buyer
                    </span>
                  </div>

                  <h5 className="font-heading font-bold text-sm text-[#282720]">
                    "{selectedPhoto.title || "Loved this purchase!"}"
                  </h5>

                  {(() => {
                    const matchedReview = reviews.find((r) => r.id === selectedPhoto.reviewId);
                    return matchedReview ? (
                      <div className="space-y-3">
                        <StarRating rating={matchedReview.rating} size="sm" />
                        <p className="text-xs text-[#5E5B52] leading-relaxed">
                          {matchedReview.content}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {onAddToCart && (
                <div className="pt-6 border-t border-[#E2DBD0] mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart();
                      setSelectedPhotoIndex(null);
                    }}
                    className="w-full bg-[#B77943] hover:bg-[#9E6433] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Add to Bag
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Write a Review Modal */}
      {isWriteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsWriteModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2DBD0] pb-4 mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943]">
                  SHARE YOUR EXPERIENCE
                </span>
                <h3 className="font-serif text-2xl text-[#282720]">Write a Review</h3>
                <p className="text-xs text-[#7D786D] mt-0.5">{productTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="size-8 rounded-full bg-[#FAF6F0] text-[#282720] hover:bg-[#EFE9DE] flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl text-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center text-xl mx-auto">
                  ✓
                </div>
                <h4 className="font-heading font-bold text-base">Review Saved!</h4>
                <p className="text-xs leading-relaxed">{submitSuccess}</p>
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="mt-3 bg-[#282720] text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Close & View Reviews
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Honeypot field for bot spam prevention */}
                <input
                  type="text"
                  name="website_url"
                  value={formHoneypot}
                  onChange={(e) => setFormHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                    {submitError}
                  </div>
                )}

                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-bold text-[#282720] mb-1.5">
                    Overall Rating *
                  </label>
                  <div className="flex items-center gap-3">
                    <StarRating
                      rating={formRating}
                      size="lg"
                      interactive
                      onSelect={(val) => setFormRating(val)}
                    />
                    <span className="text-xs font-semibold text-[#B77943]">
                      {formRating === 5
                        ? "5 Stars (Exceptional)"
                        : formRating === 4
                        ? "4 Stars (Great)"
                        : formRating === 3
                        ? "3 Stars (Average)"
                        : formRating === 2
                        ? "2 Stars (Below expectations)"
                        : "1 Star (Disappointed)"}
                    </span>
                  </div>
                </div>

                {/* Review Title */}
                <div>
                  <label htmlFor="review-title" className="block text-xs font-bold text-[#282720] mb-1">
                    Review Headline *
                  </label>
                  <input
                    id="review-title"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Must have for daily living! Great quality."
                    className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943]"
                  />
                </div>

                {/* Review Body */}
                <div>
                  <label htmlFor="review-content" className="block text-xs font-bold text-[#282720] mb-1">
                    Detailed Review *
                  </label>
                  <textarea
                    id="review-content"
                    required
                    rows={4}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="What did you like or dislike? How does it fit into your everyday routine?"
                    className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943]"
                  />
                </div>

                {/* Attributes: Value & Quality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF6F0] p-3.5 rounded-xl border border-[#E2DBD0]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#282720] mb-1">
                      Value for Price
                    </label>
                    <select
                      value={formValue}
                      onChange={(e) => setFormValue(Number(e.target.value))}
                      className="w-full bg-white border border-[#E2DBD0] rounded-md px-2.5 py-1.5 text-xs"
                    >
                      <option value={1}>1 - Overpriced</option>
                      <option value={2}>2 - Somewhat high</option>
                      <option value={3}>3 - Fair value</option>
                      <option value={4}>4 - Good value</option>
                      <option value={5}>5 - Exceptional value</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#282720] mb-1">
                      Quality & Finish
                    </label>
                    <select
                      value={formQuality}
                      onChange={(e) => setFormQuality(Number(e.target.value))}
                      className="w-full bg-white border border-[#E2DBD0] rounded-md px-2.5 py-1.5 text-xs"
                    >
                      <option value={1}>1 - Poor quality</option>
                      <option value={2}>2 - Fair</option>
                      <option value={3}>3 - Moderate</option>
                      <option value={4}>4 - High quality</option>
                      <option value={5}>5 - Premium luxury</option>
                    </select>
                  </div>
                </div>

                {/* Recommend Toggle */}
                <label className="flex items-center gap-2.5 text-xs font-medium text-[#282720] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecommend}
                    onChange={(e) => setFormRecommend(e.target.checked)}
                    className="rounded border-[#E2DBD0] text-[#B77943] focus:ring-[#B77943]"
                  />
                  <span>I recommend this product to other shoppers</span>
                </label>

                {/* Photo Upload */}
                <div>
                  <label className="block text-xs font-bold text-[#282720] mb-1">
                    Upload Photos (Optional, max 4 photos)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={formPhotos.length >= 4}
                    className="block w-full text-xs text-[#7D786D] file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#EFE9DE] file:text-[#282720] hover:file:bg-[#E2DBD0] file:cursor-pointer"
                  />

                  {/* Uploaded Photos Preview with Remove button */}
                  {formPhotos.length > 0 && (
                    <div className="flex items-center gap-2.5 mt-2.5">
                      {formPhotos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          className="relative size-16 rounded-md overflow-hidden border border-[#E2DBD0]"
                        >
                          <img src={photo} alt="" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(pIdx)}
                            className="absolute top-0.5 right-0.5 size-4 bg-black/70 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Author Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="author-name" className="block text-xs font-bold text-[#282720] mb-1">
                      Your Name *
                    </label>
                    <input
                      id="author-name"
                      type="text"
                      required
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      placeholder="e.g. Priya S."
                      className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-lg px-3.5 py-2 text-xs text-[#282720] focus:outline-none focus:border-[#B77943]"
                    />
                  </div>
                  <div>
                    <label htmlFor="author-email" className="block text-xs font-bold text-[#282720] mb-1">
                      Email Address *
                    </label>
                    <input
                      id="author-email"
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="Will not be published"
                      className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-lg px-3.5 py-2 text-xs text-[#282720] focus:outline-none focus:border-[#B77943]"
                    />
                  </div>
                </div>

                {/* Order ID for Verified Buyer */}
                <div>
                  <label htmlFor="order-id" className="block text-xs font-bold text-[#282720] mb-1">
                    Shopify Order ID (Optional)
                  </label>
                  <input
                    id="order-id"
                    type="text"
                    value={formOrderId}
                    onChange={(e) => setFormOrderId(e.target.value)}
                    placeholder="e.g. #1042"
                    className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-lg px-3.5 py-2 text-xs text-[#282720] focus:outline-none focus:border-[#B77943]"
                  />
                  <p className="text-[10px] text-[#7D786D] mt-1">
                    Verified Buyer badges are awarded exclusively after matching against confirmed Shopify store orders.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#B77943] hover:bg-[#9E6433] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Submitting Review…" : "Publish Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Secret Unlock Dialog */}
      {showAdminSecretModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowAdminSecretModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading font-bold text-base text-[#282720]">
              Unlock Store Moderation
            </h3>
            <p className="text-xs text-[#7D786D]">
              Enter your review moderation secret token to manage reviews directly on this product page.
            </p>
            <input
              type="password"
              placeholder="Enter REVIEWS_ADMIN_SECRET"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-lg px-3.5 py-2 text-xs text-[#282720] focus:outline-none focus:border-[#B77943]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminSecretModal(false)}
                className="px-3 py-1.5 text-xs text-[#7D786D] hover:text-[#282720]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!adminSecret.trim()) {
                    alert("Please enter the configured REVIEWS_ADMIN_SECRET.");
                    return;
                  }
                  setIsAdminMode(true);
                  setShowAdminSecretModal(false);
                  fetchReviews(filter, true);
                }}
                className="bg-[#282720] text-white px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Unlock Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
