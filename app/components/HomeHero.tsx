import { Link } from "react-router";

import type { ProductCardData } from "~/components/ProductCard";
import type { HomeHeroData } from "~/lib/home-hero";
import { formatPrice, salePercent } from "~/lib/money";

type HomeHeroProps = {
  hero?: HomeHeroData;
  products?: readonly ProductCardData[];
};

export function HomeHero({ products = [] }: HomeHeroProps) {
  // Take the primary featured product from store catalog
  const primaryProduct = products[0];
  const primaryImage = primaryProduct?.featuredImage ?? primaryProduct?.images?.nodes?.[0];
  const primaryPrice = primaryProduct?.priceRange?.minVariantPrice;
  const primaryCompareAt = primaryProduct?.compareAtPriceRange?.minVariantPrice;
  const primaryDiscount = primaryPrice ? salePercent(primaryPrice, primaryCompareAt) : null;

  return (
    <section
      className="relative w-full bg-[#F7F3EC] text-[#282720] border-b border-[#E2DBD0] overflow-hidden py-12 sm:py-16 lg:py-20"
      aria-labelledby="hero-heading"
    >
      <div className="max-w-page px-margin mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Editorial Value Proposition & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 bg-[#B77943]/10 border border-[#B77943]/25 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-[#B77943] mb-5 shadow-2xs">
              <span className="text-sm leading-none">⚡</span>
              <span>YOUR NEXT FAVOURITE FIND STARTS HERE</span>
            </div>

            {/* Main Headline */}
            <h1
              id="hero-heading"
              className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-[3.5rem] text-[#282720] tracking-tight leading-[1.12] mb-5"
            >
              Discover Finds That <br className="hidden sm:inline" />
              <span className="font-serif italic font-normal text-[#B77943]">
                Make Life Better.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-[#5E5B52] text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mb-8 font-normal">
              From clever home essentials to trending gadgets, explore practical little upgrades that make everyday life easier.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                to="#trending"
                className="inline-flex items-center justify-center gap-2 bg-[#B77943] hover:bg-[#9E6433] text-white px-8 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md active:scale-95 group w-full sm:w-auto"
              >
                <span>Shop Trending Finds</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <Link
                to="/collections"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FAF6F0] text-[#282720] border border-[#E2DBD0] px-7 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-colors shadow-2xs w-full sm:w-auto"
              >
                <span>Explore All Products</span>
              </Link>
            </div>

            {/* Mini Trust Highlights Strip */}
            <div className="pt-8 mt-8 border-t border-[#E2DBD0] w-full grid grid-cols-3 gap-3 text-left">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#282720] flex items-center gap-1.5">
                  <span className="text-[#B77943]">✓</span> Pan-India
                </p>
                <p className="text-[11px] text-[#7D786D] mt-0.5">3–5 Days Transit</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#282720] flex items-center gap-1.5">
                  <span className="text-[#B77943]">✓</span> COD Available
                </p>
                <p className="text-[11px] text-[#7D786D] mt-0.5">Pay at Doorstep</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#282720] flex items-center gap-1.5">
                  <span className="text-[#B77943]">✓</span> 7-Day Guarantee
                </p>
                <p className="text-[11px] text-[#7D786D] mt-0.5">Easy Replacement</p>
              </div>
            </div>
          </div>

          {/* Right Column: High-Quality Curated Product Showcase */}
          <div className="lg:col-span-5 w-full">
            <div className="relative bg-white rounded-3xl border border-[#E2DBD0] p-4 sm:p-6 shadow-xl overflow-hidden">
              {/* Decorative background glow */}
              <div
                className="absolute -top-24 -right-24 size-64 rounded-full bg-[#D7A84C]/15 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              {/* Main Lifestyle / Practical Gadget Visual */}
              <div className="relative aspect-[4/3] rounded-2xl bg-[#FAF6F0] border border-[#E2DBD0] overflow-hidden mb-4 flex items-center justify-center">
                {primaryImage ? (
                  <img
                    src={primaryImage.url}
                    alt={primaryImage.altText ?? (primaryProduct?.title || "HypeeeCart Trending Find")}
                    className="size-full object-contain p-4"
                    loading="eager"
                    fetchPriority="high"
                  />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80"
                    alt="Trending everyday essentials"
                    className="size-full object-cover"
                    loading="eager"
                  />
                )}

                {/* Top Badge */}
                <div className="absolute top-3 start-3 flex items-center gap-2">
                  <span className="bg-[#282720] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span>🔥</span>
                    <span>TRENDING IN INDIA</span>
                  </span>
                  {primaryDiscount ? (
                    <span className="bg-[#B77943] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                      SAVE {primaryDiscount}%
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Live Catalog Product Card Overlay */}
              {primaryProduct ? (
                <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77943]">
                      SPOTLIGHT FEATURE
                    </span>
                    <h3 className="text-sm font-bold text-[#282720] truncate mt-0.5">
                      {primaryProduct.title}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      {primaryPrice ? (
                        <span className="text-base font-extrabold text-[#282720]">
                          {formatPrice(primaryPrice)}
                        </span>
                      ) : null}
                      {primaryCompareAt && primaryDiscount ? (
                        <s className="text-xs text-[#7D786D]">
                          {formatPrice(primaryCompareAt)}
                        </s>
                      ) : null}
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        In Stock • COD
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/products/${primaryProduct.handle}`}
                    className="shrink-0 bg-[#282720] hover:bg-[#B77943] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-xs"
                  >
                    View →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
