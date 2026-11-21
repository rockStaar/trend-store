import { gql } from "@shopify/hydrogen";
import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { envContext } from "~/lib/env";
import { formatPrice } from "~/lib/money";
import { createShopifyCodOrder } from "~/lib/shopify-admin.server";
import { storefrontClientContext } from "~/lib/storefront";
import type { Route } from "./+types/checkout.cod";

const INDIAN_STATES = [
  "Delhi",
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Uttar Pradesh",
  "Gujarat",
  "West Bengal",
  "Telangana",
  "Rajasthan",
  "Haryana",
  "Punjab",
  "Madhya Pradesh",
  "Bihar",
  "Kerala",
  "Andhra Pradesh",
  "Assam",
  "Odisha",
  "Jharkhand",
  "Chhattisgarh",
  "Uttarakhand",
  "Himachal Pradesh",
  "Goa",
  "Jammu and Kashmir",
  "Chandigarh",
  "Tripura",
  "Puducherry",
  "Manipur",
  "Meghalaya",
  "Nagaland",
  "Mizoram",
  "Arunachal Pradesh",
  "Sikkim",
  "Ladakh",
];

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
    { title: "Cash on Delivery Checkout | Fast & Secure" },
    { name: "description", content: "Fast and secure Cash on Delivery checkout for your order." },
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

  const title = product?.title || url.searchParams.get("title") || "HypeeeCart Find";
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
    isPrepaidInitial: url.searchParams.get("prepaid") === "1" || url.searchParams.get("prepaid") === "true",
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
  const state = String(formData.get("state") || "").trim();
  const landmark = String(formData.get("landmark") || "").trim();
  const productTitle = String(formData.get("productTitle") || "HypeeeCart Item").trim();
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
  if (!state) {
    return { error: "Please select your state." };
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
  const [state, setState] = useState("");
  const [paymentMode, setPaymentMode] = useState<"prepaid" | "cod">(
    loaderData.isPrepaidInitial ? "prepaid" : "cod"
  );

  const isPrepaid = paymentMode === "prepaid";
  const unitAmount = parseFloat(unitPrice.amount) || 0;
  const rawSubtotal = unitAmount * quantity;
  const bundlePercent = quantity >= 3 ? 25 : quantity === 2 ? 15 : 0;
  const bundleSavings = Math.round(rawSubtotal * (bundlePercent / 100));
  const subtotalAfterBundle = rawSubtotal - bundleSavings;

  // 10% Off on Prepaid Orders
  const prepaidPercent = isPrepaid ? 10 : 0;
  const prepaidSavings = Math.round(subtotalAfterBundle * (prepaidPercent / 100));

  const totalPayable = subtotalAfterBundle - prepaidSavings;
  const deliveryFee = 0;
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
    <div className="min-h-screen bg-[#F8F7F3] py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header with Logo instead of plain text */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to={handle ? `/products/${handle}` : "/"}
            className="text-xs font-bold text-[#64748B] hover:text-[#2457D6] transition-colors flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Product</span>
          </Link>
          <Link to="/" className="inline-block group" aria-label="Home">
            <img
              src="/logo.png"
              alt="Store Logo"
              className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#192A46] font-bold uppercase tracking-wider">
            <span className="text-emerald-700">🔒</span>
            <span className="hidden sm:inline">256-Bit Encrypted COD Checkout</span>
            <span className="sm:hidden text-[10px]">Secure COD</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E4E7ED] p-6 sm:p-8 shadow-xs">
            <div className="border-b border-[#E4E7ED] pb-4 mb-6">
              <span className="text-[11px] font-bold text-[#2457D6] tracking-widest uppercase block mb-1">
                STEP 1 OF 1 • FAST CHECKOUT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#192A46] leading-tight">
                Cash on Delivery Details
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
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
                <label htmlFor="name" className="block text-xs font-bold text-[#192A46] mb-1.5">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-[#192A46] mb-1.5">
                  Mobile Number (for Courier &amp; WhatsApp Updates) <span className="text-red-600">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-[#E4E7ED] bg-[#F8F7F3] text-xs font-bold text-[#192A46]">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="flex-1 bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-r-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-xs font-bold text-[#192A46] mb-1.5">
                  House / Flat No., Building, Street <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  rows={2}
                  placeholder="e.g. Flat 302, Green Valley Apartments, 5th Cross Road"
                  className="w-full bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all resize-none font-medium"
                />
              </div>

              {/* PIN Code & City */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="pincode" className="block text-xs font-bold text-[#192A46] mb-1.5">
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
                    className="w-full bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-xs font-bold text-[#192A46] mb-1.5">
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
                    className="w-full bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* State & Landmark */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="state" className="block text-xs font-bold text-[#192A46] mb-1.5">
                    State <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all font-medium cursor-pointer"
                  >
                    <option value="" disabled>
                      Select State *
                    </option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="landmark" className="block text-xs font-bold text-[#192A46] mb-1.5">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    placeholder="Near park, temple..."
                    className="w-full bg-[#F8F7F3]/70 border border-[#E4E7ED] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#192A46] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-[#2457D6]/20 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 mt-4 pt-2 border-t border-[#E4E7ED]">
                <label className="block text-xs font-bold text-[#192A46]">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Prepaid with 10% OFF */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode("prepaid")}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isPrepaid
                        ? "border-[#FF5000] bg-orange-50/70 ring-2 ring-[#FF5000]/20"
                        : "border-[#E4E7ED] bg-white hover:bg-[#F8F7F3]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm text-[#192A46]">
                        <span>⚡</span>
                        <span>Prepaid / Online</span>
                      </div>
                      <span className="text-[10px] font-black bg-[#25F476] text-black px-2 py-0.5 rounded shadow-2xs">
                        10% OFF
                      </span>
                    </div>
                    <p className="text-[11px] text-[#475569]">
                      Google Pay, PhonePe, Paytm, UPI, Cards
                    </p>
                  </button>

                  {/* Option 2: Cash on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode("cod")}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      !isPrepaid
                        ? "border-[#192A46] bg-[#F8F7F3] ring-2 ring-[#192A46]/20"
                        : "border-[#E4E7ED] bg-white hover:bg-[#F8F7F3]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm text-[#192A46]">
                        <span>💵</span>
                        <span>Cash on Delivery</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#64748B] bg-gray-100 px-1.5 py-0.5 rounded">
                        Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Pay cash or UPI upon delivery
                    </p>
                  </button>
                </div>
                <input type="hidden" name="paymentMode" value={paymentMode} />
              </div>

              {/* Payment Details Card */}
              {isPrepaid ? (
                <div className="p-4 rounded-xl border-2 border-[#FF5000] bg-orange-50/60 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <span className="font-extrabold text-xs sm:text-sm text-[#192A46]">
                        Prepaid Selected • 10% Discount Active
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Save ₹{prepaidSavings}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    You save an extra <strong>₹{prepaidSavings}</strong>! You will pay via UPI QR code or Google Pay / PhonePe / Paytm / Cards directly upon confirming.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-[#192A46] bg-[#F8F7F3] space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💵</span>
                      <span className="font-extrabold text-xs sm:text-sm text-[#192A46]">
                        Cash on Delivery (COD) Selected
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      No Advance Payment
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    Keep exact cash ready or scan courier UPI QR code (Google Pay, PhonePe, Paytm, BHIM) upon doorstep delivery.
                  </p>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-xl text-sm sm:text-base font-extrabold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 active:scale-[0.99] text-white ${
                  isPrepaid
                    ? "bg-gradient-to-r from-[#FF5000] to-[#FF3800] hover:from-[#E64600] hover:to-[#D93000]"
                    : "bg-[#192A46] hover:bg-[#282720]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing Your Order…</span>
                  </>
                ) : isPrepaid ? (
                  <>
                    <span>⚡</span>
                    <span>Confirm &amp; Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} (10% OFF Applied)</span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>Confirm COD Order • Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} on Delivery</span>
                  </>
                )}
              </button>
            </Form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E4E7ED] p-6 shadow-xs space-y-5 lg:sticky lg:top-8">
            <h2 className="font-bold text-base text-[#192A46] border-b border-[#E4E7ED] pb-3">
              Order Summary
            </h2>

            {/* Product Card */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#E4E7ED]">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="size-16 rounded-xl object-contain bg-[#F8F7F3] border border-[#E4E7ED] shrink-0 p-1"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#192A46] leading-tight line-clamp-2">
                  {title}
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  Pack Quantity: <strong className="text-[#192A46]">{quantity} Pc{quantity > 1 ? "s" : ""}</strong>
                  {variantTitle ? ` • ${variantTitle}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0 font-extrabold text-sm sm:text-base text-[#192A46]">
                {formatPrice({ amount: rawSubtotal.toFixed(2), currencyCode: currency })}
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-2.5 text-xs text-[#64748B]">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-[#192A46]">
                  {formatPrice({ amount: rawSubtotal.toFixed(2), currencyCode: currency })}
                </span>
              </div>

              {bundleSavings > 0 ? (
                <div className="flex justify-between items-center text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1">
                    <span>🎉</span>
                    <span>Bundle Discount ({bundlePercent}% OFF):</span>
                  </span>
                  <span>- {formatPrice({ amount: bundleSavings.toFixed(2), currencyCode: currency })}</span>
                </div>
              ) : null}

              {isPrepaid && prepaidSavings > 0 ? (
                <div className="flex justify-between items-center text-xs text-orange-950 font-bold bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200">
                  <span className="flex items-center gap-1">
                    <span>⚡</span>
                    <span>Prepaid Discount (10% OFF):</span>
                  </span>
                  <span className="text-[#D93800]">- {formatPrice({ amount: prepaidSavings.toFixed(2), currencyCode: currency })}</span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span>Pan-India Delivery:</span>
                <span className="font-bold text-emerald-700">
                  FREE (All Orders)
                </span>
              </div>
              <div className="flex justify-between">
                <span>COD Handling Fee:</span>
                <span className="font-bold text-emerald-700">₹0 (Free)</span>
              </div>
              <div className="pt-3 border-t border-[#E4E7ED] flex justify-between items-baseline text-base font-extrabold text-[#192A46]">
                <span>Total Amount to Pay:</span>
                <span className="text-[#2457D6] text-xl font-black">
                  {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })}
                </span>
              </div>
            </div>

            {/* Trust Assurances */}
            <div className="pt-3 border-t border-[#E4E7ED] space-y-2 text-xs text-[#475569]">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Dispatches within 24 hours with live SMS/WhatsApp tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>5-Day Free Replacement Guarantee on all items</span>
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

