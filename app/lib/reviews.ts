// ─────────────────────────────────────────────────────────────────────────────
// Grow & Glow Reviews System — Shared Types & Utilities
// Client-safe models, calculations, normalization, and privacy sanitization.
// ─────────────────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  productId: string;
  productHandle?: string;
  productTitle?: string;
  author: string;
  email: string;
  rating: number; // 1 to 5
  title: string;
  content: string;
  recommend: boolean;
  verifiedPurchase: boolean;
  isDemo?: boolean;
  orderId?: string;
  photos: string[];
  valueRating?: number; // 1 to 5: 1=Overpriced, 3=Fair value, 5=Good value
  qualityRating?: number; // 1 to 5: 1=Low, 3=Moderate, 5=Exceptional
  createdAt: string; // ISO date string
  status: "approved" | "pending" | "rejected";
  helpfulCount: number;
};

// Public review representation (email and orderId are strictly stripped for privacy)
export type PublicReview = Omit<Review, "email" | "orderId">;

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  recommendPercent: number;
  allPhotos: Array<{ url: string; reviewId: string; author: string; title: string }>;
  averageValue: number;
  averageQuality: number;
};

export type ReviewFilter = {
  rating?: number;
  withMedia?: boolean;
  verifiedOnly?: boolean;
  sortBy?: "recent" | "rating-high" | "rating-low" | "helpful";
};

export type NewReviewInput = {
  productId: string;
  productHandle?: string;
  productTitle?: string;
  author: string;
  email: string;
  rating: number;
  title: string;
  content: string;
  recommend?: boolean;
  orderId?: string;
  photos?: string[];
  valueRating?: number;
  qualityRating?: number;
  honeypot?: string;
};

/**
 * Strips private customer fields (email, orderId) before sending reviews over the wire
 */
export function sanitizeReviewForPublic(review: Review): PublicReview {
  const { email, orderId, ...publicFields } = review;
  return publicFields;
}

/**
 * Normalizes a Shopify Product ID to a clean string
 * Handles both "gid://shopify/Product/12345678" and "12345678" or handle
 */
export function normalizeProductId(idOrHandle: string): string {
  if (!idOrHandle) return "";
  const match = idOrHandle.match(/Product\/(\d+)/);
  if (match) return match[1];
  return idOrHandle.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Calculates review statistics from a list of approved reviews
 */
export function calculateReviewStats(reviews: Array<Review | PublicReview>): ReviewStats {
  const approved = reviews.filter((r) => r.status === "approved");
  const total = approved.length;

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (total === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: distribution,
      recommendPercent: 0,
      allPhotos: [],
      averageValue: 4,
      averageQuality: 4,
    };
  }

  let ratingSum = 0;
  let recommendCount = 0;
  let valueSum = 0;
  let valueCount = 0;
  let qualitySum = 0;
  let qualityCount = 0;
  const allPhotos: Array<{ url: string; reviewId: string; author: string; title: string }> = [];

  for (const review of approved) {
    const star = Math.max(1, Math.min(5, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    ratingSum += review.rating;

    if (review.recommend) recommendCount += 1;
    if (review.valueRating) {
      valueSum += review.valueRating;
      valueCount += 1;
    }
    if (review.qualityRating) {
      qualitySum += review.qualityRating;
      qualityCount += 1;
    }

    if (review.photos && review.photos.length > 0) {
      for (const photo of review.photos) {
        allPhotos.push({
          url: photo,
          reviewId: review.id,
          author: review.author,
          title: review.title,
        });
      }
    }
  }

  const averageRating = Number((ratingSum / total).toFixed(2));
  const recommendPercent = Math.round((recommendCount / total) * 100);
  const averageValue = valueCount > 0 ? Number((valueSum / valueCount).toFixed(1)) : 4;
  const averageQuality = qualityCount > 0 ? Number((qualitySum / qualityCount).toFixed(1)) : 4;

  return {
    averageRating,
    totalReviews: total,
    ratingDistribution: distribution,
    recommendPercent,
    allPhotos,
    averageValue,
    averageQuality,
  };
}

/**
 * Filter and sort reviews according to user selection
 */
export function filterAndSortReviews<T extends Review | PublicReview>(
  reviews: T[],
  filter?: ReviewFilter,
): T[] {
  let list = [...reviews];

  if (filter?.rating && filter.rating > 0) {
    list = list.filter((r) => Math.round(r.rating) === filter.rating);
  }

  if (filter?.withMedia) {
    list = list.filter((r) => r.photos && r.photos.length > 0);
  }

  if (filter?.verifiedOnly) {
    list = list.filter((r) => r.verifiedPurchase);
  }

  const sortBy = filter?.sortBy || "recent";
  list.sort((a, b) => {
    if (sortBy === "rating-high") return b.rating - a.rating;
    if (sortBy === "rating-low") return a.rating - b.rating;
    if (sortBy === "helpful") return b.helpfulCount - a.helpfulCount;
    // default "recent"
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return list;
}
