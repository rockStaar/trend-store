import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

import { compareMoney, formatPrice, salePercent } from "~/lib/money";

export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    handle
    title
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

  return (
    <article
      className="group card flex flex-col h-full bg-white rounded-xl border border-[#E2DBD0] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-[#B77943]/30"
      aria-label={product.title}
      data-testid="product-card"
    >
      {/* Image area — 4:5 portrait ratio for editorial feel */}
      <Link
        to={`/products/${product.handle}`}
        className="relative block overflow-hidden bg-[#EFE9DE]"
        style={{ aspectRatio: "4/5" }}
        tabIndex={-1}
        aria-hidden="true"
      >
        {primaryImage ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]">
            <img
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#FAF6F0] to-[#EFE9DE]">
            <span className="text-3xl opacity-30">🌿</span>
          </div>
        )}

        {/* Hover image */}
        {hoverImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-400 motion-safe:group-hover:opacity-100">
            <img
              src={hoverImage.url}
              alt={hoverImage.altText ?? ""}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        {/* Badges row */}
        <div className="absolute start-2.5 top-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {!product.availableForSale ? (
            <span className="bg-[#282720] text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
              Sold out
            </span>
          ) : discountPercent ? (
            <span className="bg-[#C2452D] text-white text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full">
              -{discountPercent}%
            </span>
          ) : null}
        </div>

        {/* "View Product" overlay pill on hover */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:group-hover:opacity-100">
          <div className="bg-white/95 backdrop-blur-sm text-[#282720] text-xs font-semibold px-4 py-2 rounded-lg shadow-md text-center w-full">
            View Product →
          </div>
        </div>
      </Link>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 text-left justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#282720] line-clamp-2 leading-snug">
            <Link to={`/products/${product.handle}`} className="card-link hover:text-[#B77943] transition-colors">
              {product.title}
            </Link>
          </h3>
        </div>

        <div className="pt-3 mt-2 border-t border-[#F0EBE1] flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#282720]">
              <span className="sr-only">Price: </span>
              {formatPrice(price)}
            </span>
            {onSale && compareAt ? (
              <s className="text-xs text-[#9D9891]">
                <span className="sr-only">Regular price: </span>
                {formatPrice(compareAt)}
              </s>
            ) : null}
          </div>

          {product.availableForSale ? (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">
              In Stock
            </span>
          ) : (
            <span className="text-[10px] font-medium text-[#9D9891] bg-[#F5F1EC] px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
