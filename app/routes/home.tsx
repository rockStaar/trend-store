import { gql } from "@shopify/hydrogen";
import { Link, useRouteLoaderData } from "react-router";
import { useState } from "react";

import {
  CollectionCard,
  COLLECTION_CARD_FRAGMENT,
  type CollectionCardData,
} from "~/components/CollectionCard";
import { HomeHero } from "~/components/HomeHero";
import { ProductCard, PRODUCT_CARD_FRAGMENT, type ProductCardData } from "~/components/ProductCard";
import { selectHomeHero } from "~/lib/home-hero";
import { storefrontClientContext } from "~/lib/storefront";
import { envContext } from "~/lib/env";
import { formatPrice, salePercent } from "~/lib/money";
import {
  FALLBACK_SHOP_NAME,
  formatPageTitle,
  getShopNameFromRootMatch,
} from "~/lib/storefront-shop";
import type { loader as rootLoader } from "~/root";

import type { Route } from "./+types/home";

const HOME_QUERY = gql(
  `
    query Home {
      products(first: 16, sortKey: CREATED_AT, reverse: true) {
        nodes {
          ...ProductCard
        }
      }
      collections(first: 4) {
        nodes {
          ...CollectionCard
        }
      }
      heroCollections: collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          title
          handle
          description
          image {
            url
            altText
          }
          products(first: 1) {
            nodes {
              featuredImage {
                url
                altText
              }
            }
          }
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

export function meta({ matches }: Route.MetaArgs) {
  const shopName = getShopNameFromRootMatch(matches[0]);
  return [
    { title: formatPageTitle("Curated Lifestyle Discoveries", shopName) },
    {
      name: "description",
      content: `Discover useful, viral, and problem-solving products for contemporary Indian homes at ${shopName}. Pan-India express delivery with Cash on Delivery & UPI.`,
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const env = context.get(envContext);
  const isMockMode = !env?.PRIVATE_STOREFRONT_API_TOKEN;

  const { data } = await storefrontClient.graphql(HOME_QUERY);

  const allProducts: ProductCardData[] = data?.products.nodes ?? [];
  const featuredCollections: CollectionCardData[] = data?.collections.nodes ?? [];
  const heroCollections = data?.heroCollections.nodes ?? [];

  return {
    allProducts,
    featuredCollections,
    heroCollections,
    isMockMode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Trending Finds
// ─────────────────────────────────────────────────────────────────────────────
function TrendingFinds({ products }: { products: readonly ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section id="trending" className="w-full py-12 md:py-16 scroll-mt-20" aria-labelledby="trending-heading">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B77943] uppercase tracking-wider mb-1">
              <span>🔥</span>
              <span>MOST POPULAR THIS WEEK</span>
            </div>
            <h2 id="trending-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#282720]">
              Trending Discoveries
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1">
              Hand-picked viral problem solvers loved by Indian households.
            </p>
          </div>
          <Link
            to="/collections"
            className="text-xs sm:text-sm font-semibold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1 group"
          >
            <span>View All Products</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <ul
          role="list"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
        >
          {products.map((product) => (
            <li key={product.handle} className="h-full">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Configurable Featured Problem-Solver Showcase (Meta Ads Focus)
// ─────────────────────────────────────────────────────────────────────────────
function FeaturedProductCampaign({ product }: { product: ProductCardData | undefined }) {
  if (!product) return null;

  const image = product.featuredImage ?? product.images.nodes[0];
  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.minVariantPrice;
  const discount = salePercent(price, compareAt);

  return (
    <section id="problem-solvers" className="w-full bg-[#FAF6F0] border-y border-[#E2DBD0] py-12 md:py-16 scroll-mt-20">
      <div className="max-w-page px-margin mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-white rounded-2xl border border-[#E2DBD0] p-6 sm:p-10 shadow-sm">
          {/* Visual Showcase */}
          <div className="lg:col-span-5">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[#EFE9DE] border border-[#E2DBD0]">
              {image ? (
                <img
                  src={image.url}
                  alt={image.altText ?? product.title}
                  className="w-full h-full object-cover"
                />
              ) : null}
              {discount ? (
                <span className="absolute top-3 start-3 bg-[#B77943] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                  SPECIAL OFFER • SAVE {discount}%
                </span>
              ) : null}
            </div>
          </div>

          {/* Value Proposition & Action */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <span className="inline-block text-[11px] uppercase font-bold tracking-wider text-[#B77943] bg-[#B77943]/10 px-2.5 py-0.5 rounded-full mb-3">
              ★ SPOTLIGHT PROBLEM-SOLVER
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] leading-snug">
              {product.title}
            </h3>

            {/* Price Box */}
            <div className="flex items-baseline gap-3 my-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#282720]">
                {formatPrice(price)}
              </span>
              {compareAt && discount ? (
                <s className="text-base text-[#7D786D]">
                  {formatPrice(compareAt)}
                </s>
              ) : null}
              {discount ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {discount}% OFF Today
                </span>
              ) : null}
            </div>

            {/* Problem vs Solution Callout */}
            <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-xl p-4 my-4 w-full space-y-2">
              <div className="flex items-start gap-2.5 text-xs text-[#282720]">
                <span className="text-red-500 font-bold">✕ The Old Way:</span>
                <span className="text-[#5E5B52]">Cluttered spaces, messy countertops, and wasted time on daily tasks.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[#282720] font-medium">
                <span className="text-emerald-600 font-bold">✓ The Varenya Fix:</span>
                <span>Effortless organisation and smart convenience designed for compact modern homes.</span>
              </div>
            </div>

            {/* Trust highlights */}
            <div className="grid grid-cols-2 gap-2 text-xs text-[#5E5B52] mb-6 w-full">
              <div className="flex items-center gap-1.5">
                <span className="text-[#B77943] font-bold">✓</span>
                <span>Fast 3–5 Day Delivery Across India</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#B77943] font-bold">✓</span>
                <span>Cash on Delivery (COD) Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#B77943] font-bold">✓</span>
                <span>100% Quality Checked Guarantee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#B77943] font-bold">✓</span>
                <span>7-Day Easy Replacement</span>
              </div>
            </div>

            <Link
              to={`/products/${product.handle}`}
              className="w-full sm:w-auto text-center bg-[#B77943] text-white hover:bg-[#9E6433] px-8 py-3.5 rounded-lg text-sm font-bold tracking-wide shadow-md transition-all active:scale-[0.98]"
            >
              Get Yours Now — View Details →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Smart Everyday Essentials
// ─────────────────────────────────────────────────────────────────────────────
function SmartEssentials({ products }: { products: readonly ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section className="w-full py-12 md:py-16" aria-labelledby="essentials-heading">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs uppercase font-bold tracking-wider text-[#B77943]">
            PRACTICAL & FUNCTIONAL
          </span>
          <h2 id="essentials-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
            Smart Everyday Essentials
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-2">
            Useful accessories and gadgets engineered to add ease and elegance to your daily routine.
          </p>
        </div>

        <ul
          role="list"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
        >
          {products.map((product) => (
            <li key={product.handle} className="h-full">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Shop By Category
// ─────────────────────────────────────────────────────────────────────────────
function ShopByCategory({ collections }: { collections: readonly CollectionCardData[] }) {
  if (collections.length === 0) return null;

  return (
    <section className="w-full py-12 md:py-16 bg-[#FAF6F0] border-t border-[#E2DBD0]" aria-labelledby="category-heading">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[#B77943]">
              CURATED CORNERS
            </span>
            <h2 id="category-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
              Shop by Category
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1">
              Explore thoughtfully assembled lifestyle collections for your space.
            </p>
          </div>
          <Link
            to="/collections"
            className="text-xs sm:text-sm font-semibold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1 group"
          >
            <span>All Categories</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection, index) => (
            <li key={collection.handle} className="h-full">
              <CollectionCard collection={collection} priority={index === 0} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Benefit-led Brand Trust Experience
// ─────────────────────────────────────────────────────────────────────────────
function BrandTrustSection() {
  return (
    <section id="why-us" className="w-full py-12 md:py-16 bg-white border-t border-[#E2DBD0] scroll-mt-20">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-wider text-[#B77943]">
            THE VARENYA PROMISE
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
            Why 50,000+ Indian Shoppers Trust Us
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-2">
            No cheap knockoffs. No false promises. Only curated quality, tested for real Indian homes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#FAF6F0] rounded-xl p-6 border border-[#E2DBD0] text-left space-y-3">
            <div className="size-12 rounded-full bg-[#B77943]/15 text-[#B77943] flex items-center justify-center text-xl font-bold">
              🔍
            </div>
            <h3 className="font-heading text-lg font-bold text-[#282720]">
              Rigorous Quality Verification
            </h3>
            <p className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed">
              We vet every supplier and test functionality before listing. You receive products that look, feel, and perform exactly as promised.
            </p>
          </div>

          <div className="bg-[#FAF6F0] rounded-xl p-6 border border-[#E2DBD0] text-left space-y-3">
            <div className="size-12 rounded-full bg-[#B77943]/15 text-[#B77943] flex items-center justify-center text-xl font-bold">
              ⚡
            </div>
            <h3 className="font-heading text-lg font-bold text-[#282720]">
              Pan-India Express Logistics
            </h3>
            <p className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed">
              Dispatched within 24 hours from local fulfillment hubs. Track your parcel live with WhatsApp and SMS status notifications.
            </p>
          </div>

          <div className="bg-[#FAF6F0] rounded-xl p-6 border border-[#E2DBD0] text-left space-y-3">
            <div className="size-12 rounded-full bg-[#B77943]/15 text-[#B77943] flex items-center justify-center text-xl font-bold">
              🤝
            </div>
            <h3 className="font-heading text-lg font-bold text-[#282720]">
              7-Day Replacement & Friendly Care
            </h3>
            <p className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed">
              Damaged in transit? Doesn't fit? We offer seamless 7-day replacements with zero friction. Human support on email & WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Festive & Gifting Campaign Block (Configurable)
// ─────────────────────────────────────────────────────────────────────────────
function FestiveGiftingEdit() {
  return (
    <section id="festive" className="w-full bg-[#FAF3E3] border-t border-[#D7A84C]/30 py-12 md:py-16 scroll-mt-20">
      <div className="max-w-page px-margin mx-auto">
        <div className="bg-gradient-to-r from-[#282720] to-[#3D3A32] text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-md">
          {/* Decorative gold badge */}
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D7A84C] tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full mb-4">
              <span>✨</span>
              <span>SPECIAL FESTIVE & GIFTING SELECTION</span>
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Gifts That Spark Joy in Every Indian Home.
            </h2>
            <p className="text-sm sm:text-base text-stone-300 mt-3 leading-relaxed">
              Thoughtful, attractive, and genuinely useful finds designed for housewarmings, family celebrations, and everyday surprises.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/collections"
                className="bg-[#D7A84C] text-[#282720] hover:bg-[#e0b45a] px-6 py-3 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm"
              >
                Explore Festive Gifting →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Customer Confidence FAQ Accordion
// ─────────────────────────────────────────────────────────────────────────────
function HomeFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How fast is delivery to my city or town?",
      a: "We ship via premium express couriers (BlueDart, Delhivery, Xpressbees). Metro destinations receive delivery within 2–4 business days; tier-2/3 cities and other pin codes arrive in 3–5 business days.",
    },
    {
      q: "Can I pay using Cash on Delivery (COD)?",
      a: "Yes! Cash on Delivery is available across eligible Indian pin codes. You can also pay seamlessly online via UPI (Google Pay, PhonePe, Paytm), NetBanking, or Cards.",
    },
    {
      q: "What if the product arrives damaged or defective?",
      a: "You are fully covered by our 7-Day Replacement Guarantee. Just message our support team with your order ID and a quick photo/video, and we will send a brand new unit without hassle.",
    },
    {
      q: "How do I track my shipment?",
      a: "Once dispatched, an automated tracking URL is sent straight to your WhatsApp and SMS so you can follow your parcel from our warehouse to your doorstep.",
    },
  ];

  return (
    <section className="w-full py-12 md:py-16 bg-[#FAF6F0] border-t border-[#E2DBD0]" aria-labelledby="faq-heading">
      <div className="max-w-2xl px-margin mx-auto">
        <div className="text-center mb-8">
          <span className="text-xs uppercase font-bold tracking-wider text-[#B77943]">
            GOT QUESTIONS?
          </span>
          <h2 id="faq-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-[#E2DBD0] rounded-lg overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 text-left font-semibold text-sm sm:text-base text-[#282720] flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF6F0] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className="text-[#B77943] text-lg font-bold shrink-0">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <div className="px-4 pb-4 text-xs sm:text-sm text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1] pt-3">
                    {faq.a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Home Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Home({ loaderData }: Route.ComponentProps) {
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const hero = selectHomeHero(
    loaderData.heroCollections,
    rootData?.shopInfo.name ?? FALLBACK_SHOP_NAME,
  );

  const trendingProducts = loaderData.allProducts.slice(0, 4);
  const featuredProduct = loaderData.allProducts[4] || loaderData.allProducts[0];
  const essentialsProducts = loaderData.allProducts.slice(5, 13);

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      {loaderData.isMockMode ? (
        <div className="bg-[#FAF3E3] border-b border-[#D7A84C]/40 px-4 py-2 text-center text-xs text-[#282720]">
          <span className="font-semibold text-[#B77943]">🛠️ Catalog Preview:</span> Showing demo inventory from mock.shop. Connect your Shopify store via <code className="bg-white px-1.5 py-0.5 rounded border border-[#D7A84C]/40 text-[11px]">npx shopify hydrogen link</code> to render live inventory.
        </div>
      ) : null}

      <HomeHero hero={hero} />
      <TrendingFinds products={trendingProducts} />
      <FeaturedProductCampaign product={featuredProduct} />
      <SmartEssentials products={essentialsProducts} />
      <ShopByCategory collections={loaderData.featuredCollections} />
      <BrandTrustSection />
      <FestiveGiftingEdit />
      <HomeFAQ />
    </main>
  );
}
