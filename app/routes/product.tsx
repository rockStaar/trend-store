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
import { ProductReviews } from "~/components/ProductReviews";
import { CodOrderModal } from "~/components/CodOrderModal";
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

export function filterSupplierNames(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\b(meesho|dropdash|roposo|glowroad|cjdropshipping|cjdropship|dropship|dropshipper|aliexpress|alibaba)\b/gi, "Grow & Glow")
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
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#FAF6F0] border border-[#E2DBD0] shadow-sm flex items-center justify-center p-2 sm:p-4">
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
                  className={`shrink-0 size-16 sm:size-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer p-1 bg-[#FAF6F0] flex items-center justify-center ${isActive
                      ? "border-[#B77943] ring-2 ring-[#B77943]/30 opacity-100 shadow-sm scale-[1.02]"
                      : "border-[#E2DBD0] opacity-70 hover:opacity-100 hover:border-[#B77943]/50"
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
    <div className="flex items-baseline gap-2.5 my-3" data-product-price>
      <span className="text-2xl sm:text-3xl font-black text-[#282720]">
        <span className="sr-only">Price: </span>
        {formatPrice(price)}
      </span>
      {compareAt && percent ? (
        <>
          <s className="text-sm sm:text-base text-gray-500 line-through">
            <span className="sr-only">Regular price: </span>
            {formatPrice(compareAt)}
          </s>
          <span className="bg-black text-white text-[11px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 uppercase" aria-label={`Save ${percent}%`}>
            <svg className="size-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>SAVE {percent}%</span>
          </span>
        </>
      ) : null}
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

function getProductFeatures(product: ProductData) {
  const text = `${product.title} ${product.description || ""}`.toLowerCase();

  if (text.includes("duster") || text.includes("clean") || text.includes("car") || text.includes("handle")) {
    return [
      {
        title: "Extendable Handle",
        desc: "Adjustable from 75 cm (29.5 in) to 86 cm (33.8 in), making it easy to clean car roofs, windshields, and hard-to-reach spots.",
      },
      {
        title: "Puffy Microfiber Brush",
        desc: "Soft yet durable fibers that absorb dust effectively and leave no streaks or scratches behind.",
      },
      {
        title: "Space-Saving Design",
        desc: "Detachable and retractable handle allows easy storage in your car trunk or garage.",
      },
      {
        title: "Multi-Purpose Use",
        desc: "Perfect for cars, SUVs, trucks, bikes, home furniture, glass windows, and office cleaning.",
      },
      {
        title: "Ergonomic Grip",
        desc: "Anti-slip foam handle provides comfortable hold during cleaning.",
      },
    ];
  }

  if (text.includes("shelf") || text.includes("corner") || text.includes("adhesive") || text.includes("wall") || text.includes("bathroom") || text.includes("rack")) {
    return [
      {
        title: "Drill-Free Installation",
        desc: "Strong trace-less adhesive pads hold securely without damaging walls or bathroom tiles.",
      },
      {
        title: "Rustproof & Waterproof",
        desc: "Anti-corrosion engineered finish withstands high humidity and constant steam.",
      },
      {
        title: "Fast-Draining Design",
        desc: "Hollow base prevents stagnant water accumulation, keeping bath items dry and clean.",
      },
      {
        title: "Heavy-Duty Load Capacity",
        desc: "Sturdy frame easily holds large shampoo, conditioner, and body wash bottles.",
      },
      {
        title: "Space-Saving Corner Fit",
        desc: "Maximizes unused 90-degree corners for neat, organized storage.",
      },
    ];
  }

  if (text.includes("bottle") || text.includes("flask") || text.includes("cup") || text.includes("mug")) {
    return [
      {
        title: "Vacuum Insulation",
        desc: "Keeps beverages piping hot for 12 hours or refreshingly ice-cold for 24 hours.",
      },
      {
        title: "Food-Grade Stainless Steel",
        desc: "Grade 304 interior ensures zero flavor retention and 100% BPA-free safety.",
      },
      {
        title: "Leakproof Lid",
        desc: "Precision silicone gasket prevents accidental spills in backpacks or vehicles.",
      },
      {
        title: "Sweat-Free Grip",
        desc: "Durable matte powder coat provides a comfortable, slip-resistant hold.",
      },
      {
        title: "Everyday Portability",
        desc: "Fits standard car cup holders and gym bag side pockets effortlessly.",
      },
    ];
  }

  return [
    {
      title: "Premium Build Quality",
      desc: "Constructed with selected high-grade materials engineered for everyday domestic use.",
    },
    {
      title: "Functional & Ergonomic",
      desc: "Designed for comfortable handling and reliable performance every single day.",
    },
    {
      title: "Zero Transit Damage Guarantee",
      desc: "Ships in protective multi-layer packaging to ensure flawless doorstep delivery.",
    },
    {
      title: "Easy Maintenance",
      desc: "Wipe-clean surfaces that resist dust, stains, and daily wear and tear.",
    },
    {
      title: "Tested & Certified",
      desc: "Individually batch-inspected to meet domestic Indian household quality standards.",
    },
  ];
}

function cleanDescriptionIntro(product: ProductData): string {
  const sanitized = filterSupplierNames(product.description || "");
  const text = `${product.title} ${sanitized}`.toLowerCase();

  if (text.includes("duster") || text.includes("car")) {
    return `Keep your car spotless with this ${filterSupplierNames(product.title)}, designed for effortless dusting and cleaning. Made with high-quality microfiber bristles, it efficiently traps dirt, dust, and pollen without scratching the surface. Its lightweight and ergonomic design makes it ideal for quick cleaning sessions as well as deep detailing.`;
  }

  if (sanitized && sanitized.length > 50) {
    return sanitized;
  }

  return `Experience premium convenience and durability with the ${filterSupplierNames(product.title)}. Crafted from high-grade materials, it is engineered for dependable daily performance, comfortable usability, and long-lasting domestic utility.`;
}

function BenefitsOfPrepaidOrdersCard() {
  return (
    <div className="rounded-xl border border-[#282720]/25 bg-white p-3 sm:p-3.5 mb-3 shadow-2xs">
      <div className="font-extrabold text-xs sm:text-sm text-[#282720] flex items-center gap-1.5 mb-2">
        <span className="text-base text-[#B77943]">🎯</span>
        <span className="tracking-tight">Benefits Of Prepaid Orders</span>
      </div>
      <div className="space-y-1.5 text-xs text-[#282720] font-medium">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm">💰</span>
          <span>₹29 Off On Orders Above ₹499</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm">🎁</span>
          <span>Extra ₹50 Off On 2 or More Items</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm">🚚</span>
          <span>Free Shipping On Prepaid Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm">⚡</span>
          <span>Priority Dispatch &amp; Fast Delivery</span>
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
              className={`relative cursor-pointer rounded-xl border-2 p-3 sm:p-3.5 transition-all flex items-center justify-between gap-3 ${isSelected
                  ? "border-[#282720] bg-[#FAF6F0] shadow-xs"
                  : "border-[#E2DBD0] bg-white hover:border-[#B77943]/60 hover:bg-[#FAF6F0]/40"
                }`}
            >
              {/* Badge if present */}
              {pack.badge ? (
                <span
                  className={`absolute -top-2.5 right-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs ${pack.badge.includes("Best Value")
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
                  className={`size-4.5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? "border-[#282720] bg-[#282720]" : "border-[#B0A99F] bg-white"
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

function ProductLowerDetails({
  product,
  faqs,
}: {
  product: ProductData;
  faqs?: FaqItem[];
}) {
  const sanitizedTitle = filterSupplierNames(product.title);
  const features = getProductFeatures(product);
  const intro = cleanDescriptionIntro(product);

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
        "None! Orders over ₹999 qualify for 100% Free Pan-India Delivery. Orders under ₹999 have a standard flat fee of ₹49.",
    },
  ];

  const faqItems = faqs && faqs.length > 0 ? faqs.slice(0, 5) : defaultFaqs;

  return (
    <section className="max-w-page px-margin mx-auto w-full py-8 space-y-5" aria-label="Product details and specifications">
      {/* 1. 5 Days Return Policy Collapsible Row (Image 3) */}
      <details className="group border border-[#E2DBD0] rounded-xl bg-white overflow-hidden shadow-2xs">
        <summary className="cursor-pointer p-4 font-bold text-xs sm:text-sm text-[#282720] flex items-center justify-between hover:bg-[#FAF6F0] transition-colors">
          <span className="flex items-center gap-2.5">
            <span className="text-base text-[#282720]">⇄</span>
            <span>5 Days Return Policy</span>
          </span>
          <span className="text-[#B77943] text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 pt-1 text-xs text-[#5E5B52] leading-relaxed border-t border-[#F0EBE1] space-y-2">
          <p>
            We stand by the quality of every product we curate. If your item arrives defective, damaged, or incomplete, notify our support team within 5 days of delivery for an immediate free replacement or hassle-free doorstep resolution.
          </p>
          <p>
            Items are picked up directly from your doorstep with zero return delivery charge.
          </p>
        </div>
      </details>

      {/* 2. Frequently Asked Questions (FAQs) Collapsible Row (Image 3) */}
      <details className="group border border-[#E2DBD0] rounded-xl bg-white overflow-hidden shadow-2xs">
        <summary className="cursor-pointer p-4 font-bold text-xs sm:text-sm text-[#282720] flex items-center justify-between hover:bg-[#FAF6F0] transition-colors">
          <span className="flex items-center gap-2.5">
            <span className="text-base text-[#282720]">❔</span>
            <span>Frequently Asked Questions (FAQs)</span>
          </span>
          <span className="text-[#B77943] text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="divide-y divide-[#E2DBD0] border-t border-[#F0EBE1]">
          {faqItems.map((item, idx) => (
            <div key={idx} className="p-4 space-y-1">
              <p className="font-bold text-xs sm:text-sm text-[#282720]">{item.question}</p>
              <p className="text-xs text-[#5E5B52] leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </details>

      {/* 3. Detailed Product Description & Feature List matching Image 3 */}
      <div className="bg-white border border-[#E2DBD0] rounded-2xl p-5 sm:p-7 shadow-2xs space-y-4">
        {/* Intro text */}
        <p className="text-xs sm:text-sm text-[#282720] leading-relaxed">
          {intro}
        </p>

        {/* Feature bullets with Green Checkmarks matching Image 3 */}
        <div className="space-y-3 pt-2 border-t border-[#F0EBE1]">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#282720]">
              <span className="text-emerald-600 text-sm sm:text-base shrink-0 leading-none">✅</span>
              <div>
                <strong className="font-bold">{feat.title}</strong>
                <span className="text-[#5E5B52]"> – {feat.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Concluding Assurance paragraph matching Image 3 */}
        <div className="pt-3 border-t border-[#F0EBE1] text-xs sm:text-sm text-[#5E5B52] leading-relaxed space-y-2">
          <p>
            Unlike traditional products that shed, break, or wear down quickly, this {sanitizedTitle} is engineered to deliver reliable, long-lasting performance for everyday convenience.
          </p>
          <p>
            Whether you are using it at home, in your car, or on the go, it is crafted to be your ultimate dependable companion.
          </p>
        </div>
      </div>
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
    setStatus({
      valid: true,
      message: `Delivers to ${clean} in ${days}. Free delivery over ₹999 & Cash on Delivery Available!`,
    });
  };

  return (
    <div className="bg-[#FAF6F0] border border-[#E2DBD0] rounded-xl p-3.5 sm:p-4 my-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#282720]">
          <span>📍</span>
          <span>Delivery &amp; COD Eligibility:</span>
        </div>
        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
          <span>Dispatches within 24 hours via Express Courier</span>
          <span>Flat ₹49 under ₹999</span>
        </p>
      )}
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
  const { options, register, formProps, errors, pending } = useProductForm();
  const addable = canAddToCart(product, options);
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const baseUnitAmount = parseFloat(price.amount) || 0;
  const compareAtAmount = compareAt ? parseFloat(compareAt.amount) : null;
  const genuineCompareAt = compareAtAmount && compareAtAmount > baseUnitAmount ? compareAtAmount : null;
  const currency = price.currencyCode || "INR";

  const sanitizedTitle = filterSupplierNames(product.title);

  return (
    <div className="flex flex-col gap-0 md:sticky md:top-8 md:self-start">
      {/* 1. Product Title: clear, bold heading, compact spacing */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#282720] leading-tight mb-1.5 tracking-tight">
        {sanitizedTitle}
      </h1>

      {/* 2. Star rating & reviews: immediately below title in one compact line */}
      <div className="flex items-center gap-1.5 text-xs text-[#282720] mb-3">
        <span className="text-[#D7A84C] text-sm tracking-widest">★★★★★</span>
        <span className="font-extrabold">
          {reviewStats && reviewStats.totalReviews > 0
            ? `Excellent ${reviewStats.averageRating.toFixed(1)}/5 | ${reviewStats.totalReviews} Customers`
            : "Excellent 4.8/5 | 5968 Customers"}
        </span>
      </div>

      {/* 3. Benefits of Prepaid Orders: compact bordered card matching Image 1 */}
      <BenefitsOfPrepaidOrdersCard />

      {/* 4. Product Price: compact row (Rs. 599.00  Rs. 999.00  [SAVE 40%]) */}
      <PriceBlock product={product} selectedVariant={selectedVariant} />
      <InventoryHint selectedVariant={selectedVariant} />

      {/* Variant options if available */}
      <div data-product-form className="space-y-2.5">
        <span className="sr-only" aria-live="polite" data-add-to-cart-status />
        <VariantOptions product={product} />

        {/* 5. ADD TO CART Button: full-width espresso button with ivory text */}
        <form {...formProps({ afterSubmit: openCartDrawer })} className="mt-1">
          <input type="hidden" {...register("merchandiseId", {})} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            {...register("addToCart", {})}
            className="w-full h-12 rounded-lg bg-black text-white font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-md hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={!addable || pending}
            data-testid="add-to-cart"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>ADDING…</span>
              </span>
            ) : addable ? (
              "ADD TO CART"
            ) : (
              "SOLD OUT"
            )}
          </button>
        </form>

        {/* 6. ORDER NOW — CASH ON DELIVERY Button: directly beneath Add to Cart */}
        <button
          type="button"
          onClick={() => setIsCodModalOpen(true)}
          disabled={!addable}
          className="cod-animated-btn w-full h-12 rounded-lg bg-white text-black border-2 border-black font-extrabold text-sm sm:text-base tracking-wide shadow-sm hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="order-now-cod"
        >
          <span className="text-lg">🛒</span>
          <span>Order Now – Cash on Delivery</span>
        </button>

        {/* Cash on Delivery Modal */}
        <CodOrderModal
          isOpen={isCodModalOpen}
          onClose={() => setIsCodModalOpen(false)}
          product={{
            id: selectedVariant?.id || product.id,
            title: sanitizedTitle,
            variantTitle: selectedVariant?.title !== "Default Title" ? selectedVariant?.title : undefined,
            image: selectedVariant?.image?.url ?? product.featuredImage?.url ?? product.images.nodes[0]?.url,
            quantity,
            unitPrice: price,
          }}
        />

        {/* 7. Bundle / Quantity Selector: directly below the two purchase buttons */}
        <PackSelector
          unitPrice={baseUnitAmount}
          unitCompareAt={genuineCompareAt}
          currency={currency}
          selectedPack={quantity}
          onSelectPack={(packQty) => setQuantity(packQty)}
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

      {/* 8. Other purchase information: Pincode & Delivery Timeline & Trusted Payments */}
      <PincodeEstimator />
      <TrustedPaymentsAndTimeline />
    </div>
  );
}

function ProductBreadcrumb({ product }: { product: ProductData }) {
  const sanitizedTitle = filterSupplierNames(product.title);
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
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
        <li aria-current="page" className="text-[#282720] font-medium truncate max-w-[200px]">
          {sanitizedTitle}
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
    <section className="max-w-page px-margin mx-auto w-full py-4 md:py-8">
      <ProductBreadcrumb product={product} />
      <div className="product-grid grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
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
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const sanitizedTitle = filterSupplierNames(product.title);

  return (
    <>
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
                className="size-10 rounded-md object-contain p-0.5 bg-[#FAF6F0] shrink-0 border border-[#E2DBD0]"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#282720] truncate">
                {sanitizedTitle}
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
              className="cod-animated-btn bg-white text-[#282720] border-2 border-[#282720] hover:bg-[#FAF6F0] px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wide shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"
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
          id: selectedVariant?.id || product.id,
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
        <ProductLowerDetails product={product} faqs={faqs} />
        <ProductReviews
          productId={product.id}
          productHandle={product.handle}
          productTitle={filterSupplierNames(product.title)}
          initialReviews={reviews}
          initialStats={reviewStats}
          productPrice={
            product.selectedOrFirstAvailableVariant?.price ?? product.priceRange.minVariantPrice
          }
          onAddToCart={() => openCartDrawer()}
        />
        <RelatedProducts products={relatedProducts} />
        <StickyMobileBuyBar product={product} />
      </main>
    </ProductProvider>
  );
}

