import { gql } from "@shopify/hydrogen";
import { Link, useRouteLoaderData } from "react-router";
import { useMemo, useRef, useState } from "react";

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
    { title: formatPageTitle("Trending Finds. Everyday Wins.", shopName || "HypeeeCart") },
    {
      name: "description",
      content: `HypeeeCart — Trending Finds. Everyday Wins. Explore clever home essentials, practical everyday upgrades, and trending gadgets with Pan-India delivery and Cash on Delivery.`,
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
// Section: Benefits & Assurance Strip (Pan-India, COD, Replacements, Quality)
// ─────────────────────────────────────────────────────────────────────────────
function BenefitsStrip() {
  return (
    <div className="w-full bg-white border-b border-[#E2DBD0] py-4 sm:py-5 shadow-2xs">
      <div className="max-w-page px-margin mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center text-lg text-[#B77943] shrink-0">
            🚚
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#282720]">Pan-India Delivery</p>
            <p className="text-[11px] text-[#5E5B52]">Dispatches in 24h • 3–5 days transit</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center text-lg text-[#B77943] shrink-0">
            💵
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#282720]">Cash on Delivery</p>
            <p className="text-[11px] text-[#5E5B52]">Pay at your doorstep with Cash or UPI</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center text-lg text-[#B77943] shrink-0">
            🔄
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#282720]">Easy Returns</p>
            <p className="text-[11px] text-[#5E5B52]">7-Day hassle-free replacement</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center text-lg text-[#B77943] shrink-0">
            🛡️
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#282720]">100% Quality Checked</p>
            <p className="text-[11px] text-[#5E5B52]">Inspected before packaging</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Curated Trending Finds Carousel (Editorial discovery with filter pills)
// ─────────────────────────────────────────────────────────────────────────────
function BestSellersSection({
  products,
  collections,
}: {
  products: readonly ProductCardData[];
  collections: readonly CollectionCardData[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const carouselRef = useRef<HTMLUListElement>(null);

  // Generate category filter pills dynamically
  const categoryFilters = useMemo(() => {
    const list = ["All"];
    collections.forEach((c) => {
      if (c.title && !list.includes(c.title)) list.push(c.title);
    });
    products.forEach((p) => {
      if (p.productType && !list.includes(p.productType)) list.push(p.productType);
    });
    return list.slice(0, 6);
  }, [collections, products]);

  // Filter products according to selected category pill
  const visibleProducts = useMemo(() => {
    if (selectedCategory === "All") return products;
    return products.filter(
      (p) =>
        p.productType?.toLowerCase() === selectedCategory.toLowerCase() ||
        p.title.toLowerCase().includes(selectedCategory.toLowerCase()),
    );
  }, [products, selectedCategory]);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -330 : 330;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section
      id="trending"
      className="w-full py-16 md:py-24 bg-[#F7F3EC] border-b border-[#E2DBD0] scroll-mt-20"
      aria-labelledby="trending-heading"
    >
      <div className="max-w-page px-margin mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-[#B77943] block mb-1.5">
              TOP TRENDING IN INDIA
            </span>
            <h2
              id="trending-heading"
              className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#282720] tracking-tight"
            >
              Trending Finds
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-2 max-w-xl leading-relaxed">
              Clever problem-solvers and practical everyday essentials hand-picked to make life smoother.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/collections"
              className="text-xs sm:text-sm font-bold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1.5 transition-colors group"
            >
              <span>Shop All Finds</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>

            {/* Desktop Navigation Chevrons */}
            <div className="hidden sm:flex items-center gap-2 ms-4">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll products left"
                className="size-9 rounded-full bg-white border border-[#E2DBD0] hover:border-[#B77943] hover:text-[#B77943] text-[#282720] flex items-center justify-center text-sm font-bold shadow-xs transition-colors cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll products right"
                className="size-9 rounded-full bg-white border border-[#E2DBD0] hover:border-[#B77943] hover:text-[#B77943] text-[#282720] flex items-center justify-center text-sm font-bold shadow-xs transition-colors cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Category Filter Pills */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none"
          role="tablist"
          aria-label="Filter trending finds by category"
        >
          {categoryFilters.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#B77943] text-white shadow-sm"
                    : "bg-white text-[#282720] border border-[#E2DBD0] hover:border-[#B77943]/60 hover:text-[#B77943]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Carousel */}
        {visibleProducts.length > 0 ? (
          <ul
            ref={carouselRef}
            role="list"
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {visibleProducts.map((product, idx) => (
              <li
                key={product.handle}
                className="w-[260px] sm:w-[280px] lg:w-[310px] shrink-0 snap-start h-full"
              >
                <ProductCard product={product} priority={idx < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2DBD0] p-10 text-center">
            <span className="text-3xl mb-2 block">⚡</span>
            <p className="font-heading font-bold text-base text-[#282720]">
              No products found in this category
            </p>
            <p className="text-xs text-[#5E5B52] mt-1 mb-4">
              Explore our full selection of curated everyday discoveries.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className="bg-[#B77943] text-white px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              View All Finds
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Configurable Featured Problem-Solver Showcase
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
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center p-4">
              {image ? (
                <img
                  src={image.url}
                  alt={image.altText ?? product.title}
                  className="w-full h-full object-contain"
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
                <span className="text-[#5E5B52]">Clumsy tools, lint-covered surfaces, and wasted time on basic chores.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[#282720] font-medium">
                <span className="text-emerald-600 font-bold">✓ The HypeeeCart Fix:</span>
                <span>Telescopic reach, scratch-free microfiber, and smart convenience designed for modern homes.</span>
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
    <section id="essentials" className="w-full py-12 md:py-16 scroll-mt-20" aria-labelledby="essentials-heading">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs uppercase font-bold tracking-wider text-[#B77943]">
            PRACTICAL & FUNCTIONAL
          </span>
          <h2 id="essentials-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
            Smart Everyday Essentials
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-2">
            Useful tools, clever gadgets, and time-saving home accessories hand-picked for quality.
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
              CURATED COLLECTIONS
            </span>
            <h2 id="category-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
              Shop by Category
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1">
              Explore practical lifestyle collections designed for contemporary Indian homes.
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
            THE HYPEEECART PROMISE
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#282720] mt-1">
            Why Indian Shoppers Choose HypeeeCart
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-2">
            No cheap knockoffs. No false promises. Only tested, practical products engineered for real everyday convenience.
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
              We test functionality, build quality, and materials before listing. You receive products that look, feel, and perform reliably.
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
              Dispatched within 24 hours from regional fulfillment hubs with live SMS & WhatsApp tracking notifications.
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
              Damaged in transit? Defective unit? We offer seamless 7-day replacements with zero friction and helpful human support.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Curated Edit Campaign Block
// ─────────────────────────────────────────────────────────────────────────────
function FestiveGiftingEdit() {
  return (
    <section id="festive" className="w-full bg-[#FAF3E3] border-t border-[#D7A84C]/30 py-12 md:py-16 scroll-mt-20">
      <div className="max-w-page px-margin mx-auto">
        <div className="bg-gradient-to-r from-[#282720] to-[#3D3A32] text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-md">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D7A84C] tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full mb-4">
              <span>✨</span>
              <span>HYPEEECART CURATED FINDS</span>
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Trending Finds That Bring Everyday Wins.
            </h2>
            <p className="text-sm sm:text-base text-stone-300 mt-3 leading-relaxed">
              Thoughtful, attractive, and genuinely useful finds designed for modern households, thoughtful gifts, and everyday convenience.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/collections"
                className="bg-[#D7A84C] text-[#282720] hover:bg-[#e0b45a] px-6 py-3 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm"
              >
                Explore All Finds →
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
      a: "We ship via premium express logistics partners (BlueDart, Delhivery, Xpressbees). Metro destinations receive delivery within 2–4 business days; other pin codes arrive in 3–5 business days.",
    },
    {
      q: "Can I pay using Cash on Delivery (COD)?",
      a: "Yes! Cash on Delivery is available across eligible Indian pin codes. You can also pay seamlessly online via UPI (Google Pay, PhonePe, Paytm), NetBanking, or Cards.",
    },
    {
      q: "What if the product arrives damaged or defective?",
      a: "You are fully covered by our 7-Day Replacement Guarantee. Simply message our support team with your order ID and a quick photo/video, and we will dispatch a brand-new unit promptly.",
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

  const featuredProduct = loaderData.allProducts[0] || loaderData.allProducts[4];
  const essentialsProducts = loaderData.allProducts.slice(1, 9);

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      {loaderData.isMockMode ? (
        <div className="bg-[#FAF3E3] border-b border-[#D7A84C]/40 px-4 py-2 text-center text-xs text-[#282720]">
          <span className="font-semibold text-[#B77943]">🛠️ Catalog Preview:</span> Showing demo inventory from mock.shop. Connect your Shopify store via <code className="bg-white px-1.5 py-0.5 rounded border border-[#D7A84C]/40 text-[11px]">npx shopify hydrogen link</code> to render live inventory.
        </div>
      ) : null}

      <HomeHero hero={hero} products={loaderData.allProducts} />
      <BenefitsStrip />
      <BestSellersSection products={loaderData.allProducts} collections={loaderData.featuredCollections} />
      <FeaturedProductCampaign product={featuredProduct} />
      <SmartEssentials products={essentialsProducts} />
      <ShopByCategory collections={loaderData.featuredCollections} />
      <BrandTrustSection />
      <FestiveGiftingEdit />
      <HomeFAQ />
    </main>
  );
}
