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

export default function CartRoute() {
  const cart = useCart((state) => state.data);
  const loading = useCart((state) => state.loading);
  const lines = cart.lines.nodes;

  useEffect(() => {
    publishCartViewed(cart);
  }, [cart]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-3 sm:px-margin mx-auto w-full flex-1 py-6 md:py-12"
    >
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E4E7ED]">
        <div>
          <h1 id="cart-page-title" tabIndex={-1} className="font-heading text-xl sm:text-3xl font-extrabold text-[#192A46]">
            Your Shopping Bag
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 sm:mt-1">
            Review your discoveries before proceeding to secure checkout.
          </p>
        </div>
        <Link
          to="/collections"
          className="text-xs sm:text-sm font-bold text-[#2457D6] hover:underline hover:opacity-90 transition-colors"
        >
          Continue Shopping →
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#64748B]">
          <p>Loading cart items…</p>
        </div>
      ) : null}

      {!loading && lines.length === 0 ? (
        <div className="bg-white border border-[#E4E7ED] rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="size-16 rounded-full bg-[#F8F7F3] border border-[#E4E7ED] flex items-center justify-center text-3xl mx-auto mb-4">
            🛍️
          </div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-[#192A46]">Your bag is empty</h2>
          <p className="text-[#64748B] mt-2 text-xs sm:text-sm leading-relaxed">
            Discover curated problem-solvers, home organizers, and trending everyday essentials.
          </p>
          <Link
            to="/#trending"
            className="mt-6 inline-flex bg-[#2457D6] hover:opacity-90 text-white px-7 py-3 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-colors shadow-xs"
          >
            Explore Trending Discoveries →
          </Link>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <div className="grid gap-6 lg:gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {/* Free shipping banner */}
            <div className="bg-[#EAF0FC] border border-[#d2def5] rounded-xl p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[#192A46]">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span>🎉</span>
                  <span className="truncate">100% FREE Pan-India Delivery on All Orders!</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  FREE SHIPPING
                </span>
              </div>
              <div className="w-full bg-[#d2def5] h-1.5 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-600 rounded-full w-full" />
              </div>
            </div>

            {/* Cart Line Items */}
            <div className="bg-white border border-[#E4E7ED] rounded-xl px-4 sm:px-5 py-2 shadow-2xs">
              <ul role="list" className="divide-y divide-[#E4E7ED]">
                {lines.map((line) => (
                  <CartLineItem key={line.id} line={line} emptyCartFocusId="cart-page-title" />
                ))}
              </ul>
            </div>
          </div>

          {/* Cart Summary Card */}
          <aside
            className="border border-[#E4E7ED] bg-white rounded-xl p-4 sm:p-6 h-fit shadow-xs space-y-4"
            aria-label="Order summary"
          >
            <h2 className="font-heading text-base sm:text-lg font-bold text-[#192A46] border-b border-[#E4E7ED] pb-3">
              Order Summary
            </h2>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#192A46]">{formatPrice(cart.cost.subtotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Pan-India Delivery</span>
                <span className="text-emerald-700 font-semibold">FREE (All Orders)</span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Taxes & Duties</span>
                <span className="text-[#64748B]">Included (GST)</span>
              </div>
              <div className="border-t border-[#E4E7ED] pt-3 flex items-center justify-between text-base font-bold text-[#192A46]">
                <span>Total Amount</span>
                <span>{formatPrice(cart.cost.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {/* Prepaid Checkout (10% OFF) */}
              <Link
                to="/checkout/cod?prepaid=1"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FF5000] to-[#FF3800] hover:from-[#E64600] hover:to-[#D93000] text-white font-extrabold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>⚡</span>
                <span>PROCEED TO CHECKOUT (10% OFF)</span>
              </Link>

              {/* Cash on Delivery option */}
              <Link
                to="/checkout/cod"
                className="w-full h-11 rounded-xl bg-white hover:bg-[#F8F7F3] text-[#192A46] border-2 border-[#192A46] font-extrabold text-xs tracking-wide shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>💵</span>
                <span>ORDER VIA CASH ON DELIVERY</span>
              </Link>

              {cart.checkoutUrl ? (
                <div className="pt-1">
                  <ShopPayButton width="100%" borderRadius="8px" />
                </div>
              ) : null}
            </div>

            {/* Trust assurances */}
            <div className="pt-3 border-t border-[#E4E7ED] space-y-2 text-xs text-[#64748B]">
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
                <span>5-Day Replacement Guarantee for any defects</span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
