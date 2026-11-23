import type { ActionFunctionArgs } from "react-router";
import { envContext } from "~/lib/env";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const env = context.get(envContext);
    const contentType = request.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else {
      const formData = await request.formData().catch(() => new FormData());
      body = Object.fromEntries(formData.entries());
    }

    const amountInRupees = parseFloat(String(body.amount || "0")) || 0;
    if (amountInRupees <= 0) {
      return Response.json(
        { success: false, error: "Invalid payment amount." },
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const amountInPaise = Math.round(amountInRupees * 100);
    const currency = "INR";
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const customerName = String(body.customerName || "Customer").trim();
    const customerPhone = String(body.customerPhone || "").trim();
    const productTitle = String(body.productTitle || "HypeeeCart Order").trim();

    const keyId =
      env?.RAZORPAY_KEY_ID ||
      env?.PUBLIC_RAZORPAY_KEY_ID ||
      (typeof process !== "undefined" ? process.env.RAZORPAY_KEY_ID : "") ||
      "";
    const keySecret =
      env?.RAZORPAY_KEY_SECRET ||
      (typeof process !== "undefined" ? process.env.RAZORPAY_KEY_SECRET : "") ||
      "";

    if (!keyId || !keySecret) {
      return Response.json(
        {
          success: false,
          requiresConfig: true,
          error:
            "Razorpay API credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured in .env. Please configure them to enable live/test payments.",
        },
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Create real server-side order on Razorpay API
    const credentials = btoa(`${keyId.trim()}:${keySecret.trim()}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          merchant: "Manaswi Dhoj Swar",
          store: "HypeeeCart",
          customer_name: customerName,
          customer_phone: customerPhone,
          product: productTitle,
        },
      }),
    });

    const rzpData = (await rzpRes.json().catch(() => null)) as any;

    if (!rzpRes.ok || !rzpData?.id) {
      const description =
        rzpData?.error?.description ||
        rzpData?.error?.message ||
        `Razorpay HTTP ${rzpRes.status}`;
      console.error("Razorpay order creation failed:", description);
      return Response.json(
        {
          success: false,
          error: `Razorpay Error: ${description}`,
        },
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return Response.json(
      {
        success: true,
        keyId: keyId.trim(),
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency || "INR",
        merchantName: "Manaswi Dhoj Swar",
      },
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error in /api/razorpay/create-order:", err);
    return Response.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
