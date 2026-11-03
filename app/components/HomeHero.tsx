import { useState } from "react";
import { Link } from "react-router";

import type { HomeHeroData } from "~/lib/home-hero";

export function HomeHero({ hero }: { hero: HomeHeroData }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const image = hero.image && hero.image.url !== failedImageUrl ? hero.image : null;

  return (
    <section className="w-full bg-[#FAF6F0] border-b border-[#E2DBD0]" aria-labelledby="hero-heading">
      <div className="max-w-page px-margin mx-auto py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B77943]/15 text-[#B77943] text-xs font-semibold uppercase tracking-wider mb-4">
              <span>⚡ Trending Across 19,000+ Indian Pincodes</span>
            </div>

            <h1
              id="hero-heading"
              className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-5xl text-[#282720] tracking-tight leading-[1.15]"
            >
              Smart Discoveries for Everyday Indian Living.
            </h1>

            <p className="text-base sm:text-lg text-[#5E5B52] mt-4 max-w-xl leading-relaxed">
              Curating practical problem-solving gadgets, aesthetic home essentials, and trending lifestyle finds that make daily life simpler, neater, and better.
            </p>

            {/* Quick value badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6 w-full max-w-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-[#282720]">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold">✓</span>
                <span>Free Delivery &gt;₹999</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#282720]">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold">✓</span>
                <span>COD & UPI Ready</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#282720]">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold">✓</span>
                <span>7-Day Replacement</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto">
              <Link
                to="#trending"
                className="w-full sm:w-auto text-center bg-[#B77943] text-white hover:bg-[#9E6433] px-7 py-3.5 rounded-lg text-sm font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                Explore Trending Finds
              </Link>
              <Link
                to="/collections"
                className="w-full sm:w-auto text-center bg-white border border-[#E2DBD0] text-[#282720] hover:bg-[#EFE9DE] px-6 py-3.5 rounded-lg text-sm font-medium transition-colors"
              >
                Browse Collections
              </Link>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-[#E2DBD0] bg-white shadow-lg p-3">
              <div className="aspect-4/3 sm:aspect-square w-full rounded-xl overflow-hidden bg-[#EFE9DE] relative">
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
                    <span className="text-4xl mb-3">✨</span>
                    <span className="font-heading font-bold text-xl text-[#282720]">
                      Everyday Problem Solvers
                    </span>
                    <span className="text-xs text-[#635F53] mt-2 max-w-xs">
                      Curated viral household, kitchen, and lifestyle innovations
                    </span>
                  </div>
                )}
                {/* Floating Meta Tag */}
                <div className="absolute bottom-3 start-3 end-3 bg-white/95 backdrop-blur-md rounded-lg p-3 border border-[#E2DBD0] shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77943] block">
                      TOP DISCOVERY OF THE WEEK
                    </span>
                    <span className="text-xs font-semibold text-[#282720] line-clamp-1">
                      {hero.heading || "Viral Smart Living Gadget"}
                    </span>
                  </div>
                  <Link
                    to={hero.to}
                    className="text-xs font-bold text-[#B77943] hover:underline shrink-0"
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
