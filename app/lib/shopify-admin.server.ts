import type { Env } from "./env";

interface TokenCache {
  token: string;
  expiresAt: number;
}

// In-memory token cache across requests on the same worker isolate
let cachedAdminToken: TokenCache | null = null;

export interface CodOrderInput {
  variantId: string;
  quantity: number;
  unitPrice?: number;
  deliveryFee: number;
  clientTotal: number;
  firstName: string;
  lastName: string;
  phone: string; // 10 digits
  address: string;
  landmark?: string;
  pincode: string; // 6 digits
  city: string;
  state: string;
  email?: string;
  productTitle: string;
  variantTitle?: string;
  productImage?: string;
  idempotencyKey: string;
}

export interface VerifiedCodOrder {
  orderNumber: string;
  shopifyOrderId: string;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  landmark?: string;
  productTitle: string;
  variantTitle?: string;
  productImage?: string;
  quantity: number;
  totalAmount: string;
  deliveryFee: number;
  paymentMethod: string;
  financialStatus: string;
  createdAt: string;
}

export type CreateCodOrderResult =
  | {
      success: true;
      order: VerifiedCodOrder;
      isDuplicatePrevented?: boolean;
    }
  | {
      success: false;
      error: string;
      status: number;
    };

/**
 * Resolves the target myshopify store domain.
 * Falls back to rxvdtk-sn.myshopify.com if unset or in mock.shop mode.
 */
export function getAdminStoreDomain(env?: Env): string {
  const rawStoreDomain =
    env?.PUBLIC_STORE_DOMAIN ||
    (typeof process !== "undefined" ? process.env.PUBLIC_STORE_DOMAIN : "");

  if (rawStoreDomain && !rawStoreDomain.includes("mock.shop")) {
    return rawStoreDomain
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "")
      .trim();
  }

  return "rxvdtk-sn.myshopify.com";
}

/**
 * Obtains an Admin API access token.
 * Supports:
 * 1. Direct static token: SHOPIFY_ADMIN_ACCESS_TOKEN (shpat_... or shpca_...)
 * 2. OAuth 2.0 Client Credentials Grant: SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET
 *    (Standard for apps created in the Shopify Dev Dashboard / dev.shopify.com)
 */
export async function getAdminAccessToken(
  env: Env | undefined,
  storeDomain: string,
  requestId: string,
): Promise<{ token: string } | { error: string; status: number }> {
  // Option 1: Direct token (static or pre-generated)
  const directToken =
    env?.SHOPIFY_ADMIN_ACCESS_TOKEN ||
    (typeof process !== "undefined" ? process.env.SHOPIFY_ADMIN_ACCESS_TOKEN : "");

  if (directToken && directToken.trim()) {
    return { token: directToken.trim() };
  }

  // Option 2: Dev Dashboard App Client Credentials
  const clientId =
    env?.SHOPIFY_ADMIN_CLIENT_ID ||
    (typeof process !== "undefined" ? process.env.SHOPIFY_ADMIN_CLIENT_ID : "");
  const clientSecret =
    env?.SHOPIFY_ADMIN_CLIENT_SECRET ||
    (typeof process !== "undefined" ? process.env.SHOPIFY_ADMIN_CLIENT_SECRET : "");

  if (clientId && clientSecret) {
    const cleanClientId = clientId.trim();
    const cleanClientSecret = clientSecret.trim();

    // Check memory cache
    if (cachedAdminToken && Date.now() < cachedAdminToken.expiresAt) {
      return { token: cachedAdminToken.token };
    }

    console.log(
      `[COD Order ${requestId}] Requesting short-lived Admin token via Client Credentials from https://${storeDomain}/admin/oauth/access_token`,
    );

    try {
      const tokenUrl = `https://${storeDomain}/admin/oauth/access_token`;
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: cleanClientId,
          client_secret: cleanClientSecret,
          grant_type: "client_credentials",
        }),
      });

      const tokenData = (await tokenRes.json().catch(() => null)) as any;

      if (!tokenRes.ok || !tokenData?.access_token) {
        const errorDesc =
          tokenData?.error_description ||
          tokenData?.error ||
          `HTTP status ${tokenRes.status}`;

        console.error(
          `[COD Order ${requestId}] Shopify OAuth token request failed (HTTP ${tokenRes.status}):`,
          errorDesc,
        );

        return {
          error: `Shopify App Authentication Failed (${tokenRes.status}): ${errorDesc}. Ensure Hypecart COD Orders app is installed on ${storeDomain} and SHOPIFY_ADMIN_CLIENT_ID / SHOPIFY_ADMIN_CLIENT_SECRET are configured in Oxygen.`,
          status: tokenRes.status >= 400 && tokenRes.status < 600 ? tokenRes.status : 502,
        };
      }

      const expiresInSec = Number(tokenData.expires_in) || 86400;
      // Buffer renewal 5 minutes before expiration
      const expiresAt = Date.now() + Math.max(60, expiresInSec - 300) * 1000;
      cachedAdminToken = { token: tokenData.access_token, expiresAt };

      console.log(
        `[COD Order ${requestId}] Obtained short-lived Admin token (valid for ${expiresInSec}s)`,
      );

      return { token: tokenData.access_token };
    } catch (err: any) {
      console.error(
        `[COD Order ${requestId}] Network exception during Shopify OAuth token request:`,
        err?.message || err,
      );
      return {
        error: `Failed to communicate with Shopify OAuth endpoint: ${err?.message || "Network error"}`,
        status: 502,
      };
    }
  }

  // Neither credential configuration was found
  console.error(
    `[COD Order ${requestId}] Missing Shopify Admin credentials in environment. (Checked SHOPIFY_ADMIN_ACCESS_TOKEN and SHOPIFY_ADMIN_CLIENT_ID/SECRET)`,
  );

  return {
    error:
      "Shopify Admin API is not configured on this storefront. In Shopify Oxygen production environment variables, configure SHOPIFY_ADMIN_CLIENT_ID and SHOPIFY_ADMIN_CLIENT_SECRET (from your Hypecart COD Orders Dev Dashboard app) and PUBLIC_STORE_DOMAIN.",
    status: 503,
  };
}

