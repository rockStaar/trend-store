import { gql } from "@shopify/hydrogen";
import { Link, useRouteLoaderData } from "react-router";
import { useMemo, useRef, useState } from "react";

import {
  CollectionCard,
  COLLECTION_CARD_FRAGMENT,
  type CollectionCardData,
} from "~/components/CollectionCard";
import { ProductCard, PRODUCT_CARD_FRAGMENT, type ProductCardData } from "~/components/ProductCard";
import { HomeHero } from "~/components/HomeHero";
import { storefrontClientContext } from "~/lib/storefront";
import { envContext } from "~/lib/env";
import { compareMoney, formatPrice, salePercent } from "~/lib/money";
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
      products(first: 36, sortKey: CREATED_AT, reverse: true) {
        nodes {
          ...ProductCard
        }
      }
      collections(first: 16) {
        nodes {
          ...CollectionCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

export function meta({ matches }: Route.MetaArgs) {
  const shopName = getShopNameFromRootMatch(matches[0]);
  return [
    { title: formatPageTitle("Everyday finds. Smarter shopping.", shopName || "HypeeeCart") },
    {
      name: "description",
      content: `HypeeeCart — Everyday finds. Smarter shopping. Explore clever home essentials, practical upgrades, and trending gadgets with Pan-India delivery and Cash on Delivery.`,
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

  return {
    allProducts,
    featuredCollections,
    isMockMode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section A: Top Categories (Image-led 12 Category Grid)
// ─────────────────────────────────────────────────────────────────────────────
interface CategoryTileData {
  title: string;
  image: string;
  link: string;
}

const DEFAULT_CATEGORIES: CategoryTileData[] = [
  {
    title: "Home & Kitchen",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=500&q=80",
    link: "/#home-kitchen",
  },
  {
    title: "Health & Personal Care",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80",
    link: "/#health-care",
  },
  {
    title: "Mobile Accessories",
    image: "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=mobile+accessories",
  },
  {
    title: "Home Decor & Lighting",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=decor",
  },
  {
    title: "Toys & Games",
    image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=toys",
  },
  {
    title: "Stationery, Art & Office",
    image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=stationery",
  },
  {
    title: "Bags, Wallets & Travel",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=bags",
  },
  {
    title: "Garden & Outdoor",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=garden",
  },
  {
    title: "Sports & Fitness",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=fitness",
  },
  {
    title: "Car, Bike & Vehicle",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=car+accessories",
  },
  {
    title: "Tools & Home Improvement",
    image: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=tools",
  },
  {
    title: "Baby & Child Care",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=500&q=80",
    link: "/search?q=baby",
  },
];

function TopCategoriesSection({
  collections,
  products,
}: {
  collections: readonly CollectionCardData[];
  products: readonly ProductCardData[];
}) {
  const categories = useMemo<CategoryTileData[]>(() => {
    const list: CategoryTileData[] = [];

    for (const c of collections) {
      if (c.title && c.handle) {
        const img = c.image?.url || products.find((p) => p.featuredImage?.url)?.featuredImage?.url;
        list.push({
          title: c.title,
          image: img || DEFAULT_CATEGORIES[list.length % DEFAULT_CATEGORIES.length].image,
          link: `/collections/${c.handle}`,
        });
      }
    }

    for (const def of DEFAULT_CATEGORIES) {
      if (list.length >= 12) break;
      if (!list.some((item) => item.title.toLowerCase() === def.title.toLowerCase())) {
        list.push(def);
      }
    }

    return list.slice(0, 12);
  }, [collections, products]);

  return (
    <section id="top-categories" className="w-full py-8 md:py-16 bg-white border-b border-[#E4E7ED]">
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="font-heading font-extrabold text-xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
              Top categories
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 sm:mt-1 font-medium">
              Find what you need, and a little more to love.
            </p>
          </div>
          <Link
            to="/collections"
            className="text-xs sm:text-sm font-bold text-[#2457D6] hover:underline hover:opacity-90 inline-flex items-center gap-1.5 transition-colors group self-start sm:self-auto"
          >
            <span>Explore all categories</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* 12 Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={cat.link}
              className="group flex flex-col items-center text-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#F8F7F3] hover:bg-white border border-[#E4E7ED] hover:border-[#2457D6]/40 transition-all duration-200 hover:shadow-sm"
            >
              <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-white mb-2 sm:mb-3 shadow-2xs">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-1.5 end-1.5 sm:bottom-2 sm:end-2 size-6 sm:size-7 rounded-full bg-white/95 border border-[#E4E7ED] flex items-center justify-center text-[#2457D6] text-[10px] sm:text-xs font-bold shadow-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-[#2457D6] group-hover:text-white">
                  →
                </div>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-[#192A46] line-clamp-2 leading-tight group-hover:text-[#2457D6] transition-colors">
                {cat.title}
              </h3>
              <span className="text-[10px] sm:text-[11px] text-[#64748B] font-medium mt-0.5 sm:mt-1">
                Explore collection
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section B: Shopping Benefits Strip
// ─────────────────────────────────────────────────────────────────────────────
function ShoppingBenefitsStrip() {
  return (
    <section className="w-full bg-[#EAF0FC] border-b border-[#d2def5] py-3.5 sm:py-5">
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3.5 p-2.5 sm:px-4 sm:py-0 bg-white/70 sm:bg-transparent rounded-xl sm:rounded-none border border-[#d2def5]/70 sm:border-0 shadow-2xs sm:shadow-none">
            <div className="size-8 sm:size-11 rounded-lg sm:rounded-xl bg-white border border-[#d2def5] flex items-center justify-center text-[#2457D6] shrink-0 shadow-2xs">
              <svg className="size-4 sm:size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#192A46] truncate">Delivery options</h4>
              <p className="text-[10px] sm:text-xs text-[#64748B] truncate">Details at checkout</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5 p-2.5 sm:px-4 sm:py-0 bg-white/70 sm:bg-transparent rounded-xl sm:rounded-none border border-[#d2def5]/70 sm:border-0 shadow-2xs sm:shadow-none">
            <div className="size-8 sm:size-11 rounded-lg sm:rounded-xl bg-white border border-[#d2def5] flex items-center justify-center text-[#2457D6] shrink-0 shadow-2xs">
              <svg className="size-4 sm:size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#192A46] truncate">Order tracking</h4>
              <p className="text-[10px] sm:text-xs text-[#64748B] truncate">Live updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5 p-2.5 sm:px-4 sm:py-0 bg-white/70 sm:bg-transparent rounded-xl sm:rounded-none border border-[#d2def5]/70 sm:border-0 shadow-2xs sm:shadow-none">
            <div className="size-8 sm:size-11 rounded-lg sm:rounded-xl bg-white border border-[#d2def5] flex items-center justify-center text-[#2457D6] shrink-0 shadow-2xs">
              <svg className="size-4 sm:size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#192A46] truncate">Secure checkout</h4>
              <p className="text-[10px] sm:text-xs text-[#64748B] truncate">COD &amp; Encrypted UPI</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5 p-2.5 sm:px-4 sm:py-0 bg-white/70 sm:bg-transparent rounded-xl sm:rounded-none border border-[#d2def5]/70 sm:border-0 shadow-2xs sm:shadow-none">
            <div className="size-8 sm:size-11 rounded-lg sm:rounded-xl bg-white border border-[#d2def5] flex items-center justify-center text-[#2457D6] shrink-0 shadow-2xs">
              <svg className="size-4 sm:size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#192A46] truncate">Customer support</h4>
              <p className="text-[10px] sm:text-xs text-[#64748B] truncate">Here to help</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section C: Shop by Price
// ─────────────────────────────────────────────────────────────────────────────
function ShopByPriceSection() {
  const priceTiers = [
    { label: "₹99", query: "99" },
    { label: "₹149", query: "149" },
    { label: "₹199", query: "199" },
    { label: "₹249", query: "249" },
    { label: "₹299", query: "299" },
    { label: "₹349", query: "349" },
    { label: "₹399", query: "399" },
    { label: "₹499 & under", query: "499" },
  ];

  return (
    <section id="shop-by-price" className="w-full py-8 md:py-16 bg-white border-b border-[#E4E7ED]">
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <h2 className="font-heading font-extrabold text-xl sm:text-3xl text-[#192A46] tracking-tight">
            Small prices. Great finds.
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
            Everyday essentials, at a price that works for you.
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3.5">
          {priceTiers.map((tier, idx) => (
            <Link
              key={idx}
              to={`/search?q=under+${tier.query}`}
              className="flex flex-col items-center justify-center p-2 sm:p-3.5 rounded-xl bg-[#F8F7F3] hover:bg-[#2457D6] border border-[#E4E7ED] hover:border-[#2457D6] text-center transition-all duration-200 group shadow-2xs hover:shadow-sm"
            >
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#64748B] group-hover:text-white/80">
                Under
              </span>
              <span className="text-xs sm:text-lg font-black text-[#192A46] group-hover:text-white mt-0.5">
                {tier.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section D: Trending Now
// ─────────────────────────────────────────────────────────────────────────────
function TrendingNowSection({
  products,
}: {
  products: readonly ProductCardData[];
}) {
  const [activeTab, setActiveTab] = useState<"all" | "new" | "offers">("all");
  const carouselRef = useRef<HTMLUListElement>(null);

  const filteredProducts = useMemo(() => {
    if (activeTab === "new") {
      return [...products].reverse().slice(0, 10);
    }
    if (activeTab === "offers") {
      return products.filter((p) => {
        const price = p.priceRange.minVariantPrice;
        const compareAt = p.compareAtPriceRange.minVariantPrice;
        return compareMoney(compareAt, price) > 0;
      });
    }
    return products;
  }, [products, activeTab]);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section id="trending" className="w-full py-8 md:py-16 bg-[#F8F7F3] border-b border-[#E4E7ED]">
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="font-heading font-extrabold text-xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
              Trending Now
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 sm:mt-1.5 font-medium">
              Clever problem-solvers and practical everyday essentials hand-picked to make life smoother.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/collections"
              className="text-xs sm:text-sm font-bold text-[#2457D6] hover:underline hover:opacity-90 inline-flex items-center gap-1 group"
            >
              <span>Shop all</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 ms-3">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="size-8 rounded-full bg-white border border-[#E4E7ED] hover:border-[#2457D6] text-[#192A46] flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer transition-colors"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="size-8 rounded-full bg-white border border-[#E4E7ED] hover:border-[#2457D6] text-[#192A46] flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 scrollbar-none" role="tablist">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            role="tab"
            aria-selected={activeTab === "all"}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "all"
                ? "bg-[#2457D6] text-white shadow-xs"
                : "bg-white text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]"
            }`}
          >
            All Finds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            role="tab"
            aria-selected={activeTab === "new"}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "new"
                ? "bg-[#2457D6] text-white shadow-xs"
                : "bg-white text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]"
            }`}
          >
            New Arrivals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("offers")}
            role="tab"
            aria-selected={activeTab === "offers"}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "offers"
                ? "bg-[#2457D6] text-white shadow-xs"
                : "bg-white text-[#192A46] border border-[#E4E7ED] hover:border-[#2457D6]"
            }`}
          >
            Best Offers
          </button>
        </div>

        {/* Product Carousel / Grid */}
        <ul
          ref={carouselRef}
          role="list"
          className="flex gap-3 sm:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0"
        >
          {filteredProducts.map((product, idx) => (
            <li
              key={product.handle}
              className="w-[195px] sm:w-[260px] lg:w-[280px] shrink-0 snap-start h-full"
            >
              <ProductCard product={product} priority={idx < 4} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section E: Category Collection: Home & Kitchen Favourites
// ─────────────────────────────────────────────────────────────────────────────
function HomeAndKitchenSection({
  products,
}: {
  products: readonly ProductCardData[];
}) {
  const homeProducts = useMemo(() => {
    const matched = products.filter(
      (p) =>
        p.productType?.toLowerCase().includes("home") ||
        p.productType?.toLowerCase().includes("kitchen") ||
        p.title.toLowerCase().includes("home") ||
        p.title.toLowerCase().includes("kitchen"),
    );
    return matched.length >= 4 ? matched.slice(0, 8) : products.slice(0, 8);
  }, [products]);

  return (
    <section id="home-kitchen" className="w-full py-12 md:py-16 bg-white border-b border-[#E4E7ED]">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2457D6] block mb-1">
              CURATED ESSENTIALS
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
              Home &amp; Kitchen favourites
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
              Practical organizers, smart cooking tools, and clever cleaning problem-solvers.
            </p>
          </div>
          <Link
            to="/search?q=home+kitchen"
            className="text-xs sm:text-sm font-bold text-[#2457D6] hover:underline hover:opacity-90 inline-flex items-center gap-1 group"
          >
            <span>Explore Home &amp; Kitchen</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {homeProducts.slice(0, 4).map((product) => (
            <div key={product.handle} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section F: Special Offers / The Offers Edit (Ice blue section, Sale Red badge)
// ─────────────────────────────────────────────────────────────────────────────
function SpecialOffersSection({
  products,
}: {
  products: readonly ProductCardData[];
}) {
  const saleProducts = useMemo(() => {
    const discounted = products.filter((p) => {
      const price = p.priceRange.minVariantPrice;
      const compareAt = p.compareAtPriceRange.minVariantPrice;
      return compareMoney(compareAt, price) > 0;
    });
    return discounted.length >= 2 ? discounted.slice(0, 4) : products.slice(2, 6);
  }, [products]);

  return (
    <section id="special-offers" className="w-full py-12 md:py-16 bg-[#EAF0FC] border-b border-[#d2def5]">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D93636] block mb-1">
              LIMITED TIME VALUES
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
              The Offers Edit
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
              Hand-picked discounts on popular everyday essentials. Genuine savings verified at checkout.
            </p>
          </div>
          <Link
            to="/search?q=sale"
            className="text-xs sm:text-sm font-bold text-[#2457D6] hover:underline hover:opacity-90 inline-flex items-center gap-1 group"
          >
            <span>View All Deals</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {saleProducts.map((product) => (
            <div key={product.handle} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section G: Smart Everyday Essentials
// ─────────────────────────────────────────────────────────────────────────────
function SmartEssentialsSection({
  products,
}: {
  products: readonly ProductCardData[];
}) {
  const gadgetProducts = products.slice(4, 12);

  return (
    <section id="smart-upgrades" className="w-full py-12 md:py-16 bg-white border-b border-[#E4E7ED]">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#2457D6] block mb-1">
            CONVENIENT UPGRADES
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
            Smart little upgrades
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 font-medium">
            Useful accessories, clever gadgets, and daily tools that upgrade your everyday routine.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {gadgetProducts.map((product) => (
            <div key={product.handle} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section H: New Arrivals / Featured Collection Banner
// ─────────────────────────────────────────────────────────────────────────────
function FeaturedBannerSection() {
  return (
    <section className="w-full py-8 md:py-14 bg-[#F8F7F3] border-b border-[#E4E7ED]">
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        <div className="bg-gradient-to-r from-[#192A46] to-[#253d66] text-white rounded-2xl p-5 sm:p-10 md:p-12 relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="max-w-xl z-10 w-full text-center md:text-left">
            <span className="inline-block text-[10px] uppercase font-bold tracking-widest text-[#EAF0FC] bg-white/10 px-3 py-1 rounded-full mb-2.5">
              NEW ARRIVALS
            </span>
            <h2 className="font-heading font-extrabold text-xl sm:text-3xl md:text-4xl tracking-tight leading-tight">
              Fresh Finds Designed to Make Life Better.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Explore the newest wave of trending problem solvers, useful kitchen upgrades, and smart accessories added this week.
            </p>
            <div className="mt-4 sm:mt-5">
              <Link
                to="/collections"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2457D6] hover:opacity-90 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xs transition-all"
              >
                <span>Explore New Arrivals</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="w-full md:w-auto grid grid-cols-2 gap-2.5 sm:gap-3 shrink-0 items-center">
            <div className="rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center text-center p-2.5 sm:p-3">
              <span className="text-lg sm:text-2xl mb-1">🚚</span>
              <span className="text-[11px] sm:text-xs font-bold">Fast Pan-India</span>
              <span className="text-[10px] text-slate-300">Dispatch in 24h</span>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center text-center p-2.5 sm:p-3">
              <span className="text-lg sm:text-2xl mb-1">💵</span>
              <span className="text-[11px] sm:text-xs font-bold">COD Available</span>
              <span className="text-[10px] text-slate-300">Pay at Doorstep</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section I: Health & Personal Care
// ─────────────────────────────────────────────────────────────────────────────
function HealthCareSection({
  products,
}: {
  products: readonly ProductCardData[];
}) {
  const healthProducts = useMemo(() => {
    const matched = products.filter(
      (p) =>
        p.productType?.toLowerCase().includes("health") ||
        p.productType?.toLowerCase().includes("care") ||
        p.title.toLowerCase().includes("massage") ||
        p.title.toLowerCase().includes("care") ||
        p.title.toLowerCase().includes("wellness"),
    );
    return matched.length >= 2 ? matched.slice(0, 4) : products.slice(1, 5);
  }, [products]);

  return (
    <section id="health-care" className="w-full py-12 md:py-16 bg-white border-b border-[#E4E7ED]">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2457D6] block mb-1">
              WELLNESS &amp; DAILY CARE
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
              Health &amp; Personal Care
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
              Everyday grooming, relaxation devices, and personal care essentials for your well-being.
            </p>
          </div>
          <Link
            to="/search?q=health+personal+care"
            className="text-xs sm:text-sm font-bold text-[#2457D6] hover:underline hover:opacity-90 inline-flex items-center gap-1 group"
          >
            <span>Explore Health &amp; Personal Care</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {healthProducts.map((product) => (
            <div key={product.handle} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section J: Additional Category Discovery
// ─────────────────────────────────────────────────────────────────────────────
function CategoryDiscoverySection() {
  const editorialCategories = [
    {
      title: "Smart Kitchen & Dining",
      desc: "Vegetable choppers, oil dispensers, storage jars, and smart countertop helpers.",
      image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
      link: "/search?q=kitchen",
    },
    {
      title: "Gadgets & Mobile Life",
      desc: "Phone mounts, desk organizers, lighting, and everyday practical electronics.",
      image: "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=600&q=80",
      link: "/search?q=gadgets",
    },
    {
      title: "Daily Home Essentials",
      desc: "Space savers, bathroom fixtures, drill-free holders, and cleaning tools.",
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
      link: "/search?q=home",
    },
  ];

  return (
    <section className="w-full py-12 md:py-16 bg-[#F8F7F3] border-b border-[#E4E7ED]">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#2457D6] block mb-1">
            EXPLORE COLLECTIONS
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
            Curated For Modern Living
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 font-medium">
            Explore curated collections tailored to simplify everyday chores and living spaces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {editorialCategories.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className="group relative rounded-2xl overflow-hidden bg-white border border-[#E4E7ED] shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#F8F7F3]">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-[#192A46] group-hover:text-[#2457D6] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#F8F7F3] flex items-center justify-between text-xs font-bold text-[#2457D6]">
                  <span>Explore Collection</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section K: Gift / Everyday Finds banner
// ─────────────────────────────────────────────────────────────────────────────
function GiftingBanner() {
  return (
    <section className="w-full py-8 sm:py-10 bg-white border-b border-[#E4E7ED]">
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        <div className="rounded-2xl bg-[#EAF0FC] border border-[#d2def5] p-5 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-3.5 sm:gap-4 w-full">
            <div className="size-12 sm:size-14 rounded-2xl bg-white border border-[#d2def5] text-[#2457D6] flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-2xs">
              🎁
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-xl text-[#192A46]">
                Looking for Thoughtful Gifts &amp; Everyday Wins?
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Surprise your loved ones with practical, clever upgrades that make everyday moments special.
              </p>
            </div>
          </div>
          <Link
            to="/collections"
            className="w-full sm:w-auto shrink-0 text-center bg-[#2457D6] hover:opacity-90 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-2xs"
          >
            Browse Gift Ideas →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section L: Shopping Guide / FAQ
// ─────────────────────────────────────────────────────────────────────────────
function ShoppingGuideFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const guideItems = [
    {
      num: "01",
      q: "How do I choose the right product?",
      a: "Review the product specifications, dimensions, and practical use cases listed on each product detail page. Each item is individually tested to ensure reliable build quality, material durability, and seamless everyday use in Indian homes.",
    },
    {
      num: "02",
      q: "Where can I check delivery charges?",
      a: "All orders on HypeeeCart come with 100% Free Express Shipping across India! Any applicable Cash on Delivery handling charges or taxes will be clearly transparent at checkout before you confirm your order.",
    },
    {
      num: "03",
      q: "How do returns and product care work?",
      a: "We provide a hassle-free 7-Day Replacement Guarantee if your product arrives damaged or defective in transit. Simply contact our support team with your order ID and a photo/video, and we will arrange a quick replacement.",
    },
  ];

  return (
    <section id="shopping-guide" className="w-full py-12 md:py-16 bg-[#F8F7F3] border-b border-[#E4E7ED]">
      <div className="max-w-page px-margin mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Heading & Trust */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2457D6] block">
              SHOPPING GUIDE
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#192A46] tracking-tight">
              Shop with confidence
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              We curate practical finds that make everyday life simpler. Here is everything you need to know about shopping, delivery, and guarantees at HypeeeCart.
            </p>

            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-[#192A46] font-semibold">
                <span className="text-[#2457D6] font-bold">✓</span>
                <span>Genuine product quality &amp; accurate descriptions</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#192A46] font-semibold">
                <span className="text-[#2457D6] font-bold">✓</span>
                <span>Pan-India express logistics with live tracking</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#192A46] font-semibold">
                <span className="text-[#2457D6] font-bold">✓</span>
                <span>Safe payments via UPI, Cards, NetBanking or COD</span>
              </div>
            </div>
          </div>

          {/* Right Column: Numbered Accordions 01, 02, 03 */}
          <div className="lg:col-span-7 space-y-3">
            {guideItems.map((item, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E4E7ED] rounded-xl overflow-hidden transition-colors shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F8F7F3] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="font-heading font-extrabold text-sm sm:text-base text-[#2457D6]">
                        {item.num}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-[#192A46]">
                        {item.q}
                      </span>
                    </div>
                    <span className="text-[#2457D6] text-lg font-bold shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#F8F7F3]">
                      {item.a}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section M: Newsletter (Pale Ice Blue Section)
// ─────────────────────────────────────────────────────────────────────────────
function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!agreed) {
      setError("Please check the box to agree to receive emails.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <section className="w-full py-12 md:py-16 bg-[#EAF0FC] border-b border-[#d2def5]">
      <div className="max-w-page px-margin mx-auto">
        <div className="bg-white rounded-2xl border border-[#d2def5] p-6 sm:p-10 md:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left text */}
            <div className="lg:col-span-6 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#2457D6] block">
                KEEP IN TOUCH
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#192A46] tracking-tight">
                Be first to discover.
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B]">
                New arrivals, fresh finds and offers, straight to your inbox.
              </p>
            </div>

            {/* Right form */}
            <div className="lg:col-span-6">
              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs font-semibold">
                  ✓ Thank you! You are now subscribed to HypeeeCart new arrival alerts.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      className="flex-1 bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl px-4 py-2.5 text-xs text-[#192A46] placeholder:text-[#64748B] focus:outline-none focus:border-[#2457D6] focus:bg-white transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-[#2457D6] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      →
                    </button>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="rounded border-[#E4E7ED] text-[#2457D6] focus:ring-[#2457D6]"
                    />
                    <span>I agree to receive emails from HypeeeCart.</span>
                  </label>

                  {error ? (
                    <p className="text-xs text-[#D93636] font-medium">{error}</p>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Home Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      {loaderData.isMockMode ? (
        <div className="bg-[#EAF0FC] border-b border-[#d2def5] px-4 py-2 text-center text-xs text-[#192A46]">
          <span className="font-semibold text-[#2457D6]">🛠️ Catalog Preview:</span> Showing demo inventory from mock.shop. Connect your Shopify store via <code className="bg-white px-1.5 py-0.5 rounded border border-[#d2def5] text-[11px]">npx shopify hydrogen link</code> to render live inventory.
        </div>
      ) : null}

      {/* 1. CLEAN RESTRAINED TWO-COLUMN HERO (1st at the top) */}
      <HomeHero products={loaderData.allProducts} />

      {/* A. Top Categories / Shop by Category */}
      <TopCategoriesSection
        collections={loaderData.featuredCollections}
        products={loaderData.allProducts}
      />

      {/* B. Shopping benefits strip */}
      <ShoppingBenefitsStrip />

      {/* C. Shop by Price */}
      <ShopByPriceSection />

      {/* D. Trending Now */}
      <TrendingNowSection products={loaderData.allProducts} />

      {/* E. Category collection: Home & Kitchen favourites */}
      <HomeAndKitchenSection products={loaderData.allProducts} />

      {/* F. Special Offers / The Offers Edit */}
      <SpecialOffersSection products={loaderData.allProducts} />

      {/* G. Smart Everyday Essentials */}
      <SmartEssentialsSection products={loaderData.allProducts} />

      {/* H. New Arrivals / Featured Collection banner */}
      <FeaturedBannerSection />

      {/* I. Health & Personal Care */}
      <HealthCareSection products={loaderData.allProducts} />

      {/* J. Additional category discovery section */}
      <CategoryDiscoverySection />

      {/* K. Gift / Everyday finds banner */}
      <GiftingBanner />

      {/* L. Shopping Guide / FAQ */}
      <ShoppingGuideFAQ />

      {/* M. Newsletter */}
      <NewsletterSection />
    </main>
  );
}
