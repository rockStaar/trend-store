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
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-1">
              <Link to="/" className="inline-block">
                <img
                  src="/logo.png"
                  alt="Grow & Glow"
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <span className="text-[10px] uppercase tracking-widest text-[#B77943] font-semibold mt-1">
                Grow Better. Glow Brighter.
              </span>
            </div>
            <p className="text-xs text-[#635F53] leading-relaxed">
              Curating wellness-forward, problem-solving, and lifestyle products for contemporary Indian homes. Quality-checked, swiftly delivered, backed by our 7-day replacement guarantee.
            </p>
            <div className="pt-2 text-xs text-[#635F53]">
              <p className="font-medium text-[#282720]">Customer Support (Mon–Sat, 10am–6pm IST):</p>
              <p className="mt-1">Email: <a href="mailto:support@growandglow.in" className="text-[#B77943] underline">support@growandglow.in</a></p>
              <p className="mt-0.5">WhatsApp: <span className="text-[#282720] font-medium">+91 98765 43210</span> (Configurable)</p>
            </div>
          </div>

          {/* Quick Discoveries */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720] mb-4">
              Explore Store
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/" className={linkClass}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/#trending" className={linkClass}>
                  Trending Bestsellers
                </Link>
              </li>
              <li>
                <Link to="/collections" className={linkClass}>
                  All Collections
                </Link>
              </li>
              <li>
                <Link to="/#problem-solvers" className={linkClass}>
                  Smart Everyday Essentials
                </Link>
              </li>
              <li>
                <Link to="/#festive" className={linkClass}>
                  The Festive & Gifting Edit
                </Link>
              </li>
              <li>
                <Link to="/search" className={linkClass}>
                  Search Catalog
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720] mb-4">
              Help & Policies
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/policies/shipping-policy" className={linkClass}>
                  Shipping & Delivery Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/refund-policy" className={linkClass}>
                  7-Day Returns & Replacements
                </Link>
              </li>
              <li>
                <Link to="/policies/faq" className={linkClass}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/policies/terms-of-service" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy-policy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/contact" className={linkClass}>
                  Contact Customer Care
                </Link>
              </li>
            </ul>
          </div>

          {/* India Payment Methods & Trust */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#282720]">
              Secure Payments
            </h3>
            <p className="text-xs text-[#635F53] leading-relaxed">
              We support all trusted Indian payment gateways with 256-bit SSL encryption.
            </p>

            {/* Indian Payment Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center rounded-sm bg-white border border-[#E2DBD0] px-2.5 py-1 text-[11px] font-semibold text-[#282720]">
                UPI (GPay / PhonePe / Paytm)
              </span>
              <span className="inline-flex items-center rounded-sm bg-white border border-[#E2DBD0] px-2.5 py-1 text-[11px] font-semibold text-[#282720]">
                RuPay
              </span>
              <span className="inline-flex items-center rounded-sm bg-white border border-[#E2DBD0] px-2.5 py-1 text-[11px] font-semibold text-[#282720]">
                Cards & NetBanking
              </span>
              <span className="inline-flex items-center rounded-sm bg-[#B77943]/10 border border-[#B77943]/30 px-2.5 py-1 text-[11px] font-semibold text-[#B77943]">
                COD Available
              </span>
            </div>

            {shopInfo.paymentMethods.length > 0 ? (
              <div className="pt-2">
                <ul
                  role="list"
                  aria-label="Supported Payment Methods"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {shopInfo.paymentMethods.map((method) => (
                    <li key={method} className="max-w-full">
                      <PaymentMethodIcon method={method} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="pt-3 border-t border-[#E2DBD0]">
              <p className="text-[11px] text-[#7D786D]">
                ⚡ 100% Safe Checkout • Dispatched via BlueDart, Delhivery & Xpressbees.
              </p>
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
