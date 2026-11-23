import { gql } from "@shopify/hydrogen";
import { useEffect, useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
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

const CHECKOUT_QUERY = gql(`
  query CheckoutProduct($handle: String!) {
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
    { title: "Fast & Secure Checkout | HypeeeCart" },
    {
      name: "description",
      content:
        "Fast and secure checkout via Razorpay (UPI, GPay, PhonePe, Cards) with 10% prepaid discount or Cash on Delivery.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.get(envContext);
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle") || "";
  const variantId = url.searchParams.get("variant") || "";
  const quantity = Math.max(1, parseInt(url.searchParams.get("quantity") || "1", 10));

  let product: any = null;
  let selectedVariant: any = null;

  if (handle) {
    const storefrontClient = context.get(storefrontClientContext);
    try {
      const { data } = await storefrontClient.graphql(CHECKOUT_QUERY, {
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

  const razorpayKeyId =
    env?.RAZORPAY_KEY_ID ||
    env?.PUBLIC_RAZORPAY_KEY_ID ||
    (typeof process !== "undefined" ? process.env.RAZORPAY_KEY_ID : "") ||
    "";

  const initialPrepaid =
    url.searchParams.get("prepaid") === "1" ||
    url.searchParams.get("prepaid") === "true";

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
    razorpayKeyId,
    initialPrepaid,
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
  const unitPrice = parseFloat(String(formData.get("unitPrice") || "0")) || 0;
  const productImage = String(formData.get("productImage") || "");
  const paymentMode = String(formData.get("paymentMode") || "cod").trim();

  // Validation
  if (!name || name.length < 2) {
    return { error: "Please enter your full name." };
  }
  if (!phone || phone.length !== 10) {
    return { error: "Please enter a valid 10-digit Indian phone number for courier updates." };
  }
  if (!address || address.length < 5) {
    return { error: "Please enter your complete delivery address." };
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
  const idempotencyKey = `cod_${phone}_${rawVariantId}_${quantity}_${Date.now()}`;

  // Standard Cash on Delivery Order Creation (Unpaid, Pending)
  const result = await createShopifyCodOrder(env, {
    variantId: rawVariantId,
    quantity,
    unitPrice: unitPrice > 0 ? unitPrice : undefined,
    deliveryFee: 0,
    clientTotal: totalAmount,
    paymentMethod: "cod",
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

  // Save to Supabase if configured
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
      // Non-blocking
    }
  }

  const redirectUrl = `/order-confirmed?orderNumber=${encodeURIComponent(
    verifiedOrder.orderNumber,
  )}&shopifyOrderId=${encodeURIComponent(
    verifiedOrder.shopifyOrderId,
  )}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(
    phone,
  )}&address=${encodeURIComponent(address)}&city=${encodeURIComponent(
    city,
  )}&state=${encodeURIComponent(state)}&pincode=${encodeURIComponent(
    pincode,
  )}&total=${encodeURIComponent(verifiedOrder.totalAmount)}&product=${encodeURIComponent(
    verifiedOrder.productTitle,
  )}&qty=${quantity}&image=${encodeURIComponent(productImage)}`;

  return { success: true, redirectUrl };
}

export default function CheckoutPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const {
    handle,
    quantity,
    title,
    image,
    variantTitle,
    unitPrice,
    razorpayKeyId,
    initialPrepaid,
  } = loaderData;

  const [paymentMode, setPaymentMode] = useState<"prepaid" | "cod">(
    initialPrepaid ? "prepaid" : "prepaid",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [landmark, setLandmark] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const navigation = useNavigation();
  const isSubmittingCod = navigation.state === "submitting";

  // Load Razorpay Script dynamically on client
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const rawUnit = parseFloat(unitPrice.amount) || 0;
  const rawSubtotal = rawUnit * quantity;

  // Bundle Discount: 2 items -> 15% OFF, 3+ items -> 25% OFF
  const bundlePercent = quantity >= 3 ? 25 : quantity === 2 ? 15 : 0;
  const bundleSavings = Math.round(rawSubtotal * (bundlePercent / 100));
  const subtotalAfterBundle = rawSubtotal - bundleSavings;

  // 10% Off on Prepaid Orders
  const isPrepaid = paymentMode === "prepaid";
  const prepaidSavings = isPrepaid ? Math.round(subtotalAfterBundle * 0.1) : 0;
  const totalPayable = subtotalAfterBundle - prepaidSavings;
  const totalSavings = bundleSavings + prepaidSavings;
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

  const validateForm = () => {
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      document.getElementById("name")?.focus();
      return false;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      document.getElementById("phone")?.focus();
      return false;
    }
    if (!address.trim() || address.trim().length < 5) {
      setErrorMessage("Please enter your complete delivery address.");
      document.getElementById("address")?.focus();
      return false;
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      setErrorMessage("Please enter a valid 6-digit Indian PIN code.");
      document.getElementById("pincode")?.focus();
      return false;
    }
    if (!city.trim()) {
      setErrorMessage("Please enter your city / town.");
      document.getElementById("city")?.focus();
      return false;
    }
    if (!state.trim()) {
      setErrorMessage("Please select your state from the dropdown.");
      document.getElementById("state")?.focus();
      return false;
    }
    setErrorMessage("");
    return true;
  };

  // Real Razorpay Standard Checkout Launch Handler
  const handleRazorpayPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      // 1. Create real Razorpay order on server
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPayable,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          productTitle: title,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const rawText = await res.text();
        throw new Error(
          `Server returned HTTP ${res.status} non-JSON response: ${rawText.slice(0, 120)}`,
        );
      }

      const orderData = (await res.json()) as any;

      if (!res.ok || !orderData.success) {
        throw new Error(
          orderData.error || "Failed to initialize Razorpay payment session.",
        );
      }

      // 2. Ensure Razorpay Checkout script is loaded
      if (typeof window === "undefined" || !(window as any).Razorpay) {
        throw new Error(
          "Razorpay Checkout SDK is still loading. Please check your internet connection and retry.",
        );
      }

      // 3. Configure and open genuine Razorpay Checkout Modal
      const options: any = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || "INR",
        name: "HypeeeCart",
        description: "Official Store by Manaswi Dhoj Swar (10% Discount Applied)",
        image: "/logo.png",
        order_id: orderData.orderId,
        prefill: {
          name: name.trim(),
          contact: `+91${phone.replace(/[^0-9]/g, "").slice(-10)}`,
          email: email.trim() || undefined,
        },
        notes: {
          merchant: "Manaswi Dhoj Swar",
          store: "HypeeeCart",
          product: title,
          phone: phone.trim(),
        },
        theme: {
          color: "#2457D6",
        },
        handler: async function (response: any) {
          setIsProcessing(true);
          try {
            // 4. Send payment details to server for signature verification & Shopify sync
            const verifyRes = await fetch("/api/razorpay/verify-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                address: address.trim(),
                landmark: landmark.trim(),
                pincode: pincode.trim(),
                city: city.trim(),
                state: state.trim(),
                variantId: loaderData.variantId,
                quantity,
                totalAmount: totalPayable,
                unitPrice: rawUnit,
                discountAmount: totalSavings,
                productTitle: title,
                variantTitle: variantTitle || undefined,
                productImage: image || undefined,
              }),
            });

            const verifyContentType = verifyRes.headers.get("content-type") || "";
            if (!verifyContentType.includes("application/json")) {
              const rawVerifyText = await verifyRes.text();
              throw new Error(
                `Server returned HTTP ${verifyRes.status} non-JSON response: ${rawVerifyText.slice(0, 120)}`,
              );
            }

            const verifyData = (await verifyRes.json()) as any;
            if (verifyRes.ok && verifyData.success && verifyData.redirectUrl) {
              window.location.href = verifyData.redirectUrl;
            } else {
              setErrorMessage(
                verifyData.error ||
                  "Payment succeeded, but order verification failed. Please contact support.",
              );
              setIsProcessing(false);
            }
          } catch (err: any) {
            setErrorMessage(err.message || "Payment verification failed.");
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setErrorMessage("Payment was closed or cancelled. You can retry whenever you're ready.");
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on("payment.failed", function (resp: any) {
        setErrorMessage(
          `Payment failed: ${resp.error?.description || "Transaction was declined."}`,
        );
        setIsProcessing(false);
      });
      rzpInstance.open();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header with Logo */}
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
            <span className="hidden sm:inline">256-Bit SSL Encrypted Checkout</span>
            <span className="sm:hidden text-[10px]">Secure Checkout</span>
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
                Shipping &amp; Delivery Details
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                Enter your delivery address below. Pay online via Razorpay for an instant 10% discount, or pay cash upon doorstep arrival.
              </p>
            </div>

            {errorMessage || actionData?.error ? (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage || actionData?.error}</span>
              </div>
            ) : null}

            {/* When COD is selected, use standard Form submission; when Prepaid is selected, use Razorpay handler */}
            <form
              method="post"
              onSubmit={isPrepaid ? handleRazorpayPayment : undefined}
              className="space-y-4"
            >
              <input type="hidden" name="variantId" value={loaderData.variantId} />
              <input type="hidden" name="productTitle" value={title} />
              <input type="hidden" name="variantTitle" value={variantTitle || ""} />
              <input type="hidden" name="productImage" value={image} />
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="totalAmount" value={totalPayable} />
              <input type="hidden" name="unitPrice" value={rawUnit} />
              <input type="hidden" name="paymentMode" value={paymentMode} />

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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
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
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
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
                        ? "border-[#2457D6] bg-[#EAF0FC] ring-2 ring-[#2457D6]/20"
                        : "border-[#E4E7ED] bg-white hover:bg-[#F8F7F3]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm text-[#192A46]">
                        <span>⚡</span>
                        <span>Prepaid / Online (Razorpay)</span>
                      </div>
                      <span className="text-[10px] font-black bg-[#2457D6] text-white px-2 py-0.5 rounded shadow-2xs">
                        10% OFF
                      </span>
                    </div>
                    <p className="text-[11px] text-[#475569]">
                      UPI, Google Pay, PhonePe, Paytm, Cards
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
              </div>

              {/* Payment Details Card */}
              {isPrepaid ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border-2 border-[#2457D6] bg-[#EAF0FC]/60 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span className="font-extrabold text-xs sm:text-sm text-[#192A46]">
                          Prepaid Selected • 10% Discount Active
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#2457D6] bg-white px-2 py-0.5 rounded-full border border-[#2457D6]/20">
                        Save ₹{prepaidSavings}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed">
                      You save an extra <strong>₹{prepaidSavings}</strong>! You will pay securely via Razorpay (UPI, GPay, PhonePe, Paytm, or Cards) upon clicking below.
                    </p>
                  </div>

                  {/* Verified Merchant Transparency Notice */}
                  <div className="p-3.5 sm:p-4 rounded-xl border border-[#2457D6]/25 bg-white text-[#192A46] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛡️</span>
                        <h4 className="font-bold text-xs sm:text-sm text-[#192A46]">
                          Official Verified Merchant Guarantee
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ✓ Verified Account
                      </span>
                    </div>

                    <p className="text-xs text-[#334155] leading-relaxed">
                      HypeeeCart is officially founded &amp; operated by <strong>Manaswi Dhoj Swar</strong> (Authorized Merchant).
                    </p>

                    <div className="bg-[#F8F7F3] p-3 rounded-lg border border-[#E4E7ED] text-[11px] text-[#334155] space-y-1">
                      <p className="font-bold text-[#192A46] flex items-center gap-1">
                        <span>ℹ️</span> Why does &ldquo;Manaswi Dhoj Swar&rdquo; appear on UPI / Bank statements?
                      </p>
                      <p className="text-[#64748B] leading-relaxed">
                        For zero processing fees and instant dispatch, our Razorpay gateway is directly linked to our registered proprietor banking account under <strong>Manaswi Dhoj Swar</strong>. When paying via Google Pay, PhonePe, Paytm, or NetBanking, you will see <strong>&ldquo;Manaswi Dhoj Swar&rdquo;</strong> as the verified beneficiary. Rest assured, your payment is 100% secure, protected by Razorpay &amp; backed by our 5-day replacement policy.
                      </p>
                    </div>
                  </div>
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
                disabled={isProcessing || isSubmittingCod}
                className="w-full py-4 px-6 rounded-xl text-sm sm:text-base font-extrabold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 active:scale-[0.99] text-white bg-[#2457D6] hover:bg-[#1e47b0]"
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Opening Razorpay Secure Gateway…</span>
                  </>
                ) : isSubmittingCod ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Confirming Cash on Delivery Order…</span>
                  </>
                ) : isPrepaid ? (
                  <>
                    <span>⚡</span>
                    <span>
                      Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} via Razorpay (10% OFF Applied)
                    </span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>
                      Confirm COD Order • Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} on Delivery
                    </span>
                  </>
                )}
              </button>

              <p className="text-center text-[10px] sm:text-[11px] text-[#64748B] pt-1">
                🔒 256-Bit Bank-Grade Encryption • {isPrepaid ? "Powered by Razorpay" : "Cash on Delivery Available Pan-India"}
              </p>
            </form>
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
                <div className="flex justify-between items-center text-xs text-[#2457D6] font-bold bg-[#EAF0FC] px-2.5 py-1.5 rounded-lg border border-[#2457D6]/20">
                  <span className="flex items-center gap-1">
                    <span>⚡</span>
                    <span>Prepaid Discount (10% OFF):</span>
                  </span>
                  <span className="font-extrabold text-[#2457D6]">
                    - {formatPrice({ amount: prepaidSavings.toFixed(2), currencyCode: currency })}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span>Pan-India Delivery:</span>
                <span className="font-bold text-emerald-700">
                  FREE (All Orders)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Processing Fee:</span>
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
              {isPrepaid ? (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span>10% Instant Prepaid Discount Applied</span>
                </div>
              ) : null}
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
                <span>
                  {isPrepaid
                    ? "100% Secure Payment via Razorpay (UPI, Cards, NetBanking)"
                    : "Inspect package upon doorstep arrival before paying"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
