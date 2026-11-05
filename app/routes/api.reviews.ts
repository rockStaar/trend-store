import { data } from "react-router";
import { envContext } from "~/lib/env";
import type { NewReviewInput, ReviewFilter } from "~/lib/reviews";
import {
  createAndPersistReview,
  getReviewsForProduct,
  moderateStoredReview,
  voteReviewHelpful,
} from "~/lib/reviews.server";

import type { Route } from "./+types/api.reviews";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") || "";
  const handle = url.searchParams.get("handle") || "";
  const rating = url.searchParams.get("rating");
  const withMedia = url.searchParams.get("withMedia") === "true";
  const verifiedOnly = url.searchParams.get("verifiedOnly") === "true";
  const sortBy = url.searchParams.get("sortBy") as ReviewFilter["sortBy"];
  const includePending = url.searchParams.get("includePending") === "true";

  const env = context.get(envContext);

  const filter: ReviewFilter = {
    rating: rating ? parseInt(rating, 10) : undefined,
    withMedia,
    verifiedOnly,
    sortBy,
  };

  const result = await getReviewsForProduct(productId, env, {
    filter,
    productHandle: handle,
    includePending,
  });

  return data(result, {
    headers: {
      "Cache-Control": includePending
        ? "no-store, no-cache"
        : "public, max-age=60, stale-while-revalidate=300",
      "Vary": "Accept-Encoding",
    },
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.get(envContext);

  try {
    const contentType = request.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());

      if (typeof body.photos === "string") {
        try {
          body.photos = JSON.parse(body.photos);
        } catch {
          body.photos = body.photos ? [body.photos] : [];
        }
      }
    }

    // 1. Handle Helpful Upvote Action
    if (body.action === "voteHelpful") {
      const success = await voteReviewHelpful(String(body.reviewId), env);
      return data({ success });
    }

    // 2. Handle Moderation Action
    if (body.action === "moderate") {
      const authHeader =
        request.headers.get("X-Admin-Secret") ||
        request.headers.get("Authorization")?.replace("Bearer ", "") ||
        body.adminSecret;

      const modResult = await moderateStoredReview(
        String(body.reviewId),
        body.status as "approve" | "reject" | "delete",
        String(authHeader || ""),
        env,
      );
      return data(modResult);
    }

    // 3. Handle Review Submission with Spam Honeypot Check
    const input: NewReviewInput = {
      productId: String(body.productId || ""),
      productHandle: body.productHandle ? String(body.productHandle) : undefined,
      productTitle: body.productTitle ? String(body.productTitle) : undefined,
      author: String(body.author || ""),
      email: String(body.email || ""),
      rating: Number(body.rating) || 5,
      title: String(body.title || ""),
      content: String(body.content || ""),
      recommend: body.recommend === "true" || body.recommend === true,
      orderId: body.orderId ? String(body.orderId) : undefined,
      photos: Array.isArray(body.photos) ? body.photos : [],
      valueRating: body.valueRating ? Number(body.valueRating) : 4,
      qualityRating: body.qualityRating ? Number(body.qualityRating) : 4,
      honeypot: body.website_url || body.honeypot ? String(body.website_url || body.honeypot) : undefined,
    };

    const result = await createAndPersistReview(input, env);
    return data(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    return data(
      {
        success: false,
        error: error.message || "Failed to process review action.",
      },
      { status: 400 },
    );
  }
}
