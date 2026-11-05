import {
  AnalyticsEvent,
  buildProductSelectionSearchParams,
  canAddToCart,
  getSelectedProductOptions,
  gql,
  type SelectedOption,
} from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { ProductCard, PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { ProductFaq } from "~/components/ProductFaq";
import { ProductReviews } from "~/components/ProductReviews";
import { openCartDrawer } from "~/lib/cart-drawer";
import { envContext } from "~/lib/env";
import { formatPrice, salePercent } from "~/lib/money";
import { ProductProvider, useProductForm } from "~/lib/product";
import { getProductFaqs, type FaqItem } from "~/lib/product-faq";
import type { PublicReview, ReviewStats } from "~/lib/reviews";
import { getReviewsForProduct } from "~/lib/reviews.server";
import { storefrontClientContext } from "~/lib/storefront";
import { formatPageTitle, getShopNameFromRootMatch } from "~/lib/storefront-shop";

import type { Route } from "./+types/product";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);

const PRODUCT_QUERY = gql(
  `
    query ProductPage($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
      product(handle: $handle) {
        id
        handle
        title
        vendor
        description
        descriptionHtml
        faqMetafield: metafield(namespace: "custom", key: "faq") {
          value
        }
        requiresSellingPlan
        encodedVariantExistence
        encodedVariantAvailability
        featuredImage {
          id
          url
          altText
          width
          height
        }
        images(first: 8) {
          nodes {
            id
            url
            altText
            width
            height
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        options {
          name
          optionValues {
            name
            firstSelectableVariant {
              ...ProductVariantFields
            }
            swatch {
              color
              image {
                previewImage {
                  url
                }
              }
            }
          }
        }
        selectedOrFirstAvailableVariant(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
        adjacentVariants(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
      }
      products(first: 5) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

export function meta({ matches }: Route.MetaArgs) {
  const shopName = getShopNameFromRootMatch(matches[0]);
  return [
    { title: formatPageTitle("Product", shopName) },
    {
      name: "description",
      content: `Shop the ${shopName} product detail page.`,
    },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response("Not Found", { status: 404 });

  const storefrontClient = context.get(storefrontClientContext);
  const env = context.get(envContext);
  const selectedOptions = getSelectedProductOptions({
    searchParams: new URL(request.url).searchParams,
  });
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });

  if (!data?.product) throw new Response("Not Found", { status: 404 });

  const [{ reviews, stats: reviewStats }, faqs] = await Promise.all([
    getReviewsForProduct(data.product.id, env, { productHandle: data.product.handle }),
    Promise.resolve(
      getProductFaqs({
        id: data.product.id,
        title: data.product.title,
        handle: data.product.handle,
        description: data.product.description,
        vendor: data.product.vendor,
        metafieldFaqJson: (data.product as any).faqMetafield?.value ?? null,
      }),
    ),
  ]);

  return {
    product: data.product,
    relatedProducts: data.products.nodes
      .filter((product) => product.handle !== data.product?.handle)
      .slice(0, 4),
    reviews,
    reviewStats,
    faqs,
  };
}

type ProductData = Route.ComponentProps["loaderData"]["product"];
type ProductVariant = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;
type RelatedProduct = Route.ComponentProps["loaderData"]["relatedProducts"][number];

type ProductImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

type SwatchValue = {
  color?: string | null;
  imageUrl?: string | null;
};

function toRouterLocation(url: string) {
  return url;
}

function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams = new URLSearchParams(),
) {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: product.options.map((option) => option.name),
    base,
  });
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}

function buildSwatchLookup(product: ProductData) {
  const lookup = new Map<string, SwatchValue>();
  for (const option of product.options) {
    for (const value of option.optionValues) {
      const swatch = value.swatch;
      lookup.set(`${option.name}:${value.name}`, {
        color: swatch?.color ?? null,
        imageUrl: swatch?.image?.previewImage?.url ?? null,
      });
    }
  }
  return lookup;
}

function hasSwatchData(product: ProductData, optionName: string) {
  const option = product.options.find((candidate) => candidate.name === optionName);
  return Boolean(
    option?.optionValues.some(
      (value) => value.swatch?.color || value.swatch?.image?.previewImage?.url,
    ),
  );
}

function ProductViewedTracker({ product }: { product: ProductData }) {
  useEffect(() => {
    const selectedVariant = product.selectedOrFirstAvailableVariant;
    window.Shopify?.analytics?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price: selectedVariant?.price ?? product.priceRange.minVariantPrice,
          vendor: product.vendor ?? "",
          variantId: selectedVariant?.id ?? product.id,
          variantTitle: selectedVariant?.title ?? product.title,
          quantity: 1,
          sku: selectedVariant?.sku,
        },
      ],
    });
  }, [product]);

  return null;
}

function useGalleryImages(product: ProductData, selectedVariant: ProductVariant | null) {
  return useMemo(() => {
    const images: ProductImage[] = [];
    const seen = new Set<string>();
    const addImage = (image: ProductImage | null | undefined) => {
      if (!image?.url || seen.has(image.url)) return;
      seen.add(image.url);
      images.push(image);
    };

    addImage(selectedVariant?.image ?? product.featuredImage ?? product.images.nodes[0]);
    for (const image of product.images.nodes) addImage(image);
    return images;
  }, [product, selectedVariant]);
}

function galleryDotClass(active: boolean) {
  if (active) return "bg-on-surface size-2 rounded-full";
  return "bg-on-surface/30 size-2 rounded-full";
}

function ProductGallery({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const images = useGalleryImages(product, selectedVariant);
  const primaryImageUrl = images[0]?.url;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => setActiveIndex(0), [primaryImageUrl]);

  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div data-testid="product-gallery" className="md:sticky md:top-24 md:self-start">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={product.title}
        className="relative"
      >
        {/* Main large display image */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#FAF6F0] border border-[#E2DBD0] shadow-sm">
          {activeImage ? (
            <img
              src={activeImage.url}
              alt={activeImage.altText ?? product.title}
              width={activeImage.width ?? undefined}
              height={activeImage.height ?? undefined}
              className="h-full w-full object-cover transition-all duration-500"
              loading="eager"
              fetchPriority="high"
              data-testid="product-gallery-image"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF6F0] to-[#EFE9DE] text-[#7D786D]">
              <span className="text-4xl mb-2">🌿</span>
              <span className="text-xs">Grow &amp; Glow Product</span>
            </div>
          )}
        </div>

        {/* Thumbnail gallery strip */}
        {images.length > 1 ? (
          <div
            role="group"
            aria-label="Product image thumbnails"
            className="mt-3.5 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
          >
            {images.map((image, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={image.url}
                  type="button"
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveIndex(index)}
                  className={`shrink-0 size-16 sm:size-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isActive
                      ? "border-[#B77943] ring-2 ring-[#B77943]/25 opacity-100 shadow-sm"
                      : "border-[#E2DBD0] opacity-60 hover:opacity-100 bg-[#FAF6F0]"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.altText ?? `Product thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PriceBlock({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const percent = salePercent(price, compareAt);

  return (
    <div className="mt-3" data-product-price>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl sm:text-3xl font-extrabold text-[#282720]">
          <span className="sr-only">Price: </span>
          {formatPrice(price)}
        </span>
        {compareAt && percent ? (
          <>
            <s className="text-base text-[#7D786D]">
              <span className="sr-only">Regular price: </span>
              {formatPrice(compareAt)}
            </s>
            <span className="bg-[#B77943] text-white text-xs font-bold px-2.5 py-0.5 rounded-full" aria-label={`Save ${percent}%`}>
              SAVE {percent}%
            </span>
          </>
        ) : null}
      </div>
      <p className="text-xs text-[#635F53] mt-1.5 flex items-center gap-1.5 font-medium">
        <span className="inline-block size-2 rounded-full bg-emerald-600"></span>
        <span>Inclusive of all taxes (GST) • Free Delivery on orders &gt;₹999</span>
      </p>
    </div>
  );
}

function InventoryHint({ selectedVariant }: { selectedVariant: ProductVariant | null }) {
  if (!selectedVariant) return null;
  if (!selectedVariant.availableForSale) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 text-sm" data-product-inventory>
          <span
            className="bg-critical inline-block h-2 w-2 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="text-critical font-medium">Out of stock</span>
        </div>
      </div>
    );
  }

  const quantity = selectedVariant.quantityAvailable;
  if (quantity == null || quantity > 5) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-sm" data-product-inventory>
        <span
          className="bg-warning inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-warning font-medium">Only {quantity} left in stock</span>
      </div>
    </div>
  );
}

// Mirrors React Router's own Link guard: a modified or non-primary click belongs to
// the browser (new tab, new window), so the href must stay in charge of it.
function isPlainActivation(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    (!event.currentTarget.target || event.currentTarget.target === "_self")
  );
}

function VariantOptions({ product }: { product: ProductData }) {
  const { options, register } = useProductForm();
  const swatches = useMemo(() => buildSwatchLookup(product), [product]);
  const location = useLocation();
  const baseParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  return (
    <div className="swatch-buttons space-y-4">
      {options.map((option) => {
        const selectedValue = option.values.find((value) => value.selected)?.name;
        const renderSwatches = hasSwatchData(product, option.name);
        const isColorOption = option.name.toLowerCase().includes("color");

        return (
          <fieldset key={option.name} className="space-y-2">
            <legend className="text-on-surface text-sm font-medium">
              {option.name}
              {selectedValue ? `: ${selectedValue}` : ""}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={option.name}>
              {option.values.map((variantOption) => {
                const valueName = variantOption.name;
                const registered = register("optionValue", {
                  optionName: option.name,
                  value: valueName,
                });
                const isCrossProduct = variantOption.handle !== product.handle;
                const linkTarget = variantUrl(
                  product,
                  variantOption.selectedOptions,
                  variantOption.handle,
                  baseParams,
                );
                const soldOut = !variantOption.available;
                const testId = isColorOption ? "color-swatch" : undefined;
                const swatch = renderSwatches ? swatches.get(`${option.name}:${valueName}`) : null;
                const swatchStyle = swatch?.imageUrl
                  ? { backgroundImage: `url("${swatch.imageUrl}")` }
                  : { backgroundColor: swatch?.color ?? undefined };

                const className = renderSwatches
                  ? `min-h-touch-target min-w-touch-target relative inline-flex cursor-pointer items-center justify-center motion-safe:transition-transform motion-safe:active:scale-[0.93] ${soldOut ? "opacity-50" : ""}`
                  : `option-pill focus-visible:outline-accent motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] ${variantOption.selected ? "is-selected" : ""} ${soldOut ? "opacity-50" : ""}`;
                const content = renderSwatches ? (
                  <>
                    <span
                      className={`swatch-md border-border relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 ring-offset-2 ${variantOption.selected ? "border-interactive" : ""}`}
                      style={swatchStyle}
                    >
                      {variantOption.selected ? (
                        <span className="swatch-scrim absolute inset-0" />
                      ) : null}
                      {soldOut ? (
                        <svg
                          className="absolute inset-0 h-full w-full"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <line x1="4" y1="4" x2="20" y2="20" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="sr-only">
                      {valueName}
                      {soldOut ? " (Sold out)" : ""}
                    </span>
                  </>
                ) : (
                  `${valueName}${soldOut ? " (Sold out)" : ""}`
                );

                if (!isCrossProduct && !variantOption.exists) {
                  return (
                    <button
                      key={valueName}
                      type="button"
                      disabled
                      className={className}
                      aria-label={renderSwatches ? valueName : undefined}
                      aria-pressed={variantOption.selected}
                      data-testid={testId}
                    >
                      {content}
                    </button>
                  );
                }

                // Every selectable value is an <a> whichever product it belongs to. The
                // activated value flips from cross-product to same-product after the
                // navigation, and a change of element type there would remount the
                // focused control and drop focus to <body>.
                return (
                  <Link
                    key={valueName}
                    to={toRouterLocation(linkTarget)}
                    replace={!isCrossProduct}
                    preventScrollReset
                    className={className}
                    aria-label={renderSwatches ? valueName : undefined}
                    aria-current={variantOption.selected ? "true" : undefined}
                    data-testid={testId}
                    onClick={
                      isCrossProduct
                        ? undefined
                        : (event) => {
                            if (!isPlainActivation(event)) return;
                            registered.onClick();
                            // onSelect has already navigated with the provider's replace
                            // and revalidation settings. Letting Link navigate too would
                            // refetch the loader that a resolved selection just skipped.
                            event.preventDefault();
                          }
                    }
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function QuantitySelector({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (quantity: number) => void;
}) {
  const { register } = useProductForm();
  const clamp = (value: number) => Math.min(99, Math.max(1, value));

  return (
    <div className="shrink-0">
      <label className="text-[#282720] mb-2 block text-xs uppercase tracking-wider font-bold" htmlFor="quantity">
        Quantity
      </label>
      <div
        className="bg-white border border-[#E2DBD0] rounded-xl inline-flex items-center p-0.5 shadow-xs"
        data-testid="quantity-stepper"
      >
        <button
          type="button"
          className="text-[#282720] hover:bg-[#FAF6F0] inline-flex size-10 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40 motion-safe:transition-all cursor-pointer"
          aria-label="Decrease quantity"
          onClick={() => setQuantity(clamp(quantity - 1))}
          disabled={quantity <= 1}
        >
          <img src="/icons/icon-minus.svg" alt="" className="size-3.5" aria-hidden="true" />
        </button>
        <input
          type="number"
          id="quantity"
          {...register("quantity", { value: quantity })}
          min={1}
          max={99}
          step={1}
          className="number-reset text-[#282720] font-bold h-10 w-11 rounded-none border-0 bg-transparent p-0 text-center text-sm"
          aria-label="Quantity"
          onChange={(event) =>
            setQuantity(clamp(Number.parseInt(event.currentTarget.value, 10) || 1))
          }
        />
        <button
          type="button"
          className="text-[#282720] hover:bg-[#FAF6F0] inline-flex size-10 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40 motion-safe:transition-all cursor-pointer"
          aria-label="Increase quantity"
          onClick={() => setQuantity(clamp(quantity + 1))}
          disabled={quantity >= 99}
        >
          <img src="/icons/icon-plus.svg" alt="" className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function getProductBenefit(product: ProductData) {
  const text = `${product.title} ${product.description || ""}`.toLowerCase();

  if (text.includes("vacuum") || text.includes("cleaner") || text.includes("dust") || text.includes("car")) {
    return {
      title: "Powerful Cordless Cyclone Suction",
      description: "Equipped with a high-RPM handheld motor engineered for cars, desks, tight gaps and effortless daily cleanups.",
      badge: "Heavy Duty Motor",
    };
  }
  if (text.includes("shelf") || text.includes("rack") || text.includes("corner") || text.includes("holder") || text.includes("adhesive") || text.includes("wall") || text.includes("bathroom")) {
    return {
      title: "Durable & Long-Lasting Build",
      description: "Designed using durable rust-resistant materials suitable for regular, everyday bathroom and kitchen use.",
      badge: "Heavy Duty Mount",
    };
  }
  if (text.includes("serum") || text.includes("cream") || text.includes("skin") || text.includes("glow") || text.includes("oil") || text.includes("face")) {
    return {
      title: "Clean & Dermatologically Tested",
      description: "Crafted with pure active botanicals to nourish and protect the delicate skin barrier without harsh chemicals.",
      badge: "Toxin-Free Formula",
    };
  }
  if (text.includes("bottle") || text.includes("flask") || text.includes("cup") || text.includes("mug")) {
    return {
      title: "Food-Grade & Temperature Retentive",
      description: "BPA-free stainless steel construction engineered for long-lasting daily hydration at home or on-the-go.",
      badge: "Grade 304 Steel",
    };
  }
  if (text.includes("candle") || text.includes("diffuser") || text.includes("fragrance") || text.includes("aroma")) {
    return {
      title: "Pure Soy Wax & Essential Oils",
      description: "Clean, soot-free burn with comforting aromatherapeutic scent throw for mindful relaxation and wellness.",
      badge: "Eco-Friendly Burn",
    };
  }

  return {
    title: "Curated Premium Build & Craftsmanship",
    description: "Individually batch-inspected and crafted for superior everyday functionality, durability, and modern living.",
    badge: "Quality Inspected",
  };
}

function ProductBenefitCard({ product }: { product: ProductData }) {
  const benefit = getProductBenefit(product);
  return (
    <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-xl p-3 sm:p-3.5 my-3 shadow-2xs">
      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#282720]">
        <span className="text-emerald-700 font-extrabold text-sm">✓</span>
        <span>{benefit.title}</span>
      </div>
      <p className="text-xs text-[#5E5B52] mt-1 leading-relaxed pl-5">
        {benefit.description}
      </p>
    </div>
  );
}

function getDynamicTimelineDates() {
  const now = new Date();
  const formatDay = (date: Date) => {
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
            ? "rd"
            : "th";
    return `${month} ${day}${suffix}`;
  };

  const orderDate = formatDay(now);

  const dispatchStart = new Date(now);
  dispatchStart.setDate(dispatchStart.getDate() + 1);
  const dispatchEnd = new Date(now);
  dispatchEnd.setDate(dispatchEnd.getDate() + 2);
  const dispatchDate = `${formatDay(dispatchStart)} – ${formatDay(dispatchEnd)}`;

  const deliveryStart = new Date(now);
  deliveryStart.setDate(deliveryStart.getDate() + 4);
  const deliveryEnd = new Date(now);
  deliveryEnd.setDate(deliveryEnd.getDate() + 6);
  const deliveryDate = `${formatDay(deliveryStart)} – ${formatDay(deliveryEnd)}`;

  return { orderDate, dispatchDate, deliveryDate };
}

function PackSelector({
  unitPrice,
  unitCompareAt,
  currency,
  selectedPack,
  onSelectPack,
}: {
  unitPrice: number;
  unitCompareAt: number | null;
  currency: string;
  selectedPack: number;
  onSelectPack: (packQty: number) => void;
}) {
  const packs = [
    { qty: 1, label: "Buy 1 Pc", badge: null },
    { qty: 2, label: "Buy 2 Pc", badge: null },
    { qty: 4, label: "Buy 4 Pc", badge: "Most popular" },
    { qty: 10, label: "Buy 10 Pc", badge: "Best Value 🔥" },
  ];

  return (
    <div className="border border-[#282720]/25 rounded-2xl bg-white p-4 sm:p-5 shadow-2xs space-y-3.5 my-4">
      {/* Pack header matching Reference 1 */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#282720] tracking-wide uppercase">
          <span className="text-base text-[#B77943]">!</span>
          <span>Choose Your Pack &amp; Save More</span>
        </div>
        <p className="text-xs text-[#635F53] mt-0.5">
          Get a lower price per piece when you choose a bigger pack.
        </p>
      </div>

      {/* Pack Options List */}
      <div className="space-y-2.5">
        {packs.map((pack) => {
          const isSelected = selectedPack === pack.qty;
          const totalPrice = unitPrice * pack.qty;
          const totalOriginal = unitCompareAt ? unitCompareAt * pack.qty : null;
          const isFreeShipping = totalPrice >= 999;
          const isBestValue = pack.qty === 10;

          return (
            <div
              key={pack.qty}
              onClick={() => onSelectPack(pack.qty)}
              className={`relative cursor-pointer rounded-xl border-2 p-3 sm:p-3.5 transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? "border-[#282720] bg-[#FAF6F0] shadow-xs"
                  : "border-[#E2DBD0] bg-white hover:border-[#B77943]/60 hover:bg-[#FAF6F0]/40"
              }`}
            >
              {/* Badge if present */}
              {pack.badge ? (
                <span
                  className={`absolute -top-2.5 right-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs ${
                    pack.badge.includes("Best Value")
                      ? "bg-[#282720] text-[#D7A84C]"
                      : "bg-[#282720] text-white"
                  }`}
                >
                  {pack.badge}
                </span>
              ) : null}

              {/* Radio & Pack Details */}
              <div className="flex items-center gap-3">
                <div
                  className={`size-4.5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    isSelected ? "border-[#282720] bg-[#282720]" : "border-[#B0A99F] bg-white"
                  }`}
                >
                  {isSelected ? <div className="size-1.5 rounded-full bg-white" /> : null}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#282720]">{pack.label}</span>
                    {isFreeShipping ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Free Shipping
                      </span>
                    ) : null}
                  </div>
                  {isBestValue ? (
                    <span className="text-[11px] text-[#B77943] font-semibold flex items-center gap-1">
                      <span>Hot Selling Deal</span>
                      <span>🔥</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#7D786D]">
                      {isFreeShipping ? "Free Express Shipping" : "Standard Delivery"}
                    </span>
                  )}
                </div>
              </div>

              {/* Price Details */}
              <div className="text-right shrink-0">
                <div className="font-extrabold text-sm sm:text-base text-[#282720]">
                  {formatPrice({ amount: totalPrice.toFixed(2), currencyCode: currency })}
                </div>
                {totalOriginal && totalOriginal > totalPrice ? (
                  <div className="text-xs text-[#8A8478] line-through">
                    {formatPrice({ amount: totalOriginal.toFixed(2), currencyCode: currency })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer checkmarks matching Reference 1 */}
      <div className="pt-2 border-t border-[#E2DBD0] flex items-center justify-between text-xs text-[#5E5B52]">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-emerald-700 font-bold">✓</span>
          <span>Heavy Duty Quality</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-emerald-700 font-bold">✓</span>
          <span>7 Days Free Replacement</span>
        </div>
      </div>
    </div>
  );
}

function PrepaidOffersSection({
  totalOrderPrice,
  currency,
  onApplyOffer,
  instantLoading,
}: {
  totalOrderPrice: number;
  currency: string;
  onApplyOffer: (code: string) => void;
  instantLoading: string | null;
}) {
  const offers = [
    {
      id: "prepaid29",
      code: "PREPAID29",
      title: "Pay Online & Save",
      headline: "Get ₹29 Instant Off",
      conditionText: "On online orders above ₹499",
      minOrder: 499,
      badgeText: "SAVE ₹29",
    },
    {
      id: "grow10",
      code: "GROW10",
      title: "Pay Online & Save More",
      headline: "Get 10% Instant Off",
      conditionText: "On online orders above ₹899",
      minOrder: 899,
      badgeText: "SAVE 10%",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#D7A84C]/50 bg-white overflow-hidden shadow-2xs my-4">
      {/* Header with Grow & Glow styling */}
      <div className="bg-[#282720] text-white px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase">
        <span className="text-[#D7A84C]">•</span>
        <span className="flex items-center gap-1.5">
          <span>💳</span>
          <span>PREPAID OFFERS</span>
        </span>
        <span className="text-[#D7A84C]">•</span>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3 bg-gradient-to-b from-[#FAF6F0] to-white">
        {offers.map((offer) => {
          const isEligible = totalOrderPrice >= offer.minOrder;
          const diff = Math.max(0, offer.minOrder - totalOrderPrice);

          return (
            <div
              key={offer.id}
              onClick={() => isEligible && onApplyOffer(offer.code)}
              className={`rounded-xl border p-3 sm:p-3.5 transition-all flex items-center justify-between gap-3 ${
                isEligible
                  ? "border-[#D7A84C] bg-white cursor-pointer hover:shadow-md hover:border-[#B77943]"
                  : "border-[#E2DBD0] bg-white/70 opacity-85"
              }`}
            >
              {/* Offer Details */}
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-[#B77943] uppercase tracking-wide block">
                  {offer.title}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[#282720] block">
                  {offer.headline}
                </span>
                <span className="text-[11px] text-[#635F53] block">
                  {offer.conditionText}
                </span>
                {isEligible ? (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pt-0.5">
                    <span>⚡</span>
                    <span>Eligible on this order! Tap to apply at checkout</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-[#9E6433] font-medium pt-0.5 block">
                    Add ₹{Math.round(diff)} more to unlock this offer
                  </span>
                )}
              </div>

              {/* Ticket Badge */}
              <div className="shrink-0 flex flex-col items-center justify-center">
                <div className="bg-[#FAF0D9] border-2 border-dashed border-[#D7A84C] text-[#73510A] font-extrabold text-xs px-3 py-2 rounded-lg text-center shadow-2xs uppercase">
                  {instantLoading === offer.code ? (
                    <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-[#73510A] border-t-transparent" />
                  ) : (
                    offer.badgeText
                  )}
                </div>
                {isEligible ? (
                  <span className="text-[9px] text-[#B77943] font-bold mt-1 uppercase tracking-wider">
                    Apply &amp; Pay
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Footer assurances */}
        <div className="pt-2 border-t border-[#E2DBD0]/60 flex items-center justify-around text-xs text-[#635F53]">
          <div className="flex items-center gap-1.5 font-medium">
            <span>🛡️</span>
            <span>Secure Payment</span>
          </div>
          <span className="text-[#D7A84C]">•</span>
          <div className="flex items-center gap-1.5 font-medium">
            <span>⚡</span>
            <span>Quick Confirmation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustedPaymentsAndTimeline() {
  const { orderDate, dispatchDate, deliveryDate } = useMemo(() => getDynamicTimelineDates(), []);

  return (
    <div className="space-y-4 my-5">
      {/* 100% Secure & Trusted Payments Panel */}
      <div className="border border-[#E2DBD0] bg-white rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#282720]">
          <span>🔒</span>
          <span>100% Secure &amp; Trusted Payments</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border border-[#E2DBD0] rounded-xl p-2.5 text-center bg-[#FAF6F0]/60 flex flex-col items-center justify-center gap-1">
            <span className="text-lg">💳</span>
            <span className="text-[11px] font-semibold text-[#282720] leading-tight">
              Debit / Credit Card
            </span>
          </div>
          <div className="border border-[#E2DBD0] rounded-xl p-2.5 text-center bg-[#FAF6F0]/60 flex flex-col items-center justify-center gap-1">
            <span className="text-lg">📱</span>
            <span className="text-[11px] font-semibold text-[#282720] leading-tight">
              UPI &amp; Wallets
            </span>
          </div>
          <div className="border border-[#E2DBD0] rounded-xl p-2.5 text-center bg-[#FAF6F0]/60 flex flex-col items-center justify-center gap-1">
            <span className="text-lg">🏛️</span>
            <span className="text-[11px] font-semibold text-[#282720] leading-tight">
              Net Banking
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#7D786D] text-center">
          Payments secured with bank-grade encryption &amp; trusted Indian gateways
        </p>
      </div>

      {/* 3-Stage Delivery Timeline */}
      <div className="border border-[#E2DBD0] bg-white rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="relative flex items-center justify-between">
          {/* Connector Line */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-[#282720]" />

          {/* Stage 1: Ordered */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[90px]">
            <div className="size-10 rounded-full bg-[#282720] text-white flex items-center justify-center text-base shadow-sm">
              <span>🛒</span>
            </div>
            <span className="font-bold text-xs text-[#282720] mt-2 leading-tight">
              {orderDate}
            </span>
            <span className="text-[11px] text-[#7D786D] mt-0.5">Ordered</span>
          </div>

          {/* Stage 2: In Transit */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[110px]">
            <div className="size-10 rounded-full bg-[#282720] text-white flex items-center justify-center text-base shadow-sm">
              <span>🚚</span>
            </div>
            <span className="font-bold text-xs text-[#282720] mt-2 leading-tight">
              {dispatchDate}
            </span>
            <span className="text-[11px] text-[#7D786D] mt-0.5">Order Ready</span>
          </div>

          {/* Stage 3: Delivered */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[110px]">
            <div className="size-10 rounded-full bg-[#282720] text-white flex items-center justify-center text-base shadow-sm">
              <span>🎁</span>
            </div>
            <span className="font-bold text-xs text-[#282720] mt-2 leading-tight">
              {deliveryDate}
            </span>
            <span className="text-[11px] text-[#7D786D] mt-0.5">Delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCompactFaq({ faqs }: { faqs?: FaqItem[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const defaultFaqs: FaqItem[] = [
    {
      question: "When will my order be dispatched and delivered?",
      answer:
        "Orders are dispatched within 24 to 48 hours from our fulfillment hub. Metro cities typically receive deliveries within 2–3 business days, while other Indian pin codes take 3–5 business days. You will receive live tracking via SMS and WhatsApp.",
    },
    {
      question: "How does Cash on Delivery (COD) work?",
      answer:
        "You can place your order with Cash on Delivery without paying anything in advance. When the courier arrives, you can pay via cash or scan a UPI QR code (GPay, PhonePe, Paytm).",
    },
    {
      question: "What is the 7-day replacement guarantee?",
      answer:
        "If your product arrives damaged, defective, or different from described, notify our support within 7 days of delivery with an unboxing photo/video for an immediate, hassle-free replacement.",
    },
    {
      question: "Are there any hidden shipping fees at checkout?",
      answer:
        "None! Orders over ₹999 qualify for 100% Free Pan-India Delivery. Orders under ₹999 have a standard flat fee of ₹49.",
    },
  ];

  const items = faqs && faqs.length > 0 ? faqs.slice(0, 4) : defaultFaqs;

  return (
    <div className="border border-[#E2DBD0] bg-white rounded-2xl overflow-hidden shadow-2xs my-5">
      <div className="p-4 border-b border-[#E2DBD0] bg-[#FAF6F0] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#282720]">
          <span>❔</span>
          <span>Frequently Asked Questions (FAQs)</span>
        </div>
      </div>

      <div className="divide-y divide-[#E2DBD0]">
        {items.map((item, index) => {
          const isOpen = openFaq === index;
          return (
            <div key={index} className="transition-colors hover:bg-[#FAF6F0]/30">
              <button
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : index)}
                className="w-full py-3.5 px-4 text-left flex items-center justify-between gap-3 cursor-pointer focus:outline-none"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#282720]">
                  {item.question}
                </span>
                <span
                  className={`text-[#B77943] text-xs transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>
              {isOpen ? (
                <div className="px-4 pb-3.5 text-xs text-[#5E5B52] leading-relaxed">
                  {item.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductPurchaseOptions({
  product,
  quantity,
  setQuantity,
  selectedVariant,
}: {
  product: ProductData;
  quantity: number;
  setQuantity: (quantity: number) => void;
  selectedVariant: ProductVariant | null;
}) {
  const { options, register, formProps, errors, pending } = useProductForm();
  const addable = canAddToCart(product, options);
  const [instantLoading, setInstantLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const baseUnitAmount = parseFloat(price.amount) || 0;
  const compareAtAmount = compareAt ? parseFloat(compareAt.amount) : null;
  const genuineCompareAt = compareAtAmount && compareAtAmount > baseUnitAmount ? compareAtAmount : null;
  const currency = price.currencyCode || "INR";

  const totalOrderPrice = baseUnitAmount * quantity;

  const handleDirectCheckout = async (mode: "cod" | "discount", discountCode = "") => {
    if (!selectedVariant?.id || !addable) return;
    setInstantLoading(mode === "discount" ? discountCode : "cod");
    setCheckoutError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          merchandiseId: selectedVariant.id,
          quantity,
          discountCode: mode === "discount" ? discountCode : "",
          paymentMethod: mode === "cod" ? "cash_on_delivery" : "standard",
        }),
      });

      const result = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error(result?.error || "Unable to initiate checkout. Please try again.");
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to proceed to checkout. Please try Add to Cart.");
      setInstantLoading(null);
    }
  };

  return (
    <div className="space-y-4 my-2">
      {/* Pack & Save More Selector */}
      <PackSelector
        unitPrice={baseUnitAmount}
        unitCompareAt={genuineCompareAt}
        currency={currency}
        selectedPack={quantity}
        onSelectPack={(packQty) => setQuantity(packQty)}
      />

      {/* Button 1: Full-Width Solid Espresso ADD TO CART */}
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <input type="hidden" name="quantity" value={quantity} />
        <button
          {...register("addToCart", {})}
          className="rounded-xl bg-[#282720] text-[#F7F3EC] hover:bg-[#3D3A32] focus-visible:outline-accent inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2 px-6 text-sm sm:text-base font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-all motion-safe:active:scale-[0.985]"
          disabled={!addable || pending || instantLoading !== null}
          data-testid="add-to-cart"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Adding to Cart…
            </span>
          ) : addable ? (
            "ADD TO CART"
          ) : selectedVariant ? (
            "Sold out"
          ) : (
            "Select options"
          )}
        </button>
      </form>

      {/* Button 2: Full-Width Ivory ORDER NOW — CASH ON DELIVERY (With continuous copper shimmer & pulse) */}
      <button
        type="button"
        onClick={() => handleDirectCheckout("cod")}
        disabled={!addable || instantLoading !== null}
        className="cod-animated-btn rounded-xl bg-white text-[#282720] border-2 border-[#282720] hover:bg-[#FAF6F0] focus-visible:outline-accent inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 px-6 text-sm sm:text-base font-extrabold tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-all"
        data-testid="order-now-cod"
      >
        {instantLoading === "cod" ? (
          <span className="flex items-center gap-2">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-[#282720] border-t-transparent" />
            Directing to COD Checkout…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <span>Order Now — Cash on Delivery</span>
          </span>
        )}
      </button>

      {/* Button 3: Prepaid Offers Panel */}
      <PrepaidOffersSection
        totalOrderPrice={totalOrderPrice}
        currency={currency}
        onApplyOffer={(code) => handleDirectCheckout("discount", code)}
        instantLoading={instantLoading}
      />

      {/* Instant Shop Pay Accelerated Checkout */}
      {selectedVariant ? (
        <div className="pt-1">
          <ShopPayButton
            variants={[{ id: selectedVariant.id, quantity }]}
            disabled={!addable || pending || instantLoading !== null}
            width="100%"
            borderRadius="12px"
          />
        </div>
      ) : null}

      {/* Errors & Notifications */}
      {checkoutError ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          ⚠️ {checkoutError}
        </div>
      ) : null}

      {[...errors.userErrors, ...errors.warnings, ...errors.networkErrors].length ? (
        <div className="grid gap-1 text-sm" role="alert">
          {errors.userErrors.map((error) => (
            <p key={error.message} className="text-critical">
              {error.message}
            </p>
          ))}
          {errors.warnings.map((warning) => (
            <p key={warning.message} className="text-warning">
              {warning.message}
            </p>
          ))}
          {errors.networkErrors.map((error) => (
            <p key={error.message} className="text-critical">
              {error.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PincodeEstimator() {
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState<null | { valid: boolean; message: string }>(null);

  const checkPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pincode.trim();
    if (!/^\d{6}$/.test(clean)) {
      setStatus({ valid: false, message: "Please enter a valid 6-digit Indian PIN code." });
      return;
    }
    const isMetro = ["11", "12", "40", "56", "60", "70", "50"].some((p) => clean.startsWith(p));
    const days = isMetro ? "2–3 business days" : "3–5 business days";
    setStatus({
      valid: true,
      message: `Delivers to ${clean} in ${days}. Free delivery over ₹999 & Cash on Delivery Available!`,
    });
  };

  return (
    <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-xl p-4 my-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#282720]">
          <span>📍</span>
          <span>Delivery & COD Eligibility:</span>
        </div>
        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          FREE Shipping over ₹999
        </span>
      </div>
      <form onSubmit={checkPincode} className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter 6-digit Pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value);
            if (status) setStatus(null);
          }}
          className="flex-1 bg-white border border-[#E2DBD0] rounded-lg px-3 py-2 text-xs text-[#282720] focus:outline-none focus:border-[#B77943]"
        />
        <button
          type="submit"
          className="bg-[#282720] hover:bg-[#3D3A32] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer"
        >
          Check
        </button>
      </form>
      {status ? (
        <div className={`mt-2 text-xs flex items-start gap-1.5 ${status.valid ? "text-emerald-700 font-medium" : "text-red-600"}`}>
          <span>{status.valid ? "✓" : "✕"}</span>
          <span>{status.message}</span>
        </div>
      ) : (
        <p className="text-[11px] text-[#7D786D] mt-1.5 flex items-center justify-between">
          <span>Dispatches within 24 hours via BlueDart / Delhivery / Xpressbees</span>
          <span>Flat ₹49 under ₹999</span>
        </p>
      )}
    </div>
  );
}

function ProductTrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-2.5 my-4 pt-3 border-t border-[#E2DBD0]">
      <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E2DBD0] rounded-lg text-xs text-[#282720]">
        <span className="text-base">🚚</span>
        <div>
          <span className="font-semibold block leading-tight">Pan-India Express</span>
          <span className="text-[10px] text-[#635F53]">3–5 Days Transit</span>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E2DBD0] rounded-lg text-xs text-[#282720]">
        <span className="text-base">💵</span>
        <div>
          <span className="font-semibold block leading-tight">COD & UPI</span>
          <span className="text-[10px] text-[#635F53]">Easy Checkout</span>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E2DBD0] rounded-lg text-xs text-[#282720]">
        <span className="text-base">🔄</span>
        <div>
          <span className="font-semibold block leading-tight">7-Day Replacement</span>
          <span className="text-[10px] text-[#635F53]">Free Transit Swap</span>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E2DBD0] rounded-lg text-xs text-[#282720]">
        <span className="text-base">🛡️</span>
        <div>
          <span className="font-semibold block leading-tight">Quality Inspected</span>
          <span className="text-[10px] text-[#635F53]">100% Genuine</span>
        </div>
      </div>
    </div>
  );
}

function ProductDetailsAccordion({ product }: { product: ProductData }) {
  return (
    <div className="space-y-2 mt-6">
      <details className="group border border-[#E2DBD0] rounded-lg bg-white overflow-hidden" open>
        <summary className="cursor-pointer p-4 font-semibold text-sm text-[#282720] flex items-center justify-between hover:bg-[#FAF6F0] transition-colors">
          <span className="flex items-center gap-2">
            <span>✨</span>
            <span>Product Highlights & Benefits</span>
          </span>
          <span className="text-[#B77943] text-sm group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 pt-0 text-xs sm:text-sm text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1]">
          {product.descriptionHtml ? (
            <div className="richtext pt-3" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          ) : (
            <p className="pt-3">{product.description || "Crafted for durability and convenience in everyday modern living."}</p>
          )}
        </div>
      </details>

      <details className="group border border-[#E2DBD0] rounded-lg bg-white overflow-hidden">
        <summary className="cursor-pointer p-4 font-semibold text-sm text-[#282720] flex items-center justify-between hover:bg-[#FAF6F0] transition-colors">
          <span className="flex items-center gap-2">
            <span>📦</span>
            <span>What's in the Box & Specifications</span>
          </span>
          <span className="text-[#B77943] text-sm group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 pt-3 text-xs sm:text-sm text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1] space-y-2">
          <p>• <strong>Package Contents:</strong> 1x {product.title}, instructions & safe transit packaging.</p>
          <p>• <strong>Suitability:</strong> Tested and certified for Indian domestic household standards.</p>
          <p>• <strong>Care:</strong> Wipe with dry or mild damp cloth. Keep away from extreme direct flame.</p>
        </div>
      </details>

      <details className="group border border-[#E2DBD0] rounded-lg bg-white overflow-hidden">
        <summary className="cursor-pointer p-4 font-semibold text-sm text-[#282720] flex items-center justify-between hover:bg-[#FAF6F0] transition-colors">
          <span className="flex items-center gap-2">
            <span>🚚</span>
            <span>Pan-India Shipping & COD</span>
          </span>
          <span className="text-[#B77943] text-sm group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 pt-3 text-xs sm:text-sm text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1] space-y-2">
          <p>• <strong>Fast Dispatch:</strong> Within 24–48 hours of order confirmation.</p>
          <p>• <strong>Timelines:</strong> Metro cities 2–4 days; all other Indian pin codes 3–5 days.</p>
          <p>• <strong>Live Updates:</strong> Tracking link sent automatically via SMS & WhatsApp.</p>
          <p>• <strong>COD:</strong> Available on eligible pin codes during checkout.</p>
        </div>
      </details>

      <details className="group border border-[#E2DBD0] rounded-lg bg-white overflow-hidden">
        <summary className="cursor-pointer p-4 font-semibold text-sm text-[#282720] flex items-center justify-between hover:bg-[#FAF6F0] transition-colors">
          <span className="flex items-center gap-2">
            <span>🔄</span>
            <span>7-Day Replacement Guarantee</span>
          </span>
          <span className="text-[#B77943] text-sm group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 pt-3 text-xs sm:text-sm text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1] space-y-2">
          <p>If your package arrives defective, damaged, or incomplete, contact our support within 7 days of delivery with photos/video for an immediate free replacement.</p>
        </div>
      </details>
    </div>
  );
}

function ProductInfo({
  product,
  selectedVariant,
  reviewStats,
  faqs,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
  reviewStats?: ReviewStats;
  faqs?: FaqItem[];
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4 md:sticky md:top-8 md:self-start">
      <div className="pt-2 md:pt-4">
        {/* Compact Trust Line (only when genuine reviews exist) */}
        {reviewStats && reviewStats.totalReviews > 0 ? (
          <a
            href="#customer-reviews"
            className="inline-flex items-center gap-1.5 text-xs text-[#7D786D] hover:text-[#B77943] transition-colors mb-1.5"
          >
            <span className="text-[#D7A84C] text-sm">★★★★★</span>
            <span className="font-extrabold text-[#282720]">
              Excellent {reviewStats.averageRating.toFixed(1)}/5
            </span>
            <span className="text-[#7D786D]">
              | {reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? "Customer Review" : "Customer Reviews"}
            </span>
          </a>
        ) : (
          <p className="text-[11px] font-bold text-[#B77943] tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
            <span>✦</span>
            <span>{product.vendor || "GROW & GLOW EDIT"}</span>
          </p>
        )}

        <h1 className="font-serif text-3xl sm:text-4xl text-[#282720] font-normal leading-[1.12]">
          {product.title}
        </h1>

        <PriceBlock product={product} selectedVariant={selectedVariant} />
        <InventoryHint selectedVariant={selectedVariant} />
        <ProductBenefitCard product={product} />
      </div>

      <span className="sr-only" aria-live="polite" id="inventory-status" />

      {product.description ? (
        <div className="text-xs sm:text-sm text-[#5E5B52] leading-relaxed line-clamp-3">
          {product.description}
        </div>
      ) : null}

      <div data-product-form>
        <span className="sr-only" aria-live="polite" data-add-to-cart-status />
        <VariantOptions product={product} />
        <ProductPurchaseOptions
          product={product}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedVariant={selectedVariant}
        />
      </div>

      <PincodeEstimator />
      <TrustedPaymentsAndTimeline />
      <ProductCompactFaq faqs={faqs} />
      <ProductDetailsAccordion product={product} />
    </div>
  );
}

function ProductBreadcrumb({ product }: { product: ProductData }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1.5 text-xs text-[#7D786D]">
        <li>
          <Link to="/" className="hover:text-[#B77943] transition-colors">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/collections" className="hover:text-[#B77943] transition-colors">
            Collections
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-[#282720] font-medium truncate max-w-[160px]">
          {product.title}
        </li>
      </ol>
    </nav>
  );
}

function ProductPageContent({
  product,
  reviewStats,
  faqs,
}: {
  product: ProductData;
  reviewStats?: ReviewStats;
  faqs?: FaqItem[];
}) {
  const { selectedVariant } = useProductForm();

  return (
    <section className="max-w-page px-margin mx-auto w-full py-6 md:py-10">
      <ProductBreadcrumb product={product} />
      <div className="product-grid mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-14">
        <ProductGallery product={product} selectedVariant={selectedVariant} />
        <ProductInfo
          product={product}
          selectedVariant={selectedVariant}
          reviewStats={reviewStats}
          faqs={faqs}
        />
      </div>
    </section>
  );
}

function StickyMobileBuyBar({ product }: { product: ProductData }) {
  const { options, formProps, register, pending, selectedVariant } = useProductForm();
  const addable = canAddToCart(product, options);
  const primaryImage = product.featuredImage ?? product.images.nodes[0];
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const [instantLoading, setInstantLoading] = useState(false);

  const handleInstantCod = async () => {
    if (!selectedVariant?.id || !addable) return;
    setInstantLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchandiseId: selectedVariant.id,
          quantity: 1,
          paymentMethod: "cash_on_delivery",
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setInstantLoading(false);
      }
    } catch {
      setInstantLoading(false);
    }
  };

  return (
    <aside
      aria-label="Quick purchase bar"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E2DBD0] px-3.5 py-2.5 z-30 md:hidden shadow-2xl transition-all"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt=""
              className="size-10 rounded-md object-cover bg-[#EFE9DE] shrink-0 border border-[#E2DBD0]"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#282720] truncate">
              {product.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-[#282720]">
                {formatPrice(price)}
              </span>
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                COD Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <form {...formProps({ afterSubmit: openCartDrawer })}>
            <input type="hidden" {...register("merchandiseId", {})} />
            <input type="hidden" name="quantity" value="1" />
            <button
              {...register("addToCart", {})}
              className="bg-[#282720] text-[#F7F3EC] hover:bg-[#3D3A32] px-3 py-2 rounded-lg text-xs font-bold tracking-wide disabled:opacity-50 cursor-pointer"
              disabled={!addable || pending || instantLoading}
              title="Add to Cart"
            >
              {pending ? "…" : "Cart"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleInstantCod}
            disabled={!addable || instantLoading}
            className="cod-animated-btn bg-white text-[#282720] border-2 border-[#282720] hover:bg-[#FAF6F0] px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wide shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            {instantLoading ? (
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-[#282720] border-t-transparent" />
                Wait…
              </span>
            ) : (
              <>
                <span>🛒</span>
                <span>COD</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function RelatedProducts({ products }: { products: RelatedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="py-8 bg-[#FAF6F0] border-t border-[#E2DBD0]" aria-labelledby="related-products-heading">
      <div className="max-w-page px-margin mx-auto">
        <div className="mb-6">
          <span className="text-xs uppercase font-bold tracking-wider text-[#B77943]">
            COMPLETE YOUR RITUAL
          </span>
          <h2
            id="related-products-heading"
            className="font-serif italic text-2xl sm:text-3xl font-normal text-[#282720] mt-1"
          >
            You May Also Love
          </h2>
        </div>
        <div className="contain-paint">
          <ul
            role="list"
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6"
          >
            {products.map((product) => (
              <li key={product.handle} className="h-full">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function ProductRoute({ loaderData }: Route.ComponentProps) {
  const { product, relatedProducts, reviews, reviewStats, faqs } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const url = toRouterLocation(
          variantUrl(
            product,
            result.selectedOptions,
            result.selectedVariant?.product?.handle,
            new URLSearchParams(location.search),
          ),
        );
        void navigate(url, {
          replace: true,
          preventScrollReset: true,
          ...(result.status === "resolved" ? { defaultShouldRevalidate: false } : {}),
        });
      }}
    >
      <ProductViewedTracker product={product} />
      <main className="flex-1 pb-16 md:pb-0" id="main-content" tabIndex={-1}>
        <ProductPageContent product={product} reviewStats={reviewStats} faqs={faqs} />
        <ProductReviews
          productId={product.id}
          productHandle={product.handle}
          productTitle={product.title}
          initialReviews={reviews}
          initialStats={reviewStats}
          productPrice={
            product.selectedOrFirstAvailableVariant?.price ?? product.priceRange.minVariantPrice
          }
          onAddToCart={() => openCartDrawer()}
        />
        <ProductFaq faqs={faqs} productTitle={product.title} />
        <RelatedProducts products={relatedProducts} />
        <StickyMobileBuyBar product={product} />
      </main>
    </ProductProvider>
  );
}

