import { useEffect, useState } from "react";
import { formatPrice } from "~/lib/money";

export interface CodProductInfo {
  id: string;
  title: string;
  variantTitle?: string;
  image?: string;
  quantity: number;
  unitPrice: {
    amount: string;
    currencyCode: string;
  };
}

interface CodOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CodProductInfo;
  initialPrepaid?: boolean;
}

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

export function CodOrderModal({
  isOpen,
  onClose,
  product,
  initialPrepaid = false,
}: CodOrderModalProps) {
  // Payment mode toggle: prepaid (10% off) vs COD
  const [isPrepaid, setIsPrepaid] = useState(initialPrepaid);

  useEffect(() => {
    setIsPrepaid(initialPrepaid);
  }, [initialPrepaid, isOpen]);

  // Form fields matching the screenshot exactly
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");

  // Unique idempotency key per checkout attempt to prevent duplicates
  const [idempotencyKey] = useState(
    () => `cod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  );

  // Submission & Confirmed state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // Price calculations with automatic bundle discounts & 10% prepaid discount
  const unitAmount = parseFloat(product.unitPrice.amount) || 0;
  const rawSubtotal = Math.round(unitAmount * product.quantity);
  const bundlePercent = product.quantity >= 3 ? 25 : product.quantity === 2 ? 15 : 0;
  const bundleSavings = Math.round(rawSubtotal * (bundlePercent / 100));
  const subtotalAfterBundle = rawSubtotal - bundleSavings;

  const prepaidPercent = isPrepaid ? 10 : 0;
  const prepaidSavings = Math.round(subtotalAfterBundle * (prepaidPercent / 100));

  const isFreeDelivery = true;
  const shippingFee = 0;
  const totalPayable = subtotalAfterBundle - prepaidSavings;

  // Body scroll lock & ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Auto-detect city & state from 6-digit Pincode
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
      } else if (clean.startsWith("12") || clean.startsWith("13")) {
        setCity("Gurugram");
        setState("Haryana");
      } else if (clean.startsWith("20")) {
        setCity("Noida");
        setState("Uttar Pradesh");
      } else if (clean.startsWith("30")) {
        setCity("Jaipur");
        setState("Rajasthan");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    if (!firstName.trim()) {
      setErrorMessage("Please enter your First Name.");
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage("Please enter your Last Name.");
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Phone Number.");
      return;
    }
    if (!address.trim()) {
      setErrorMessage("Please enter your Address.");
      return;
    }
    if (!landmark.trim()) {
      setErrorMessage("Please enter a nearby Landmark.");
      return;
    }
    if (pincode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit Pincode.");
      return;
    }
    if (!state.trim()) {
      setErrorMessage("Please select your State.");
      return;
    }
    if (!city.trim()) {
      setErrorMessage("Please enter your City.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cod-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          variantId: product.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: cleanPhone,
          address: address.trim(),
          landmark: landmark.trim(),
          pincode: pincode.trim(),
          state: state.trim(),
          city: city.trim(),
          email: email.trim(),
          productTitle: product.title,
          variantTitle: product.variantTitle,
          productImage: product.image,
          quantity: product.quantity,
          unitPrice: unitAmount,
          totalAmount: totalPayable,
          deliveryFee: shippingFee,
          idempotencyKey,
        }),
      });

      const result = (await response.json()) as any;

      if (response.ok && result.success && result.order?.shopifyOrderId) {
        setConfirmedOrder(result.order);
      } else {
        throw new Error(result?.error || "Failed to create order in Shopify. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmedOrder(null);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={handleResetAndClose}
    >
      <div
        className="relative w-full max-w-[460px] bg-white rounded-2xl shadow-2xl p-5 sm:p-6 my-auto text-left border border-[#E4E7ED] max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Store Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E7ED] mb-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Store Logo" className="h-7 sm:h-8 w-auto object-contain" />
            <span className="text-[10px] font-bold text-[#2457D6] bg-[#EAF0FC] px-2 py-0.5 rounded-full border border-[#2457D6]/20">
              COD Checkout
            </span>
          </div>
          {/* Top Close Button (✕) */}
          <button
            type="button"
            onClick={handleResetAndClose}
            className="text-[#64748B] hover:text-[#192A46] transition-colors cursor-pointer text-lg font-bold p-1 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {confirmedOrder ? (
          /* ─────────────────────────────────────────────────────────────
             ORDER CONFIRMED SCREEN (100% CASH ON DELIVERY)
             ───────────────────────────────────────────────────────────── */
          <div className="space-y-4 py-2 text-center">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto font-bold shadow-inner">
              ✓
            </div>
            <div className="space-y-1">
              <h2 className="font-extrabold text-xl sm:text-2xl text-[#192A46]">
                Order Confirmed!
              </h2>
              <p className="text-xs text-[#64748B]">
                Thank you, <strong>{confirmedOrder.firstName || firstName}</strong>! Your Cash on Delivery order has been successfully placed.
              </p>
            </div>

            <div className="bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl p-2.5 inline-block text-xs font-bold text-[#192A46]">
              Shopify Order: <span className="text-[#2457D6]">{confirmedOrder.orderNumber}</span>
              {confirmedOrder.shopifyOrderId ? (
                <span className="text-[10px] text-[#64748B] block font-normal mt-0.5">
                  Shopify Admin ID: #{confirmedOrder.shopifyOrderId}
                </span>
              ) : null}
            </div>

            {/* Order summary card */}
            <div className="bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl p-3.5 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#E4E7ED]">
                <span className="font-bold text-[#192A46] truncate max-w-[240px]">
                  {confirmedOrder.productTitle || product.title} (Qty: {confirmedOrder.quantity || product.quantity})
                </span>
                <span className="font-black text-[#2457D6]">
                  Rs. {parseFloat(confirmedOrder.totalAmount || String(totalPayable)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-700">Cash on Delivery (COD)</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Deliver To:</span>
                <span className="font-medium text-[#192A46] text-right max-w-[210px] truncate">
                  {confirmedOrder.address}, {confirmedOrder.city} - {confirmedOrder.pincode}
                </span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Contact:</span>
                <span className="font-medium text-[#192A46]">+91 {confirmedOrder.phone}</span>
              </div>
            </div>

            {/* Delivery Note */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 text-left space-y-1">
              <p className="font-bold">🚚 Dispatches within 24 hours</p>
              <p className="leading-relaxed">
                Please keep <strong>Rs. {totalPayable.toFixed(2)}</strong> cash ready when our delivery executive arrives at your doorstep.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full bg-[#2457D6] hover:bg-[#1e47b0] text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             EXACT COD FORM MATCHING CLEAN SITE THEME
             ───────────────────────────────────────────────────────────── */
          <div>
            {/* Top Product Strip */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7ED] gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="size-12 rounded-lg object-contain p-0.5 bg-[#F8F7F3] border border-[#E4E7ED]"
                    />
                  ) : (
                    <div className="size-12 rounded-lg bg-[#F8F7F3] border border-[#E4E7ED]" />
                  )}
                  {/* Badge with quantity on top-right of image */}
                  <span className="absolute -top-1.5 -right-1.5 size-5 bg-[#2457D6] text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-xs">
                    {product.quantity}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-[#192A46] leading-snug line-clamp-2">
                  {product.title}
                </div>
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-[#192A46] shrink-0 whitespace-nowrap">
                Rs. {rawSubtotal.toFixed(2)}
              </div>
            </div>

            {/* Centered Heading */}
            <h2 className="text-center font-bold text-xs sm:text-sm text-[#192A46] my-2 tracking-wide">
              Select Payment &amp; Enter Address
            </h2>

            {/* Payment Mode Selector */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsPrepaid(true)}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  isPrepaid
                    ? "border-[#2457D6] bg-[#EAF0FC] ring-2 ring-[#2457D6]/20"
                    : "border-[#E4E7ED] bg-white hover:bg-[#F8F7F3]"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-black text-[#192A46]">Prepaid (UPI)</span>
                  <span className="text-[9px] font-black bg-[#2457D6] text-white px-1.5 py-0.5 rounded">
                    10% OFF
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B]">GPay, PhonePe, Cards</p>
              </button>

              <button
                type="button"
                onClick={() => setIsPrepaid(false)}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  !isPrepaid
                    ? "border-[#192A46] bg-[#F8F7F3] ring-2 ring-[#192A46]/20"
                    : "border-[#E4E7ED] bg-white hover:bg-[#F8F7F3]"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-black text-[#192A46]">Cash on Delivery</span>
                  <span className="text-[9px] font-bold text-[#64748B]">Doorstep</span>
                </div>
                <p className="text-[10px] text-[#64748B]">Pay cash upon delivery</p>
              </button>
            </div>

            {/* Subtotal / Bundle Savings / Prepaid Savings / Total Box */}
            <div className="bg-[#F8F7F3] rounded-xl p-3 text-xs space-y-1.5 mb-3 border border-[#E4E7ED]">
              <div className="flex justify-between text-[#64748B]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#192A46]">Rs. {rawSubtotal.toFixed(2)}</span>
              </div>
              {bundleSavings > 0 ? (
                <div className="flex justify-between items-center text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <span>🎉 Bundle Discount ({bundlePercent}% OFF)</span>
                  <span>- Rs. {bundleSavings.toFixed(2)}</span>
                </div>
              ) : null}
              {isPrepaid && prepaidSavings > 0 ? (
                <div className="flex justify-between items-center text-xs text-[#2457D6] font-bold bg-[#EAF0FC] px-2 py-1 rounded border border-[#2457D6]/20">
                  <span>⚡ 10% Prepaid Savings</span>
                  <span className="font-extrabold text-[#2457D6]">- Rs. {prepaidSavings.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#64748B]">
                <span>Pan-India Delivery</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between font-extrabold text-xs sm:text-sm text-[#192A46] pt-1.5 border-t border-[#E4E7ED]">
                <span>Total Amount to Pay</span>
                <span className="text-[#2457D6] text-base font-black">Rs. {totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage ? (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-semibold text-center">
                ⚠️ {errorMessage}
              </div>
            ) : null}

            {/* Form Fields matching the clean site theme */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Row 1: First Name */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-first-name">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3 py-2 border-r border-[#E4E7ED] text-[#2457D6] flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-first-name"
                    type="text"
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Last name */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-last-name">
                  Last name <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3 py-2 border-r border-[#E4E7ED] text-[#2457D6] flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-last-name"
                    type="text"
                    required
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 3: Phone number */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-phone-number">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3 py-2 border-r border-[#E4E7ED] text-[#2457D6] flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
                    </svg>
                  </div>
                  <input
                    id="cod-phone-number"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-address">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3 py-2 border-r border-[#E4E7ED] text-[#2457D6] flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-address"
                    type="text"
                    required
                    placeholder="House / Flat No., Road, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 5: Landmark */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-landmark">
                  Landmark
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3 py-2 border-r border-[#E4E7ED] text-[#2457D6] flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-landmark"
                    type="text"
                    placeholder="Nearby school, hospital, shop (Optional)"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 6: Pincode */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-pincode">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3.5 py-2 border-r border-[#E4E7ED] text-[#2457D6] font-bold text-xs flex items-center justify-center shrink-0">
                    #
                  </div>
                  <input
                    id="cod-pincode"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="6-digit Pincode"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 7: State */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-state">
                  State <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <select
                    id="cod-state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#192A46] focus:outline-none bg-white cursor-pointer font-medium"
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
              </div>

              {/* Row 8: City */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-city">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3 py-2 border-r border-[#E4E7ED] text-[#2457D6] flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-city"
                    type="text"
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 9: Email */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-[#192A46]" htmlFor="cod-email">
                  Email
                </label>
                <div className="flex border border-[#E4E7ED] rounded-xl overflow-hidden focus-within:border-[#2457D6] focus-within:ring-2 focus-within:ring-[#2457D6]/20 bg-white">
                  <div className="bg-[#F8F7F3] px-3.5 py-2 border-r border-[#E4E7ED] text-[#2457D6] font-bold text-xs flex items-center justify-center shrink-0">
                    @
                  </div>
                  <input
                    id="cod-email"
                    type="email"
                    placeholder="Email (Optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-[#192A46] placeholder:text-[#94A3B8] focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Complete Order Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2457D6] hover:bg-[#1e47b0] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm tracking-wider uppercase mt-4 cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing {isPrepaid ? "Prepaid" : "COD"} Order…</span>
                  </>
                ) : (
                  <span>
                    {isPrepaid
                      ? `COMPLETE PREPAID ORDER (10% OFF) - Rs. ${totalPayable.toFixed(2)}`
                      : `COMPLETE COD ORDER - Rs. ${totalPayable.toFixed(2)}`}
                  </span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
