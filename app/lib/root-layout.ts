import { gql, type StorefrontApi, type StorefrontClient } from "@shopify/hydrogen";

import { normalizeStorefrontShop, type StorefrontShop } from "~/lib/storefront-shop";

export const ROOT_LAYOUT_QUERY = gql(`
  query RootLayout($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      id
      name
      brand {
        logo {
          alt
          image {
            url
            altText
            width
            height
          }
        }
      }
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
    collections(first: 50) {
      nodes {
        id
        title
        handle
        description
        image {
          url
          altText
          width
          height
        }
      }
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
  }
`);

export type RootLayoutQueryResult = StorefrontApi.ResultOf<typeof ROOT_LAYOUT_QUERY>;

export type HeaderCollection = {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
};

type RootLayoutLoaderData = {
  shopId: string;
  shopInfo: StorefrontShop;
  collections: HeaderCollection[];
  // Browse events carry no price, so shopify.js reads their currency from
  // window.Shopify.currency.active. The cart tracker only sets that once a cart exists,
  // so the bootstrap needs it up front.
  currency: string;
};

export async function loadRootLayout(
  storefrontClient: Pick<StorefrontClient, "graphql">,
): Promise<RootLayoutLoaderData> {
  const layoutResult = await storefrontClient.graphql(ROOT_LAYOUT_QUERY);

  if (layoutResult.errors) {
    console.error(
      `Root layout query failed: ${layoutResult.errors.map(({ message }) => message).join("\n")}`,
    );
  }

  // Upstream error details are logged above, not exposed through the boundary.
  if (!layoutResult.data) throw new Error("Root layout data is unavailable.");

  const { shop, localization, collections } = layoutResult.data;
  return {
    shopId: shop.id,
    shopInfo: normalizeStorefrontShop(shop),
    collections: (collections?.nodes as HeaderCollection[]) ?? [],
    currency: localization.country.currency.isoCode,
  };
}
