import { AnalyticsEvent, type AnalyticsCart } from "@shopify/hydrogen";
import { useCartAnalytics } from "@shopify/hydrogen/react";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import type { CartData } from "~/lib/cart";

export const META_PIXEL_ID = "1007715191637803";

export function MetaPixelScript({ pixelId = META_PIXEL_ID }: { pixelId?: string }) {
  return (
    <>
      {/* Meta Pixel Base Code */}
      <script
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

function isConsentAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const cp = window.Shopify?.customerPrivacy;
  if (!cp) return true;
  if (typeof cp.marketingAllowed === "function" && !cp.marketingAllowed()) {
    return false;
  }
  if (typeof cp.analyticsProcessingAllowed === "function" && !cp.analyticsProcessingAllowed()) {
    return false;
  }
  return true;
}

export function PageViewedTracker() {
  const location = useLocation();
  const pageKey = `${location.pathname}${location.search}`;
  const lastTrackedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Hydrogen Storefront analytics bus
    window.Shopify?.analytics?.publish(AnalyticsEvent.PAGE_VIEWED);

    // 2. Meta Pixel SPA route tracking:
    // On the initial client mount, the base script in <head> already tracked the initial PageView.
    // Record pageKey so we do not duplicate PageView on initial render or React StrictMode.
    if (lastTrackedUrlRef.current === null) {
      lastTrackedUrlRef.current = pageKey;
      return;
    }

    // Prevent duplicate PageView if pageKey hasn't changed (re-renders, state updates, HMR)
    if (lastTrackedUrlRef.current === pageKey) {
      return;
    }

    lastTrackedUrlRef.current = pageKey;

    if (!isConsentAllowed()) {
      return;
    }

    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pageKey]);

  useEffect(() => {
    // Listen for Shopify Customer Privacy consent resolution if banner was accepted later
    const handleConsent = () => {
      if (typeof window !== "undefined" && typeof window.fbq === "function" && isConsentAllowed()) {
        window.fbq("track", "PageView");
      }
    };

    document.addEventListener("visitorConsentCollected", handleConsent);
    return () => {
      document.removeEventListener("visitorConsentCollected", handleConsent);
    };
  }, []);

  return null;
}

function toAnalyticsCart(cart: CartData): AnalyticsCart | null {
  if (!cart.id || !cart.updatedAt) return null;

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    lines: {
      nodes: cart.lines.nodes.flatMap((line) => {
        const merchandise = line.merchandise;
        const product = merchandise?.product;
        // Optimistic lines may not have product details yet.
        if (!merchandise?.id || !product?.id || !product.title || !product.vendor) {
          return [];
        }
        return [
          {
            id: line.id,
            quantity: line.quantity,
            merchandise: {
              id: merchandise.id,
              title: merchandise.title ?? product.title,
              sku: merchandise.sku,
              price: line.cost.amountPerQuantity,
              product: {
                id: product.id,
                title: product.title,
                vendor: product.vendor,
                productType: product.productType,
                handle: product.handle,
              },
            },
          },
        ];
      }),
    },
  };
}

export function CartAnalyticsTracker() {
  useCartAnalytics();
  return null;
}

export function publishCartViewed(cart: CartData) {
  window.Shopify?.analytics?.publish(AnalyticsEvent.CART_VIEWED, {
    cart: toAnalyticsCart(cart),
  });
}
