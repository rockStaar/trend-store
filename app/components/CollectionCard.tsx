import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

export const COLLECTION_CARD_PRODUCT_COUNT_LIMIT = 100;

export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    handle
    title
    image {
      url
      altText
      width
      height
    }
    products(first: 1) {
      nodes {
        featuredImage {
          url
          altText
        }
      }
    }
    productCountProbe: products(first: 100) {
      nodes {
        id
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`);

const COLLECTION_CARD_SHAPE_QUERY = gql(
  `query CollectionCardShape { collections(first: 1) { nodes { ...CollectionCard } } }`,
  [COLLECTION_CARD_FRAGMENT],
);

export type CollectionCardData = StorefrontApi.ResultOf<
  typeof COLLECTION_CARD_SHAPE_QUERY
>["collections"]["nodes"][number];

export type CollectionCardProps = {
  collection: CollectionCardData;
  priority?: boolean;
  productCount?: number;
  useProductImageFallback?: boolean;
};

function productCountText(collection: CollectionCardData, productCount?: number) {
  if (typeof productCount === "number") {
    return `${productCount} ${productCount === 1 ? "product" : "products"}`;
  }

  if (collection.productCountProbe.pageInfo.hasNextPage) {
    return `${COLLECTION_CARD_PRODUCT_COUNT_LIMIT}+ products`;
  }

  const count = collection.productCountProbe.nodes.length;
  return `${count} ${count === 1 ? "product" : "products"}`;
}

export function CollectionCard({
  collection,
  priority = false,
  productCount,
  useProductImageFallback = true,
}: CollectionCardProps) {
  const fallbackImage = useProductImageFallback
    ? (collection.products.nodes[0]?.featuredImage ?? null)
    : null;
  const image = collection.image ?? fallbackImage;
  const imageWidth = collection.image?.width ?? undefined;
  const imageHeight = collection.image?.height ?? undefined;

  return (
    <Link
      to={`/collections/${collection.handle}`}
      className="card group rounded-xl focus-visible:outline-accent relative block overflow-hidden no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border border-[#E4E7ED] hover:border-[#2457D6]/50 transition-all hover:shadow-lg shadow-2xs"
      aria-label={collection.title}
      data-testid="collection-card"
    >
      <div className="bg-[#F8F7F3] relative block aspect-[4/3] overflow-hidden">
        {image ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.05]">
            <img
              src={image.url}
              alt=""
              width={imageWidth}
              height={imageHeight}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#F8F7F3] to-[#EAF0FC]">
            <span className="text-3xl opacity-40">🛍️</span>
          </div>
        )}
      </div>
      <div className="overlay-dark pointer-events-none absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 sm:p-4 text-left">
        <h3 className="text-white font-heading text-xs sm:text-base md:text-lg font-bold leading-tight line-clamp-1">{collection.title}</h3>
        <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 sm:mt-1 flex items-center gap-1">
          <span>{productCountText(collection, productCount)}</span>
          <span className="opacity-60">→</span>
        </p>
      </div>
    </Link>
  );
}
