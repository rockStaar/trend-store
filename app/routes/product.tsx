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
import { getProductFaqs } from "~/lib/product-faq";
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
  const [instantLoading, setInstantLoading] = useState<"buyNow" | "cod" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const baseUnitAmount = parseFloat(price.amount) || 0;
  const discountedUnitAmount = Math.round(baseUnitAmount * 0.6); // 40% OFF
  const totalOriginalAmount = baseUnitAmount * quantity;
  const totalDiscountedAmount = discountedUnitAmount * quantity;
  const totalSavings = totalOriginalAmount - totalDiscountedAmount;
  const currency = price.currencyCode || "INR";

  const handleDirectCheckout = async (mode: "buyNow" | "cod") => {
    if (!selectedVariant?.id || !addable) return;
    setInstantLoading(mode);
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
          discountCode: mode === "buyNow" ? "GROW40" : "",
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
      setCheckoutError(err.message || "Failed to proceed to checkout. Please try Add to Bag.");
      setInstantLoading(null);
    }
  };

  return (
    <div className="space-y-4 my-6">
      {/* Quantity Stepper */}
      <div className="flex items-center gap-4">
        <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
        <div className="text-xs text-[#635F53]">
          <span className="font-semibold text-[#282720] block">Special Launch Promotion</span>
          <span>40% OFF code applied automatically at checkout</span>
        </div>
      </div>

      {/* Option 1: Prominent BUY NOW — GET 40% OFF (Copper Filled CTA) */}
      <div className="bg-[#FAF6F0] border-2 border-[#B77943]/40 rounded-2xl p-4 shadow-sm hover:border-[#B77943] transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[#B77943] font-bold text-xs uppercase tracking-wider flex items-center gap-1">
              <span>⚡</span>
              <span>Fast Track Checkout</span>
            </span>
            <span className="bg-[#D7A84C]/25 text-[#73510A] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Save 40%
            </span>
          </div>
          <span className="text-xs text-[#7D786D] line-through">
            {formatPrice({ amount: totalOriginalAmount.toFixed(2), currencyCode: currency })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleDirectCheckout("buyNow")}
          disabled={!addable || instantLoading !== null}
          className="rounded-xl bg-[#B77943] text-white hover:bg-[#9E6433] focus-visible:outline-accent inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2 px-6 text-base font-bold shadow-md hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-all motion-safe:active:scale-[0.98]"
          data-testid="buy-now-discount"
        >
          {instantLoading === "buyNow" ? (
            <span className="flex items-center gap-2">
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Securing 40% Off Checkout…
            </span>
          ) : addable ? (
            <span className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5">
                <span className="text-lg">⚡</span>
                <span>BUY NOW — GET 40% OFF</span>
              </span>
              <span className="font-extrabold text-white text-base">
                {formatPrice({ amount: totalDiscountedAmount.toFixed(2), currencyCode: currency })}
              </span>
            </span>
          ) : selectedVariant ? (
            "Sold out"
          ) : (
            "Select options"
          )}
        </button>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#635F53] px-1">
          <span>Apply code <strong>GROW40</strong> at checkout</span>
          <span className="text-emerald-700 font-bold">You save {formatPrice({ amount: totalSavings.toFixed(2), currencyCode: currency })}!</span>
        </div>
      </div>

      {/* Option 2: Cash On Delivery Card (Distinct COD Option) */}
      <div className="border border-[#E2DBD0] bg-white rounded-2xl p-4 shadow-2xs hover:border-[#B77943]/60 transition-all">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💵</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wide text-[#282720]">
                  Cash On Delivery Available
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Doorstep Payment
                </span>
              </div>
              <p className="text-[11px] text-[#635F53] mt-0.5">
                Pay in cash or scan UPI (GPay/PhonePe/Paytm) directly to courier upon delivery. Verified PIN codes only.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleDirectCheckout("cod")}
          disabled={!addable || instantLoading !== null}
          className="w-full bg-[#FAF6F0] hover:bg-[#F2ECE0] text-[#282720] border border-[#D7A84C] inline-flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          data-testid="cod-buy-now"
        >
          {instantLoading === "cod" ? (
            <span className="flex items-center gap-2">
              <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-[#282720] border-t-transparent" />
              Directing to COD Checkout…
            </span>
          ) : (
            <span>Proceed with Cash on Delivery</span>
          )}
        </button>
      </div>

      {/* Option 3: Standard Add to Bag (Preserves Cart Drawer Flow) */}
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <button
          {...register("addToCart", {})}
          className="rounded-xl bg-[#282720] text-white hover:bg-[#3D3A32] focus-visible:outline-accent inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 px-6 text-sm font-bold shadow-sm hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-all motion-safe:active:scale-[0.98]"
          disabled={!addable || pending || instantLoading !== null}
          data-testid="add-to-cart"
        >
          <span className="text-base">🛍️</span>
          <span>
            {pending
              ? "Adding to Bag…"
              : addable
                ? `Add to Bag — ${formatPrice({ amount: totalOriginalAmount.toFixed(2), currencyCode: currency })}`
                : selectedVariant
                  ? "Sold out"
                  : "Select options"}
          </span>
        </button>
      </form>

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
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
  reviewStats?: ReviewStats;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4 md:sticky md:top-8 md:self-start">
      <div className="pt-2 md:pt-4">
        <p className="text-[11px] font-bold text-[#B77943] tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
          <span>✦</span>
          <span>{product.vendor || "GROW & GLOW EDIT"}</span>
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#282720] font-normal leading-[1.12]">
          {product.title}
        </h1>

        {reviewStats && reviewStats.totalReviews > 0 ? (
          <a
            href="#customer-reviews"
            className="inline-flex items-center gap-1.5 text-xs text-[#7D786D] hover:text-[#B77943] transition-colors mt-1"
          >
            <span className="text-[#D7A84C]">★</span>
            <span className="font-bold text-[#282720]">{reviewStats.averageRating.toFixed(1)}</span>
            <span>({reviewStats.totalReviews} verified {reviewStats.totalReviews === 1 ? "review" : "reviews"})</span>
          </a>
        ) : null}

        <PriceBlock product={product} selectedVariant={selectedVariant} />
        <InventoryHint selectedVariant={selectedVariant} />
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
      <ProductTrustBadges />
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
}: {
  product: ProductData;
  reviewStats?: ReviewStats;
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
  const baseAmount = parseFloat(price.amount) || 0;
  const discountedAmount = Math.round(baseAmount * 0.6);
  const currency = price.currencyCode || "INR";
  const [instantLoading, setInstantLoading] = useState(false);

  const handleInstantBuy = async () => {
    if (!selectedVariant?.id || !addable) return;
    setInstantLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchandiseId: selectedVariant.id,
          quantity: 1,
          discountCode: "GROW40",
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
              <span className="text-xs font-bold text-[#B77943]">
                {formatPrice({ amount: discountedAmount.toFixed(2), currencyCode: currency })}
              </span>
              <span className="text-[10px] text-[#7D786D] line-through">
                {formatPrice(price)}
              </span>
              <span className="text-[9px] font-extrabold bg-[#D7A84C]/25 text-[#73510A] px-1 rounded">
                -40%
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
              className="border border-[#282720] text-[#282720] hover:bg-[#FAF6F0] px-2.5 py-2 rounded-lg text-xs font-bold tracking-wide disabled:opacity-50 cursor-pointer"
              disabled={!addable || pending || instantLoading}
              title="Add to Bag"
            >
              {pending ? "…" : "Bag"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleInstantBuy}
            disabled={!addable || instantLoading}
            className="bg-[#B77943] hover:bg-[#9E6433] text-white px-3.5 py-2 rounded-lg text-xs font-bold tracking-wide shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            {instantLoading ? (
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Wait…
              </span>
            ) : (
              <>
                <span>⚡</span>
                <span>Buy -40%</span>
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
        <ProductPageContent product={product} reviewStats={reviewStats} />
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

