import { data } from "react-router";
import { envContext } from "~/lib/env";
import { createShopifyCodOrder } from "~/lib/shopify-admin.server";
import type { Route } from "./+types/api.razorpay.verify-order";

async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const text = `${orderId}|${paymentId}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(text));
    const expectedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return expectedSig.toLowerCase() === signature.toLowerCase();
  } catch {
    return false;
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

    const razorpayPaymentId = String(body.razorpay_payment_id || "").trim();
    const razorpayOrderId = String(body.razorpay_order_id || "").trim();
    const razorpaySignature = String(body.razorpay_signature || "").trim();

    if (!razorpayPaymentId) {
      return data(
        { success: false, error: "Missing Razorpay payment confirmation ID." },
        { status: 400 },
      );
    }

    // Optional cryptographic verification if Secret is configured and order_id was created
    const keySecret =
      env?.RAZORPAY_KEY_SECRET ||
      (typeof process !== "undefined" ? process.env.RAZORPAY_KEY_SECRET : "");

    if (keySecret && razorpayOrderId && razorpaySignature) {
      const isValid = await verifyRazorpaySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        keySecret.trim(),
      );
      if (!isValid) {
        return data(
          {
            success: false,
            error: "Payment signature verification failed. Please contact support.",
          },
          { status: 400 },
        );
      }
    }

    // Extract order payload details
    const variantId = String(body.variantId || "").trim();
    const name = String(body.name || "").trim();
    const nameParts = name.split(" ");
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ") || firstName;
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
    const totalAmount = parseFloat(String(body.totalAmount || "0")) || 0;
    const unitPrice = parseFloat(String(body.unitPrice || "0")) || (quantity > 0 ? totalAmount / quantity : 0);
    const discountAmount = parseFloat(String(body.discountAmount || "0")) || 0;
    const idempotencyKey = `prepaid_${phone}_${variantId}_${razorpayPaymentId}`;

    // ─────────────────────────────────────────────────────────────────────────────
    // Create Real PAID Order in Shopify with 10% Discount Applied
    // ─────────────────────────────────────────────────────────────────────────────
    const result = await createShopifyCodOrder(env, {
      variantId,
      quantity,
      unitPrice,
      deliveryFee: 0,
      clientTotal: totalAmount,
      discountAmount,
      paymentMethod: "razorpay",
      razorpayPaymentId,
      razorpayOrderId,
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
      console.error("Shopify order creation after Razorpay payment failed:", result.error);
      return data(
        {
          success: false,
          error: `Payment was recorded (${razorpayPaymentId}), but Shopify order sync returned: ${result.error}`,
        },
        { status: result.status },
      );
    }

    const verifiedRecord = result.order;

    // Optional Supabase Mirror
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
            customer_name: name,
            customer_phone: phone,
            delivery_address: address,
            pincode,
            city,
            state,
            landmark: landmark || null,
            product_title: productTitle,
            variant_title: variantTitle || null,
            product_image: productImage || null,
            quantity,
            total_amount: verifiedRecord.totalAmount,
            delivery_fee: "0",
            payment_method: `Razorpay Online (${razorpayPaymentId})`,
            status: "paid",
            created_at: verifiedRecord.createdAt,
          }),
        });
      } catch (err) {
        console.warn("Could not mirror paid order to Supabase table:", err);
      }
    }

    const redirectUrl = `/order-confirmed?orderNumber=${encodeURIComponent(
      verifiedRecord.orderNumber,
    )}&shopifyOrderId=${encodeURIComponent(
      verifiedRecord.shopifyOrderId,
    )}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(
      phone,
    )}&total=${encodeURIComponent(
      verifiedRecord.totalAmount,
    )}&product=${encodeURIComponent(productTitle)}&qty=${quantity}&image=${encodeURIComponent(
      productImage,
    )}&paid=1`;

    return data({
      success: true,
      orderNumber: verifiedRecord.orderNumber,
      shopifyOrderId: verifiedRecord.shopifyOrderId,
      redirectUrl,
    });
  } catch (err: any) {
    console.error("Unhandled error in /api/razorpay/verify-order:", err);
    return data(
      { success: false, error: err.message || "Failed to complete payment verification." },
      { status: 500 },
    );
  }
}
