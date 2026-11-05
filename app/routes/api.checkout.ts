import { gql } from "@shopify/hydrogen";
import { data } from "react-router";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/api.checkout";

const INSTANT_CART_CREATE_MUTATION = gql(`
  mutation InstantCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        discountCodes {
          code
          applicable
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`);

export async function action({ request, context }: Route.ActionArgs) {
  try {
    const storefrontClient = context.get(storefrontClientContext);
    const contentType = request.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    const merchandiseId = String(body.merchandiseId || "").trim();
    const quantity = Math.max(1, parseInt(String(body.quantity || "1"), 10));
    const discountCode = body.discountCode ? String(body.discountCode).trim().toUpperCase() : "";
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod).trim() : "";

    if (!merchandiseId) {
      return data({ error: "Please select a product variant to continue." }, { status: 400 });
    }

    const discountCodes = discountCode ? [discountCode] : [];
    const attributes = paymentMethod
      ? [{ key: "preferred_payment_method", value: paymentMethod }]
      : [];

    const { data: result, errors: gqlErrors } = await storefrontClient.graphql(
      INSTANT_CART_CREATE_MUTATION,
      {
        variables: {
          input: {
            lines: [{ merchandiseId, quantity }],
            discountCodes,
            attributes,
          },
        },
      },
    );

    const cart = result?.cartCreate?.cart;
    const userErrors = result?.cartCreate?.userErrors || [];

    if (cart?.checkoutUrl) {
      const discountApplied = Boolean(
        cart.discountCodes?.some((d) => d.code.toUpperCase() === discountCode && d.applicable),
      );

      return data(
        {
          success: true,
          checkoutUrl: cart.checkoutUrl,
          discountApplied,
          discountCode,
          totalAmount: cart.cost.totalAmount,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    // Fallback: If GraphQL returns user error or no checkoutUrl, construct standard Shopify cart permalink
    const numericVariantId = merchandiseId.replace(/[^0-9]/g, "");
    if (!numericVariantId) {
      const errorMsg = userErrors[0]?.message || gqlErrors?.[0]?.message || "Could not create checkout.";
      return data({ error: errorMsg }, { status: 400 });
    }

    const discountParam = discountCode ? `?discount=${encodeURIComponent(discountCode)}` : "";
    const fallbackPermalink = `/cart/${numericVariantId}:${quantity}${discountParam}`;

    return data(
      {
        success: true,
        checkoutUrl: fallbackPermalink,
        discountApplied: false,
        discountCode,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err: any) {
    return data(
      {
        error: err.message || "An unexpected error occurred while preparing your checkout.",
      },
      { status: 500 },
    );
  }
}

