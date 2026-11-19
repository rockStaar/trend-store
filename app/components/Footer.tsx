import { Link } from "react-router";

import type { StorefrontShop } from "~/lib/storefront-shop";

const linkClass =
  "text-white/80 hover:text-white focus-visible:outline-white inline-flex items-center gap-1.5 text-xs sm:text-sm font-normal no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors py-1";

export function Footer({ shopInfo }: { shopInfo: StorefrontShop }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#2457D6] text-white mt-16 shadow-lg">
      {/* Brand Trust Strip */}
      <div className="border-b border-white/15 bg-[#2457D6] py-6 sm:py-8">
        <div className="max-w-page px-margin mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">100% Quality Checked</h4>
              <p className="text-xs text-white/75 mt-0.5">Every unit inspected before dispatch</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Pan-India Express Delivery</h4>
              <p className="text-xs text-white/75 mt-0.5">Dispatches in 24h • 3–5 days transit</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">5-Day Replacement</h4>
              <p className="text-xs text-white/75 mt-0.5">Hassle-free guarantee for damages</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Verified Secure Payments</h4>
              <p className="text-xs text-white/75 mt-0.5">UPI, Cards, NetBanking & COD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-page px-margin mx-auto py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex flex-col items-start gap-1">
              <Link to="/" className="inline-block bg-white p-2 rounded-xl shadow-xs">
                <img
                  src="/logo.png"
                  alt="HypeeeCart"
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <span className="text-xs uppercase tracking-wider text-white font-extrabold mt-2">
                Shop Smart... Live Better
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Experience the difference. Discover clever home essentials, trending gadgets, and practical upgrades at unbeatable prices — delivered across India.
            </p>
            <div className="flex items-center gap-3 pt-2 text-white">
              {/* Social links */}
              <span className="size-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold hover:bg-white/25 transition-colors cursor-pointer">
                f
              </span>
              <span className="size-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold hover:bg-white/25 transition-colors cursor-pointer">
                📸
              </span>
              <span className="size-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold hover:bg-white/25 transition-colors cursor-pointer">
                𝕏
              </span>
              <span className="size-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold hover:bg-white/25 transition-colors cursor-pointer">
                ▶
              </span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-white mb-3.5 pb-1 border-b border-white/20 inline-block">
              Quick Links
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/#why-us" className={linkClass}>
                  <span>›</span> About Us
                </Link>
              </li>
              <li>
                <Link to="/policies/contact" className={linkClass}>
                  <span>›</span> Contact Us
                </Link>
              </li>
              <li>
                <Link to="/collections" className={linkClass}>
                  <span>›</span> All Products
                </Link>
              </li>
              <li>
                <Link to="/#trending" className={linkClass}>
                  <span>›</span> New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/#top-products" className={linkClass}>
                  <span>›</span> Best Sellers
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service / Policies Column */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-white mb-3.5 pb-1 border-b border-white/20 inline-block">
              Customer Service
            </h3>
            <ul role="list" className="space-y-1">
              <li>
                <Link to="/policies/privacy-policy" className={linkClass}>
                  <span>›</span> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/terms-of-service" className={linkClass}>
                  <span>›</span> Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/policies/refund-policy" className={linkClass}>
                  <span>›</span> Return &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/shipping-policy" className={linkClass}>
                  <span>›</span> Shipping &amp; Delivery Policy
                </Link>
              </li>
              <li>
                <Link to="/#faq" className={linkClass}>
                  <span>›</span> FAQ &amp; Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us Column */}
          <div className="space-y-3.5">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-white mb-3.5 pb-1 border-b border-white/20 inline-block">
              Contact Us
            </h3>
            <div className="space-y-2.5 text-xs text-white/85">
              <div className="flex items-start gap-2.5">
                <span className="text-sm shrink-0">✉️</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/60 block">Email</span>
                  <a href="mailto:support@hypeeecart.in" className="text-white hover:underline font-medium">
                    support@hypeeecart.in
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm shrink-0">📞</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/60 block">Customer Care</span>
                  <span className="font-medium text-white">+91 93071-40983</span>
                  <span className="block text-[11px] text-white/70 mt-0.5">Mon–Sat: 10:00 AM – 6:30 PM IST</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm shrink-0">📍</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/60 block">Location</span>
                  <span className="text-white/80">Express Hub, Maharashtra, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Developed by Manaswi Swar & Payment Badges */}
        <div className="border-t border-white/15 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/80">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span>© {currentYear} {shopInfo.name || "HypeeeCart"}. All rights reserved.</span>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="font-semibold text-white">
              Developed by <span className="underline decoration-white/40 underline-offset-2">Manaswi Swar</span>
            </span>
          </div>

          {/* Payment Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded bg-white text-[#2457D6] px-2 py-0.5 text-[10px] font-extrabold">
              VISA
            </span>
            <span className="inline-flex items-center rounded bg-white text-[#2457D6] px-2 py-0.5 text-[10px] font-extrabold">
              MASTERCARD
            </span>
            <span className="inline-flex items-center rounded bg-white text-[#2457D6] px-2 py-0.5 text-[10px] font-extrabold">
              UPI
            </span>
            <span className="inline-flex items-center rounded bg-white text-[#2457D6] px-2 py-0.5 text-[10px] font-extrabold">
              RUPAY
            </span>
            <span className="inline-flex items-center rounded bg-white/20 text-white border border-white/40 px-2 py-0.5 text-[10px] font-bold">
              COD AVAILABLE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
