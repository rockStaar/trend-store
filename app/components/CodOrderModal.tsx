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

export function CodOrderModal({ isOpen, onClose, product }: CodOrderModalProps) {
  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Delhi");
  const [landmark, setLandmark] = useState("");

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // Calculations
  const unitAmount = parseFloat(product.unitPrice.amount) || 0;
  const subtotal = unitAmount * product.quantity;
  const isFreeDelivery = subtotal >= 999;
  const deliveryFee = isFreeDelivery ? 0 : 49;
  const totalPayable = subtotal + deliveryFee;
  const currency = product.unitPrice.currencyCode || "INR";

  // Reset or close on Escape key
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

  // Handle pincode auto-fill suggestions
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

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    if (!pincode || pincode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    if (!address.trim() || address.trim().length < 5) {
      setErrorMessage("Please enter your complete house/street address.");
      return;
    }

    if (!city.trim()) {
      setErrorMessage("Please enter your city/town.");
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
          name: name.trim(),
          phone: cleanPhone,
          address: address.trim(),
          pincode: pincode.trim(),
          city: city.trim(),
          state: state.trim(),
          landmark: landmark.trim(),
          productTitle: product.title,
          variantTitle: product.variantTitle,
          productImage: product.image,
          quantity: product.quantity,
          totalAmount: totalPayable,
          deliveryFee,
        }),
      });

      const result = (await response.json()) as any;

      if (response.ok && result.success) {
        setConfirmedOrder(result.order || { orderNumber: result.orderId, name, phone, address, pincode, city, state });
      } else {
        throw new Error(result.error || "Unable to confirm COD order. Please try again.");
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
      aria-labelledby="cod-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E2DBD0] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#282720] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            <div>
              <h2 id="cod-modal-title" className="font-heading font-bold text-sm sm:text-base leading-tight">
                {confirmedOrder ? "Order Confirmed!" : "Cash on Delivery (COD) Checkout"}
              </h2>
              <p className="text-[11px] text-[#FAF6F0]/80">
                {confirmedOrder
                  ? "Your order has been recorded successfully"
                  : "Pay in cash or scan UPI when the package reaches your door"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {confirmedOrder ? (
            /* ─────────────────────────────────────────────────────────────
               ORDER CONFIRMED SCREEN
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-5 animate-scale-up py-2">
              <div className="text-center space-y-2">
                <div className="size-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto shadow-inner">
                  ✓
                </div>
                <h3 className="font-serif text-2xl font-normal text-[#282720]">
                  Thank You, {confirmedOrder.name || name}!
                </h3>
                <p className="text-xs sm:text-sm text-[#5E5B52] max-w-md mx-auto">
                  Your Cash on Delivery order is officially placed and queued for dispatch.
                </p>
                <div className="inline-block bg-[#FAF6F0] border border-[#D7A84C] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#282720]">
                  Order ID: <span className="text-[#B77943]">{confirmedOrder.orderNumber}</span>
                </div>
              </div>

              {/* Order summary card */}
              <div className="border border-[#E2DBD0] rounded-2xl bg-[#FAF6F0]/60 p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-[#E2DBD0]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="size-12 rounded-lg object-cover bg-white border border-[#E2DBD0] shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs sm:text-sm text-[#282720] truncate">
                      {product.title}
                    </p>
                    <p className="text-xs text-[#7D786D]">
                      Quantity: <strong>{product.quantity} Pc</strong>
                      {product.variantTitle ? ` • ${product.variantTitle}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-extrabold text-sm text-[#282720]">
                    {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#5E5B52]">
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-bold text-[#282720]">Cash / UPI upon Delivery</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Address:</span>
                    <span className="font-semibold text-[#282720] text-right max-w-[220px] truncate">
                      {confirmedOrder.address}, {confirmedOrder.city} - {confirmedOrder.pincode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Number:</span>
                    <span className="font-semibold text-[#282720]">+91 {confirmedOrder.phone}</span>
                  </div>
                </div>
              </div>

              {/* 3-Step Next Timeline */}
              <div className="border border-[#E2DBD0] rounded-2xl bg-white p-4 space-y-2.5">
                <p className="text-xs font-bold text-[#282720] uppercase tracking-wide">
                  What Happens Next?
                </p>
                <div className="space-y-2 text-xs text-[#5E5B52]">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">1.</span>
                    <span><strong>Order Verification:</strong> Our fulfillment team will confirm your order via SMS &amp; WhatsApp.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">2.</span>
                    <span><strong>Express Dispatch:</strong> Dispatched in 24–48 hours via BlueDart / Delhivery / Xpressbees.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">3.</span>
                    <span><strong>Doorstep Delivery:</strong> Keep cash ready or scan courier’s UPI QR code (GPay/PhonePe/Paytm).</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full bg-[#282720] hover:bg-[#3D3A32] text-white py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               COD ORDER FORM
               ───────────────────────────────────────────────────────────── */
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Product item summary strip */}
              <div className="flex items-center justify-between p-3 bg-[#FAF6F0] rounded-xl border border-[#E2DBD0] gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="size-11 rounded-lg object-cover bg-white border border-[#E2DBD0] shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#282720] truncate">
                      {product.title}
                    </p>
                    <p className="text-[11px] text-[#7D786D]">
                      Pack of <strong>{product.quantity}</strong>
                      {isFreeDelivery ? " • Free Express Shipping" : " • ₹49 Shipping"}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sm sm:text-base text-[#282720]">
                    {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Pay on Delivery
                  </span>
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-name">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="cod-name"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                />
              </div>

              {/* Mobile Phone Number (+91) */}
              <div>
                <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-phone">
                  Mobile Number (for Courier &amp; WhatsApp updates) <span className="text-red-600">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E2DBD0] bg-[#FAF6F0] text-xs font-bold text-[#282720]">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="cod-phone"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    className="flex-1 bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-r-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-address">
                  House / Flat No., Building, Street <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="cod-address"
                  required
                  rows={2}
                  placeholder="e.g. Flat 402, Sunshine Apartments, 12th Main Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Pincode & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-pincode">
                    PIN Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="cod-pincode"
                    required
                    maxLength={6}
                    placeholder="6 digits"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-city">
                    City / Town <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="cod-city"
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* State & Optional Landmark */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-state">
                    State <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="cod-state"
                    required
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#282720] mb-1" htmlFor="cod-landmark">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    id="cod-landmark"
                    placeholder="Near school, mall..."
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full bg-[#FAF6F0]/40 border border-[#E2DBD0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#282720] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Reassurance badge */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                <span className="text-base shrink-0">🛡️</span>
                <span>
                  <strong>Zero Risk:</strong> Inspect your package upon arrival. Pay cash or scan UPI directly to the courier agent.
                </span>
              </div>

              {/* Error banner */}
              {errorMessage ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  ⚠️ {errorMessage}
                </div>
              ) : null}

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#282720] hover:bg-[#3D3A32] text-white py-3.5 px-4 rounded-xl text-sm sm:text-base font-extrabold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Confirming Your Order…</span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>Confirm Order — Pay {formatPrice({ amount: totalPayable.toFixed(2), currencyCode: currency })} on Delivery</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
