import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useRouteLoaderData } from "react-router";

import { useCart } from "~/lib/cart";
import { CART_DRAWER_ID, SEARCH_DRAWER_ID, openDialogFromLinkClick } from "~/lib/cart-drawer";
import type { HeaderCollection } from "~/lib/root-layout";
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

function CategoryDropdown({
  collections = [],
}: {
  collections: HeaderCollection[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close when pressing Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="shop-by-category-menu"
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-[#EAF0FC] hover:bg-[#dbe6fa] text-[#155EEF] text-xs font-bold transition-all shadow-2xs border border-[#d2def5] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#155EEF]/40"
      >
        <svg className="size-4 text-[#155EEF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <span className="whitespace-nowrap">Shop by Category</span>
        <svg
          className={`size-3.5 text-[#155EEF] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu Container */}
      {isOpen ? (
        <div
          id="shop-by-category-menu"
          role="menu"
          aria-label="Shop All Categories"
          className="absolute start-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-[480px] lg:w-[540px] max-w-[95vw] rounded-2xl bg-white border border-[#E4E7ED] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header Strip */}
          <div className="bg-[#F7F3EC] border-b border-[#E4E7ED] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#155EEF]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#282720]">
                Shop All Categories
              </h3>
            </div>
            <Link
              to="/collections"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#155EEF] hover:underline flex items-center gap-1"
            >
              <span>View All Collections</span>
              <span>→</span>
            </Link>
          </div>

          {/* Collections List: 2-column on desktop, 1-column on mobile */}
          <div className="p-3 sm:p-4 max-h-[65vh] overflow-y-auto scrollbar-thin">
            {collections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {collections.map((col) => (
                  <Link
                    key={col.id || col.handle}
                    to={`/collections/${col.handle}`}
                    onClick={() => setIsOpen(false)}
                    role="menuitem"
                    className="group flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-[#d2def5] hover:bg-[#EAF0FC]/60 transition-all text-[#282720]"
                  >
                    <div className="size-10 sm:size-11 rounded-lg bg-[#F7F3EC] border border-[#E4E7ED] overflow-hidden shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {col.image?.url ? (
                        <img
                          src={col.image.url}
                          alt={col.image.altText ?? col.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-base">🛍️</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-[#282720] group-hover:text-[#155EEF] truncate transition-colors">
                        {col.title}
                      </p>
                      <span className="text-[10px] text-[#64748B] group-hover:text-[#155EEF]/80 flex items-center gap-0.5">
                        <span>Explore collection</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">›</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#64748B] space-y-2">
                <p>No collections found in this store yet.</p>
                <Link
                  to="/collections"
                  onClick={() => setIsOpen(false)}
                  className="inline-block text-xs font-bold text-[#155EEF] hover:underline"
                >
                  Browse Store Catalog →
                </Link>
              </div>
            )}
          </div>

          {/* Footer Strip */}
          <div className="bg-[#F7F3EC] border-t border-[#E4E7ED] px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-[#64748B]">All products delivered pan-India</span>
            <Link
              to="/collections"
              onClick={() => setIsOpen(false)}
              className="font-bold text-[#155EEF] hover:underline"
            >
              Browse All Products →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Header({
  shopInfo,
  collections = [],
}: {
  shopInfo: StorefrontShop;
  collections?: HeaderCollection[];
}) {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlistCount, setWishlistCount] = useState(0);
  const navigate = useNavigate();

  // Root loader fallback if collections not passed as prop
  const rootData = useRouteLoaderData<{ collections?: HeaderCollection[] }>("root");
  const allCollections =
    (collections && collections.length > 0 ? collections : rootData?.collections) ?? [];

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
    <header className="border-b border-[#E4E7ED] bg-white sticky top-0 z-40 shadow-xs transition-colors">
      {/* ── Main Header Row ── */}
      <div className="max-w-page px-3 sm:px-margin mx-auto flex h-14 sm:h-20 w-full items-center justify-between gap-2 sm:gap-4">
        {/* Mobile menu + Logo + Shop by Category dropdown */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-4 shrink-0">
          <div className="-ms-1 sm:-ms-2 lg:hidden shrink-0" data-hamburger-wrapper>
            <MobileNavTrigger />
          </div>
          <Link
            to="/"
            aria-label={shopInfo.name || "HypeeeCart"}
            title={shopInfo.name || "HypeeeCart"}
            className="text-[#192A46] focus-visible:outline-[#155EEF] inline-flex items-center rounded-sm no-underline group"
          >
            <img
              src="/logo.png"
              alt={shopInfo.name || "HypeeeCart"}
              className="h-8 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Functional "Shop by Category" Dropdown (Desktop & Tablet) */}
          <div className="hidden sm:inline-block">
            <CategoryDropdown collections={allCollections} />
          </div>
        </div>

        {/* ── Desktop Navigation Links ── */}
        <nav
          aria-label="Main navigation"
          className="hidden xl:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-[#192A46]"
        >
          <Link to="/" className="text-[#155EEF] hover:text-[#1044b2] transition-colors">
            HOME
          </Link>
          <Link to="/#trending" className="hover:text-[#155EEF] transition-colors">
            BESTSELLERS
          </Link>
          <Link to="/#trending" className="hover:text-[#155EEF] transition-colors">
            NEW ARRIVALS
          </Link>
          <Link to="/collections" className="hover:text-[#155EEF] transition-colors">
            COLLECTIONS
          </Link>
        </nav>

        {/* ── Search Input (Desktop) ── */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-xs lg:max-w-sm mx-2 relative items-center"
          role="search"
        >
          <div className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands and more..."
              className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-full py-2 ps-4 pe-9 text-xs text-[#192A46] placeholder:text-[#64748B] focus:outline-none focus:border-[#155EEF] focus:bg-white transition-all shadow-inner/5"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#155EEF] transition-colors cursor-pointer"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </form>

        {/* ── Action Icons on Right (Account, Wishlist, Cart) ── */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          {/* Account Link (Desktop/Tablet) */}
          <Link
            to="/account"
            className="hidden sm:inline-flex h-9 w-9 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#155EEF] hover:bg-[#F8F7F3] transition-colors"
            aria-label="Account"
            title="Customer Account"
          >
            <svg className="size-5 sm:size-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </Link>

          {/* Wishlist Link / Trigger */}
          <Link
            to="/#trending"
            className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#155EEF] hover:bg-[#F8F7F3] transition-colors"
            aria-label={`Wishlist (${wishlistCount} items)`}
            title="Saved items"
          >
            <svg className="size-5 sm:size-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="bg-[#192A46] text-white absolute end-0 top-0.5 sm:top-1 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
              {displayCount(wishlistCount)}
            </span>
          </Link>

          {/* Cart Trigger */}
          <Link
            to="/cart"
            className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#155EEF] hover:bg-[#F8F7F3] transition-colors"
            aria-label={cartCountLabel(totalQuantity)}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="cart-trigger"
            onClick={(event) => openDialogFromLinkClick(event, CART_DRAWER_ID)}
          >
            <svg className="size-5 sm:size-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span className="bg-[#155EEF] text-white absolute end-0 top-0.5 sm:top-1 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
              {displayCount(totalQuantity)}
            </span>
          </Link>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {liveCartCountLabel(totalQuantity)}
          </span>
        </div>
      </div>

      {/* ── Mobile Instant Search Bar ── */}
      <div className="md:hidden px-3 pb-2 pt-0.5 border-b border-[#E4E7ED]/70 bg-white">
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full flex items-center"
          role="search"
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, brands and more..."
            className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl py-2 ps-9 pe-4 text-xs text-[#192A46] placeholder:text-[#64748B] focus:outline-none focus:border-[#155EEF] focus:bg-white transition-all shadow-inner/5"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#155EEF] transition-colors cursor-pointer"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </form>
      </div>

      {/* ── Mobile Category Quick Strip ── */}
      <div className="md:hidden bg-[#FAF8F5] border-b border-[#E4E7ED] px-3 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] font-bold text-[#192A46]">
        <Link
          to="/"
          className="shrink-0 px-2.5 py-1 rounded-full bg-[#155EEF] text-white shadow-2xs"
        >
          All
        </Link>
        <Link
          to="/#top-categories"
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#E4E7ED] text-[#192A46] hover:border-[#155EEF] transition-colors"
        >
          Categories
        </Link>
        <Link
          to="/#trending"
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#E4E7ED] text-[#192A46] hover:border-[#155EEF] transition-colors flex items-center gap-1"
        >
          <span>🔥</span>
          <span>Trending</span>
        </Link>
        <Link
          to="/#home-kitchen"
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#E4E7ED] text-[#192A46] hover:border-[#155EEF] transition-colors"
        >
          Home &amp; Kitchen
        </Link>
        <Link
          to="/#special-offers"
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#E4E7ED] text-[#D93636] hover:border-[#D93636] transition-colors"
        >
          Offers %
        </Link>
        <Link
          to="/#shop-by-price"
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#E4E7ED] text-[#192A46] hover:border-[#155EEF] transition-colors"
        >
          Under ₹299
        </Link>
        <Link
          to="/collections"
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#E4E7ED] text-[#155EEF] hover:border-[#155EEF] transition-colors"
        >
          All Catalog →
        </Link>
      </div>

      {/* ── Category Quick Navigation Bar (Desktop) ── */}
      <nav
        aria-label="Category navigation"
        className="hidden md:block border-t border-[#E4E7ED] bg-[#F8F7F3]"
      >
        <div className="max-w-page px-margin mx-auto flex items-center gap-6 overflow-x-auto py-2 text-xs font-semibold text-[#192A46] scrollbar-none">
          <Link to="/" className="text-[#155EEF] hover:text-[#1044b2] whitespace-nowrap transition-colors">
            All Categories
          </Link>
          <Link to="/#top-categories" className="hover:text-[#155EEF] whitespace-nowrap transition-colors">
            Top Categories
          </Link>
          <Link to="/#trending" className="hover:text-[#155EEF] whitespace-nowrap transition-colors">
            Trending Now
          </Link>
          <Link to="/#home-kitchen" className="hover:text-[#155EEF] whitespace-nowrap transition-colors">
            Home &amp; Kitchen
          </Link>
          <Link to="/#special-offers" className="hover:text-[#155EEF] whitespace-nowrap transition-colors">
            Special Offers
          </Link>
          <Link to="/#smart-upgrades" className="hover:text-[#155EEF] whitespace-nowrap transition-colors">
            Smart Little Upgrades
          </Link>
          <Link to="/#health-care" className="hover:text-[#155EEF] whitespace-nowrap transition-colors">
            Health &amp; Care
          </Link>
          <Link to="/#shop-by-price" className="text-[#155EEF] hover:text-[#1044b2] whitespace-nowrap transition-colors">
            Under ₹299
          </Link>
          <Link to="/#shopping-guide" className="hover:text-[#155EEF] whitespace-nowrap transition-colors ms-auto">
            Shopping Guide &amp; FAQ
          </Link>
        </div>
      </nav>

      <MobileNav collections={allCollections} />
    </header>
  );
}
