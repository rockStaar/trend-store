import { useState, useEffect, useRef, useMemo } from "react";
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

  const filteredCollections = useMemo(
    () =>
      collections.filter((col: HeaderCollection) => {
        const lower = col.title?.toLowerCase().trim() || "";
        const handleLower = col.handle?.toLowerCase().trim() || "";
        return (
          lower !== "home page" &&
          lower !== "homepage" &&
          handleLower !== "frontpage" &&
          handleLower !== "home-page" &&
          handleLower !== "home"
        );
      }),
    [collections],
  );

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="shop-by-category-menu"
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-[#EAF0FC] hover:bg-[#dbe6fa] text-[#2457D6] text-xs font-bold transition-all shadow-2xs border border-[#d2def5] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2457D6]/40"
      >
        <svg className="size-4 text-[#2457D6] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <span className="whitespace-nowrap">Shop by Category</span>
        <svg
          className={`size-3.5 text-[#2457D6] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
              <span className="size-2 rounded-full bg-[#2457D6]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#282720]">
                Shop All Categories
              </h3>
            </div>
            <Link
              to="/collections"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#2457D6] hover:underline flex items-center gap-1"
            >
              <span>View All Collections</span>
              <span>→</span>
            </Link>
          </div>

          {/* Collections List: 2-column on desktop, 1-column on mobile */}
          <div className="p-3 sm:p-4 max-h-[65vh] overflow-y-auto scrollbar-thin">
            {filteredCollections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredCollections.map((col: HeaderCollection) => (
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
                      <p className="font-bold text-xs sm:text-sm text-[#282720] group-hover:text-[#2457D6] truncate transition-colors">
                        {col.title}
                      </p>
                      <span className="text-[10px] text-[#64748B] group-hover:text-[#2457D6]/80 flex items-center gap-0.5">
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
                  className="inline-block text-xs font-bold text-[#2457D6] hover:underline"
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
              className="font-bold text-[#2457D6] hover:underline"
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
      <div className="max-w-page px-3 sm:px-margin mx-auto">
        {/* ── Mobile Layout (under md): Hamburger Left, Center BIG Highlighted Logo, Wishlist + Cart Right ── */}
        <div className="flex md:hidden w-full items-center justify-between h-15 sm:h-16 relative">
          <div className="shrink-0 -ms-1" data-hamburger-wrapper>
            <MobileNavTrigger />
          </div>

          {/* Centered Big Highlighted Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <Link
              to="/"
              aria-label={shopInfo.name || "HypeeeCart"}
              title={shopInfo.name || "HypeeeCart"}
              className="group relative inline-flex items-center justify-center p-1 transition-all"
            >
              <img
                src="/logo.png"
                alt={shopInfo.name || "HypeeeCart"}
                className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-[0_2px_10px_rgba(36,87,214,0.22)]"
              />
            </Link>
          </div>

          {/* Right Action Icons (Wishlist & Cart) */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Wishlist Link / Trigger */}
            <Link
              to="/#trending"
              className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#2457D6] hover:bg-[#F8F7F3] transition-colors"
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
              <span className="bg-[#192A46] text-white absolute end-0 top-0.5 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
                {displayCount(wishlistCount)}
              </span>
            </Link>

            {/* Cart Trigger */}
            <Link
              to="/cart"
              className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#2457D6] hover:bg-[#F8F7F3] transition-colors"
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
              <span className="bg-[#2457D6] text-white absolute end-0 top-0.5 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
                {displayCount(totalQuantity)}
              </span>
            </Link>
          </div>
        </div>

        {/* ── Desktop Layout (md and up): Left Nav/Category, Center BIG Highlighted Logo, Right Search/Actions ── */}
        <div className="hidden md:flex w-full items-center justify-between gap-4 h-20">
          {/* Left: Category Dropdown & Nav Links */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0 min-w-0">
            <CategoryDropdown collections={allCollections} />
            <nav
              aria-label="Main navigation"
              className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs font-bold uppercase tracking-wider text-[#192A46]"
            >
              <Link to="/" className="text-[#2457D6] hover:text-[#2457D6] transition-colors">
                HOME
              </Link>
              <Link to="/#trending" className="hover:text-[#2457D6] transition-colors">
                BESTSELLERS
              </Link>
              <Link to="/#trending" className="hover:text-[#2457D6] transition-colors">
                NEW ARRIVALS
              </Link>
              <Link to="/collections" className="hover:text-[#2457D6] transition-colors">
                COLLECTIONS
              </Link>
            </nav>
          </div>

          {/* Center: BIG HIGHLIGHTED LOGO */}
          <div className="flex shrink-0 items-center justify-center">
            <Link
              to="/"
              aria-label={shopInfo.name || "HypeeeCart"}
              title={shopInfo.name || "HypeeeCart"}
              className="group relative inline-flex items-center justify-center px-3 py-1.5 rounded-2xl transition-all"
            >
              <img
                src="/logo.png"
                alt={shopInfo.name || "HypeeeCart"}
                className="h-12 lg:h-14 w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-[0_3px_12px_rgba(36,87,214,0.25)]"
              />
            </Link>
          </div>

          {/* Right: Search + Account + Wishlist + Cart */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-40 lg:w-52 xl:w-64"
              role="search"
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-full py-1.5 ps-3.5 pe-8 text-xs text-[#192A46] placeholder:text-[#64748B] focus:outline-none focus:border-[#2457D6] focus:bg-white transition-all shadow-inner/5"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#2457D6] transition-colors cursor-pointer"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </form>

            <Link
              to="/account"
              className="inline-flex h-9 w-9 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#2457D6] hover:bg-[#F8F7F3] transition-colors"
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

            <Link
              to="/#trending"
              className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#2457D6] hover:bg-[#F8F7F3] transition-colors"
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
              <span className="bg-[#192A46] text-white absolute end-0 top-0.5 sm:top-1 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
                {displayCount(wishlistCount)}
              </span>
            </Link>

            <Link
              to="/cart"
              className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-full text-[#192A46] hover:text-[#2457D6] hover:bg-[#F8F7F3] transition-colors"
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
              <span className="bg-[#2457D6] text-white absolute end-0 top-0.5 sm:top-1 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs">
                {displayCount(totalQuantity)}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile Instant Search Bar ── */}
      <div className="md:hidden px-3 pb-2.5 pt-0.5 border-b border-[#E4E7ED]/70 bg-white">
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
            className="w-full bg-[#F8F7F3] border border-[#E4E7ED] rounded-xl py-2 ps-9 pe-4 text-xs text-[#192A46] placeholder:text-[#64748B] focus:outline-none focus:border-[#2457D6] focus:bg-white transition-all shadow-inner/5"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#2457D6] transition-colors cursor-pointer"
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

      <MobileNav collections={allCollections} />
    </header>
  );
}
