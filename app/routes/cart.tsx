import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect } from "react";
import { Link } from "react-router";

import { publishCartViewed } from "~/components/AnalyticsTrackers";
import { CartLineItem } from "~/components/CartDrawer";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/money";
import { formatPageTitle, getShopNameFromRootMatch } from "~/lib/storefront-shop";

import type { Route } from "./+types/cart";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: formatPageTitle("Shopping Bag", getShopNameFromRootMatch(matches[0])) }];
}

const FREE_SHIPPING_THRESHOLD = 999;

export default function CartRoute() {
  const cart = useCart((state) => state.data);
  const loading = useCart((state) => state.loading);
  const lines = cart.lines.nodes;

  useEffect(() => {
    publishCartViewed(cart);
  }, [cart]);

  const subtotal = Number.parseFloat(cart.cost?.subtotalAmount?.amount ?? "0");
  const isEligible = subtotal >= FREE_SHIPPING_THRESHOLD;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const percentage = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto w-full flex-1 py-10 md:py-16"
    >
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E2DBD0]">
        <div>
          <h1 id="cart-page-title" tabIndex={-1} className="font-heading text-2xl sm:text-3xl font-bold text-[#282720]">
            Your Shopping Bag
          </h1>
          <p className="text-xs sm:text-sm text-[#635F53] mt-1">
            Review your discoveries before proceeding to secure checkout.
          </p>
        </div>
        <Link
          to="/collections"
          className="text-xs sm:text-sm font-semibold text-[#B77943] hover:text-[#9E6433] transition-colors"
        >
          Continue Shopping →
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#635F53]">
          <p>Loading cart items…</p>
        </div>
      ) : null}

      {!loading && lines.length === 0 ? (
        <div className="bg-white border border-[#E2DBD0] rounded-2xl p-12 text-center max-w-lg mx-auto my-8">
          <div className="size-16 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center text-3xl mx-auto mb-4">
            🛍️
          </div>
          <h2 className="font-heading text-xl font-bold text-[#282720]">Your bag is empty</h2>
          <p className="text-[#635F53] mt-2 text-xs sm:text-sm leading-relaxed">
            Discover curated problem-solvers, home organizers, and trending Indian lifestyle finds.
          </p>
          <Link
            to="/#trending"
            className="mt-6 inline-flex bg-[#B77943] hover:bg-[#9E6433] text-white px-7 py-3 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-colors shadow-xs"
          >
            Explore Trending Discoveries →
          </Link>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {/* Free shipping banner */}
            <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[#282720] mb-2">
                {isEligible ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <span>🎉</span>
                    <span>Congratulations! You qualify for FREE Pan-India Express Delivery</span>
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-[#B77943]">₹{Math.round(remaining)}</strong> more to unlock <strong>FREE Delivery</strong>
                  </span>
                )}
                <span className="text-[11px] text-[#7D786D]">{percentage}%</span>
              </div>
              <div className="w-full bg-[#E2DBD0] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${isEligible ? "bg-emerald-600" : "bg-[#B77943]"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Cart Line Items */}
            <div className="bg-white border border-[#E2DBD0] rounded-xl px-5 py-2">
              <ul role="list" className="divide-y divide-[#F0EBE1]">
                {lines.map((line) => (
                  <CartLineItem key={line.id} line={line} emptyCartFocusId="cart-page-title" />
                ))}
              </ul>
            </div>
          </div>

          {/* Cart Summary Card */}
          <aside
            className="border border-[#E2DBD0] bg-white rounded-xl p-6 h-fit shadow-xs space-y-4"
            aria-label="Order summary"
          >
            <h2 className="font-heading text-lg font-bold text-[#282720] border-b border-[#F0EBE1] pb-3">
              Order Summary
            </h2>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-[#5E5B52]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#282720]">{formatPrice(cart.cost.subtotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-[#5E5B52]">
                <span>Pan-India Delivery</span>
                <span className="text-emerald-700 font-semibold">{isEligible ? "FREE" : "₹49"}</span>
              </div>
              <div className="flex items-center justify-between text-[#5E5B52]">
                <span>Taxes & Duties</span>
                <span className="text-[#7D786D]">Included (GST)</span>
              </div>
              <div className="border-t border-[#E2DBD0] pt-3 flex items-center justify-between text-base font-bold text-[#282720]">
                <span>Total Amount</span>
                <span>{formatPrice(cart.cost.totalAmount)}</span>
              </div>
            </div>

            {cart.checkoutUrl ? (
              <div className="mt-4 space-y-2.5">
                <a
                  href={cart.checkoutUrl}
                  className="bg-[#B77943] hover:bg-[#9E6433] text-white inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold tracking-wide shadow-md transition-all active:scale-[0.98]"
                >
                  🔒 Proceed to Checkout
                </a>
                <ShopPayButton width="100%" borderRadius="8px" />
              </div>
            ) : null}

            {/* Trust assurances */}
            <div className="pt-3 border-t border-[#F0EBE1] space-y-2 text-xs text-[#635F53]">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Pay via UPI, Cards, NetBanking or Cash on Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Dispatches within 24 hours via express couriers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>7-Day Replacement Guarantee for any defects</span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
