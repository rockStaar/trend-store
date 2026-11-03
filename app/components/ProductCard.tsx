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
      className="group card flex flex-col h-full bg-white rounded-lg border border-[#E2DBD0] overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#B77943]/40"
      aria-label={product.title}
      data-testid="product-card"
    >
      <Link
        to={`/products/${product.handle}`}
        className="relative block aspect-square w-full bg-[#EFE9DE] overflow-hidden"
        tabIndex={-1}
        aria-hidden="true"
      >
        {primaryImage ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105">
            <img
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[#7D786D] text-xs">
            No image
          </div>
        )}

        {hoverImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100">
            <img
              src={hoverImage.url}
              alt={hoverImage.altText ?? ""}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        {/* Status / Discount Badges */}
        <div className="absolute start-2.5 top-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {!product.availableForSale ? (
            <span className="bg-[#282720] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-xs">
              Sold out
            </span>
          ) : discountPercent ? (
            <span className="bg-[#B77943] text-white text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full shadow-xs">
              SAVE {discountPercent}%
            </span>
          ) : null}
        </div>

        {/* Subtle quick indicator */}
        <div className="absolute end-2.5 bottom-2.5 bg-white/90 backdrop-blur-xs text-[#282720] text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
          <span className="text-[#D7A84C]">★</span>
          <span>4.8</span>
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-3.5 sm:p-4 text-left justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#B77943] font-semibold block mb-1">
            Curated Find
          </span>
          <h3 className="text-sm font-semibold text-[#282720] line-clamp-2 leading-snug group-hover:text-[#B77943] transition-colors">
            <Link to={`/products/${product.handle}`} className="card-link text-[#282720]">
              {product.title}
            </Link>
          </h3>
        </div>

        <div className="pt-3 mt-auto border-t border-[#F0EBE1] flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-[#282720]">
              <span className="sr-only">Price: </span>
              {formatPrice(price)}
            </span>
            {onSale && compareAt ? (
              <s className="text-xs text-[#7D786D]">
                <span className="sr-only">Regular price: </span>
                {formatPrice(compareAt)}
              </s>
            ) : null}
          </div>

          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
            Fast Dispatch
          </span>
        </div>
      </div>
    </article>
  );
}
