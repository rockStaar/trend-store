import { data } from "react-router";
import { envContext } from "~/lib/env";
import type { Route } from "./+types/api.razorpay.create-order";

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

    const amountInRupees = parseFloat(String(body.amount || "0")) || 0;
    if (amountInRupees <= 0) {
      return data({ error: "Invalid payment amount." }, { status: 400 });
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

    // If both Key ID and Secret are configured, create real server-side order on Razorpay
    if (keyId && keySecret) {
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
        console.error("Razorpay order creation failed:", rzpData);
        return data(
          {
            error:
              rzpData?.error?.description ||
              "Could not initiate payment session with Razorpay.",
          },
          { status: 502 },
        );
      }

      return data({
        success: true,
        keyId,
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency || "INR",
        merchantName: "Manaswi Dhoj Swar",
      });
    }

    // If Key ID is present without secret (or in client-key mode)
    if (keyId) {
      return data({
        success: true,
        keyId,
        amount: amountInPaise,
        currency,
        merchantName: "Manaswi Dhoj Swar",
      });
    }

    // Keys not yet configured
    return data(
      {
        success: false,
        requiresConfig: true,
        error:
          "Razorpay credentials not found in environment. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.",
      },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("Error in /api/razorpay/create-order:", err);
    return data({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
