import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";
import { useState, useEffect } from "react";

import { compareMoney, formatPrice, salePercent } from "~/lib/money";

export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    handle
    title
    productType
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        url
        altText
      }
    }
    availableForSale
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 1) {
      nodes {
        id
        availableForSale
      }
    }
  }
`);

const PRODUCT_CARD_SHAPE_QUERY = gql(
  `query ProductCardShape { products(first: 1) { nodes { ...ProductCard } } }`,
  [PRODUCT_CARD_FRAGMENT],
);

export type ProductCardData = StorefrontApi.ResultOf<
  typeof PRODUCT_CARD_SHAPE_QUERY
>["products"]["nodes"][number];

type ProductCardProps = {
  product: ProductCardData;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const primaryImage = product.featuredImage ?? product.images.nodes[0] ?? null;
  const hoverImage = product.images.nodes[1] ?? null;
  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.minVariantPrice;
  const onSale = compareMoney(compareAt, price) > 0;
  const discountPercent = onSale ? salePercent(price, compareAt) : null;

  const firstVariant = product.variants?.nodes?.[0];
  const variantId = firstVariant?.id;
  const isAvailable = product.availableForSale && (firstVariant?.availableForSale ?? true);

  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hypeeecart_wishlist");
      if (saved) {
        const list: string[] = JSON.parse(saved);
        setIsWishlisted(list.includes(product.handle));
      }
    } catch {}
  }, [product.handle]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = localStorage.getItem("hypeeecart_wishlist");
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (list.includes(product.handle)) {
        list = list.filter((h) => h !== product.handle);
        setIsWishlisted(false);
      } else {
        list.push(product.handle);
        setIsWishlisted(true);
      }
      localStorage.setItem("hypeeecart_wishlist", JSON.stringify(list));
      window.dispatchEvent(new Event("wishlist_updated"));
    } catch {}
  };

  return (
    <article
      className="group card flex flex-col h-full bg-white rounded-2xl border border-[#E2DBD0] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-[#B77943]/50 relative"
      aria-label={product.title}
      data-testid="product-card"
    >
      {/* ── Product Photography (Aspect 4/5 or 1/1) ── */}
      <div className="relative aspect-[4/5] w-full bg-[#FAF6F0] overflow-hidden">
        <Link
          to={`/products/${product.handle}`}
          className="block h-full w-full"
          tabIndex={-1}
          aria-hidden="true"
        >
          {primaryImage ? (
            <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105">
              <img
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.title}
                className="h-full w-full object-cover"
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
              />
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-[#FAF6F0] text-[#7D786D] text-xs">
              <span>HypeeeCart</span>
            </div>
          )}

          {/* Secondary hover image */}
          {hoverImage ? (
            <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-500 motion-safe:group-hover:opacity-100">
              <img
                src={hoverImage.url}
                alt={hoverImage.altText ?? ""}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
        </Link>

        {/* ── Top Badges: Discount on Left, Wishlist on Right ── */}
        <div className="absolute start-3 top-3 z-10 pointer-events-none">
          {!isAvailable ? (
            <span className="bg-[#282720] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md shadow-xs">
              Sold out
            </span>
          ) : discountPercent ? (
            <span className="bg-[#B77943] text-white text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md shadow-xs">
              SAVE {discountPercent}%
            </span>
          ) : null}
        </div>

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute end-3 top-3 z-20 size-8 rounded-full bg-white/90 backdrop-blur-xs border border-[#E2DBD0] flex items-center justify-center text-[#282720] hover:text-[#B77943] hover:scale-110 shadow-xs transition-all cursor-pointer"
        >
          <svg
            className={`size-4.5 ${isWishlisted ? "fill-[#B77943] text-[#B77943]" : "fill-none stroke-current"}`}
            viewBox="0 0 24 24"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* ── Card Content ── */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 text-left justify-between bg-white">
        <div>
          {product.productType ? (
            <span className="text-[10px] uppercase tracking-wider text-[#B77943] font-bold block mb-1">
              {product.productType}
            </span>
          ) : null}
          <h3 className="text-xs sm:text-sm font-semibold text-[#282720] line-clamp-2 leading-snug group-hover:text-[#B77943] transition-colors">
            <Link to={`/products/${product.handle}`} className="text-[#282720] hover:underline">
              {product.title}
            </Link>
          </h3>
        </div>

        {/* Price & Stock info */}
        <div className="pt-2.5 mt-2.5 border-t border-[#F0EBE1] flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base font-bold text-[#282720]">
              {formatPrice(price)}
            </span>
            {onSale && compareAt ? (
              <s className="text-[11px] sm:text-xs text-[#7D786D]">
                {formatPrice(compareAt)}
              </s>
            ) : null}
          </div>

          <span
            className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${
              isAvailable
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-[#7D786D] bg-[#EFE9DE]"
            }`}
          >
            {isAvailable ? "In Stock" : "Sold Out"}
          </span>
        </div>

        {/* Action Button (KitKart full-width style) */}
        <div className="mt-3">
          <Link
            to={`/products/${product.handle}`}
            className="w-full py-2 px-3 rounded-lg bg-[#FAF6F0] hover:bg-[#B77943] text-[#282720] hover:text-white border border-[#E2DBD0] hover:border-[#B77943] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-[#B77943] group-hover:text-white group-hover:border-[#B77943]"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span>{isAvailable ? "Add to Cart" : "Sold Out"}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
