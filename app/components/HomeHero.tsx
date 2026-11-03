import { useState } from "react";
import { Link } from "react-router";

import type { HomeHeroData } from "~/lib/home-hero";

export function HomeHero({ hero }: { hero: HomeHeroData }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const image = hero.image && hero.image.url !== failedImageUrl ? hero.image : null;

  return (
    <section className="w-full bg-[#FAF6F0] border-b border-[#E2DBD0]" aria-labelledby="hero-heading">
      <div className="max-w-page px-margin mx-auto py-10 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-8 lg:gap-14 items-center">

          {/* ── Text Content ── */}
          <div className="flex flex-col items-start text-left order-2 lg:order-1">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B77943]/12 text-[#B77943] text-xs font-semibold uppercase tracking-wider mb-5">
              <span>🌿</span>
              <span>Trusted by 50,000+ Indian Homes</span>
            </div>

            {/* Headline */}
            <h1
              id="hero-heading"
              className="font-heading font-extrabold text-[2rem] sm:text-5xl lg:text-5xl text-[#282720] tracking-tight leading-[1.12]"
            >
              Discover Products That Make<br />
              Life <em className="not-italic text-[#B77943]">Better</em>{" "}
              &amp; You <em className="not-italic text-[#B77943]">Glow</em>
            </h1>

            {/* Sub-copy */}
            <p className="text-[#5E5B52] mt-4 text-base sm:text-lg max-w-lg leading-relaxed">
              Curated wellness essentials, smart home gadgets, and lifestyle finds — designed to elevate your everyday routine. Delivered across India in 3–5 days.
            </p>

            {/* Value micro-badges */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 mb-6">
              {[
                "✓ Free Delivery >₹999",
                "✓ COD & UPI",
                "✓ 7-Day Guarantee",
              ].map((badge) => (
                <span key={badge} className="text-xs font-medium text-[#282720] flex items-center gap-1.5">
                  {badge}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Link
                to="#trending"
                className="text-center bg-[#B77943] text-white hover:bg-[#9E6433] px-7 py-3.5 rounded-lg text-sm font-bold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                Shop Bestsellers →
              </Link>
              <Link
                to="/collections"
                className="text-center bg-white border border-[#E2DBD0] text-[#282720] hover:bg-[#EFE9DE] px-6 py-3.5 rounded-lg text-sm font-medium transition-colors"
              >
                Browse Collections
              </Link>
            </div>
          </div>

          {/* ── Hero Visual ── */}
          <div className="order-1 lg:order-2">
            <div className="relative rounded-2xl overflow-hidden border border-[#E2DBD0] bg-white shadow-xl p-2.5">
              <div className="aspect-[4/3] sm:aspect-square w-full rounded-xl overflow-hidden bg-[#EFE9DE] relative">
                {image ? (
                  <img
                    src={image.url}
                    alt={image.altText ?? "Curated Lifestyle Discoveries"}
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    ref={(img) => {
                      if (img?.complete && img.naturalWidth === 0) setFailedImageUrl(image.url);
                    }}
                    onError={() => setFailedImageUrl(image.url)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#FAF6F0] to-[#EFE9DE]">
                    <span className="text-5xl mb-3">🌿</span>
                    <span className="font-heading font-bold text-xl text-[#282720]">
                      Grow&amp;Glow Picks
                    </span>
                    <span className="text-xs text-[#635F53] mt-2 max-w-xs leading-relaxed">
                      Curated wellness, lifestyle, and problem-solving finds for Indian homes
                    </span>
                  </div>
                )}

                {/* Floating discovery tag */}
                <div className="absolute bottom-3 start-3 end-3 bg-white/96 backdrop-blur-sm rounded-xl p-3 border border-[#E2DBD0] shadow-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77943] block">
                      TOP DISCOVERY OF THE WEEK
                    </span>
                    <span className="text-xs font-semibold text-[#282720] line-clamp-1 mt-0.5">
                      {hero.heading || "Viral Smart Living Essential"}
                    </span>
                  </div>
                  <Link
                    to={hero.to}
                    className="text-xs font-bold text-white bg-[#B77943] hover:bg-[#9E6433] px-3 py-1.5 rounded-md transition-colors shrink-0"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
