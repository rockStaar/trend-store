import { Link } from "react-router";

import type { StorefrontShop } from "~/lib/storefront-shop";
import { PaymentMethodIcon } from "./PaymentMethodIcon";

const linkClass =
  "text-[#635F53] hover:text-[#B77943] focus-visible:outline-accent inline-flex items-center text-sm font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors py-1";

export function Footer({ shopInfo }: { shopInfo: StorefrontShop }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#EFE9DE] border-t border-[#E2DBD0] mt-16 text-[#282720]">
      {/* Brand Trust Strip */}
      <div className="border-b border-[#E2DBD0] bg-[#FAF6F0] py-8">
        <div className="max-w-page px-margin mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#B77943]/15 text-[#B77943]">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#282720]">100% Quality Checked</h4>
              <p className="text-xs text-[#635F53] mt-0.5">Every unit inspected before dispatch</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#B77943]/15 text-[#B77943]">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#282720]">Pan-India Express Delivery</h4>
              <p className="text-xs text-[#635F53] mt-0.5">Dispatches in 24h • 3–5 days transit</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#B77943]/15 text-[#B77943]">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#282720]">7-Day Replacement</h4>
              <p className="text-xs text-[#635F53] mt-0.5">Hassle-free guarantee for damages</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#B77943]/15 text-[#B77943]">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#282720]">Verified Secure Payments</h4>
              <p className="text-xs text-[#635F53] mt-0.5">UPI, Cards, NetBanking & COD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-page px-margin mx-auto py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex flex-col items-start gap-1">
              <Link to="/" className="inline-block">
                <img
                  src="/logo.png"
                  alt="HypeeeCart"
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <span className="text-[10px] uppercase tracking-widest text-[#B77943] font-bold mt-1">
                Trending Finds. Everyday Wins.
              </span>
            </div>
            <p className="text-xs text-[#635F53] leading-relaxed">
              Discover clever home essentials, trending gadgets, and practical everyday upgrades made to bring convenience to your home.
            </p>
            <div className="pt-2 text-xs text-[#635F53] space-y-1">
              <p className="font-semibold text-[#282720]">Customer Support:</p>
              <p>Email: <a href="mailto:support@hypeeecart.in" className="text-[#B77943] hover:underline font-medium">support@hypeeecart.in</a></p>
              <p>Mon–Sat: 10:00 AM – 6:30 PM IST</p>
            </div>
          </div>

          {/* Useful Links Column 1 */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720] mb-3.5">
              Useful Links
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/#home-kitchen" className={linkClass}>
                  Home &amp; Kitchen
                </Link>
              </li>
              <li>
                <Link to="/search?q=storage" className={linkClass}>
                  Storage &amp; Household
                </Link>
              </li>
              <li>
                <Link to="/search?q=decor" className={linkClass}>
                  Home Decor &amp; Lighting
                </Link>
              </li>
              <li>
                <Link to="/#smart-upgrades" className={linkClass}>
                  Tools &amp; Home Improvement
                </Link>
              </li>
              <li>
                <Link to="/collections" className={linkClass}>
                  All Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Useful Links Column 2 */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720] mb-3.5">
              Categories
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/#health-care" className={linkClass}>
                  Health &amp; Personal Care
                </Link>
              </li>
              <li>
                <Link to="/search?q=mobile" className={linkClass}>
                  Mobile Accessories
                </Link>
              </li>
              <li>
                <Link to="/search?q=bags" className={linkClass}>
                  Bags, Wallets &amp; Travel
                </Link>
              </li>
              <li>
                <Link to="/search?q=toys" className={linkClass}>
                  Toys &amp; Kids Essentials
                </Link>
              </li>
              <li>
                <Link to="/search?q=stationery" className={linkClass}>
                  Stationery &amp; Office
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Help Column */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720] mb-3.5">
              Policies &amp; Help
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/#why-us" className={linkClass}>
                  About HypeeeCart
                </Link>
              </li>
              <li>
                <Link to="/policies/contact" className={linkClass}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/account" className={linkClass}>
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/policies/shipping-policy" className={linkClass}>
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link to="/policies/refund-policy" className={linkClass}>
                  7-Day Replacements
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy-policy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/terms-of-service" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* My Account Column */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720] mb-3.5">
              My Account
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/account" className={linkClass}>
                  Sign In / Register
                </Link>
              </li>
              <li>
                <Link to="/account" className={linkClass}>
                  Order History
                </Link>
              </li>
              <li>
                <Link to="/#trending" className={linkClass}>
                  My Wishlist
                </Link>
              </li>
              <li>
                <Link to="/cart" className={linkClass}>
                  View Cart
                </Link>
              </li>
            </ul>

            {/* Indian Payment Badges */}
            <div className="mt-5 pt-4 border-t border-[#E2DBD0]">
              <span className="text-[11px] font-bold text-[#282720] block mb-2">
                Secure Indian Payments
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-sm bg-white border border-[#E2DBD0] px-2 py-0.5 text-[10px] font-semibold text-[#282720]">
                  UPI
                </span>
                <span className="inline-flex items-center rounded-sm bg-white border border-[#E2DBD0] px-2 py-0.5 text-[10px] font-semibold text-[#282720]">
                  RuPay
                </span>
                <span className="inline-flex items-center rounded-sm bg-white border border-[#E2DBD0] px-2 py-0.5 text-[10px] font-semibold text-[#282720]">
                  Cards / NetBanking
                </span>
                <span className="inline-flex items-center rounded-sm bg-[#B77943]/10 border border-[#B77943]/30 px-2 py-0.5 text-[10px] font-bold text-[#B77943]">
                  COD Available
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#E2DBD0] mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7D786D]">
          <p>© {currentYear} {shopInfo.name}. All rights reserved. Crafted with ❤️ for Indian Homes.</p>
          <div className="flex items-center gap-4">
            <Link to="/policies/privacy-policy" className="hover:text-[#B77943] transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/policies/terms-of-service" className="hover:text-[#B77943] transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/policies/shipping-policy" className="hover:text-[#B77943] transition-colors">Shipping</Link>
            <span>•</span>
            <Link to="/policies/refund-policy" className="hover:text-[#B77943] transition-colors">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
