import { Link } from "react-router";

import { closeMobileNavDrawer, MOBILE_NAV_DRAWER_ID, openDialogFallback } from "~/lib/cart-drawer";

export function MobileNav() {
  return (
    <dialog
      id={MOBILE_NAV_DRAWER_ID}
      className="drawer-left bg-[#F7F3EC] text-[#282720] border-e border-[#E2DBD0]"
      aria-labelledby="mobile-nav-title"
      data-testid="mobile-nav"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="min-h-touch-target relative flex shrink-0 items-center justify-between px-5 py-4 border-b border-[#E2DBD0]">
          <Link to="/" onClick={() => closeMobileNavDrawer()} className="inline-block">
            <img
              src="/logo.png"
              alt="HypeeeCart"
              className="h-8 w-auto object-contain"
            />
            <span className="sr-only" id="mobile-nav-title">HypeeeCart</span>
          </Link>
          <button
            type="button"
            commandfor={MOBILE_NAV_DRAWER_ID}
            command="close"
            className="button-icon focus-visible:outline-accent inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#EFE9DE] text-[#282720] hover:bg-[#E5DFD3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Close"
            onClick={() => closeMobileNavDrawer()}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <nav aria-label="Mobile navigation">
            <p className="text-xs uppercase font-semibold text-[#B77943] tracking-wider mb-3">
              Explore HypeeeCart
            </p>
            <ul role="list" className="flex flex-col space-y-1">
              <li>
                <Link
                  to="/"
                  className="min-h-touch-target text-[#282720] flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>Home</span>
                  <span className="text-xs text-[#7D786D]">Explore</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#trending"
                  className="min-h-touch-target text-[#282720] flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span className="flex items-center gap-2">
                    <span>Trending Finds</span>
                    <span className="bg-[#B77943] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">HOT</span>
                  </span>
                  <span className="text-xs text-[#7D786D]">Best Sellers</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#essentials"
                  className="min-h-touch-target text-[#282720] flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>Home Essentials</span>
                  <span className="text-xs text-[#7D786D]">Practical</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#problem-solvers"
                  className="min-h-touch-target text-[#282720] flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>Gadgets &amp; Accessories</span>
                  <span className="text-xs text-[#7D786D]">Viral Finds</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/collections"
                  className="min-h-touch-target text-[#282720] flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>All Collections</span>
                  <span className="text-xs text-[#7D786D]">Catalog</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#why-us"
                  className="min-h-touch-target text-[#282720] flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>Why HypeeeCart</span>
                  <span className="text-xs text-[#7D786D]">Our Promise</span>
                </Link>
              </li>
            </ul>

            <hr className="my-6 border-[#E2DBD0]" />

            <p className="text-xs uppercase font-semibold text-[#B77943] tracking-wider mb-3">
              Customer Support & Policies
            </p>
            <ul role="list" className="flex flex-col space-y-1">
              <li>
                <Link
                  to="/policies/shipping-policy"
                  className="min-h-touch-target text-[#5E5B52] hover:text-[#282720] flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-normal hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>🚚</span>
                  <span>Pan-India Shipping & Delivery</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/policies/refund-policy"
                  className="min-h-touch-target text-[#5E5B52] hover:text-[#282720] flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-normal hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>🔄</span>
                  <span>7-Day Replacement & Refunds</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/policies/faq"
                  className="min-h-touch-target text-[#5E5B52] hover:text-[#282720] flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-normal hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>❓</span>
                  <span>Frequently Asked Questions</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/policies/contact"
                  className="min-h-touch-target text-[#5E5B52] hover:text-[#282720] flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-normal hover:bg-[#EFE9DE] motion-safe:transition-colors"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span>💬</span>
                  <span>WhatsApp & Email Support</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="p-5 border-t border-[#E2DBD0] bg-[#EFE9DE] space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#5E5B52]">
            <span className="size-2 rounded-full bg-emerald-600"></span>
            <span>Fast Express Dispatch Across 19,000+ Indian Pincodes</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#7D786D]">
            <span>100% Genuine Quality</span>
            <span>COD & UPI Supported</span>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function MobileNavTrigger() {
  return (
    <button
      type="button"
      commandfor={MOBILE_NAV_DRAWER_ID}
      command="show-modal"
      className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded-full font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
      aria-label="Open navigation menu"
      aria-controls={MOBILE_NAV_DRAWER_ID}
      aria-haspopup="dialog"
      data-testid="nav-trigger"
      onClick={() => openDialogFallback(MOBILE_NAV_DRAWER_ID)}
    >
      <img src="/icons/icon-menu.svg" alt="" className="size-5" aria-hidden="true" />
    </button>
  );
}
