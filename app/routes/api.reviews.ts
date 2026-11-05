import { data } from "react-router";
import { envContext } from "~/lib/env";
import {
  getProductReviews,
  moderateReview,
  submitReview,
  type NewReviewInput,
  type ReviewFilter,
} from "~/lib/reviews";

import type { Route } from "./+types/api.reviews";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") || "";
  const rating = url.searchParams.get("rating");
  const withMedia = url.searchParams.get("withMedia") === "true";
  const verifiedOnly = url.searchParams.get("verifiedOnly") === "true";
  const sortBy = url.searchParams.get("sortBy") as ReviewFilter["sortBy"];

  const env = context.get(envContext);

  const filter: ReviewFilter = {
    rating: rating ? parseInt(rating, 10) : undefined,
    withMedia,
    verifiedOnly,
    sortBy,
  };

  const result = await getProductReviews(productId, env, filter);
  return data(result, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
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

      // Parse photos if sent as JSON string or multi-field
      if (typeof body.photos === "string") {
        try {
          body.photos = JSON.parse(body.photos);
        } catch {
          body.photos = body.photos ? [body.photos] : [];
        }
      }
    }

    // Handle Moderation Action
    if (body.action === "moderate") {
      const authHeader =
        request.headers.get("X-Admin-Secret") ||
        request.headers.get("Authorization")?.replace("Bearer ", "") ||
        body.adminSecret;

      const modResult = await moderateReview(
        body.reviewId,
        body.status as "approve" | "reject" | "delete",
        authHeader,
        env,
      );
      return data(modResult);
    }

    // Handle Review Submission
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
      valueRating: body.valueRating ? Number(body.valueRating) : 3,
      qualityRating: body.qualityRating ? Number(body.qualityRating) : 3,
    };

    const result = await submitReview(input, env);
    return data(result);
  } catch (error: any) {
    return data(
      {
        success: false,
        error: error.message || "Failed to submit review.",
      },
      { status: 400 },
    );
  }
}

