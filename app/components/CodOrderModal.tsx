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

export function CodOrderModal({ isOpen, onClose, product }: CodOrderModalProps) {
  // Form fields matching the screenshot exactly
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("Delhi");
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

  // Price calculations
  const unitAmount = parseFloat(product.unitPrice.amount) || 0;
  const subtotal = Math.round(unitAmount * product.quantity);
  const isFreeDelivery = subtotal >= 999;
  const shippingFee = isFreeDelivery ? 0 : 49;
  const totalPayable = subtotal + shippingFee;

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
        className="relative w-full max-w-[450px] bg-white rounded-2xl shadow-2xl p-5 sm:p-6 my-auto text-left border border-gray-100 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button (✕) */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors cursor-pointer text-lg font-bold p-1 leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {confirmedOrder ? (
          /* ─────────────────────────────────────────────────────────────
             ORDER CONFIRMED SCREEN (100% CASH ON DELIVERY)
             ───────────────────────────────────────────────────────────── */
          <div className="space-y-4 py-2 text-center">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto font-bold shadow-inner">
              ✓
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-xl sm:text-2xl text-[#282720]">
                Order Confirmed!
              </h2>
              <p className="text-xs text-[#5E5B52]">
                Thank you, <strong>{confirmedOrder.firstName || firstName}</strong>! Your Cash on Delivery order has been successfully placed.
              </p>
            </div>

            <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-xl p-2.5 inline-block text-xs font-bold text-[#282720]">
              Shopify Order: <span className="text-[#B77943]">{confirmedOrder.orderNumber}</span>
              {confirmedOrder.shopifyOrderId ? (
                <span className="text-[10px] text-[#7D786D] block font-normal mt-0.5">
                  Shopify Admin ID: #{confirmedOrder.shopifyOrderId}
                </span>
              ) : null}
            </div>

            {/* Order summary card */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-800 truncate max-w-[240px]">
                  {confirmedOrder.productTitle || product.title} (Qty: {confirmedOrder.quantity || product.quantity})
                </span>
                <span className="font-extrabold text-black">
                  Rs. {parseFloat(confirmedOrder.totalAmount || String(totalPayable)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-700">Cash on Delivery (COD)</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Deliver To:</span>
                <span className="font-medium text-gray-800 text-right max-w-[210px] truncate">
                  {confirmedOrder.address}, {confirmedOrder.city} - {confirmedOrder.pincode}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Contact:</span>
                <span className="font-medium text-gray-800">+91 {confirmedOrder.phone}</span>
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
              className="w-full bg-black hover:bg-neutral-800 text-white font-bold py-3 px-4 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             EXACT COD FORM MATCHING USER REFERENCE SCREENSHOT
             ───────────────────────────────────────────────────────────── */
          <div>
            {/* Top Product Strip */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="size-12 rounded object-cover bg-gray-50 border border-gray-200"
                    />
                  ) : (
                    <div className="size-12 rounded bg-gray-100 border border-gray-200" />
                  )}
                  {/* Badge with quantity on top-right of image */}
                  <span className="absolute -top-1.5 -right-1.5 size-5 bg-gray-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-xs">
                    {product.quantity}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-black leading-snug line-clamp-2">
                  {product.title}
                </div>
              </div>
              <div className="font-bold text-xs sm:text-sm text-black shrink-0 whitespace-nowrap">
                Rs. {subtotal.toFixed(2)}
              </div>
            </div>

            {/* Centered Heading */}
            <h2 className="text-center font-bold text-sm sm:text-base text-black my-3 tracking-wide">
              Enter Your Complete Address
            </h2>

            {/* Subtotal / Shipping / Total Box */}
            <div className="bg-[#EDEDED]/70 rounded-lg p-3 text-xs space-y-1 mb-3.5 border border-gray-200">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold text-black">Rs. {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span className="font-semibold text-black">
                  {isFreeDelivery ? "Free" : `Rs. ${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-xs sm:text-sm text-black pt-1 border-t border-gray-300">
                <span>Total</span>
                <span>Rs. {totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage ? (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 font-semibold text-center">
                ⚠️ {errorMessage}
              </div>
            ) : null}

            {/* Form Fields matching the screenshot */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Row 1: First Name */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-first-name">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600 flex items-center justify-center shrink-0">
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
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Last name */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-last-name">
                  Last name <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600 flex items-center justify-center shrink-0">
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
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 3: Phone number */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-phone-number">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600 flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
                    </svg>
                  </div>
                  <input
                    id="cod-phone-number"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-address">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600 flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-address"
                    type="text"
                    required
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 5: Landmark */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-landmark">
                  Landmark <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600 flex items-center justify-center shrink-0">
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="cod-landmark"
                    type="text"
                    required
                    placeholder="Nearby school, hospital, shop"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 6: Pincode */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-pincode">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3.5 py-2 border-r border-gray-300 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0">
                    #
                  </div>
                  <input
                    id="cod-pincode"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Pincode"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 7: State */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-state">
                  State <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <select
                    id="cod-state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-black focus:outline-none bg-white cursor-pointer"
                  >
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
                <label className="text-xs font-bold text-black" htmlFor="cod-city">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600 flex items-center justify-center shrink-0">
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
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Row 9: Email */}
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] items-center gap-2">
                <label className="text-xs font-bold text-black" htmlFor="cod-email">
                  Email
                </label>
                <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-black bg-white">
                  <div className="bg-gray-100 px-3.5 py-2 border-r border-gray-300 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0">
                    @
                  </div>
                  <input
                    id="cod-email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Complete Order Button matching screenshot */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold py-3.5 px-4 rounded text-xs sm:text-sm tracking-wider uppercase mt-4 cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing Order…</span>
                  </>
                ) : (
                  <span>COMPLETE ORDER - Rs. {totalPayable.toFixed(2)}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