/**
 * Checks if an order with this idempotency key was already created in Shopify.
 * This is production-safe across serverless Oxygen instances.
 */
async function findExistingOrderByIdempotencyKey(
  storeDomain: string,
  token: string,
  idempotencyKey: string,
  requestId: string,
): Promise<any | null> {
  try {
    const searchUrl = `https://${storeDomain}/admin/api/2024-10/orders.json?status=any&limit=10&fields=id,name,order_number,total_price,financial_status,created_at,note_attributes,line_items`;
    const res = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
    });

    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as any;
    if (!Array.isArray(data?.orders)) return null;

    for (const order of data.orders) {
      if (Array.isArray(order.note_attributes)) {
        const hasKey = order.note_attributes.some(
          (attr: any) =>
            attr.name === "idempotency_key" && attr.value === idempotencyKey,
        );
        if (hasKey) {
          console.log(
            `[COD Order ${requestId}] Found existing order ${order.name} for idempotencyKey: ${idempotencyKey}`,
          );
          return order;
        }
      }
    }
  } catch (err) {
    console.warn(`[COD Order ${requestId}] Idempotency lookup failed:`, err);
  }
  return null;
}

/**
 * Creates a real Cash on Delivery order in Shopify via the supported Admin REST API.
 */
export async function createShopifyCodOrder(
  env: Env | undefined,
  input: CodOrderInput,
): Promise<CreateCodOrderResult> {
  const requestId = `cod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storeDomain = getAdminStoreDomain(env);

  // 1. Validate Variant ID
  const rawVariantId = input.variantId.trim();
  if (rawVariantId.includes("/Product/")) {
    return {
      success: false,
      error: `Invalid variant ID: Received a Product ID ("${rawVariantId}") instead of a ProductVariant ID. Please reload the product page.`,
      status: 400,
    };
  }

  const numericVariantId = rawVariantId.includes("/")
    ? rawVariantId.split("/").pop()
    : rawVariantId;
  const parsedVariantId = Number(numericVariantId);

  if (!parsedVariantId || isNaN(parsedVariantId)) {
    return {
      success: false,
      error: `Invalid Shopify variant ID: "${rawVariantId}". Cannot create order.`,
      status: 400,
    };
  }

  // 2. Obtain Admin API Access Token
  const authResult = await getAdminAccessToken(env, storeDomain, requestId);
  if ("error" in authResult) {
    return {
      success: false,
      error: authResult.error,
      status: authResult.status,
    };
  }
  const adminToken = authResult.token;

  // 3. Serverless Idempotency Check (Check Shopify directly for existing order)
  const existingOrder = await findExistingOrderByIdempotencyKey(
    storeDomain,
    adminToken,
    input.idempotencyKey,
    requestId,
  );

  if (existingOrder) {
    const verifiedRecord: VerifiedCodOrder = {
      orderNumber: existingOrder.name || `#${existingOrder.order_number}`,
      shopifyOrderId: String(existingOrder.id),
      name: `${input.firstName} ${input.lastName}`,
      phone: input.phone,
      address: input.address,
      pincode: input.pincode,
      city: input.city,
      state: input.state,
      landmark: input.landmark,
      productTitle: existingOrder.line_items?.[0]?.title || input.productTitle,
      variantTitle: existingOrder.line_items?.[0]?.variant_title || input.variantTitle,
      productImage: input.productImage,
      quantity: input.quantity,
      totalAmount: existingOrder.total_price || String(input.clientTotal),
      deliveryFee: input.deliveryFee,
      paymentMethod: "Cash on Delivery (COD)",
      financialStatus: existingOrder.financial_status || "pending",
      createdAt: existingOrder.created_at || new Date().toISOString(),
    };

    return {
      success: true,
      order: verifiedRecord,
      isDuplicatePrevented: true,
    };
  }

  // 4. Build Shopify Admin Order Payload
  const shippingCharge =
    input.deliveryFee > 0
      ? input.deliveryFee
      : input.clientTotal >= 999
        ? 0
        : 49;

  const lineItemObj: any = {
    variant_id: parsedVariantId,
    quantity: input.quantity,
  };
  if (input.unitPrice && input.unitPrice > 0) {
    lineItemObj.price = input.unitPrice.toFixed(2);
  }

  const shopifyOrderPayload = {
    order: {
      line_items: [lineItemObj],
      customer: {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email || undefined,
        phone: `+91${input.phone}`,
      },
      billing_address: {
        first_name: input.firstName,
        last_name: input.lastName,
        address1: input.address,
        address2: input.landmark || undefined,
        city: input.city,
        province: input.state,
        zip: input.pincode,
        country: "India",
        country_code: "IN",
        phone: `+91${input.phone}`,
      },
      shipping_address: {
        first_name: input.firstName,
        last_name: input.lastName,
        address1: input.address,
        address2: input.landmark || undefined,
        city: input.city,
        province: input.state,
        zip: input.pincode,
        country: "India",
        country_code: "IN",
        phone: `+91${input.phone}`,
      },
      shipping_lines: [
        {
          title:
            shippingCharge === 0
              ? "Free Pan-India Delivery"
              : "Standard COD Express Delivery",
          price: shippingCharge.toFixed(2),
          code: shippingCharge === 0 ? "FREE_DELIVERY" : "STANDARD_COD",
        },
      ],
      // Financial status for Cash on Delivery must remain pending until delivery & collection
      financial_status: "pending",
      payment_gateway_names: ["Cash on Delivery (COD)"],
      note: input.landmark
        ? `Landmark: ${input.landmark} | Ordered via Grow & Glow Direct Cash on Delivery Form`
        : "Ordered via Grow & Glow Direct Cash on Delivery Form",
      tags: "Cash on Delivery, COD, Direct Form, Grow & Glow",
      note_attributes: [
        { name: "idempotency_key", value: input.idempotencyKey },
        { name: "payment_method", value: "Cash on Delivery" },
        { name: "channel", value: "Hydrogen Oxygen Storefront" },
      ],
      inventory_behaviour: "decrement_ignoring_policy",
    },
  };

  const shopifyAdminUrl = `https://${storeDomain}/admin/api/2024-10/orders.json`;

  console.log(
    `[COD Order ${requestId}] Sending POST orders.json to https://${storeDomain} (variantId: ${parsedVariantId}, qty: ${input.quantity})`,
  );

  const shopifyResponse = await fetch(shopifyAdminUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify(shopifyOrderPayload),
  });

  const shopifyResult = (await shopifyResponse.json().catch(() => null)) as any;

  // 5. Handle Shopify API Error
  if (!shopifyResponse.ok || !shopifyResult?.order) {
    let detailedError = "Shopify rejected the order creation.";
    if (shopifyResult?.errors) {
      if (typeof shopifyResult.errors === "string") {
        detailedError = shopifyResult.errors;
      } else {
        detailedError = Object.entries(shopifyResult.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join("; ");
      }
    }

    console.error(
      `[COD Order ${requestId}] Shopify Admin rejected order creation (HTTP ${shopifyResponse.status}):`,
      detailedError,
    );

    return {
      success: false,
      error: `Shopify Order Creation Failed (${shopifyResponse.status}): ${detailedError}`,
      status:
        shopifyResponse.status >= 400 && shopifyResponse.status < 600
          ? shopifyResponse.status
          : 502,
    };
  }

  // 6. Confirmed Real Shopify Order
  const shopifyOrder = shopifyResult.order;
  const realOrderNumber = shopifyOrder.name || `#${shopifyOrder.order_number}`;
  const realShopifyId = String(shopifyOrder.id);
  const confirmedTotal = shopifyOrder.total_price || String(input.clientTotal);

  console.log(
    `[COD Order ${requestId}] SUCCESS! Real Shopify Order Created: ${realOrderNumber} (ID: ${realShopifyId})`,
  );

  const verifiedRecord: VerifiedCodOrder = {
    orderNumber: realOrderNumber,
    shopifyOrderId: realShopifyId,
    name: `${input.firstName} ${input.lastName}`,
    phone: input.phone,
    address: input.address,
    pincode: input.pincode,
    city: input.city,
    state: input.state,
    landmark: input.landmark || undefined,
    productTitle: shopifyOrder.line_items?.[0]?.title || input.productTitle,
    variantTitle: shopifyOrder.line_items?.[0]?.variant_title || input.variantTitle || undefined,
    productImage: input.productImage || undefined,
    quantity: input.quantity,
    totalAmount: confirmedTotal,
    deliveryFee: shippingCharge,
    paymentMethod: "Cash on Delivery (COD)",
    financialStatus: shopifyOrder.financial_status || "pending",
    createdAt: shopifyOrder.created_at || new Date().toISOString(),
  };

  return {
    success: true,
    order: verifiedRecord,
  };
}

