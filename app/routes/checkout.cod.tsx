import { gql } from "@shopify/hydrogen";
import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { envContext } from "~/lib/env";
import { formatPrice } from "~/lib/money";
import { createShopifyCodOrder } from "~/lib/shopify-admin.server";
import { storefrontClientContext } from "~/lib/storefront";
import type { Route } from "./+types/checkout.cod";

const COD_CHECKOUT_QUERY = gql(`
  query CodCheckoutProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      featuredImage {
        id
        url
        altText
      }
      variants(first: 20) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          image {
            id
            url
            altText
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`);

export function meta() {
  return [
    { title: "Cash on Delivery Checkout | Grow & Glow" },
    { name: "description", content: "Fast and secure Cash on Delivery checkout for your Grow & Glow order." },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle") || "";
  const variantId = url.searchParams.get("variant") || "";
  const quantity = Math.max(1, parseInt(url.searchParams.get("quantity") || "1", 10));

  let product: any = null;
  let selectedVariant: any = null;

  if (handle) {
    const storefrontClient = context.get(storefrontClientContext);
    try {
      const { data } = await storefrontClient.graphql(COD_CHECKOUT_QUERY, {
        variables: { handle },
      });
      product = data?.product || null;
      if (product) {
        if (variantId) {
          selectedVariant =
            product.variants.nodes.find((v: any) => v.id === variantId) ||
            product.variants.nodes[0];
        } else {
          selectedVariant = product.variants.nodes[0];
        }
      }
    } catch {
      // Gracefully continue with search params fallback
    }
  }

  const title = product?.title || url.searchParams.get("title") || "Grow & Glow Discovery";
  const image =
    selectedVariant?.image?.url ||
    product?.featuredImage?.url ||
    url.searchParams.get("image") ||
    "";
  const unitPriceAmount =
    selectedVariant?.price?.amount ||
    product?.priceRange?.minVariantPrice?.amount ||
    url.searchParams.get("price") ||
    "699";
  const currency =
    selectedVariant?.price?.currencyCode ||
    product?.priceRange?.minVariantPrice?.currencyCode ||
    "INR";

  return {
    handle,
    variantId: selectedVariant?.id || variantId,
    variantTitle:
      selectedVariant?.title && selectedVariant.title !== "Default Title"
        ? selectedVariant.title
        : undefined,
    quantity,
    title,
    image,
    unitPrice: {
      amount: String(unitPriceAmount),
      currencyCode: currency,
    },
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.get(envContext);
  const formData = await request.formData();

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").replace(/[^0-9]/g, "").slice(-10);
  const address = String(formData.get("address") || "").trim();
  const pincode = String(formData.get("pincode") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "Delhi").trim();
  const landmark = String(formData.get("landmark") || "").trim();
  const productTitle = String(formData.get("productTitle") || "Grow & Glow Item").trim();
  const variantTitle = String(formData.get("variantTitle") || "").trim();
  const rawVariantId = String(formData.get("variantId") || "").trim();
  const quantity = Math.max(1, parseInt(String(formData.get("quantity") || "1"), 10));
  const totalAmount = parseFloat(String(formData.get("totalAmount") || "0")) || 0;
  const rawDeliveryFee = parseFloat(String(formData.get("deliveryFee") || "0")) || 0;
  const productImage = String(formData.get("productImage") || "");

  // Validation
  if (!name || name.length < 2) {
    return { error: "Please enter your full name." };
  }
  if (!phone || phone.length !== 10) {
    return { error: "Please enter a valid 10-digit Indian phone number for courier updates." };
  }
  if (!address || address.length < 5) {
    return { error: "Please enter your complete street address (house/flat no, building, road)." };
  }
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return { error: "Please enter a valid 6-digit Indian PIN code." };
  }
  if (!city) {
    return { error: "Please specify your city / town." };
  }
  if (!rawVariantId) {
    return { error: "Missing product variant ID. Please reload the page." };
  }

  const nameParts = name.split(" ");
  const firstName = nameParts[0] || name;
  const lastName = nameParts.slice(1).join(" ") || firstName;
  const idempotencyKey = `cod_${phone}_${rawVariantId}_${quantity}`;

  const result = await createShopifyCodOrder(env, {
    variantId: rawVariantId,
    quantity,
    clientTotal: totalAmount,
    deliveryFee: rawDeliveryFee,
    firstName,
    lastName,
    phone,
    address,
    landmark: landmark || undefined,
    pincode,
    city,
    state,
    productTitle,
    variantTitle: variantTitle || undefined,
    productImage: productImage || undefined,
    idempotencyKey,
  });

  if (!result.success) {
    return { error: result.error };
  }

  const verifiedOrder = result.order;

  // Save to Supabase if credentials exist
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
          id: `shopify_${verifiedOrder.shopifyOrderId}`,
          order_number: verifiedOrder.orderNumber,
          customer_name: name,
          customer_phone: phone,
          delivery_address: address,
          pincode,
          city,
          state,
          landmark: landmark || null,
          product_title: verifiedOrder.productTitle,
          variant_title: verifiedOrder.variantTitle || null,
          product_image: productImage || null,
          quantity,
          total_amount: verifiedOrder.totalAmount,
          payment_method: "Cash on Delivery (COD)",
          status: "confirmed",
          created_at: verifiedOrder.createdAt,
        }),
      });
    } catch {
      // Safe fallback
    }
  }

  // Redirect to the dedicated Order Confirmed screen with real Shopify order details
  const params = new URLSearchParams({
    orderNumber: verifiedOrder.orderNumber,
    shopifyOrderId: verifiedOrder.shopifyOrderId,
    name,
    phone,
    address,
    city,
    state,
    pincode,
    total: verifiedOrder.totalAmount,
    product: verifiedOrder.productTitle,
    qty: String(quantity),
    image: productImage,
  });

  return redirect(`/order-confirmed?${params.toString()}`);
}

