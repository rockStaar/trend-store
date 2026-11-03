import { useState } from "react";
import { Link } from "react-router";

import type { ProductCardData } from "~/components/ProductCard";
import type { HomeHeroData } from "~/lib/home-hero";
import { formatPrice } from "~/lib/money";

type HomeHeroProps = {
  hero?: HomeHeroData;
  products?: readonly ProductCardData[];
};

export function HomeHero({ hero, products = [] }: HomeHeroProps) {
  const [bgFailed, setBgFailed] = useState(false);

  // Take the first 3 products for the bottom-right floating showcase cards (just like reference)
  const previewProducts = products.slice(0, 3);

  return (
    <section
      className="relative w-full bg-[#1C1A17] text-[#F7F3EC] overflow-hidden min-h-[580px] sm:min-h-[640px] lg:min-h-[720px] flex flex-col justify-between"
      aria-labelledby="hero-heading"
    >
      {/* ── Background Editorial Image ── */}
      <div className="absolute inset-0 z-0">
        {!bgFailed ? (
          <img
            src="/images/hero-bg.jpg"
            alt="Grow & Glow Ritual for Radiant Living"
            className="w-full h-full object-cover object-center lg:object-[center_35%]"
            loading="eager"
            fetchPriority="high"
            onError={() => setBgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#282720] via-[#332A24] to-[#1C1A17]" />
        )}

        {/* Cinematic gradient overlays matching the reference mood */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#1C1A17]/90 via-[#1C1A17]/65 to-transparent sm:to-[#1C1A17]/20"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#1C1A17]/95 via-transparent to-[#1C1A17]/40"
          aria-hidden="true"
        />
      </div>

      {/* ── Hero Main Content ── */}
      <div className="relative z-10 max-w-page px-margin mx-auto w-full pt-16 sm:pt-24 lg:pt-32 pb-8 flex-1 flex flex-col justify-center">
        <div className="max-w-xl lg:max-w-2xl text-left">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 text-xs uppercase font-semibold tracking-widest text-[#D7A84C] mb-3">
            <span>✦</span>
            <span>A NEW RITUAL FOR EVERYDAY GLOW</span>
          </div>

          {/* Master Editorial Serif Headline (Matches reference) */}
          <h1
            id="hero-heading"
            className="font-serif italic font-normal text-4xl sm:text-6xl lg:text-[4.5rem] text-white tracking-tight leading-[1.06] mb-5 drop-shadow-sm"
          >
            A New Ritual for <br />
            <span className="font-heading not-italic font-bold text-[#F7F3EC]">
              Radiant Living
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-[#D7A84C] font-semibold text-sm sm:text-base uppercase tracking-wider mb-2">
            Curated Essentials For You
          </p>

          {/* Short Supporting Copy */}
          <p className="text-[#EFE9DE]/90 text-sm sm:text-base max-w-md leading-relaxed mb-8 font-normal">
            Thoughtfully chosen botanicals, clean formulations, and calming lifestyle discoveries that respect your daily rhythm and keep routines simple.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="#best-sellers"
              className="inline-flex items-center gap-2 bg-[#D7A84C] hover:bg-[#c99a3e] text-[#282720] px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg active:scale-95 group"
            >
              <span>Shop Now</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-[#F7F3EC] border border-white/25 px-6 py-3.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all backdrop-blur-xs"
            >
              <span>Explore Edit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Right: Floating Product Preview Shelf (Matches reference picture) ── */}
      <div className="relative z-10 w-full pb-8 pt-4">
        <div className="max-w-page px-margin mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">

          {/* Left mini assurance indicators */}
          <div className="hidden lg:flex items-center gap-6 text-xs text-[#EFE9DE]/80">
            <span className="flex items-center gap-1.5">
              <span className="text-[#D7A84C]">✓</span> Express Pan-India Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#D7A84C]">✓</span> Cash on Delivery &amp; UPI
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#D7A84C]">✓</span> 7-Day Easy Replacements
            </span>
          </div>

          {/* Floating Product Cards Carousel / Row */}
          {previewProducts.length > 0 ? (
            <div
              className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none self-end max-w-full"
              role="region"
              aria-label="Featured product previews"
            >
              {previewProducts.map((prod) => {
                const image = prod.featuredImage ?? prod.images.nodes[0];
                const price = prod.priceRange.minVariantPrice;

                return (
                  <Link
                    key={prod.handle}
                    to={`/products/${prod.handle}`}
                    className="group shrink-0 flex items-center gap-3.5 bg-[#FAF6F0]/95 hover:bg-white text-[#282720] p-2.5 sm:p-3 rounded-2xl border border-white/40 shadow-xl transition-all duration-300 hover:-translate-y-1 w-[200px] sm:w-[220px]"
                  >
                    <div className="size-14 sm:size-16 rounded-xl bg-[#EFE9DE] overflow-hidden shrink-0 border border-[#E2DBD0] flex items-center justify-center">
                      {image ? (
                        <img
                          src={image.url}
                          alt={image.altText ?? prod.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xl">🌿</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#282720] truncate group-hover:text-[#B77943] transition-colors">
                        {prod.title}
                      </p>
                      <p className="text-xs font-semibold text-[#B77943] mt-0.5">
                        {formatPrice(price)}
                      </p>
                      <span className="inline-flex items-center text-[10px] font-medium text-[#7D786D] group-hover:text-[#282720] mt-1">
                        View Details →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
