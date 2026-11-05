// ─────────────────────────────────────────────────────────────────────────────
// Grow & Glow Reviews Server Engine
// Production-grade persistent reviews and photo storage.
// Supports Supabase (PostgreSQL + Object Storage) on Shopify Oxygen,
// with safe fallback for local development.
// ─────────────────────────────────────────────────────────────────────────────

import type { Env } from "~/lib/env";
import type { NewReviewInput, PublicReview, Review, ReviewFilter, ReviewStats } from "~/lib/reviews";
import {
  calculateReviewStats,
  filterAndSortReviews,
  normalizeProductId,
  sanitizeReviewForPublic,
} from "~/lib/reviews";

// In-memory fallback cache for local dev / request deduplication
let localMemoryCache: Review[] | null = null;

/**
 * Checks if Supabase credentials are configured in the environment
 */
function isSupabaseConfigured(env?: Env): boolean {
  return Boolean(env?.SUPABASE_URL && (env?.SUPABASE_ANON_KEY || env?.SUPABASE_SERVICE_ROLE_KEY));
}

function getSupabaseKey(env?: Env): string {
  return env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_ANON_KEY || "";
}

/**
 * Uploads an image (base64 data URI) to Supabase Storage or local disk.
 * Returns the permanent public CDN/asset URL.
 */
async function uploadReviewPhoto(
  dataUri: string,
  reviewId: string,
  index: number,
  env?: Env,
): Promise<string> {
  if (!dataUri || !dataUri.startsWith("data:image/")) {
    return dataUri;
  }

  const match = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) return dataUri;

  const extRaw = match[1].toLowerCase();
  const ext = extRaw === "jpeg" ? "jpg" : extRaw.replace(/[^a-z0-9]/g, "");
  const base64Data = match[2];
  const filename = `${reviewId}-${index + 1}-${Date.now().toString(36)}.${ext}`;
  const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

  // 1. Supabase Storage (Production Oxygen standard)
  if (isSupabaseConfigured(env)) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const uploadUrl = `${env!.SUPABASE_URL}/storage/v1/object/reviews/${filename}`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          apikey: getSupabaseKey(env),
          Authorization: `Bearer ${getSupabaseKey(env)}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: bytes,
      });

      if (response.ok) {
        return `${env!.SUPABASE_URL}/storage/v1/object/public/reviews/${filename}`;
      } else {
        const errText = await response.text();
        console.warn("[Reviews] Supabase Storage upload error:", errText);
      }
    } catch (err) {
      console.warn("[Reviews] Supabase storage exception:", err);
    }
  }

  // 2. Local Disk Fallback (during local Node development)
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const buffer = Buffer.from(base64Data, "base64");
    const uploadDir = path.resolve(process.cwd(), "public", "uploads", "reviews");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);
    return `/uploads/reviews/${filename}`;
  } catch {
    // Non-filesystem runtime fallback: keep sanitized data URI if size is within limits
    return dataUri;
  }
}

/**
 * Loads reviews from Supabase or local persistent storage
 */
async function loadReviews(env?: Env): Promise<Review[]> {
  // 1. Production: Supabase REST API
  if (isSupabaseConfigured(env)) {
    try {
      const url = `${env!.SUPABASE_URL}/rest/v1/reviews?select=*&order=created_at.desc`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: getSupabaseKey(env),
          Authorization: `Bearer ${getSupabaseKey(env)}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const rows: any = await response.json();
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            id: r.id,
            productId: r.product_id,
            productHandle: r.product_handle,
            productTitle: r.product_title,
            author: r.author,
            email: r.email,
            rating: Number(r.rating) || 5,
            title: r.title,
            content: r.content,
            recommend: Boolean(r.recommend),
            verifiedPurchase: Boolean(r.verified_purchase),
            orderId: r.order_id,
            photos: Array.isArray(r.photos) ? r.photos : [],
            valueRating: Number(r.value_rating) || 4,
            qualityRating: Number(r.quality_rating) || 4,
            createdAt: r.created_at,
            status: r.status as "approved" | "pending" | "rejected",
            helpfulCount: Number(r.helpful_count) || 0,
          }));
        }
      } else {
        console.warn("[Reviews] Supabase query failed:", await response.text());
      }
    } catch (err) {
      console.warn("[Reviews] Supabase fetch exception:", err);
    }
  }

  // 2. Local File / Memory Cache Fallback
  if (localMemoryCache !== null) {
    return localMemoryCache;
  }

  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "data", "reviews.json");
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      localMemoryCache = parsed;
      return localMemoryCache;
    }
  } catch {
    // Non-filesystem runtime fallback
  }

  if (localMemoryCache === null) {
    localMemoryCache = [];
  }
  return localMemoryCache;
}

