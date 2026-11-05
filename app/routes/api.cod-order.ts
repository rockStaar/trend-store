import { data } from "react-router";
import { envContext } from "~/lib/env";
import type { Route } from "./+types/api.cod-order";

// In-memory fallback persistence for local development and runtime caching
interface CodOrderRecord {
  id: string;
  orderNumber: string;
  createdAt: string;
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
  totalAmount: string | number;
  deliveryFee: string | number;
  paymentMethod: string;
  status: "confirmed" | "dispatched" | "delivered" | "cancelled";
}

const memoryCodOrders: CodOrderRecord[] = [];

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
    const totalAmount = body.totalAmount || "0";
    const deliveryFee = body.deliveryFee || "0";

    // Validation
    if (!firstName && !name) {
      return data({ error: "Please enter your first name." }, { status: 400 });
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
      return data({ error: "Please enter a valid 6-digit PIN code." }, { status: 400 });
    }
    if (!city) {
      return data({ error: "Please enter your city." }, { status: 400 });
    }

    // Generate readable, branded Order Number
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `GG-COD-${randomDigits}`;
    const orderId = `cod_${Date.now()}_${randomDigits}`;
    const createdAt = new Date().toISOString();

    const orderRecord: CodOrderRecord = {
      id: orderId,
      orderNumber,
      createdAt,
      name,
      phone,
      address,
      pincode,
      city,
      state: state || "India",
      landmark: landmark || undefined,
      productTitle,
      variantTitle: variantTitle || undefined,
      productImage: productImage || undefined,
      quantity,
      totalAmount,
      deliveryFee,
      paymentMethod: "Cash on Delivery (COD)",
      status: "confirmed",
    };

    // Store in Supabase if configured
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
            id: orderId,
            order_number: orderNumber,
            customer_name: name,
            customer_phone: phone,
            delivery_address: address,
            pincode,
            city,
            state: state || "India",
            landmark: landmark || null,
            product_title: productTitle,
            variant_title: variantTitle || null,
            product_image: productImage || null,
            quantity,
            total_amount: String(totalAmount),
            delivery_fee: String(deliveryFee),
            payment_method: "Cash on Delivery (COD)",
            status: "confirmed",
            created_at: createdAt,
          }),
        });
      } catch (e) {
        console.warn("Could not persist COD order to Supabase table (fallback to memory):", e);
      }
    }

    // Always persist to local memory cache
    memoryCodOrders.unshift(orderRecord);

    return data(
      {
        success: true,
        orderId: orderNumber,
        order: orderRecord,
        message: "Your Cash on Delivery order has been successfully placed!",
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
        error: err.message || "Failed to process Cash on Delivery order. Please try again.",
      },
      { status: 500 },
    );
  }
}

