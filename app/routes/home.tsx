import { gql } from "@shopify/hydrogen";
import { Link, useRouteLoaderData } from "react-router";
import { useMemo, useRef, useState } from "react";

import {
  CollectionCard,
  COLLECTION_CARD_FRAGMENT,
  type CollectionCardData,
} from "~/components/CollectionCard";
import { ProductCard, PRODUCT_CARD_FRAGMENT, type ProductCardData } from "~/components/ProductCard";
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

  return {
    allProducts,
    featuredCollections,
    isMockMode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section A: Top Categories (KitKart inspired 12 category grid)
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
  // Merge live store collections and dynamic product categories
  const categories = useMemo<CategoryTileData[]>(() => {
    const list: CategoryTileData[] = [];

    // Prioritize collections from Shopify
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

    // Fill remaining up to 12 from DEFAULT_CATEGORIES
    for (const def of DEFAULT_CATEGORIES) {
      if (list.length >= 12) break;
      if (!list.some((item) => item.title.toLowerCase() === def.title.toLowerCase())) {
        list.push(def);
      }
    }

    return list.slice(0, 12);
  }, [collections, products]);

  return (
    <section id="top-categories" className="w-full py-10 md:py-14 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
              Top categories
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1.5 font-medium">
              Find what you need, and a little more to love.
            </p>
          </div>
          <Link
            to="/collections"
            className="text-xs sm:text-sm font-bold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1.5 transition-colors group self-start sm:self-auto"
          >
            <span>Explore all categories</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* 12 Category Grid (KitKart 6-per-row layout on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={cat.link}
              className="group flex flex-col items-center text-center p-3 rounded-2xl bg-[#FAF6F0] hover:bg-white border border-[#E2DBD0] hover:border-[#B77943]/40 transition-all duration-200 hover:shadow-md"
            >
              {/* Category Image container with circular pill button */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white mb-3 shadow-2xs">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                  loading="lazy"
                />
                {/* Circular arrow icon on bottom right */}
                <div className="absolute bottom-2 end-2 size-7 rounded-full bg-white/95 border border-[#E2DBD0] flex items-center justify-center text-[#B77943] text-xs font-bold shadow-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-[#B77943] group-hover:text-white">
                  →
                </div>
              </div>

              {/* Title & subtitle */}
              <h3 className="text-xs sm:text-sm font-bold text-[#282720] line-clamp-2 leading-tight group-hover:text-[#B77943] transition-colors">
                {cat.title}
              </h3>
              <span className="text-[11px] text-[#7D786D] font-medium mt-1">
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
// Section B: Shopping Benefits Strip (KitKart screenshot 4)
// ─────────────────────────────────────────────────────────────────────────────
function ShoppingBenefitsStrip() {
  return (
    <section className="w-full bg-[#FAF6F0] border-b border-[#E2DBD0] py-5">
      <div className="max-w-page px-margin mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2DBD0]">
          {/* Benefit 1 */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="size-11 rounded-xl bg-white border border-[#E2DBD0] flex items-center justify-center text-[#B77943] shrink-0 shadow-2xs">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#282720]">Delivery options</h4>
              <p className="text-xs text-[#5E5B52]">Details at checkout</p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="size-11 rounded-xl bg-white border border-[#E2DBD0] flex items-center justify-center text-[#B77943] shrink-0 shadow-2xs">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#282720]">Order tracking</h4>
              <p className="text-xs text-[#5E5B52]">Updates in your account</p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="size-11 rounded-xl bg-white border border-[#E2DBD0] flex items-center justify-center text-[#B77943] shrink-0 shadow-2xs">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#282720]">Secure checkout</h4>
              <p className="text-xs text-[#5E5B52]">Shop with confidence</p>
            </div>
          </div>

          {/* Benefit 4 */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="size-11 rounded-xl bg-white border border-[#E2DBD0] flex items-center justify-center text-[#B77943] shrink-0 shadow-2xs">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#282720]">Customer support</h4>
              <p className="text-xs text-[#5E5B52]">We are here to help</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section C: Shop by Price (KitKart screenshot 3 / ccb5bc93)
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
    <section id="shop-by-price" className="w-full py-10 md:py-14 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#282720] tracking-tight">
            Small prices. Great finds.
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-1.5 font-medium">
            Everyday essentials, at a price that works for you.
          </p>
        </div>

        {/* Price Tiles Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">
          {priceTiers.map((tier, idx) => (
            <Link
              key={idx}
              to={`/search?q=under+${tier.query}`}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#FAF6F0] hover:bg-[#B77943] border border-[#E2DBD0] hover:border-[#B77943] text-center transition-all duration-200 group shadow-2xs hover:shadow-md"
            >
              <span className="text-[10px] uppercase font-bold text-[#7D786D] group-hover:text-white/80">
                Under
              </span>
              <span className="text-base sm:text-lg font-black text-[#282720] group-hover:text-white mt-0.5">
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
// Section D: Trending Now (KitKart screenshot 6 with tabs)
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
    <section id="trending" className="w-full py-12 md:py-16 bg-[#FAF6F0] border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
              Trending Now
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1.5 font-medium">
              Clever problem-solvers and practical everyday essentials hand-picked to make life smoother.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/collections"
              className="text-xs sm:text-sm font-bold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1 group"
            >
              <span>Shop all</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>

            {/* Desktop Chevrons */}
            <div className="hidden sm:flex items-center gap-1.5 ms-3">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="size-8 rounded-full bg-white border border-[#E2DBD0] hover:border-[#B77943] text-[#282720] flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer transition-colors"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="size-8 rounded-full bg-white border border-[#E2DBD0] hover:border-[#B77943] text-[#282720] flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6" role="tablist">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            role="tab"
            aria-selected={activeTab === "all"}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#B77943] text-white shadow-xs"
                : "bg-white text-[#282720] border border-[#E2DBD0] hover:border-[#B77943]"
            }`}
          >
            All Finds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            role="tab"
            aria-selected={activeTab === "new"}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "new"
                ? "bg-[#B77943] text-white shadow-xs"
                : "bg-white text-[#282720] border border-[#E2DBD0] hover:border-[#B77943]"
            }`}
          >
            New Arrivals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("offers")}
            role="tab"
            aria-selected={activeTab === "offers"}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "offers"
                ? "bg-[#B77943] text-white shadow-xs"
                : "bg-white text-[#282720] border border-[#E2DBD0] hover:border-[#B77943]"
            }`}
          >
            Best Offers
          </button>
        </div>

        {/* Product Carousel / Grid */}
        <ul
          ref={carouselRef}
          role="list"
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {filteredProducts.map((product, idx) => (
            <li
              key={product.handle}
              className="w-[230px] sm:w-[260px] lg:w-[280px] shrink-0 snap-start h-full"
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
// Section E: Category Collection: Home & Kitchen Favourites (KitKart screenshot 7)
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
    <section id="home-kitchen" className="w-full py-12 md:py-16 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block mb-1">
              CURATED ESSENTIALS
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
              Home &amp; Kitchen favourites
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1 font-medium">
              Practical organizers, smart cooking tools, and clever cleaning problem-solvers.
            </p>
          </div>
          <Link
            to="/search?q=home+kitchen"
            className="text-xs sm:text-sm font-bold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1 group"
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
// Section F: Special Offers / The Offers Edit
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
    <section id="special-offers" className="w-full py-12 md:py-16 bg-[#FAF6F0] border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block mb-1">
              LIMITED TIME VALUES
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
              The Offers Edit
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1 font-medium">
              Hand-picked discounts on popular everyday essentials. Genuine savings verified at checkout.
            </p>
          </div>
          <Link
            to="/search?q=sale"
            className="text-xs sm:text-sm font-bold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1 group"
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
    <section id="smart-upgrades" className="w-full py-12 md:py-16 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block mb-1">
            CONVENIENT UPGRADES
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
            Smart little upgrades
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-1.5 font-medium">
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
    <section className="w-full py-10 md:py-14 bg-[#FAF6F0] border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="bg-gradient-to-r from-[#282720] to-[#3D3A32] text-white rounded-2xl p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl z-10">
            <span className="inline-block text-[10px] uppercase font-bold tracking-widest text-[#D7A84C] bg-white/10 px-3 py-1 rounded-full mb-3">
              ✨ NEW ARRIVALS
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight">
              Fresh Finds Designed to Make Life Better.
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-2.5 leading-relaxed">
              Explore the newest wave of trending problem solvers, useful kitchen upgrades, and smart accessories added this week.
            </p>
            <div className="mt-5">
              <Link
                to="/collections"
                className="inline-flex items-center gap-2 bg-[#B77943] hover:bg-[#9E6433] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-lg shadow-sm transition-all"
              >
                <span>Explore New Arrivals</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 items-center">
            <div className="size-24 sm:size-32 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center text-center p-3">
              <span className="text-xl sm:text-2xl mb-1">🚚</span>
              <span className="text-[10px] sm:text-xs font-bold">Fast Pan-India</span>
              <span className="text-[9px] text-stone-300">Dispatch in 24h</span>
            </div>
            <div className="size-24 sm:size-32 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center text-center p-3">
              <span className="text-xl sm:text-2xl mb-1">💵</span>
              <span className="text-[10px] sm:text-xs font-bold">COD Available</span>
              <span className="text-[9px] text-stone-300">Pay at Doorstep</span>
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
    <section id="health-care" className="w-full py-12 md:py-16 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block mb-1">
              WELLNESS &amp; DAILY CARE
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
              Health &amp; Personal Care
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] mt-1 font-medium">
              Everyday grooming, relaxation devices, and personal care essentials for your well-being.
            </p>
          </div>
          <Link
            to="/search?q=health+personal+care"
            className="text-xs sm:text-sm font-bold text-[#B77943] hover:text-[#9E6433] inline-flex items-center gap-1 group"
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
    <section className="w-full py-12 md:py-16 bg-[#FAF6F0] border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block mb-1">
            EXPLORE COLLECTIONS
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
            Curated For Modern Living
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5B52] mt-1.5 font-medium">
            Explore curated collections tailored to simplify everyday chores and living spaces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {editorialCategories.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className="group relative rounded-2xl overflow-hidden bg-white border border-[#E2DBD0] shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#FAF6F0]">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-[#282720] group-hover:text-[#B77943] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-[#5E5B52] mt-1.5 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-xs font-bold text-[#B77943]">
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
    <section className="w-full py-10 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="rounded-2xl bg-[#FAF6F0] border border-[#E2DBD0] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-[#B77943]/15 text-[#B77943] flex items-center justify-center text-2xl shrink-0">
              🎁
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg sm:text-xl text-[#282720]">
                Looking for Thoughtful Gifts &amp; Everyday Wins?
              </h3>
              <p className="text-xs sm:text-sm text-[#5E5B52] mt-0.5">
                Surprise your loved ones with practical, clever upgrades that make everyday moments special.
              </p>
            </div>
          </div>
          <Link
            to="/collections"
            className="shrink-0 bg-[#282720] hover:bg-[#3D3A32] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-lg transition-colors shadow-2xs"
          >
            Browse Gift Ideas →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section L: Shopping Guide / FAQ (KitKart screenshot 5 / 731db47e)
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
    <section id="shopping-guide" className="w-full py-12 md:py-16 bg-[#FAF6F0] border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Heading & Trust */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block">
              SHOPPING GUIDE
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#282720] tracking-tight">
              Shop with confidence
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed">
              We curate practical finds that make everyday life simpler. Here is everything you need to know about shopping, delivery, and guarantees at HypeeeCart.
            </p>

            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-[#282720] font-semibold">
                <span className="text-[#B77943]">✓</span>
                <span>Genuine product quality &amp; accurate descriptions</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#282720] font-semibold">
                <span className="text-[#B77943]">✓</span>
                <span>Pan-India express logistics with live tracking</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#282720] font-semibold">
                <span className="text-[#B77943]">✓</span>
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
                  className="bg-white border border-[#E2DBD0] rounded-xl overflow-hidden transition-colors shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF6F0]/60 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="font-heading font-extrabold text-sm sm:text-base text-[#B77943]">
                        {item.num}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-[#282720]">
                        {item.q}
                      </span>
                    </div>
                    <span className="text-[#B77943] text-lg font-bold shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1]">
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
// Section M: Newsletter (KitKart screenshot 3 / 6077de1d)
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
    <section className="w-full py-12 md:py-16 bg-white border-b border-[#E2DBD0]">
      <div className="max-w-page px-margin mx-auto">
        <div className="bg-[#FAF6F0] rounded-2xl border border-[#E2DBD0] p-6 sm:p-10 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left text */}
            <div className="lg:col-span-6 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77943] block">
                KEEP IN TOUCH
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#282720] tracking-tight">
                Be first to discover.
              </h2>
              <p className="text-xs sm:text-sm text-[#5E5B52]">
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
                      className="flex-1 bg-white border border-[#E2DBD0] rounded-xl px-4 py-2.5 text-xs text-[#282720] placeholder:text-[#8D887D] focus:outline-none focus:border-[#B77943] transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-[#B77943] hover:bg-[#9E6433] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      →
                    </button>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#5E5B52]">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="rounded border-[#E2DBD0] text-[#B77943] focus:ring-[#B77943]"
                    />
                    <span>I agree to receive emails from HypeeeCart.</span>
                  </label>

                  {error ? (
                    <p className="text-xs text-red-600 font-medium">{error}</p>
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
        <div className="bg-[#FAF3E3] border-b border-[#D7A84C]/40 px-4 py-2 text-center text-xs text-[#282720]">
          <span className="font-semibold text-[#B77943]">🛠️ Catalog Preview:</span> Showing demo inventory from mock.shop. Connect your Shopify store via <code className="bg-white px-1.5 py-0.5 rounded border border-[#D7A84C]/40 text-[11px]">npx shopify hydrogen link</code> to render live inventory.
        </div>
      ) : null}

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
