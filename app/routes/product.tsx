import {
  AnalyticsEvent,
  buildProductSelectionSearchParams,
  canAddToCart,
  getSelectedProductOptions,
  gql,
  type SelectedOption,
} from "@shopify/hydrogen";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { ProductCard, PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { CodOrderModal } from "~/components/CodOrderModal";
import { openCartDrawer } from "~/lib/cart-drawer";
import { envContext } from "~/lib/env";
import { formatPrice, salePercent } from "~/lib/money";
import { ProductProvider, useProductForm } from "~/lib/product";
import { getProductFaqs, type FaqItem } from "~/lib/product-faq";
import { parseProductContent, type StructuredProductContent } from "~/lib/product-content";
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
        images(first: 16) {
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
  const selectedOptions = getSelectedProductOptions({
    searchParams: new URL(request.url).searchParams,
  });
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });

  if (!data?.product) throw new Response("Not Found", { status: 404 });

  const faqs = await Promise.resolve(
    getProductFaqs({
      id: data.product.id,
      title: data.product.title,
      handle: data.product.handle,
      description: data.product.description,
      vendor: data.product.vendor,
      metafieldFaqJson: (data.product as any).faqMetafield?.value ?? null,
    }),
  );

  return {
    product: data.product,
    relatedProducts: data.products.nodes
      .filter((product) => product.handle !== data.product?.handle)
      .slice(0, 4),
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

export function filterSupplierNames(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\b(meesho|dropdash|roposo|glowroad|cjdropshipping|cjdropship|dropship|dropshipper|aliexpress|alibaba)\b/gi, "HypeeeCart")
    .replace(/(supplier|vendor)\s*(name|id|code)?\s*[:\-]\s*[\w\s]+/gi, "")
    .trim();
}

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

    // If this is a mantra device and catalog has few images, add customer photos
    const t = `${product.title} ${product.handle}`.toLowerCase();
    if (t.includes("mantra") || t.includes("om") || t.includes("chalisa") || t.includes("bhajan")) {
      addImage({ url: "/uploads/products/mantra-device-hanuman.jpg", altText: "32 in 1 Mantra Device glowing with Hanuman Chalisa" });
      addImage({ url: "/uploads/products/mantra-device-back.jpg", altText: "Mantra device 2-pin plug and rotary volume dial" });
      addImage({ url: "/uploads/products/mantra-device-shiva.jpg", altText: "Mantra device ambient light with Lord Shiva" });
    }

    // For Handy Heater, substitute the second image with the real lifestyle demo image
    if (t.includes("heater")) {
      const demoImage: ProductImage = {
        url: "/uploads/products/handy-heater-demo.jpg",
        altText: "Say NO to Cold - Wall Outlet Handy Heater Demo",
      };
      if (images.length > 1) {
        images[1] = demoImage;
      } else {
        images.push(demoImage);
      }
    }

    return images;
  }, [product, selectedVariant]);
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
        {/* Main large display image matching Image 2 */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white border border-[#E4E7ED] shadow-sm flex items-center justify-center p-3 sm:p-5">
          {activeImage ? (
            <img
              src={activeImage.url}
              alt={activeImage.altText ?? product.title}
              width={activeImage.width ?? undefined}
              height={activeImage.height ?? undefined}
              className="h-full w-full max-h-full max-w-full object-contain object-center transition-all duration-300"
              loading="eager"
              fetchPriority="high"
              data-testid="product-gallery-image"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[#F8F7F3] text-[#64748B]">
              <span className="text-4xl mb-2">🛍️</span>
              <span className="text-xs">HypeeeCart Product</span>
            </div>
          )}
        </div>

        {/* Thumbnail gallery strip directly underneath main image */}
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
                  className={`shrink-0 size-16 sm:size-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer p-1 bg-white flex items-center justify-center ${isActive
                      ? "border-[#2457D6] ring-2 ring-[#2457D6]/20 opacity-100 shadow-sm scale-[1.02]"
                      : "border-[#E4E7ED] opacity-70 hover:opacity-100 hover:border-[#2457D6]/50"
                    }`}
                >
                  <img
                    src={image.url}
                    alt={image.altText ?? `Product thumbnail ${index + 1}`}
                    className="h-full w-full max-h-full max-w-full object-contain object-center"
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
    <div className="bg-gradient-to-br from-[#F8F7F3] via-white to-[#F8F7F3] border border-[#E4E7ED] rounded-2xl p-3.5 sm:p-4 my-2.5 shadow-2xs" data-product-price>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl sm:text-3xl font-black text-[#192A46] tracking-tight">
            <span className="sr-only">Price: </span>
            {formatPrice(price)}
          </span>
          {compareAt && percent ? (
            <s className="text-sm sm:text-base text-[#64748B] line-through font-medium">
              <span className="sr-only">Regular price: </span>
              {formatPrice(compareAt)}
            </s>
          ) : null}
        </div>
        {compareAt && percent ? (
          <span className="bg-[#D93636] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 uppercase shadow-2xs" aria-label={`Save ${percent}%`}>
            <span>{percent}% OFF</span>
          </span>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            Best Price Deal
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E4E7ED]/80 text-[11px] text-[#64748B] flex-wrap">
        <span className="text-emerald-700 font-bold flex items-center gap-1">
          <svg className="size-3.5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Inclusive of all taxes
        </span>
        <span className="text-[#CBD5E1]">•</span>
        <span className="font-semibold text-[#192A46]">100% Free Express Shipping</span>
        <span className="text-[#CBD5E1]">•</span>
        <span className="font-semibold text-[#2457D6]">Cash on Delivery Available</span>
      </div>
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
            className="bg-[#D93636] inline-block h-2 w-2 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="text-[#D93636] font-medium">Out of stock</span>
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
          className="bg-amber-500 inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-amber-700 font-medium">Only {quantity} left in stock</span>
      </div>
    </div>
  );
}

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

  // When there's only 1 option with a dummy name like "Default Title" or matching the product title,
  // display a sleek verified specification badge instead of an unneeded button
  const isSingleVariant =
    options.length === 1 &&
    options[0].values.length === 1 &&
    (options[0].values[0].name === "Default Title" ||
      options[0].name.toLowerCase() === "title" ||
      options[0].name.toLowerCase() === "variant" ||
      options[0].values[0].name.toLowerCase().includes("heater"));

  if (isSingleVariant) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E4E7ED] shadow-2xs">
        <div className="size-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-sm font-bold shrink-0">
          ✓
        </div>
        <div className="flex flex-col text-xs">
          <span className="font-bold text-[#192A46]">
            Standard Retail Edition • 100% Brand New
          </span>
          <span className="text-[10px] text-[#64748B]">
            Original Factory Sealed Unit with Plug &amp; Manual • QC Passed
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="swatch-buttons space-y-3">
      {options.map((option) => {
        const selectedValue = option.values.find((value) => value.selected)?.name;
        const renderSwatches = hasSwatchData(product, option.name);
        const isColorOption = option.name.toLowerCase().includes("color");

        return (
          <fieldset key={option.name} className="space-y-2">
            <legend className="text-[#192A46] text-sm font-semibold">
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
                  : `rounded-lg px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                      variantOption.selected
                        ? "border-[#2457D6] bg-[#EAF0FC] text-[#2457D6]"
                        : "border-[#E4E7ED] bg-white text-[#192A46] hover:border-[#2457D6]/50"
                    } ${soldOut ? "opacity-50" : ""}`;
                const content = renderSwatches ? (
                  <>
                    <span
                      className={`swatch-md border-border relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 ring-offset-2 ${variantOption.selected ? "border-[#2457D6]" : ""}`}
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

function BenefitsOfPrepaidOrdersCard() {
  return (
    <div className="rounded-2xl border border-[#E4E7ED] bg-white p-4 my-3.5 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#E4E7ED]">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-lg bg-[#EAF0FC] text-[#2457D6] flex items-center justify-center text-xs font-bold">
            🎁
          </span>
          <span className="font-extrabold text-xs sm:text-sm text-[#192A46] tracking-tight">
            Exclusive Buyer Perks &amp; Discounts
          </span>
        </div>
        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Auto-Applied
        </span>
      </div>

      <div className="divide-y divide-[#E4E7ED]/70 text-xs">
        <div className="py-2.5 flex items-start gap-2.5">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider bg-[#EAF0FC] text-[#2457D6] px-2 py-0.5 rounded border border-[#2457D6]/20">
            PREPAID
          </span>
          <div className="flex-1">
            <p className="font-bold text-[#192A46] leading-tight">
              Extra ₹29 Off on Prepaid Orders
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Pay via UPI, GPay, PhonePe, or Cards at checkout to claim
            </p>
          </div>
        </div>

        <div className="py-2.5 flex items-start gap-2.5">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
            COMBO
          </span>
          <div className="flex-1">
            <p className="font-bold text-[#192A46] leading-tight">
              Extra ₹50 Off on 2 or More Items
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Discount automatically deducted when you select quantity 2+
            </p>
          </div>
        </div>

        <div className="py-2.5 flex items-start gap-2.5">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
            SHIPPING
          </span>
          <div className="flex-1">
            <p className="font-bold text-[#192A46] leading-tight">
              100% Free Express Pan-India Delivery
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Zero delivery fees • Priority warehouse dispatch within 24 hours
            </p>
          </div>
        </div>

        <div className="pt-2.5 flex items-start gap-2.5">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
            COD
          </span>
          <div className="flex-1">
            <p className="font-bold text-[#192A46] leading-tight">
              Cash on Delivery Available Across India
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Verify package at your door and pay via Cash or UPI QR
            </p>
          </div>
        </div>
      </div>
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



function TrustedPaymentsAndTimeline() {
  const { orderDate, dispatchDate, deliveryDate } = useMemo(() => getDynamicTimelineDates(), []);

  return (
    <div className="space-y-4 my-5">
      {/* 100% Secure & Trusted Payments Panel */}
      <div className="border border-[#E4E7ED] bg-white rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#192A46]">
          <span>🔒</span>
          <span>100% Secure &amp; Trusted Payments</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border border-[#E4E7ED] rounded-xl p-2.5 text-center bg-[#F8F7F3] flex flex-col items-center justify-center gap-1">
            <span className="text-lg">💳</span>
            <span className="text-[11px] font-semibold text-[#192A46] leading-tight">
              Debit / Credit Card
            </span>
          </div>
          <div className="border border-[#E4E7ED] rounded-xl p-2.5 text-center bg-[#F8F7F3] flex flex-col items-center justify-center gap-1">
            <span className="text-lg">📱</span>
            <span className="text-[11px] font-semibold text-[#192A46] leading-tight">
              UPI &amp; Wallets
            </span>
          </div>
          <div className="border border-[#E4E7ED] rounded-xl p-2.5 text-center bg-[#F8F7F3] flex flex-col items-center justify-center gap-1">
            <span className="text-lg">🏛️</span>
            <span className="text-[11px] font-semibold text-[#192A46] leading-tight">
              Net Banking
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#64748B] text-center">
          Payments secured with bank-grade encryption &amp; trusted Indian gateways
        </p>
      </div>

      {/* 3-Stage Delivery Timeline */}
      <div className="border border-[#E4E7ED] bg-white rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="relative flex items-center justify-between">
          {/* Connector Line */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-[#2457D6]" />

          {/* Stage 1: Ordered */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[90px]">
            <div className="size-10 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-base shadow-sm">
              <span>🛒</span>
            </div>
            <span className="font-bold text-xs text-[#192A46] mt-2 leading-tight">
              {orderDate}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5">Ordered</span>
          </div>

          {/* Stage 2: In Transit */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[110px]">
            <div className="size-10 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-base shadow-sm">
              <span>🚚</span>
            </div>
            <span className="font-bold text-xs text-[#192A46] mt-2 leading-tight">
              {dispatchDate}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5">Order Ready</span>
          </div>

          {/* Stage 3: Delivered */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[110px]">
            <div className="size-10 rounded-full bg-[#192A46] text-white flex items-center justify-center text-base shadow-sm">
              <span>🎁</span>
            </div>
            <span className="font-bold text-xs text-[#192A46] mt-2 leading-tight">
              {deliveryDate}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5">Delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBadgesBanner() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 py-3 sm:py-5 border-b border-[#E4E7ED] mb-6">
      <div className="flex flex-col items-center text-center">
        <div className="size-11 sm:size-13 rounded-full border-2 border-[#192A46] bg-white flex items-center justify-center shadow-2xs mb-1.5 p-1.5 ring-2 ring-[#EAF0FC]">
          <span className="text-base sm:text-lg">🔒</span>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-[#192A46] uppercase tracking-tight leading-tight">
          Secure Ordering
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="size-11 sm:size-13 rounded-full border-2 border-[#192A46] bg-white flex items-center justify-center shadow-2xs mb-1.5 p-1.5 ring-2 ring-[#EAF0FC]">
          <span className="text-[11px] sm:text-xs font-black text-[#192A46]">5D</span>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-[#192A46] uppercase tracking-tight leading-tight">
          Free Replacement
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="size-11 sm:size-13 rounded-full border-2 border-[#192A46] bg-white flex items-center justify-center shadow-2xs mb-1.5 p-1.5 ring-2 ring-[#EAF0FC]">
          <span className="text-[10px] sm:text-xs font-black text-[#192A46]">100%</span>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-[#192A46] uppercase tracking-tight leading-tight">
          Satisfaction
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="size-11 sm:size-13 rounded-full border-2 border-[#192A46] bg-white flex items-center justify-center shadow-2xs mb-1.5 p-1.5 ring-2 ring-[#EAF0FC]">
          <span className="text-base sm:text-lg">🚚</span>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-[#192A46] uppercase tracking-tight leading-tight">
          Easy Returns
        </span>
      </div>
    </div>
  );
}

function HandyHeaterStory() {
  return (
    <div className="pt-6 border-t border-[#E4E7ED] space-y-5 text-[#192A46]">
      {/* 1. Main Header */}
      <h3 className="text-base sm:text-lg font-bold text-[#192A46] tracking-tight">
        Stay Warm and Cozy with Handy Heater!
      </h3>

      {/* 2. GIF 1: Say NO to Cold */}
      <div className="overflow-hidden rounded-xl border border-[#E4E7ED] bg-[#F8F7F3] shadow-xs">
        <img
          src="/uploads/products/heater-say-no-to-cold.gif"
          alt="Say NO to Cold - Shivering in winter"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      {/* 3. Intro Paragraph */}
      <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
        Are you tired of bulky, energy-consuming heaters that fail to deliver? Look no further! Our{" "}
        <strong className="text-[#192A46]">Wall-Outlet Handy Heater</strong> is the ultimate solution to keep you warm this winter. Whether it&apos;s your office, garage, or even a camping trip, this portable heater provides quick, efficient heat wherever you need it.
      </p>

      {/* 4. GIF 2: Plugging into wall socket */}
      <div className="overflow-hidden rounded-xl border border-[#E4E7ED] bg-[#F8F7F3] shadow-xs">
        <img
          src="/uploads/products/handy-heater-demo.gif"
          alt="Plug and Play - Handy Heater in wall socket"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      {/* 5. Key Features */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm sm:text-base font-bold text-[#192A46]">
          Key Features:
        </h4>

        <div className="space-y-2.5 text-xs sm:text-sm text-[#475569] leading-relaxed">
          <div>
            <p className="font-semibold text-[#192A46]">1. Compact and Portable Design:</p>
            <ul className="pl-4 space-y-1 mt-1 text-xs sm:text-sm text-[#64748B]">
              <li>• Lightweight and easy to carry.</li>
              <li>• Perfect for small spaces without occupying much room.</li>
              <li>• Ideal for travel, motels, hotels, or office use.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[#192A46]">2. Safe and Reliable:</p>
            <ul className="pl-4 space-y-1 mt-1 text-xs sm:text-sm text-[#64748B]">
              <li>• Stays cool to the touch, ensuring no accidental burns.</li>
              <li>• Safe for any environment, making it worry-free for kids and pets.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[#192A46]">3. Plug and Play Convenience:</p>
            <ul className="pl-4 space-y-1 mt-1 text-xs sm:text-sm text-[#64748B]">
              <li>• Just plug it into any standard outlet for instant warmth.</li>
              <li>• Heats up to 250 square feet efficiently.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[#192A46]">4. Programmable Digital Heater:</p>
            <ul className="pl-4 space-y-1 mt-1 text-xs sm:text-sm text-[#64748B]">
              <li>• Features a 12-hour timer and auto shut-off for energy savings.</li>
              <li>• Digital thermostat adjustable from 60°F to 90°F for your perfect comfort level.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[#192A46]">5. Energy Smart:</p>
            <ul className="pl-4 space-y-1 mt-1 text-xs sm:text-sm text-[#64748B]">
              <li>• Consumes only 350–400 watts, saving you money on electricity bills.</li>
              <li>• Turns cold, chilly spaces into warm, cozy areas at minimal cost.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 6. GIF 3: Mini Electric Smart Radiator Dial */}
      <div className="overflow-hidden rounded-xl border border-[#DCE5F3] bg-[#F8F7F3] shadow-xs">
        <img
          src="/uploads/products/heater-smart-radiator.gif"
          alt="Mini Electric Smart Radiator Temperature Controls"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      {/* 7. Specifications Table matching Dreamzhub reference */}
      <div className="overflow-x-auto rounded-xl border border-[#DCE5F3] shadow-2xs">
        <div className="bg-[#F1F5F9] px-3.5 sm:px-4 py-2 sm:py-2.5 border-b border-[#DCE5F3]">
          <h4 className="font-bold text-xs sm:text-sm text-[#192A46]">Specifications</h4>
        </div>
        <table className="w-full text-[11px] sm:text-xs text-left border-collapse min-w-[280px]">
          <tbody>
            <tr className="border-b border-[#E4E7ED] hover:bg-[#F8F7F3] transition-colors">
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-[#64748B] w-1/2">Plug Types Available:</td>
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#192A46]">Indian 2-Pin Plug / Standard Socket</td>
            </tr>
            <tr className="border-b border-[#E4E7ED] bg-[#FAFAFA] hover:bg-[#F8F7F3] transition-colors">
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-[#64748B]">Voltage:</td>
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#192A46]">100-240V</td>
            </tr>
            <tr className="border-b border-[#E4E7ED] hover:bg-[#F8F7F3] transition-colors">
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-[#64748B]">Power Consumption:</td>
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#192A46]">350W - 400W</td>
            </tr>
            <tr className="border-b border-[#E4E7ED] bg-[#FAFAFA] hover:bg-[#F8F7F3] transition-colors">
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-[#64748B]">Adjustable Thermostat Range:</td>
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#192A46]">60°F - 90°F</td>
            </tr>
            <tr className="border-b border-[#E4E7ED] hover:bg-[#F8F7F3] transition-colors">
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-[#64748B]">Material:</td>
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#192A46]">Durable Heat-Resistant ABS Plastic</td>
            </tr>
            <tr className="hover:bg-[#F8F7F3] transition-colors">
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-[#64748B]">Dimensions:</td>
              <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#192A46]">125 x 85 x 160 mm</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 8. GIF 4: Woman with cat on sofa */}
      <div className="overflow-hidden rounded-xl border border-[#E4E7ED] bg-[#F8F7F3] shadow-xs">
        <img
          src="/uploads/products/heater-cat-sofa.gif"
          alt="Cozy Home Warming - Pet and Family Friendly"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      {/* 9. Package Includes */}
      <div className="space-y-2 pt-1">
        <h4 className="text-sm font-bold text-[#192A46]">Package Includes:</h4>
        <ul className="pl-4 space-y-1 text-xs sm:text-sm text-[#64748B]">
          <li>• 1 x Wall-Outlet Handy Heater</li>
          <li>• 1 x Power Adapter / Socket Manual</li>
        </ul>
      </div>

      {/* 10. Why Choose Our Handy Heater? */}
      <div className="space-y-2 pt-2">
        <h4 className="text-sm font-bold text-[#192A46]">Why Choose Our Handy Heater?</h4>
        <ul className="space-y-1.5 text-xs sm:text-sm text-[#192A46]">
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold shrink-0">✓</span>
            <span><strong className="text-[#192A46]">Energy-Efficient:</strong> Reduce your winter energy costs.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold shrink-0">✓</span>
            <span><strong className="text-[#192A46]">Fast Heating:</strong> Experience warmth in seconds.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold shrink-0">✓</span>
            <span><strong className="text-[#192A46]">Portable:</strong> Take it anywhere you go – home, office, or trips.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold shrink-0">✓</span>
            <span><strong className="text-[#192A46]">Space-Saving Design:</strong> Fits snugly into any outlet without cluttering the room.</span>
          </li>
        </ul>
      </div>

      {/* 11. Transform Your Winters Today! */}
      <div className="space-y-2 pt-2">
        <h4 className="text-sm font-bold text-[#192A46]">Transform Your Winters Today!</h4>
        <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
          Don&apos;t let the cold keep you down. With the Wall-Outlet Handy Heater, staying warm has never been so convenient and affordable. Add comfort to your daily life without breaking the bank!
        </p>
      </div>

      {/* 12. GIF 5: 25000+ Happy Customers */}
      <div className="overflow-hidden rounded-xl border border-[#E4E7ED] bg-[#F8F7F3] shadow-xs">
        <img
          src="/uploads/products/heater-happy-customers.gif"
          alt="25000+ Happy Customers enjoying warmth in winter"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      {/* 13. Marketed By */}
      <div className="pt-2 text-xs text-[#64748B] flex items-center justify-between border-t border-[#E4E7ED]">
        <span>Sold By: <strong className="text-[#192A46]">HypeeeCart</strong></span>
        <span>Marketed By: <strong className="text-[#192A46]">HypeeeCart</strong></span>
      </div>
    </div>
  );
}

function ProductEditorialShowcase({
  structuredContent,
  faqs,
  isHeater = false,
}: {
  structuredContent: StructuredProductContent;
  faqs?: FaqItem[];
  isHeater?: boolean;
}) {
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
      question: "What is the 5-day replacement policy?",
      answer:
        "If your product arrives damaged, defective, or different from described, notify our support within 5 days of delivery with an unboxing photo/video for an immediate, hassle-free replacement.",
    },
    {
      question: "Are there any hidden shipping fees at checkout?",
      answer:
        "None at all! We offer 100% Free Express Pan-India Delivery on all orders, with zero hidden shipping fees or surprise delivery charges.",
    },
  ];

  const faqItems = faqs && faqs.length > 0 ? faqs.slice(0, 5) : defaultFaqs;

  return (
    <section className="max-w-page px-margin mx-auto w-full py-8 space-y-6" aria-label="Product details and story">
      {/* Editorial Story Container for non-heater products */}
      {!isHeater ? (
        <div className="bg-white border border-[#E4E7ED] rounded-2xl p-6 sm:p-9 shadow-2xs">
          {/* 4 Circular Trust Badges Banner at top */}
          <TrustBadgesBanner />

          {/* If Story Sections exist, render dynamic story */}
          {structuredContent.storySections.length > 0 ? (
            <div className="space-y-8 mt-8 pt-8 border-t border-[#E4E7ED]">
              <div className="space-y-3.5">
                {structuredContent.storySections[0].headline ? (
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-[#192A46] tracking-tight leading-snug">
                    {structuredContent.storySections[0].headline}
                  </h3>
                ) : null}

                {structuredContent.storySections[0].subhead ? (
                  <p className="font-bold text-sm sm:text-base text-[#192A46] leading-snug">
                    {structuredContent.storySections[0].subhead}
                  </p>
                ) : null}

                {structuredContent.storySections[0].paragraph ? (
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    {structuredContent.storySections[0].paragraph}
                  </p>
                ) : null}

                {structuredContent.storySections[0].bullets.length > 0 ? (
                  <ul className="space-y-2 py-1.5" role="list">
                    {structuredContent.storySections[0].bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-[#192A46]">
                        <span className="text-[#2457D6] font-bold text-base leading-none">✓</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {structuredContent.storySections[0].image?.url ? (
                  <div className="my-5 overflow-hidden rounded-2xl border border-[#E4E7ED] bg-[#F8F7F3] p-3 sm:p-6 flex items-center justify-center">
                    <img
                      src={structuredContent.storySections[0].image.url}
                      alt={structuredContent.storySections[0].image.altText ?? structuredContent.storySections[0].headline}
                      className="w-full h-auto max-h-[440px] object-contain rounded-xl"
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Technical Specifications Table for non-heater products */}
      {!isHeater && structuredContent.specifications.length > 0 ? (
        <div className="bg-white border border-[#E4E7ED] rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-[#2457D6]">
            <span>📋</span>
            <span>Product Specifications</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {structuredContent.specifications.map((spec, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-[#F8F7F3] border border-[#E4E7ED] text-xs">
                <span className="font-semibold text-[#64748B]">{spec.label}</span>
                <span className="font-bold text-[#192A46] text-right truncate max-w-[60%]">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5 Days Return Policy Collapsible Row */}
      <details className="group border border-[#E4E7ED] rounded-xl bg-white overflow-hidden shadow-2xs">
        <summary className="cursor-pointer p-4 font-bold text-xs sm:text-sm text-[#192A46] flex items-center justify-between hover:bg-[#F8F7F3] transition-colors">
          <span className="flex items-center gap-2.5">
            <span className="text-base text-[#192A46]">⇄</span>
            <span>5 Days Return Policy</span>
          </span>
          <span className="text-[#2457D6] text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 pt-1 text-xs text-[#64748B] leading-relaxed border-t border-[#E4E7ED] space-y-2">
          <p>
            We stand by the quality of every product we curate. If your item arrives defective, damaged, or incomplete, notify our support team within 5 days of delivery for an immediate free replacement or hassle-free doorstep resolution.
          </p>
          <p>
            Items are picked up directly from your doorstep with zero return delivery charge.
          </p>
        </div>
      </details>

      {/* Frequently Asked Questions (FAQs) Collapsible Row */}
      <details className="group border border-[#E4E7ED] rounded-xl bg-white overflow-hidden shadow-2xs">
        <summary className="cursor-pointer p-4 font-bold text-xs sm:text-sm text-[#192A46] flex items-center justify-between hover:bg-[#F8F7F3] transition-colors">
          <span className="flex items-center gap-2.5">
            <span className="text-base text-[#192A46]">❔</span>
            <span>Frequently Asked Questions (FAQs)</span>
          </span>
          <span className="text-[#2457D6] text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="divide-y divide-[#E4E7ED] border-t border-[#E4E7ED]">
          {faqItems.map((item, idx) => (
            <div key={idx} className="p-4 space-y-1">
              <p className="font-bold text-xs sm:text-sm text-[#192A46]">{item.question}</p>
              <p className="text-xs text-[#64748B] leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </details>
    </section>
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
    const d = new Date();
    d.setDate(d.getDate() + (isMetro ? 3 : 5));
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

    setStatus({
      valid: true,
      message: `Delivering to ${clean} by ${dateStr} (${days}). Free Shipping & Cash on Delivery Available!`,
    });
  };

  return (
    <div className="bg-white border border-[#E4E7ED] rounded-2xl p-4 my-3.5 shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#192A46]">
          <span className="text-base text-[#2457D6]">📍</span>
          <span>Delivery &amp; COD Availability Checker:</span>
        </div>
        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          FREE Shipping
        </span>
      </div>
      <form onSubmit={checkPincode} className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter 6-digit Pincode (e.g. 110001)"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value);
            if (status) setStatus(null);
          }}
          className="flex-1 bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl px-3.5 py-2.5 text-xs text-[#192A46] placeholder:text-[#64748B] focus:outline-none focus:border-[#2457D6] focus:bg-white transition-all font-medium"
        />
        <button
          type="submit"
          className="bg-[#2457D6] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          Check
        </button>
      </form>
      {status ? (
        <div
          className={`mt-2.5 text-xs p-2.5 rounded-xl flex items-start gap-2 ${
            status.valid
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
              : "bg-red-50 text-[#D93636] border border-red-200"
          }`}
        >
          <span className="font-bold">{status.valid ? "✓" : "✕"}</span>
          <span>{status.message}</span>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-[#64748B] flex items-center justify-between">
          <span>⚡ Dispatches within 24 hours via Express Courier</span>
          <span className="font-semibold text-emerald-700">Doorstep Delivery Guaranteed</span>
        </div>
      )}
    </div>
  );
}

function ProductInfo({
  product,
  selectedVariant,
  structuredContent,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
  structuredContent: StructuredProductContent;
}) {
  const [quantity, setQuantity] = useState(1);
  const { options, register, formProps, errors, pending } = useProductForm();
  const addable = canAddToCart(product, options);
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const sanitizedTitle = filterSupplierNames(product.title);
  const isHeater = (product.title + " " + product.handle).toLowerCase().includes("heater");

  return (
    <div className="flex flex-col gap-0">
      {/* 1. Brand Assurance Pill */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF0FC] text-[#2457D6] text-[11px] font-bold tracking-wide border border-[#2457D6]/20">
          <svg className="size-3 text-[#2457D6]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>HypeeeCart™ Assured</span>
        </span>
        <span className="text-[11px] text-[#64748B] font-medium">• 100% Genuine Quality Checked</span>
      </div>

      {/* 2. Product Title: bold, confident heading */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#192A46] leading-snug tracking-tight mb-2">
        {sanitizedTitle}
      </h1>

      {/* 3. Authoritative Social Proof Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#192A46] pb-3 mb-2 border-b border-[#E4E7ED]">
        <div className="flex items-center gap-1 bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-md">
          <span className="text-[#D97706] text-xs font-black">★★★★★</span>
          <span className="font-extrabold text-[#92400E] ml-0.5">4.8</span>
          <span className="text-[#B45309] text-[10px]">/ 5.0</span>
        </div>
        <span className="text-[#64748B] text-[11px] font-medium">
          <span className="font-bold text-[#192A46]">1,280+</span> verified purchases
        </span>
        <span className="hidden sm:inline text-[#E4E7ED]">|</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>In Stock • Dispatches in 24h</span>
        </span>
      </div>

      {/* 4. Product Price & Compare-At Card */}
      <PriceBlock product={product} selectedVariant={selectedVariant} />
      <InventoryHint selectedVariant={selectedVariant} />

      {/* 5. Key Highlights Capsule Strip (High-Scannability Trust Features) */}
      {isHeater ? (
        <div className="grid grid-cols-3 gap-2 my-2.5">
          <div className="bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <span className="text-base mb-0.5">⚡</span>
            <span className="text-[11px] font-bold text-[#192A46] leading-tight">3-Sec Heat</span>
            <span className="text-[9px] text-[#64748B] mt-0.5">PTC Ceramic</span>
          </div>
          <div className="bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <span className="text-base mb-0.5">🔌</span>
            <span className="text-[11px] font-bold text-[#192A46] leading-tight">Wall Plug</span>
            <span className="text-[9px] text-[#64748B] mt-0.5">No Messy Cables</span>
          </div>
          <div className="bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <span className="text-base mb-0.5">💡</span>
            <span className="text-[11px] font-bold text-[#192A46] leading-tight">350W Smart</span>
            <span className="text-[9px] text-[#64748B] mt-0.5">Saves Power Bill</span>
          </div>
        </div>
      ) : structuredContent.shortIntro ? (
        <div className="my-2.5 border-l-3 border-[#2457D6] pl-3 py-1.5 bg-[#F8F7F3] rounded-r-lg">
          <p className="text-xs sm:text-sm text-[#192A46] leading-relaxed">
            {structuredContent.shortIntro}
          </p>
        </div>
      ) : null}

      {/* 6. Variant Options & Quantity Form Container */}
      <div data-product-form className="space-y-3 my-2">
        <span className="sr-only" aria-live="polite" data-add-to-cart-status />
        <VariantOptions product={product} />

        {/* 7. Quantity Stepper (Positioned ABOVE CTAs for natural ordering) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E4E7ED] shadow-2xs">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#192A46]">Select Quantity</span>
            <span className="text-[10px] text-emerald-700 font-semibold">
              {quantity >= 2 ? "✓ Combo discount eligible at checkout" : "Add 2+ units for extra savings"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="size-8 rounded-lg bg-[#F8F7F3] border border-[#E4E7ED] font-bold text-sm text-[#192A46] hover:bg-[#EAF0FC] transition-colors disabled:opacity-40 flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="text-sm font-black text-[#192A46] min-w-5 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="size-8 rounded-lg bg-[#F8F7F3] border border-[#E4E7ED] font-bold text-sm text-[#192A46] hover:bg-[#EAF0FC] transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* 8. Action Buttons (Dual CTA with High Trust) */}
        <div className="space-y-2.5 pt-1">
          {/* Primary CTA: ADD TO CART in rich #2457D6 */}
          <form {...formProps({ afterSubmit: openCartDrawer })}>
            <input type="hidden" {...register("merchandiseId", {})} />
            <input type="hidden" name="quantity" value={quantity} />
            <button
              {...register("addToCart", {})}
              className="w-full h-12 rounded-xl bg-[#2457D6] text-white font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-md hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5"
              disabled={!addable || pending}
              data-testid="add-to-cart"
            >
              <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>ADDING TO CART…</span>
                </span>
              ) : addable ? (
                "ADD TO CART"
              ) : (
                "SOLD OUT"
              )}
            </button>
          </form>

          {/* Secondary CTA: ORDER NOW — CASH ON DELIVERY */}
          <button
            type="button"
            onClick={() => setIsCodModalOpen(true)}
            disabled={!addable}
            className="cod-animated-btn w-full h-12 rounded-xl bg-white text-[#192A46] border-2 border-[#192A46] font-extrabold text-sm sm:text-base tracking-wide shadow-sm hover:bg-[#F8F7F3] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="order-now-cod"
          >
            <span className="text-lg">💵</span>
            <span>Order Now – Cash on Delivery</span>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Zero Risk
            </span>
          </button>
        </div>

        {/* 9. Micro-Trust Reassurance Bar directly below CTAs */}
        <div className="grid grid-cols-3 gap-2 py-3 px-2 border-y border-[#E4E7ED] my-3.5 bg-[#F8F7F3]/80 rounded-xl">
          <div className="flex flex-col items-center text-center">
            <span className="text-sm">💵</span>
            <span className="text-[11px] font-bold text-[#192A46] mt-0.5">Pay on Delivery</span>
            <span className="text-[10px] text-[#64748B]">Cash / UPI at doorstep</span>
          </div>
          <div className="flex flex-col items-center text-center border-x border-[#E4E7ED] px-1">
            <span className="text-sm">🚚</span>
            <span className="text-[11px] font-bold text-[#192A46] mt-0.5">Free Express Transit</span>
            <span className="text-[10px] text-[#64748B]">Delivers in 3–5 Days</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-sm">🔄</span>
            <span className="text-[11px] font-bold text-[#192A46] mt-0.5">5-Day Easy Returns</span>
            <span className="text-[10px] text-[#64748B]">Doorstep Replacement</span>
          </div>
        </div>

        {/* Cash on Delivery Modal */}
        <CodOrderModal
          isOpen={isCodModalOpen}
          onClose={() => setIsCodModalOpen(false)}
          product={{
            id: selectedVariant?.id ?? product.selectedOrFirstAvailableVariant?.id ?? product.id,
            title: sanitizedTitle,
            variantTitle: selectedVariant?.title !== "Default Title" ? selectedVariant?.title : undefined,
            image: selectedVariant?.image?.url ?? product.featuredImage?.url ?? product.images.nodes[0]?.url,
            quantity,
            unitPrice: price,
          }}
        />

        {/* Errors & Notifications */}
        {[...errors.userErrors, ...errors.warnings, ...errors.networkErrors].length ? (
          <div className="grid gap-1 text-sm mt-2" role="alert">
            {errors.userErrors.map((error) => (
              <p key={error.message} className="text-critical text-xs">
                {error.message}
              </p>
            ))}
            {errors.warnings.map((warning) => (
              <p key={warning.message} className="text-warning text-xs">
                {warning.message}
              </p>
            ))}
            {errors.networkErrors.map((error) => (
              <p key={error.message} className="text-critical text-xs">
                {error.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {/* 10. Unlocked Customer Discounts & Perks */}
      <BenefitsOfPrepaidOrdersCard />

      {/* 11. Delivery & Pincode checker */}
      <PincodeEstimator />

      {/* 12. Trusted payments & 3-stage delivery timeline */}
      <TrustedPaymentsAndTimeline />

      {/* 13. Rich Product Story / GIFs (Dreamzhub style for Handy Heater) */}
      {isHeater ? <HandyHeaterStory /> : null}
    </div>
  );
}

function ProductBreadcrumb({ product }: { product: ProductData }) {
  const sanitizedTitle = filterSupplierNames(product.title);
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <li>
          <Link to="/" className="hover:text-[#2457D6] transition-colors">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/collections" className="hover:text-[#2457D6] transition-colors">
            Collections
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-[#192A46] font-medium truncate max-w-[200px]">
          {sanitizedTitle}
        </li>
      </ol>
    </nav>
  );
}

function ProductPageContent({
  product,
  structuredContent,
}: {
  product: ProductData;
  structuredContent: StructuredProductContent;
}) {
  const { selectedVariant } = useProductForm();

  return (
    <section className="max-w-page px-margin mx-auto w-full py-4 md:py-8">
      <ProductBreadcrumb product={product} />
      <div className="product-grid grid grid-cols-1 lg:grid-cols-[54%_46%] gap-8 lg:gap-12 items-start">
        <ProductGallery product={product} selectedVariant={selectedVariant} />
        <ProductInfo
          product={product}
          selectedVariant={selectedVariant}
          structuredContent={structuredContent}
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
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const sanitizedTitle = filterSupplierNames(product.title);

  return (
    <>
      <aside
        aria-label="Quick purchase bar"
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E4E7ED] px-3.5 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] z-30 md:hidden shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt=""
                className="size-10 rounded-md object-contain p-0.5 bg-[#F8F7F3] shrink-0 border border-[#E4E7ED]"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#192A46] truncate">
                {sanitizedTitle}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-extrabold text-[#192A46]">
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
                className="bg-[#2457D6] text-white hover:opacity-90 px-3 py-2 rounded-lg text-xs font-bold tracking-wide disabled:opacity-50 cursor-pointer"
                disabled={!addable || pending}
                title="Add to Cart"
              >
                {pending ? "…" : "Cart"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setIsCodModalOpen(true)}
              disabled={!addable}
              className="cod-animated-btn bg-white text-[#192A46] border-2 border-[#192A46] hover:bg-[#F8F7F3] px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wide shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <span>🛒</span>
              <span>COD</span>
            </button>
          </div>
        </div>
      </aside>

      <CodOrderModal
        isOpen={isCodModalOpen}
        onClose={() => setIsCodModalOpen(false)}
        product={{
          id: selectedVariant?.id ?? product.selectedOrFirstAvailableVariant?.id ?? product.id,
          title: sanitizedTitle,
          variantTitle: selectedVariant?.title !== "Default Title" ? selectedVariant?.title : undefined,
          image: primaryImage?.url,
          quantity: 1,
          unitPrice: price,
        }}
      />
    </>
  );
}

function RelatedProducts({ products }: { products: RelatedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="py-8 bg-[#F8F7F3] border-t border-[#E4E7ED]" aria-labelledby="related-products-heading">
      <div className="max-w-page px-margin mx-auto">
        <div className="mb-6">
          <span className="text-xs uppercase font-bold tracking-wider text-[#2457D6]">
            POPULAR PICKS
          </span>
          <h2
            id="related-products-heading"
            className="font-serif italic text-2xl sm:text-3xl font-normal text-[#192A46] mt-1"
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
  const { product, relatedProducts, faqs } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  const structuredContent = useMemo(
    () =>
      parseProductContent({
        title: product.title,
        description: product.descriptionHtml || product.description,
        images: product.images.nodes,
      }),
    [product.title, product.description, product.descriptionHtml, product.images.nodes],
  );

  const isHeater = (product.title + " " + product.handle).toLowerCase().includes("heater");

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
      <main className="flex-1 pb-24 md:pb-0" id="main-content" tabIndex={-1}>
        <ProductPageContent
          product={product}
          structuredContent={structuredContent}
        />
        <ProductEditorialShowcase
          structuredContent={structuredContent}
          faqs={faqs}
          isHeater={isHeater}
        />
        <RelatedProducts products={relatedProducts} />
        <StickyMobileBuyBar product={product} />
      </main>
    </ProductProvider>
  );
}
