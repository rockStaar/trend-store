import { data } from "react-router";
import { envContext } from "~/lib/env";
import type { Route } from "./+types/api.cod-order";

// In-memory idempotency cache to prevent duplicate orders on double-clicks or retries
interface CachedOrder {
  orderNumber: string;
  shopifyOrderId: string;
  totalAmount: string;
  createdAt: number;
  orderRecord: any;
}
const idempotencyCache = new Map<string, CachedOrder>();

// Cleanup stale idempotency records older than 15 minutes
function pruneIdempotencyCache() {
  const now = Date.now();
  for (const [key, cached] of idempotencyCache.entries()) {
    if (now - cached.createdAt > 15 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  try {
    const env = context.get(envContext);
    const contentType = request.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    const variantId = String(body.variantId || "").trim();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const name = String(body.name || `${firstName} ${lastName}`).trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const address = String(body.address || "").trim();
    const pincode = String(body.pincode || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const landmark = String(body.landmark || "").trim();
    const productTitle = String(body.productTitle || "Grow & Glow Discovery").trim();
    const variantTitle = String(body.variantTitle || "").trim();
    const productImage = String(body.productImage || "").trim();
    const quantity = Math.max(1, parseInt(String(body.quantity || "1"), 10));
    const rawDeliveryFee = parseFloat(String(body.deliveryFee || "0")) || 0;
    const clientTotal = parseFloat(String(body.totalAmount || "0")) || 0;
    const idempotencyKey = String(body.idempotencyKey || `${phone}_${variantId}_${quantity}`).trim();

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Strict Server-Side Validation
    // ─────────────────────────────────────────────────────────────────────────────
    if (!firstName) {
      return data({ error: "Please enter your first name." }, { status: 400 });
    }
    if (!lastName) {
      return data({ error: "Please enter your last name." }, { status: 400 });
    }
    if (!phone || phone.length !== 10) {
      return data(
        { error: "Please enter a valid 10-digit Indian phone number." },
        { status: 400 },
      );
    }
    if (!address || address.length < 5) {
      return data({ error: "Please enter your complete delivery address." }, { status: 400 });
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return data({ error: "Please enter a valid 6-digit Indian PIN code." }, { status: 400 });
    }
    if (!city) {
      return data({ error: "Please enter your city." }, { status: 400 });
    }
    if (!state) {
      return data({ error: "Please select your state." }, { status: 400 });
    }
    if (!variantId) {
      return data(
        { error: "Missing product variant ID. Please reload the product page and try again." },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Idempotency Check (Prevent duplicate orders on double clicks / retries)
    // ─────────────────────────────────────────────────────────────────────────────
    pruneIdempotencyCache();
    if (idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey)!;
      return data(
        {
          success: true,
          orderId: cached.orderNumber,
          shopifyOrderId: cached.shopifyOrderId,
          totalAmount: cached.totalAmount,
          order: cached.orderRecord,
          isDuplicatePrevented: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Verify Server-Side Shopify Admin API Credentials
    // ─────────────────────────────────────────────────────────────────────────────
    const adminToken = env?.SHOPIFY_ADMIN_ACCESS_TOKEN || (typeof process !== "undefined" ? process.env.SHOPIFY_ADMIN_ACCESS_TOKEN : "");
    const rawStoreDomain = env?.PUBLIC_STORE_DOMAIN || (typeof process !== "undefined" ? process.env.PUBLIC_STORE_DOMAIN : "");

    // Clean store domain: remove https:// and trailing slashes
    const storeDomain = (rawStoreDomain || "")
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "")
      .trim();

    if (!adminToken || !storeDomain || storeDomain.includes("mock.shop")) {
      return data(
        {
          success: false,
          error:
            "Shopify Admin API is not configured on this storefront. To create real Cash on Delivery orders in Shopify Admin, set SHOPIFY_ADMIN_ACCESS_TOKEN (with write_orders scope) and PUBLIC_STORE_DOMAIN in your server environment variables.",
        },
        { status: 503 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Create Order in Shopify via Admin REST API
    // ─────────────────────────────────────────────────────────────────────────────
    // Extract numeric variant ID if GraphQL GID was passed (gid://shopify/ProductVariant/12345678)
    const numericVariantId = variantId.includes("/")
      ? variantId.split("/").pop()
      : variantId;

    const parsedNumericVariantId = Number(numericVariantId);
    if (!parsedNumericVariantId || isNaN(parsedNumericVariantId)) {
      return data(
        { error: `Invalid Shopify variant ID: "${variantId}". Cannot create order.` },
        { status: 400 },
      );
    }

    const shippingCharge = rawDeliveryFee > 0 ? rawDeliveryFee : (clientTotal >= 999 ? 0 : 49);

    const shopifyOrderPayload = {
      order: {
        line_items: [
          {
            variant_id: parsedNumericVariantId,
            quantity,
          },
        ],
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: email || undefined,
          phone: `+91${phone}`,
        },
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          address1: address,
          address2: landmark || undefined,
          city,
          province: state,
          zip: pincode,
          country: "India",
          country_code: "IN",
          phone: `+91${phone}`,
        },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address1: address,
          address2: landmark || undefined,
          city,
          province: state,
          zip: pincode,
          country: "India",
          country_code: "IN",
          phone: `+91${phone}`,
        },
        shipping_lines: [
          {
            title: shippingCharge === 0 ? "Free Pan-India Delivery" : "Standard COD Express Delivery",
            price: shippingCharge.toFixed(2),
            code: shippingCharge === 0 ? "FREE_DELIVERY" : "STANDARD_COD",
          },
        ],
        financial_status: "pending", // Crucial: Cash on Delivery must remain pending (unpaid) until delivered
        payment_gateway_names: ["Cash on Delivery (COD)"],
        note: landmark
          ? `Landmark: ${landmark} | Ordered via Grow & Glow Direct Cash on Delivery Form`
          : "Ordered via Grow & Glow Direct Cash on Delivery Form",
        tags: "Cash on Delivery, COD, Direct Form, Grow & Glow",
        inventory_behaviour: "decrement_ignoring_policy",
      },
    };

    const shopifyAdminUrl = `https://${storeDomain}/admin/api/2024-10/orders.json`;

    const shopifyResponse = await fetch(shopifyAdminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify(shopifyOrderPayload),
    });

    const shopifyResult = (await shopifyResponse.json().catch(() => null)) as any;

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

      console.error("Shopify Admin order creation failed:", shopifyResponse.status, detailedError);

      return data(
        {
          success: false,
          error: `Shopify Order Creation Failed (${shopifyResponse.status}): ${detailedError}`,
        },
        { status: shopifyResponse.status >= 400 && shopifyResponse.status < 600 ? shopifyResponse.status : 502 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. Successful Shopify Order Creation
    // ─────────────────────────────────────────────────────────────────────────────
    const shopifyOrder = shopifyResult.order;
    const realOrderNumber = shopifyOrder.name || `#${shopifyOrder.order_number}`;
    const realShopifyId = String(shopifyOrder.id);
    const confirmedTotal = shopifyOrder.total_price || String(clientTotal);

    const verifiedRecord = {
      orderNumber: realOrderNumber,
      shopifyOrderId: realShopifyId,
      name,
      phone,
      address,
      pincode,
      city,
      state,
      landmark: landmark || undefined,
      productTitle: shopifyOrder.line_items?.[0]?.title || productTitle,
      variantTitle: shopifyOrder.line_items?.[0]?.variant_title || variantTitle || undefined,
      productImage: productImage || undefined,
      quantity,
      totalAmount: confirmedTotal,
      deliveryFee: shippingCharge,
      paymentMethod: "Cash on Delivery (COD)",
      financialStatus: shopifyOrder.financial_status || "pending",
      createdAt: shopifyOrder.created_at || new Date().toISOString(),
    };

    // Cache to prevent duplicate creation on instant retry
    idempotencyCache.set(idempotencyKey, {
      orderNumber: realOrderNumber,
      shopifyOrderId: realShopifyId,
      totalAmount: confirmedTotal,
      createdAt: Date.now(),
      orderRecord: verifiedRecord,
    });

    // Optional backup to Supabase if configured
    if (env?.SUPABASE_URL && (env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_ANON_KEY)) {
      const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "";
      try {
        await fetch(`${env.SUPABASE_URL}/rest/v1/cod_orders`, {
          method: "POST",
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            id: `shopify_${realShopifyId}`,
            order_number: realOrderNumber,
            customer_name: name,
            customer_phone: phone,
            delivery_address: address,
            pincode,
            city,
            state,
            landmark: landmark || null,
            product_title: verifiedRecord.productTitle,
            variant_title: verifiedRecord.variantTitle || null,
            product_image: productImage || null,
            quantity,
            total_amount: confirmedTotal,
            delivery_fee: String(shippingCharge),
            payment_method: "Cash on Delivery (COD)",
            status: "confirmed",
            created_at: verifiedRecord.createdAt,
          }),
        });
      } catch (err) {
        console.warn("Could not mirror verified order to Supabase table:", err);
      }
    }

    return data(
      {
        success: true,
        orderId: realOrderNumber,
        shopifyOrderId: realShopifyId,
        totalAmount: confirmedTotal,
        order: verifiedRecord,
        message: "Your Cash on Delivery order has been successfully created in Shopify!",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err: any) {
    console.error("Unhandled error in /api/cod-order:", err);
    return data(
      {
        success: false,
        error: err.message || "An unexpected server error occurred while processing the order.",
      },
      { status: 500 },
    );
  }
}
