import { data } from "react-router";
import { envContext } from "~/lib/env";
import { createShopifyCodOrder } from "~/lib/shopify-admin.server";
import type { Route } from "./+types/api.cod-order";

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
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const address = String(body.address || "").trim();
    const pincode = String(body.pincode || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const landmark = String(body.landmark || "").trim();
    const productTitle = String(body.productTitle || "HypeeeCart Find").trim();
    const variantTitle = String(body.variantTitle || "").trim();
    const productImage = String(body.productImage || "").trim();
    const quantity = Math.max(1, parseInt(String(body.quantity || "1"), 10));
    const rawDeliveryFee = parseFloat(String(body.deliveryFee || "0")) || 0;
    const clientTotal = parseFloat(String(body.totalAmount || "0")) || 0;
    const unitPrice = parseFloat(String(body.unitPrice || "0")) || (quantity > 0 ? clientTotal / quantity : 0);
    const idempotencyKey = String(
      body.idempotencyKey || `cod_${phone}_${variantId}_${quantity}`,
    ).trim();

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
    if (variantId.includes("/Product/")) {
      return data(
        { error: "Received a Product ID instead of a ProductVariant ID. Please reload the product page." },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Create Real Order via Shopify Admin API (using Dev Dashboard App Auth)
    // ─────────────────────────────────────────────────────────────────────────────
    const result = await createShopifyCodOrder(env, {
      variantId,
      quantity,
      unitPrice,
      deliveryFee: rawDeliveryFee,
      clientTotal,
      firstName,
      lastName,
      phone,
      address,
      landmark: landmark || undefined,
      pincode,
      city,
      state,
      email: email || undefined,
      productTitle,
      variantTitle: variantTitle || undefined,
      productImage: productImage || undefined,
      idempotencyKey,
    });

    if (!result.success) {
      return data(
        {
          success: false,
          error: result.error,
        },
        { status: result.status },
      );
    }

    const verifiedRecord = result.order;

    // Optional backup mirror to Supabase if credentials are present
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
            id: `shopify_${verifiedRecord.shopifyOrderId}`,
            order_number: verifiedRecord.orderNumber,
            customer_name: verifiedRecord.name,
            customer_phone: verifiedRecord.phone,
            delivery_address: verifiedRecord.address,
            pincode: verifiedRecord.pincode,
            city: verifiedRecord.city,
            state: verifiedRecord.state,
            landmark: verifiedRecord.landmark || null,
            product_title: verifiedRecord.productTitle,
            variant_title: verifiedRecord.variantTitle || null,
            product_image: verifiedRecord.productImage || null,
            quantity: verifiedRecord.quantity,
            total_amount: verifiedRecord.totalAmount,
            delivery_fee: String(verifiedRecord.deliveryFee),
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
        orderId: verifiedRecord.orderNumber,
        shopifyOrderId: verifiedRecord.shopifyOrderId,
        totalAmount: verifiedRecord.totalAmount,
        order: verifiedRecord,
        isDuplicatePrevented: result.isDuplicatePrevented,
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
