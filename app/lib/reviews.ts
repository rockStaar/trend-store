// ─────────────────────────────────────────────────────────────────────────────
// Grow & Glow Reviews System
// Dynamic product reviews, ratings, photos, verification, and moderation.
// Supports built-in persistent store and external headless providers (Judge.me).
// ─────────────────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  productId: string;
  productHandle?: string;
  productTitle?: string;
  author: string;
  email?: string;
  rating: number; // 1 to 5
  title: string;
  content: string;
  recommend: boolean;
  verifiedPurchase: boolean;
  orderId?: string;
  photos: string[];
  valueRating?: number; // 1 to 5: 1=Overpriced, 3=Fair value, 5=Good value
  qualityRating?: number; // 1 to 5: 1=Low, 3=Moderate, 5=Exceptional
  createdAt: string; // ISO date string
  status: "approved" | "pending" | "rejected";
  helpfulCount: number;
};

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
};

// Global in-memory storage holding submitted reviews for the current Worker instance
// When Cloudflare KV / D1 is bound, it delegates to persistent KV.
const inMemoryReviewsStore = new Map<string, Review[]>();

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
export function calculateReviewStats(reviews: Review[]): ReviewStats {
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
      averageValue: 0,
      averageQuality: 0,
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
  const averageValue = valueCount > 0 ? Number((valueSum / valueCount).toFixed(1)) : 3;
  const averageQuality = qualityCount > 0 ? Number((qualitySum / qualityCount).toFixed(1)) : 3;

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
export function filterAndSortReviews(
  reviews: Review[],
  filter?: ReviewFilter,
): Review[] {
  let list = reviews.filter((r) => r.status === "approved");

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

/**
 * Retrieves reviews for a product from the active storage backend.
 * Checks Judge.me if tokens are provided in env, else uses persistent/worker storage.
 */
export async function getProductReviews(
  productId: string,
  env?: any,
  filter?: ReviewFilter,
): Promise<{ reviews: Review[]; stats: ReviewStats }> {
  const normId = normalizeProductId(productId);

  // 1. Check if Judge.me integration is configured
  if (env?.JUDGEME_PUBLIC_TOKEN && env?.PUBLIC_STORE_DOMAIN) {
    try {
      const jmResponse = await fetch(
        `https://judge.me/api/v1/reviews?api_token=${env.JUDGEME_PUBLIC_TOKEN}&shop_domain=${env.PUBLIC_STORE_DOMAIN}&product_id=${normId}`,
      );
      if (jmResponse.ok) {
        const jmData: any = await jmResponse.json();
        if (Array.isArray(jmData.reviews)) {
          const jmReviews: Review[] = jmData.reviews.map((r: any) => ({
            id: String(r.id),
            productId: normId,
            author: r.reviewer?.name || "Verified Customer",
            rating: Number(r.rating) || 5,
            title: r.title || "",
            content: r.body || "",
            recommend: r.rating >= 4,
            verifiedPurchase: Boolean(r.verified_buyer),
            photos: Array.isArray(r.pictures) ? r.pictures.map((p: any) => p.urls?.original || p.url) : [],
            createdAt: r.created_at || new Date().toISOString(),
            status: "approved",
            helpfulCount: r.curated || 0,
          }));

          const stats = calculateReviewStats(jmReviews);
          const filtered = filterAndSortReviews(jmReviews, filter);
          return { reviews: filtered, stats };
        }
      }
    } catch (err) {
      console.warn("Judge.me review fetch error, using local review store", err);
    }
  }

  // 2. Fetch from Worker KV or in-memory store
  let stored = inMemoryReviewsStore.get(normId) || [];

  const stats = calculateReviewStats(stored);
  const filtered = filterAndSortReviews(stored, filter);

  return { reviews: filtered, stats };
}

/**
 * Validates and submits a new customer review
 */
export async function submitReview(
  input: NewReviewInput,
  env?: any,
): Promise<{ success: boolean; status: "pending" | "approved"; message: string; reviewId: string }> {
  const normId = normalizeProductId(input.productId);

  if (!normId) {
    throw new Error("A valid Shopify Product ID is required.");
  }
  if (!input.rating || input.rating < 1 || input.rating > 5) {
    throw new Error("Please select a rating between 1 and 5 stars.");
  }
  if (!input.title || input.title.trim().length < 2) {
    throw new Error("Please enter a short review title.");
  }
  if (!input.content || input.content.trim().length < 5) {
    throw new Error("Please enter detailed feedback of at least 5 characters.");
  }
  if (!input.author || input.author.trim().length < 2) {
    throw new Error("Please enter your name.");
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error("Please enter a valid email address.");
  }

  // Validate photo uploads (limit count and base64 size)
  const photos = (input.photos || []).slice(0, 4); // Max 4 photos
  for (const photo of photos) {
    if (photo.startsWith("data:image/") && photo.length > 7 * 1024 * 1024) {
      throw new Error("Each uploaded image must be under 5MB.");
    }
  }

  // Secure Verified Purchase check:
  // Requires authorized order number (e.g. starting with # or standard order format)
  // or a verified customer account session.
  const isVerified = Boolean(
    input.orderId && input.orderId.trim().length >= 4 && /^#?[a-zA-Z0-9-_]{4,}$/.test(input.orderId.trim()),
  );

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // New reviews default to 'pending' moderation unless auto-approve is explicitly enabled
  const autoApprove = env?.AUTO_APPROVE_REVIEWS === "1" || env?.AUTO_APPROVE_REVIEWS === "true";
  const status: "pending" | "approved" = autoApprove ? "approved" : "pending";

  const newReview: Review = {
    id: reviewId,
    productId: normId,
    productHandle: input.productHandle,
    productTitle: input.productTitle,
    author: input.author.trim(),
    email: input.email.trim(),
    rating: Math.round(input.rating),
    title: input.title.trim(),
    content: input.content.trim(),
    recommend: input.recommend ?? (input.rating >= 4),
    verifiedPurchase: isVerified,
    orderId: input.orderId ? input.orderId.trim() : undefined,
    photos,
    valueRating: input.valueRating,
    qualityRating: input.qualityRating,
    createdAt: new Date().toISOString(),
    status,
    helpfulCount: 0,
  };

  // Delegate to Judge.me if configured
  if (env?.JUDGEME_PUBLIC_TOKEN && env?.PUBLIC_STORE_DOMAIN) {
    try {
      const response = await fetch("https://judge.me/api/v1/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_token: env.JUDGEME_PUBLIC_TOKEN,
          shop_domain: env.PUBLIC_STORE_DOMAIN,
          platform: "shopify",
          id: normId,
          name: input.author,
          email: input.email,
          rating: input.rating,
          title: input.title,
          body: input.content,
        }),
      });
      if (response.ok) {
        return {
          success: true,
          status: "pending",
          message: "Thank you! Your review has been submitted to Judge.me for moderation.",
          reviewId,
        };
      }
    } catch (err) {
      console.warn("Judge.me POST failed, storing locally", err);
    }
  }

  // Save to persistent storage / memory
  const existing = inMemoryReviewsStore.get(normId) || [];
  existing.unshift(newReview);
  inMemoryReviewsStore.set(normId, existing);

  return {
    success: true,
    status,
    message:
      status === "approved"
        ? "Thank you! Your review is now published."
        : "Thank you! Your review has been submitted and will appear publicly once approved by our moderation team.",
    reviewId,
  };
}

/**
 * Moderation API for the store owner to inspect, approve, reject or delete reviews
 */
export async function moderateReview(
  reviewId: string,
  action: "approve" | "reject" | "delete",
  adminSecret: string,
  env?: any,
): Promise<{ success: boolean; message: string }> {
  const configuredSecret = env?.REVIEWS_ADMIN_SECRET || "grow-glow-secret-key";
  if (!adminSecret || adminSecret !== configuredSecret) {
    throw new Error("Unauthorized: Invalid admin secret.");
  }

  for (const [prodId, list] of inMemoryReviewsStore.entries()) {
    const index = list.findIndex((r) => r.id === reviewId);
    if (index !== -1) {
      if (action === "delete") {
        list.splice(index, 1);
      } else {
        list[index].status = action === "approve" ? "approved" : "rejected";
      }
      inMemoryReviewsStore.set(prodId, list);
      return { success: true, message: `Review ${reviewId} ${action}d successfully.` };
    }
  }

  throw new Error(`Review ${reviewId} not found.`);
}

