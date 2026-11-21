import { Link } from "react-router";
import { formatPrice } from "~/lib/money";
import type { Route } from "./+types/order-confirmed";

export function meta() {
  return [
    { title: "Order Confirmed! | Cash on Delivery" },
    { name: "description", content: "Your Cash on Delivery order is confirmed." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get("orderNumber") || "";
  const shopifyOrderId = url.searchParams.get("shopifyOrderId") || "";
  const name = url.searchParams.get("name") || "Valued Customer";
  const phone = url.searchParams.get("phone") || "";
  const address = url.searchParams.get("address") || "";
  const city = url.searchParams.get("city") || "";
  const state = url.searchParams.get("state") || "India";
  const pincode = url.searchParams.get("pincode") || "";
  const total = url.searchParams.get("total") || "699";
  const product = url.searchParams.get("product") || "HypeeeCart Find";
  const qty = url.searchParams.get("qty") || "1";
  const image = url.searchParams.get("image") || "";

  return {
    orderNumber,
    shopifyOrderId,
    name,
    phone,
    address,
    city,
    state,
    pincode,
    total,
    product,
    qty,
    image,
  };
}

export default function OrderConfirmedPage({ loaderData }: Route.ComponentProps) {
  const {
    orderNumber,
    shopifyOrderId,
    name,
    phone,
    address,
    city,
    state,
    pincode,
    total,
    product,
    qty,
    image,
  } = loaderData;

  const totalAmount = parseFloat(total) || 0;

  return (
    <div className="min-h-screen bg-[#F8F7F3] py-10 sm:py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Site Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group">
            <img
              src="/logo.png"
              alt="Store Logo"
              className="h-9 sm:h-11 w-auto mx-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E7ED] shadow-xs p-6 sm:p-10 space-y-7 text-center">
          {/* Celebration Icon & Header */}
          <div className="space-y-3">
            <div className="size-16 sm:size-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-inner">
              ✓
            </div>
            <span className="text-[11px] font-bold text-[#2457D6] tracking-widest uppercase block">
              ORDER CONFIRMED • CASH ON DELIVERY
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#192A46] leading-tight">
              Thank You, {name}!
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
              Your Cash on Delivery order has been successfully placed and forwarded to our packaging station.
            </p>
            <div className="inline-block bg-[#F8F7F3] border border-[#E4E7ED] px-4 py-1.5 rounded-xl text-xs font-bold text-[#192A46]">
              Shopify Order: <span className="text-[#2457D6]">{orderNumber || "Confirmed"}</span>
              {shopifyOrderId ? (
                <span className="text-[10px] text-[#64748B] block font-normal mt-0.5">
                  Admin ID: #{shopifyOrderId}
                </span>
              ) : null}
            </div>
          </div>

          {/* Order Details Card */}
          <div className="text-left border border-[#E4E7ED] rounded-xl bg-[#F8F7F3]/70 p-5 space-y-4">
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#E4E7ED]">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="size-14 rounded-xl object-contain bg-white border border-[#E4E7ED] shrink-0 p-1"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#192A46] truncate">
                  {product}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pack Quantity: <strong className="text-[#192A46]">{qty} Pc{parseInt(qty, 10) > 1 ? "s" : ""}</strong>
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-base text-[#2457D6]">
                  {formatPrice({ amount: totalAmount.toFixed(2), currencyCode: "INR" })}
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Pay on Delivery
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-bold text-[#192A46]">Cash or UPI QR upon Delivery</span>
              </div>
              {address ? (
                <div className="flex justify-between">
                  <span>Shipping Address:</span>
                  <span className="font-semibold text-[#192A46] text-right max-w-[240px]">
                    {address}, {city}, {state} - {pincode}
                  </span>
                </div>
              ) : null}
              {phone ? (
                <div className="flex justify-between">
                  <span>Contact Number:</span>
                  <span className="font-semibold text-[#192A46]">+91 {phone}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* 3-Step Delivery Process */}
          <div className="text-left border border-[#E4E7ED] rounded-xl bg-white p-5 space-y-3">
            <p className="text-xs font-bold text-[#192A46] uppercase tracking-wider">
              Fulfillment &amp; Delivery Timeline
            </p>
            <div className="space-y-3 text-xs text-[#64748B]">
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                  1
                </span>
                <div>
                  <strong className="text-[#192A46]">Order Verified:</strong> We will send a confirmation link &amp; receipt via WhatsApp/SMS to +91 {phone || "your number"}.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                  2
                </span>
                <div>
                  <strong className="text-[#192A46]">Express Dispatch:</strong> Dispatched in 24–48 hours via BlueDart / Delhivery / Xpressbees.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                  3
                </span>
                <div>
                  <strong className="text-[#192A46]">Doorstep Delivery:</strong> Keep exact cash ready or scan courier’s UPI QR code (GPay/PhonePe/Paytm) upon delivery.
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Link
              to="/collections"
              className="inline-flex w-full sm:w-auto items-center justify-center bg-[#2457D6] hover:bg-[#1e47b0] text-white px-8 py-3.5 rounded-xl text-sm font-extrabold tracking-wide transition-all shadow-md cursor-pointer active:scale-95"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