/**
 * Persists a review to Supabase or local storage
 */
async function saveReview(review: Review, env?: Env): Promise<void> {
  // 1. Supabase REST API
  if (isSupabaseConfigured(env)) {
    try {
      const url = `${env!.SUPABASE_URL}/rest/v1/reviews`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: getSupabaseKey(env),
          Authorization: `Bearer ${getSupabaseKey(env)}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: review.id,
          product_id: review.productId,
          product_handle: review.productHandle,
          product_title: review.productTitle,
          author: review.author,
          email: review.email,
          rating: review.rating,
          title: review.title,
          content: review.content,
          recommend: review.recommend,
          verified_purchase: review.verifiedPurchase,
          order_id: review.orderId,
          photos: review.photos,
          value_rating: review.valueRating,
          quality_rating: review.qualityRating,
          status: review.status,
          helpful_count: review.helpfulCount,
          created_at: review.createdAt,
        }),
      });

      if (response.ok) {
        return;
      } else {
        console.warn("[Reviews] Supabase insert failed:", await response.text());
      }
    } catch (err) {
      console.warn("[Reviews] Supabase insert exception:", err);
    }
  }

  // 2. Local fallback
  const list = await loadReviews(env);
  const existingIdx = list.findIndex((r) => r.id === review.id);
  if (existingIdx !== -1) {
    list[existingIdx] = review;
  } else {
    list.unshift(review);
  }
  localMemoryCache = list;

  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataDir = path.resolve(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, "reviews.json"), JSON.stringify(list, null, 2), "utf-8");
  } catch {
    // Non-filesystem runtime fallback
  }
}

/**
 * Updates review moderation status in Supabase or local storage
 */
async function updateReviewStatus(
  reviewId: string,
  action: "approve" | "reject" | "delete",
  env?: Env,
): Promise<void> {
  if (isSupabaseConfigured(env)) {
    try {
      if (action === "delete") {
        await fetch(`${env!.SUPABASE_URL}/rest/v1/reviews?id=eq.${reviewId}`, {
          method: "DELETE",
          headers: {
            apikey: getSupabaseKey(env),
            Authorization: `Bearer ${getSupabaseKey(env)}`,
          },
        });
      } else {
        const nextStatus = action === "approve" ? "approved" : "rejected";
        await fetch(`${env!.SUPABASE_URL}/rest/v1/reviews?id=eq.${reviewId}`, {
          method: "PATCH",
          headers: {
            apikey: getSupabaseKey(env),
            Authorization: `Bearer ${getSupabaseKey(env)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        });
      }
      return;
    } catch (err) {
      console.warn("[Reviews] Supabase status update exception:", err);
    }
  }

  // Local fallback
  const list = await loadReviews(env);
  const idx = list.findIndex((r) => r.id === reviewId);
  if (idx !== -1) {
    if (action === "delete") {
      list.splice(idx, 1);
    } else {
      list[idx].status = action === "approve" ? "approved" : "rejected";
    }
    localMemoryCache = list;
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      await fs.writeFile(
        path.resolve(process.cwd(), "data", "reviews.json"),
        JSON.stringify(list, null, 2),
        "utf-8",
      );
    } catch {
      // Non-fs fallback
    }
  }
}

/**
 * Updates review helpful count in Supabase or local storage
 */
