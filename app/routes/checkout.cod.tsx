import { gql } from "@shopify/hydrogen";
import { useEffect, useState } from "react";
import { Link, useNavigation } from "react-router";
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
    { title: "Fast & Secure Online Checkout | 10% Prepaid Discount" },
    {
      name: "description",
      content:
        "Fast and secure online checkout via Razorpay (UPI, GPay, PhonePe, Cards) with instant 10% prepaid discount.",
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
  const discountAmount = parseFloat(String(formData.get("discountAmount") || "0")) || 0;
  const productImage = String(formData.get("productImage") || "");
  const razorpayPaymentId = String(formData.get("razorpayPaymentId") || `test_rzp_${Date.now()}`);

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
  const idempotencyKey = `prepaid_${phone}_${rawVariantId}_${razorpayPaymentId}`;

  // Create real PAID order in Shopify with the 10% discount applied!
  const result = await createShopifyCodOrder(env, {
    variantId: rawVariantId,
    quantity,
    unitPrice: unitPrice > 0 ? unitPrice : undefined,
    deliveryFee: 0,
    clientTotal: totalAmount,
    discountAmount,
    paymentMethod: "razorpay",
    razorpayPaymentId,
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
          payment_method: `Razorpay Online (${razorpayPaymentId})`,
          status: "paid",
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
  )}&qty=${quantity}&image=${encodeURIComponent(productImage)}&paid=1`;

  return { success: true, redirectUrl };
}

export default function CheckoutOnlinePage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { handle, quantity, title, image, variantTitle, unitPrice, razorpayKeyId } =
    loaderData;

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
  const [showConfigModal, setShowConfigModal] = useState(false);

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

  // 10% Off on ALL Online Prepaid Orders
  const prepaidSavings = Math.round(subtotalAfterBundle * 0.1);
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

  const handlePayWithRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      // Step 1: Create Order on Razorpay backend
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

      const orderData = await res.json();

      // If Razorpay keys are not yet configured in .env, display informative setup guide
      if (orderData.requiresConfig) {
        setIsProcessing(false);
        setShowConfigModal(true);
        return;
      }

      if (!res.ok || orderData.error) {
        setErrorMessage(orderData.error || "Could not initialize Razorpay payment.");
        setIsProcessing(false);
        return;
      }

      // Step 2: Open official Razorpay Checkout popup
      const activeKey = orderData.keyId || razorpayKeyId;

      if (!activeKey) {
        setIsProcessing(false);
        setShowConfigModal(true);
        return;
      }

      if (typeof window === "undefined" || !(window as any).Razorpay) {
        setErrorMessage("Razorpay payment gateway is loading. Please try again in a few seconds.");
        setIsProcessing(false);
        return;
      }

      const options: any = {
        key: activeKey,
        amount: orderData.amount || Math.round(totalPayable * 100),
        currency: orderData.currency || "INR",
        name: "HypeeeCart",
        description: `Order by Manaswi Dhoj Swar (10% Discount Applied)`,
        image: "/logo.png",
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
            // Step 3: Verify payment and create PAID order in Shopify
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

            const verifyData = await verifyRes.json();
            if (verifyData.success && verifyData.redirectUrl) {
              window.location.href = verifyData.redirectUrl;
            } else {
              setErrorMessage(
                verifyData.error ||
                  "Payment succeeded, but Shopify order sync encountered an issue. Please contact support.",
              );
              setIsProcessing(false);
            }
          } catch (err: any) {
            setErrorMessage("Failed to verify payment with server. Please contact support.");
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      if (orderData.orderId) {
        options.order_id = orderData.orderId;
      }

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on("payment.failed", function (failResponse: any) {
        setErrorMessage(
          `Payment Failed: ${failResponse.error?.description || "Transaction was declined."}`,
        );
        setIsProcessing(false);
      });
      rzpInstance.open();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  // Fallback for instant test order creation when Razorpay keys are being set up
  const handleCreateTestPaidOrder = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    setShowConfigModal(false);

    const dummyPaymentId = `pay_test_${Date.now()}`;
    try {
      const verifyRes = await fetch("/api/razorpay/verify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: dummyPaymentId,
          razorpay_order_id: `order_test_${Date.now()}`,
          razorpay_signature: "test_signature",
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
      const data = await verifyRes.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setErrorMessage(data.error || "Could not create order in Shopify.");
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create order.");
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
          {/* Left Column: Delivery & Online Payment Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E4E7ED] p-6 sm:p-8 shadow-xs">
            <div className="border-b border-[#E4E7ED] pb-4 mb-6">
              <span className="text-[11px] font-bold text-[#2457D6] tracking-widest uppercase block mb-1">
                STEP 1 OF 1 • FAST SECURE CHECKOUT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#192A46] leading-tight">
                Shipping &amp; Delivery Details
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                Enter your shipping address. 10% instant prepaid discount is automatically applied to your order.
              </p>
            </div>

            {errorMessage || actionData?.error ? (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage || actionData?.error}</span>
              </div>
            ) : null}

            <form onSubmit={handlePayWithRazorpay} className="space-y-4">
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

              {/* Mobile Number */}
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

              {/* ── EXCLUSIVE PAYMENT METHOD: 100% SECURE ONLINE PAYMENT (RAZORPAY) ── */}
              <div className="pt-3 border-t border-[#E4E7ED] space-y-3">
                <label className="block text-xs font-bold text-[#192A46]">
                  Payment Method
                </label>

                {/* Pre-selected Online Payment Card */}
                <div className="p-4 rounded-xl border-2 border-[#2457D6] bg-[#EAF0FC] ring-2 ring-[#2457D6]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <span className="font-extrabold text-xs sm:text-sm text-[#192A46]">
                        Instant Online Payment (Razorpay)
                      </span>
                    </div>
                    <span className="text-[10px] font-black bg-[#2457D6] text-white px-2 py-0.5 rounded shadow-2xs uppercase">
                      10% OFF ACTIVE
                    </span>
                  </div>

                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    Pay securely using Google Pay, PhonePe, Paytm, BHIM UPI, Debit/Credit Cards, or NetBanking.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#192A46] font-semibold">
                    <span className="bg-white px-2 py-1 rounded border border-[#2457D6]/20 shadow-2xs">
                      🟢 GPay
                    </span>
                    <span className="bg-white px-2 py-1 rounded border border-[#2457D6]/20 shadow-2xs">
                      🟣 PhonePe
                    </span>
                    <span className="bg-white px-2 py-1 rounded border border-[#2457D6]/20 shadow-2xs">
                      🔵 Paytm
                    </span>
                    <span className="bg-white px-2 py-1 rounded border border-[#2457D6]/20 shadow-2xs">
                      ⚡ Any UPI ID / QR
                    </span>
                    <span className="bg-white px-2 py-1 rounded border border-[#2457D6]/20 shadow-2xs">
                      💳 Cards / NetBanking
                    </span>
                  </div>
                </div>

                {/* ── VERIFIED MERCHANT TRANSPARENCY NOTICE (PREVENT FRAUD SUSPICION) ── */}
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

              {/* Submit CTA (Opens Razorpay) */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl text-sm sm:text-base font-extrabold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4 active:scale-[0.99] text-white bg-[#2457D6] hover:bg-[#1e47b0]"
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Opening Razorpay Secure Gateway…</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>
                      Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} via UPI / Card (10% OFF Applied)
                    </span>
                  </>
                )}
              </button>

              <p className="text-center text-[10px] sm:text-[11px] text-[#64748B] pt-1">
                🔒 256-Bit Bank-Grade Encryption • Powered by Razorpay • Instant Order Confirmation
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

              {/* 10% Prepaid Discount is ALWAYS applied */}
              <div className="flex justify-between items-center text-xs text-[#2457D6] font-bold bg-[#EAF0FC] px-2.5 py-1.5 rounded-lg border border-[#2457D6]/20">
                <span className="flex items-center gap-1">
                  <span>⚡</span>
                  <span>Prepaid Discount (10% OFF):</span>
                </span>
                <span className="font-extrabold text-[#2457D6]">
                  - {formatPrice({ amount: prepaidSavings.toFixed(2), currencyCode: currency })}
                </span>
              </div>

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
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>10% Instant Prepaid Discount Applied</span>
              </div>
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
                <span>100% Secure Payment via Razorpay (UPI, Cards, NetBanking)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Key Setup Guide / Test Modal */}
      {showConfigModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#E4E7ED] pb-3">
              <div className="flex items-center gap-2 text-[#2457D6] font-bold text-base">
                <span>⚙️</span>
                <span>Razorpay Gateway Configuration</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#334155] leading-relaxed">
              <p>
                To launch the live/test Razorpay popup, please add your Razorpay API keys to your project&apos;s <code className="bg-gray-100 text-[#192A46] px-1.5 py-0.5 rounded font-mono font-bold">.env</code> file:
              </p>
              <div className="bg-[#192A46] text-[#EAF0FC] p-3.5 rounded-xl font-mono text-[11px] space-y-1">
                <div>RAZORPAY_KEY_ID=rzp_test_... (or rzp_live_...)</div>
                <div>RAZORPAY_KEY_SECRET=your_razorpay_secret</div>
              </div>
              <p className="text-[11px] text-[#64748B]">
                You can obtain these keys in 1 click from your <strong>Razorpay Dashboard &gt; Settings &gt; API Keys</strong>.
              </p>
            </div>

            <div className="bg-[#EAF0FC] p-3 rounded-xl border border-[#2457D6]/20 text-xs text-[#192A46]">
              <strong>💡 Testing Without Keys Right Now?</strong>
              <p className="text-[11px] text-[#475569] mt-0.5">
                Click below to simulate a completed Razorpay payment. It will create a real <strong>PAID</strong> order with the <strong>10% discount</strong> in your Shopify dashboard!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCreateTestPaidOrder}
                className="flex-1 bg-[#2457D6] hover:bg-[#1e47b0] text-white py-3 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Simulate Paid Order in Shopify
              </button>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-[#192A46] py-3 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
