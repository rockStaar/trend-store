import { Link } from "react-router";
import type { ProductCardData } from "~/components/ProductCard";
import { formatPrice, salePercent, compareMoney } from "~/lib/money";

type HomeHeroProps = {
  products?: readonly ProductCardData[];
};

export function HomeHero({ products = [] }: HomeHeroProps) {
  // Use real products from the store catalog
  const mainProduct = products[0];
  const sideProduct1 = products[1] || products[0];
  const sideProduct2 = products[2] || products[1] || products[0];

  const mainImage = mainProduct?.featuredImage ?? mainProduct?.images?.nodes?.[0];
  const sideImage1 = sideProduct1?.featuredImage ?? sideProduct1?.images?.nodes?.[0];
  const sideImage2 = sideProduct2?.featuredImage ?? sideProduct2?.images?.nodes?.[0];

  const mainPrice = mainProduct?.priceRange?.minVariantPrice;
  const mainCompareAt = mainProduct?.compareAtPriceRange?.minVariantPrice;
  const mainOnSale = compareMoney(mainCompareAt, mainPrice) > 0;
  const mainDiscount = mainOnSale && mainPrice ? salePercent(mainPrice, mainCompareAt) : null;

  return (
    <section
      className="relative w-full bg-[#F8F7F3] border-b border-[#E4E7ED] py-12 sm:py-16 lg:py-20"
      aria-labelledby="hero-heading"
    >
      <div className="max-w-page px-margin mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ── Left Column: Editorial Value Proposition & CTA ── */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start text-left">
            {/* Restrained Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 bg-[#EAF0FC] border border-[#d2def5] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-[#2457D6] mb-5 shadow-2xs">
              <span className="size-2 rounded-full bg-[#2457D6]" />
              <span>Trending Finds &amp; Practical Upgrades</span>
            </div>

            {/* Main Headline */}
            <h1
              id="hero-heading"
              className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-[3.5rem] text-[#192A46] tracking-tight leading-[1.12] mb-4"
            >
              Everyday finds. <br />
              <span className="text-[#2457D6]">Smarter shopping.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-[#64748B] text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mb-8 font-normal">
              Discover clever home upgrades, trending gadgets, and practical essentials hand-picked to make everyday life simpler. High quality, verified utility, and hassle-free Cash on Delivery across India.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                to="#trending"
                className="inline-flex items-center justify-center gap-2 bg-[#2457D6] hover:bg-[#1D44B8] text-white px-8 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm hover:shadow-md active:scale-95 group w-full sm:w-auto"
              >
                <span>Explore Trending Finds</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <Link
                to="/collections"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F8F7F3] text-[#192A46] border border-[#E4E7ED] px-7 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-colors shadow-2xs w-full sm:w-auto hover:border-[#192A46]/30"
              >
                <span>Browse All Categories</span>
              </Link>
            </div>

            {/* Clean Trust Strip */}
            <div className="pt-8 mt-8 border-t border-[#E4E7ED] w-full grid grid-cols-3 gap-3 text-left">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#192A46] flex items-center gap-1.5">
                  <span className="text-[#2457D6] font-extrabold">✓</span> Pan-India
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">3–5 Days Express</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#192A46] flex items-center gap-1.5">
                  <span className="text-[#2457D6] font-extrabold">✓</span> Cash on Delivery
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">Pay at Doorstep</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#192A46] flex items-center gap-1.5">
                  <span className="text-[#2457D6] font-extrabold">✓</span> 7-Day Guarantee
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">Easy Replacement</p>
              </div>
            </div>
          </div>

          {/* ── Right Column: Balanced Real Product Collage ── */}
          <div className="lg:col-span-6 xl:col-span-5 w-full">
            <div className="grid grid-cols-12 gap-3.5 sm:gap-4">
              {/* Primary Featured Product Card */}
              <div className="col-span-12 sm:col-span-7 bg-white rounded-2xl border border-[#E4E7ED] p-4 shadow-sm hover:shadow-md transition-shadow">
                <Link
                  to={mainProduct ? `/products/${mainProduct.handle}` : "/collections"}
                  className="group block"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#F8F7F3] mb-3.5">
                    {mainImage ? (
                      <img
                        src={mainImage.url}
                        alt={mainImage.altText ?? mainProduct?.title ?? "Featured Product"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#64748B] text-xs">
                        HypeeeCart Find
                      </div>
                    )}
                    {mainDiscount ? (
                      <span className="absolute top-2.5 start-2.5 bg-[#D93636] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                        SAVE {mainDiscount}%
                      </span>
                    ) : (
                      <span className="absolute top-2.5 start-2.5 bg-[#192A46] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                        TOP FIND
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#2457D6] block mb-1">
                    {mainProduct?.productType || "Curated Discovery"}
                  </span>
                  <h3 className="text-sm font-bold text-[#192A46] line-clamp-1 group-hover:text-[#2457D6] transition-colors">
                    {mainProduct?.title || "Multifunctional Household Problem Solver"}
                  </h3>
                  <div className="mt-2 flex items-baseline justify-between pt-2 border-t border-[#F8F7F3]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-[#192A46]">
                        {mainPrice ? formatPrice(mainPrice) : "₹499"}
                      </span>
                      {mainOnSale && mainCompareAt ? (
                        <s className="text-xs text-[#94A3B8]">
                          {formatPrice(mainCompareAt)}
                        </s>
                      ) : null}
                    </div>
                    <span className="text-xs font-bold text-[#2457D6] group-hover:underline">
                      View →
                    </span>
                  </div>
                </Link>
              </div>

              {/* Side Stack Cards (2 compact cards) */}
              <div className="col-span-12 sm:col-span-5 flex flex-col gap-3.5 sm:gap-4 justify-between">
                {/* Secondary Card 1 */}
                <div className="bg-white rounded-2xl border border-[#E4E7ED] p-3.5 shadow-2xs hover:shadow-sm transition-shadow flex-1">
                  <Link
                    to={sideProduct1 ? `/products/${sideProduct1.handle}` : "/collections"}
                    className="group flex sm:flex-col gap-3 items-center sm:items-start"
                  >
                    <div className="relative size-20 sm:size-auto sm:aspect-[4/3] sm:w-full rounded-lg overflow-hidden bg-[#F8F7F3] shrink-0">
                      {sideImage1 ? (
                        <img
                          src={sideImage1.url}
                          alt={sideImage1.altText ?? sideProduct1?.title ?? "Product"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#64748B] text-[10px]">
                          Popular
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#64748B] block">
                        Trending
                      </span>
                      <h4 className="text-xs font-bold text-[#192A46] line-clamp-1 group-hover:text-[#2457D6] transition-colors">
                        {sideProduct1?.title || "Everyday Essential Find"}
                      </h4>
                      <p className="text-xs font-extrabold text-[#192A46] mt-1">
                        {sideProduct1?.priceRange?.minVariantPrice
                          ? formatPrice(sideProduct1.priceRange.minVariantPrice)
                          : "₹299"}
                      </p>
                    </div>
                  </Link>
                </div>

                {/* Secondary Card 2 */}
                <div className="bg-white rounded-2xl border border-[#E4E7ED] p-3.5 shadow-2xs hover:shadow-sm transition-shadow flex-1">
                  <Link
                    to={sideProduct2 ? `/products/${sideProduct2.handle}` : "/collections"}
                    className="group flex sm:flex-col gap-3 items-center sm:items-start"
                  >
                    <div className="relative size-20 sm:size-auto sm:aspect-[4/3] sm:w-full rounded-lg overflow-hidden bg-[#F8F7F3] shrink-0">
                      {sideImage2 ? (
                        <img
                          src={sideImage2.url}
                          alt={sideImage2.altText ?? sideProduct2?.title ?? "Product"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#64748B] text-[10px]">
                          Special
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#64748B] block">
                        Problem Solver
                      </span>
                      <h4 className="text-xs font-bold text-[#192A46] line-clamp-1 group-hover:text-[#2457D6] transition-colors">
                        {sideProduct2?.title || "Smart Kitchen & Home Tool"}
                      </h4>
                      <p className="text-xs font-extrabold text-[#192A46] mt-1">
                        {sideProduct2?.priceRange?.minVariantPrice
                          ? formatPrice(sideProduct2.priceRange.minVariantPrice)
                          : "₹349"}
                      </p>
                    </div>
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