export default function CodCheckoutPage({ loaderData, actionData }: Route.ComponentProps) {
  const { title, image, quantity, unitPrice, variantTitle, handle } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Delhi");

  const unitAmount = parseFloat(unitPrice.amount) || 0;
  const subtotal = unitAmount * quantity;
  const isFreeDelivery = subtotal >= 999;
  const deliveryFee = isFreeDelivery ? 0 : 49;
  const totalPayable = subtotal + deliveryFee;
  const currency = unitPrice.currencyCode || "INR";

  const handlePincodeChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      if (clean.startsWith("11")) {
        setCity("New Delhi");
        setState("Delhi");
      } else if (clean.startsWith("40")) {
        setCity("Mumbai");
        setState("Maharashtra");
      } else if (clean.startsWith("56")) {
        setCity("Bengaluru");
        setState("Karnataka");
      } else if (clean.startsWith("60")) {
        setCity("Chennai");
        setState("Tamil Nadu");
      } else if (clean.startsWith("70")) {
        setCity("Kolkata");
        setState("West Bengal");
      } else if (clean.startsWith("50")) {
        setCity("Hyderabad");
        setState("Telangana");
      } else if (clean.startsWith("38")) {
        setCity("Ahmedabad");
        setState("Gujarat");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EC] py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={handle ? `/products/${handle}` : "/"}
            className="text-xs font-bold text-[#7D786D] hover:text-[#B77943] transition-colors flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Product</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#282720] font-bold uppercase tracking-wider">
            <span className="text-emerald-700">🔒</span>
            <span>256-Bit Encrypted COD Checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E2DBD0] p-6 sm:p-8 shadow-sm">
            <div className="border-b border-[#E2DBD0] pb-4 mb-6">
              <span className="text-[11px] font-bold text-[#B77943] tracking-widest uppercase block mb-1">
                STEP 1 OF 1 • FAST CHECKOUT
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#282720] font-normal leading-tight">
                Cash on Delivery Details
              </h1>
              <p className="text-xs text-[#5E5B52] mt-1">
                Pay in cash or scan UPI when the delivery executive arrives at your doorstep.
              </p>
            </div>

            {actionData?.error ? (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                ⚠️ {actionData.error}
              </div>
            ) : null}

            <Form method="post" className="space-y-4">
              <input type="hidden" name="variantId" value={loaderData.variantId} />
              <input type="hidden" name="productTitle" value={title} />
              <input type="hidden" name="variantTitle" value={variantTitle || ""} />
              <input type="hidden" name="productImage" value={image} />
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="totalAmount" value={totalPayable} />
              <input type="hidden" name="deliveryFee" value={deliveryFee} />

              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-[#282720] mb-1.5">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-[#282720] mb-1.5">
                  Mobile Number (for Courier &amp; WhatsApp Updates) <span className="text-red-600">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-[#E2DBD0] bg-[#FAF6F0] text-xs font-bold text-[#282720]">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="flex-1 bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-r-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-xs font-bold text-[#282720] mb-1.5">
                  House / Flat No., Building, Street <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  rows={2}
                  placeholder="e.g. Flat 302, Green Valley Apartments, 5th Cross Road"
                  className="w-full bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all resize-none"
                />
              </div>

              {/* PIN Code & City */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="pincode" className="block text-xs font-bold text-[#282720] mb-1.5">
                    PIN Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    name="pincode"
                    required
                    maxLength={6}
                    placeholder="6 digits"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-xs font-bold text-[#282720] mb-1.5">
                    City / Town <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* State & Landmark */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="state" className="block text-xs font-bold text-[#282720] mb-1.5">
                    State <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    required
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="landmark" className="block text-xs font-bold text-[#282720] mb-1.5">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    placeholder="Near park, temple..."
                    className="w-full bg-[#FAF6F0]/50 border border-[#E2DBD0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="p-4 rounded-2xl border-2 border-[#282720] bg-[#FAF6F0]/60 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    <span className="font-bold text-xs sm:text-sm text-[#282720]">
                      Cash on Delivery (COD) Selected
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    No Advance Payment
                  </span>
                </div>
                <p className="text-[11px] text-[#635F53] leading-relaxed">
                  Keep exact cash ready or scan UPI QR code (Google Pay, PhonePe, Paytm, BHIM) directly to the delivery person upon arrival.
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#282720] hover:bg-[#3D3A32] text-white py-4 px-6 rounded-2xl text-sm sm:text-base font-extrabold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Placing Your COD Order…</span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>Confirm Order • Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} on Delivery</span>
                  </>
                )}
              </button>
            </Form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E2DBD0] p-6 shadow-sm space-y-5 lg:sticky lg:top-8">
            <h2 className="font-heading font-bold text-base text-[#282720] border-b border-[#E2DBD0] pb-3">
              Order Summary
            </h2>

            {/* Product Card */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#E2DBD0]">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="size-16 rounded-xl object-cover bg-[#FAF6F0] border border-[#E2DBD0] shrink-0"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#282720] leading-tight line-clamp-2">
                  {title}
                </p>
                <p className="text-xs text-[#7D786D] mt-1">
                  Pack Quantity: <strong>{quantity} Pc</strong>
                  {variantTitle ? ` • ${variantTitle}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0 font-extrabold text-sm sm:text-base text-[#282720]">
                {formatPrice({ amount: subtotal.toFixed(2), currencyCode: currency })}
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-2.5 text-xs text-[#5E5B52]">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-[#282720]">
                  {formatPrice({ amount: subtotal.toFixed(2), currencyCode: currency })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pan-India Delivery:</span>
                <span className="font-bold text-emerald-700">
                  {isFreeDelivery ? "FREE (Orders over ₹999)" : "₹49"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>COD Handling Fee:</span>
                <span className="font-bold text-emerald-700">₹0 (Free)</span>
              </div>
              <div className="pt-3 border-t border-[#E2DBD0] flex justify-between text-base font-extrabold text-[#282720]">
                <span>Total Amount to Pay:</span>
                <span className="text-[#B77943]">
                  {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })}
                </span>
              </div>
            </div>

            {/* Trust Assurances */}
            <div className="pt-3 border-t border-[#E2DBD0] space-y-2 text-xs text-[#635F53]">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Dispatches within 24 hours with live SMS/WhatsApp tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>7-Day Free Replacement Guarantee on all items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Inspect your package upon doorstep arrival before paying</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