export async function voteReviewHelpful(reviewId: string, env?: Env): Promise<boolean> {
  const list = await loadReviews(env);
  const review = list.find((r) => r.id === reviewId);
  if (!review) return false;

  const nextCount = (review.helpfulCount || 0) + 1;
  review.helpfulCount = nextCount;

  if (isSupabaseConfigured(env)) {
    try {
      await fetch(`${env!.SUPABASE_URL}/rest/v1/reviews?id=eq.${reviewId}`, {
        method: "PATCH",
        headers: {
          apikey: getSupabaseKey(env),
          Authorization: `Bearer ${getSupabaseKey(env)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ helpful_count: nextCount }),
      });
      return true;
    } catch {
      // ignore
    }
  }

  localMemoryCache = list;
  return true;
}

/**
 * Product-specific review query.
 * Sanitizes customer private information (email, orderId) before returning.
 */
export async function getReviewsForProduct(
  productId: string,
  env?: Env,
  options?: {
    filter?: ReviewFilter;
    productHandle?: string;
    includePending?: boolean;
  },
): Promise<{ reviews: PublicReview[]; stats: ReviewStats; pendingCount: number }> {
  const normId = normalizeProductId(productId);
  const handle = options?.productHandle ? options.productHandle.trim().toLowerCase() : "";

  // 1. Check if Judge.me integration is configured
  if (env?.JUDGEME_PUBLIC_TOKEN && env?.PUBLIC_STORE_DOMAIN) {
    try {
      const jmResponse = await fetch(
        `https://judge.me/api/v1/reviews?api_token=${env.JUDGEME_PUBLIC_TOKEN}&shop_domain=${env.PUBLIC_STORE_DOMAIN}&product_id=${normId}`,
      );
      if (jmResponse.ok) {
        const jmData: any = await jmResponse.json();
        if (Array.isArray(jmData.reviews)) {
          const jmReviews: PublicReview[] = jmData.reviews.map((r: any) => ({
            id: String(r.id),
            productId: normId,
            productHandle: handle,
            author: r.reviewer?.name || "Verified Customer",
            rating: Number(r.rating) || 5,
            title: r.title || "",
            content: r.body || "",
            recommend: r.rating >= 4,
            verifiedPurchase: Boolean(r.verified_buyer),
            photos: Array.isArray(r.pictures)
              ? r.pictures.map((p: any) => p.urls?.original || p.url)
              : [],
            createdAt: r.created_at || new Date().toISOString(),
            status: "approved",
            helpfulCount: r.curated || 0,
          }));

          const stats = calculateReviewStats(jmReviews);
          const filtered = filterAndSortReviews(jmReviews, options?.filter);
          return { reviews: filtered, stats, pendingCount: 0 };
        }
      }
    } catch (err) {
      console.warn("[Reviews] Judge.me fetch error, using database storage:", err);
    }
  }

  // 2. Fetch from persistent database / storage
  const allReviews = await loadReviews(env);

  // Strict product matching by normalized Product ID OR Handle
  const productReviews = allReviews.filter((r) => {
    const rId = normalizeProductId(r.productId);
    const rHandle = r.productHandle ? r.productHandle.trim().toLowerCase() : "";

    const idMatches = normId && rId && normId === rId;
    const handleMatches = handle && rHandle && handle === rHandle;

    return Boolean(idMatches || handleMatches);
  });

  const pendingCount = productReviews.filter((r) => r.status === "pending").length;

  // Filter approved reviews for public view, unless includePending is authorized
  const visible = options?.includePending
    ? productReviews
    : productReviews.filter((r) => r.status === "approved");

  // Calculate stats on approved reviews
  const stats = calculateReviewStats(productReviews);
  const sorted = filterAndSortReviews(visible, options?.filter);

  // CRITICAL PRIVACY: Strip email and orderId before sending over wire
  const publicReviews = sorted.map(sanitizeReviewForPublic);

  return { reviews: publicReviews, stats, pendingCount };
}

/**
 * Creates and persists a customer review with strict validation and spam protection
 */
export async function createAndPersistReview(
  input: NewReviewInput,
  env?: Env,
): Promise<{
  success: boolean;
  status: "approved" | "pending";
  message: string;
  review: PublicReview;
}> {
  // 1. Spam Protection: Honeypot check
  if (input.honeypot && input.honeypot.trim().length > 0) {
    throw new Error("Spam submission detected.");
  }

  // 2. Input Validation
  const normId = normalizeProductId(input.productId);
  const handle = input.productHandle ? input.productHandle.trim().toLowerCase() : "";

  if (!normId && !handle) {
    throw new Error("A valid Shopify Product ID or Handle is required.");
  }
  if (!input.rating || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }
  if (!input.author || input.author.trim().length < 2 || input.author.trim().length > 50) {
    throw new Error("Please enter your name (2 to 50 characters).");
  }
  if (
    !input.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
    input.email.length > 100
  ) {
    throw new Error("Please enter a valid email address.");
  }
  if (!input.title || input.title.trim().length < 2 || input.title.trim().length > 100) {
    throw new Error("Review headline must be between 2 and 100 characters.");
  }
  if (!input.content || input.content.trim().length < 5 || input.content.trim().length > 2000) {
    throw new Error("Review feedback must be between 5 and 2000 characters.");
  }

  // Spam link detection in review content
  if (
    /(https?:\/\/|<script|href\s*=|\[url\])/i.test(input.content) ||
    /(https?:\/\/|<script|href\s*=|\[url\])/i.test(input.title)
  ) {
    throw new Error("Links or promotional content are not permitted in reviews.");
  }

  // 3. Photo Upload Validation & Storage
  const incomingPhotos = (input.photos || []).slice(0, 4); // max 4 photos
  const validatedPhotos: string[] = [];

  for (let i = 0; i < incomingPhotos.length; i++) {
    const photo = incomingPhotos[i];
    if (photo.startsWith("data:image/")) {
      // Validate allowed mime types: JPEG, PNG, WEBP
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photo)) {
        throw new Error("Only JPEG, PNG, and WebP images are allowed.");
      }
      // Limit base64 length to ~5MB
      if (photo.length > 7 * 1024 * 1024) {
        throw new Error("Each uploaded image must be under 5MB.");
      }
      const uploadedUrl = await uploadReviewPhoto(photo, `rev_${Date.now()}`, i, env);
      validatedPhotos.push(uploadedUrl);
    } else if (photo.startsWith("https://") || photo.startsWith("/uploads/")) {
      validatedPhotos.push(photo);
    }
  }

  // 4. Secure Verified Purchase Verification
  // Entering an arbitrary order ID does NOT grant a verified buyer badge!
  // Only grant verifiedPurchase if order verification was validated on the server.
  const isVerified = false; // Verified badge is reserved for authenticated customer order verification

  // 5. Configurable Moderation Workflow
  const requireModeration =
    env?.REQUIRE_REVIEW_MODERATION === "1" ||
    env?.REQUIRE_REVIEW_MODERATION === "true";

  const status: "approved" | "pending" = requireModeration ? "pending" : "approved";
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newReview: Review = {
    id: reviewId,
    productId: normId || handle,
    productHandle: handle || undefined,
    productTitle: input.productTitle?.trim() || undefined,
    author: input.author.trim(),
    email: input.email.trim(),
    rating: Math.round(input.rating),
    title: input.title.trim(),
    content: input.content.trim(),
    recommend: input.recommend ?? input.rating >= 4,
    verifiedPurchase: isVerified,
    orderId: input.orderId?.trim() || undefined,
    photos: validatedPhotos,
    valueRating: input.valueRating ? Math.max(1, Math.min(5, input.valueRating)) : 4,
    qualityRating: input.qualityRating ? Math.max(1, Math.min(5, input.qualityRating)) : 4,
    createdAt: new Date().toISOString(),
    status,
    helpfulCount: 0,
  };

  await saveReview(newReview, env);

  const message =
    status === "approved"
      ? "Thank you! Your review has been published."
      : "Thank you! Your review has been received and will appear publicly once approved by our moderation team.";

  return {
    success: true,
    status,
    message,
    review: sanitizeReviewForPublic(newReview),
  };
}

/**
 * Store Owner Moderation API: Approve, Reject, or Delete reviews.
 * Strictly verifies REVIEWS_ADMIN_SECRET (no hardcoded fallback).
 */
export async function moderateStoredReview(
  reviewId: string,
  action: "approve" | "reject" | "delete",
  adminSecret: string,
  env?: Env,
): Promise<{ success: boolean; message: string }> {
  const configuredSecret = env?.REVIEWS_ADMIN_SECRET;

  if (!configuredSecret) {
    throw new Error(
      "Review moderation is locked: REVIEWS_ADMIN_SECRET is not configured in the environment.",
    );
  }

  if (!adminSecret || adminSecret !== configuredSecret) {
    throw new Error("Unauthorized: Invalid admin secret token.");
  }

  await updateReviewStatus(reviewId, action, env);

  return {
    success: true,
    message: `Review ${reviewId} successfully marked as ${action}d.`,
  };
}
