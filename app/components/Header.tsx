import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";

import { useCart } from "~/lib/cart";
import { CART_DRAWER_ID, SEARCH_DRAWER_ID, openDialogFromLinkClick } from "~/lib/cart-drawer";
import type { StorefrontShop } from "~/lib/storefront-shop";

import { MobileNav, MobileNavTrigger } from "./MobileNav";

function cartCountLabel(count: number) {
  return count === 1 ? "Cart (1 item)" : `Cart (${count} items)`;
}

function liveCartCountLabel(count: number) {
  return count === 1 ? "1 item in cart" : `${count} items in cart`;
}

function displayCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function Header({ shopInfo }: { shopInfo: StorefrontShop }) {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlistCount, setWishlistCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Read wishlist from localStorage if available
    try {
      const saved = localStorage.getItem("hypeeecart_wishlist");
      if (saved) {
        const items = JSON.parse(saved);
        setWishlistCount(Array.isArray(items) ? items.length : 0);
      }
    } catch {}

    const handleWishlistUpdate = () => {
      try {
        const saved = localStorage.getItem("hypeeecart_wishlist");
        if (saved) {
          const items = JSON.parse(saved);
          setWishlistCount(Array.isArray(items) ? items.length : 0);
        }
      } catch {}
    };

    window.addEventListener("wishlist_updated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlist_updated", handleWishlistUpdate);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="border-border bg-white sticky top-0 z-40 border-b shadow-2xs transition-colors">
      {/* ── Main Header Row ── */}
      <div className="max-w-page px-margin mx-auto flex h-16 sm:h-18 w-full items-center justify-between gap-3 sm:gap-6">
        {/* Mobile menu + Logo */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 shrink-0">
          <div className="-ms-2 lg:hidden shrink-0" data-hamburger-wrapper>
            <MobileNavTrigger />
          </div>
          <Link
            to="/"
            aria-label={shopInfo.name || "HypeeeCart"}
            title={shopInfo.name || "HypeeeCart"}
            className="text-on-surface focus-visible:outline-accent inline-flex items-center rounded-sm no-underline group"
          >
            <img
              src="/logo.png"
              alt={shopInfo.name || "HypeeeCart"}
              className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* ── Prominent Desktop Search Bar (KitKart inspired) ── */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6 relative items-center"
          role="search"
        >
          <div className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for trending finds, home essentials, gadgets..."
              className="w-full bg-[#FAF6F0] border border-[#E2DBD0] rounded-full py-2.5 ps-11 pe-24 text-xs sm:text-sm text-[#282720] placeholder:text-[#8D887D] focus:outline-none focus:border-[#B77943] focus:bg-white transition-all shadow-inner/5"
            />
            <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#7D786D] pointer-events-none">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              type="submit"
              className="absolute end-1.5 top-1/2 -translate-y-1/2 bg-[#B77943] hover:bg-[#9E6433] text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* ── Action Icons on Right (Search, Wishlist, Account, Cart) ── */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Mobile search trigger */}
          <Link
            to="/search"
            className="md:hidden button-icon inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#282720] hover:bg-[#FAF6F0] transition-colors"
            aria-label="Search"
            aria-controls={SEARCH_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="search-trigger"
            onClick={(event) => openDialogFromLinkClick(event, SEARCH_DRAWER_ID)}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {/* Wishlist Link / Trigger */}
          <Link
            to="/#trending"
            className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#282720] hover:bg-[#FAF6F0] transition-colors"
            aria-label={`Wishlist (${wishlistCount} items)`}
            title="Saved items"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {wishlistCount > 0 ? (
              <span className="bg-[#B77943] text-white absolute end-1 top-1 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
                {displayCount(wishlistCount)}
              </span>
            ) : null}
          </Link>

          {/* Account Link */}
          <Link
            to="/account"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#282720] hover:bg-[#FAF6F0] transition-colors"
            aria-label="Account"
            title="Customer Account"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </Link>

          {/* Cart Trigger */}
          <Link
            to="/cart"
            className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#282720] hover:bg-[#FAF6F0] transition-colors"
            aria-label={cartCountLabel(totalQuantity)}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="cart-trigger"
            onClick={(event) => openDialogFromLinkClick(event, CART_DRAWER_ID)}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {totalQuantity > 0 ? (
              <span className="bg-[#B77943] text-white absolute end-1 top-1 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
                {displayCount(totalQuantity)}
              </span>
            ) : null}
          </Link>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {liveCartCountLabel(totalQuantity)}
          </span>
        </div>
      </div>

      {/* ── Category Quick Navigation Bar (Desktop) ── */}
      <nav
        aria-label="Category navigation"
        className="hidden md:block border-t border-[#F0EBE1] bg-[#FAF6F0]/80 backdrop-blur-xs"
      >
        <div className="max-w-page px-margin mx-auto flex items-center gap-6 overflow-x-auto py-2 text-xs font-semibold text-[#282720] scrollbar-none">
          <Link to="/" className="text-[#B77943] hover:text-[#9E6433] whitespace-nowrap transition-colors">
            All Categories
          </Link>
          <Link to="/#top-categories" className="hover:text-[#B77943] whitespace-nowrap transition-colors">
            Top Categories
          </Link>
          <Link to="/#trending" className="hover:text-[#B77943] whitespace-nowrap transition-colors">
            Trending Now
          </Link>
          <Link to="/#home-kitchen" className="hover:text-[#B77943] whitespace-nowrap transition-colors">
            Home &amp; Kitchen
          </Link>
          <Link to="/#special-offers" className="hover:text-[#B77943] whitespace-nowrap transition-colors">
            Special Offers
          </Link>
          <Link to="/#smart-upgrades" className="hover:text-[#B77943] whitespace-nowrap transition-colors">
            Smart Little Upgrades
          </Link>
          <Link to="/#health-care" className="hover:text-[#B77943] whitespace-nowrap transition-colors">
            Health &amp; Care
          </Link>
          <Link to="/#shop-by-price" className="text-[#B77943] hover:text-[#9E6433] whitespace-nowrap transition-colors">
            Under ₹299
          </Link>
          <Link to="/#shopping-guide" className="hover:text-[#B77943] whitespace-nowrap transition-colors ms-auto">
            Shopping Guide &amp; FAQ
          </Link>
        </div>
      </nav>

      <MobileNav />
    </header>
  );
}
