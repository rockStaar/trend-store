import { Link } from "react-router";
import type { ProductCardData } from "~/components/ProductCard";

type HomeHeroProps = {
  products?: readonly ProductCardData[];
};

interface OrbitProduct {
  name: string;
  category: string;
  image: string;
  link: string;
  tag?: string;
  positionClass: string;
}

export function HomeHero({ products = [] }: HomeHeroProps) {
  // Curated showcase of the 12 iconic e-commerce categories matching the reference screenshot
  const orbitItems: OrbitProduct[] = [
    {
      name: "Sneakers & Footwear",
      category: "Fashion",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=shoes",
      positionClass: "top-4 left-6 sm:left-12 lg:left-16",
    },
    {
      name: "Wireless Headphones",
      category: "Audio",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=headphones",
      positionClass: "top-2 left-[28%] lg:left-[27%]",
    },
    {
      name: "Smart Watch",
      category: "Wearables",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=watch",
      positionClass: "top-1 left-1/2 -translate-x-1/2",
    },
    {
      name: "Luxury Handbag",
      category: "Bags",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=handbag",
      positionClass: "top-2 right-[28%] lg:right-[27%]",
    },
    {
      name: "Smartphones",
      category: "Gadgets",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=mobile",
      positionClass: "top-4 right-6 sm:right-12 lg:right-16",
    },
    {
      name: "Mixer Grinder",
      category: "Kitchen",
      image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=400&q=80",
      link: "/#home-kitchen",
      positionClass: "top-[36%] left-2 sm:left-6 lg:left-8",
    },
    {
      name: "Polo T-Shirts",
      category: "Apparel",
      image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=shirt",
      positionClass: "top-[42%] left-[16%] lg:left-[17%]",
    },
    {
      name: "Digital Air Fryer",
      category: "Appliances",
      image: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=400&q=80",
      link: "/#home-kitchen",
      positionClass: "top-[36%] right-2 sm:right-6 lg:right-8",
    },
    {
      name: "Slim Laptop",
      category: "Electronics",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=laptop",
      positionClass: "bottom-6 left-4 sm:left-12 lg:left-16",
    },
    {
      name: "Plush Toys & Gifts",
      category: "Toys",
      image: "https://images.unsplash.com/photo-1558877385-81a1c7e67d72?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=toys",
      positionClass: "bottom-4 left-[26%] lg:left-[27%]",
    },
    {
      name: "Perfume & Cosmetics",
      category: "Beauty",
      image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
      link: "/#health-care",
      positionClass: "bottom-4 right-[26%] lg:right-[27%]",
    },
    {
      name: "Home Towels & Linen",
      category: "Home Decor",
      image: "https://images.unsplash.com/photo-1616627547584-bf28cee262db?auto=format&fit=crop&w=400&q=80",
      link: "/search?q=decor",
      positionClass: "bottom-6 right-4 sm:right-12 lg:right-16",
    },
  ];

  return (
    <section
      className="relative w-full overflow-hidden bg-gradient-to-b from-[#EBF3FE] via-[#F4F8FD] to-white border-b border-[#DCE5F3] py-6 sm:py-16 lg:py-20"
      aria-label="Welcome Hero"
    >
      {/* ── Background Luminous Energy Orbit Rings ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* Outer glowing orbital ring */}
        <div className="absolute size-[550px] sm:size-[780px] lg:size-[980px] rounded-full border-2 border-amber-400/40 shadow-[0_0_80px_rgba(251,191,36,0.25)] animate-[spin_60s_linear_infinite]" />
        {/* Inner glowing orbital ring */}
        <div className="absolute size-[420px] sm:size-[600px] lg:size-[750px] rounded-full border border-[#2457D6]/30 shadow-[0_0_60px_rgba(36,87,214,0.15)] animate-[spin_45s_linear_infinite_reverse]" />
        {/* Radial Ambient Backlight */}
        <div className="absolute size-[350px] sm:size-[500px] rounded-full bg-radial from-[#2457D6]/20 via-[#2457D6]/5 to-transparent blur-3xl" />
      </div>

      <div className="max-w-page px-margin mx-auto relative z-10">
        {/* ── Desktop & Tablet: Full Orbit Composition ── */}
        <div className="relative min-h-0 sm:min-h-[580px] lg:min-h-[640px] flex items-center justify-center">
          {/* Floating Product Badges around the orbit (Desktop/Tablet) */}
          <div className="hidden sm:block absolute inset-0 pointer-events-auto">
            {orbitItems.map((item, index) => (
              <Link
                key={index}
                to={item.link}
                className={`absolute ${item.positionClass} group z-20 transition-transform duration-300 hover:scale-115 hover:z-30 block`}
                title={item.name}
              >
                <div className="relative size-20 sm:size-24 lg:size-28 rounded-2xl bg-white/95 backdrop-blur-xs p-1.5 border border-white/80 shadow-[0_8px_25px_rgba(36,87,214,0.12)] group-hover:shadow-[0_12px_32px_rgba(36,87,214,0.25)] group-hover:border-[#2457D6] transition-all">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-[#FAF6F0] flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      loading="eager"
                    />
                  </div>
                  {/* Subtle category tooltip badge on hover */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#2457D6] text-white text-[9px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xs pointer-events-none">
                    {item.name}
                  </div>
                </div>
              </Link>
            ))}

            {/* Floating Decorative Gift Boxes & Mini Carts */}
            <div className="absolute top-[20%] left-[8%] size-8 text-xl animate-bounce duration-1000 select-none">
              🎁
            </div>
            <div className="absolute top-[24%] right-[10%] size-8 text-xl animate-bounce delay-300 duration-1000 select-none">
              🎁
            </div>
            <div className="absolute bottom-[24%] left-[12%] size-7 text-lg select-none opacity-80 animate-pulse">
              🛒
            </div>
            <div className="absolute bottom-[22%] right-[12%] size-8 text-xl animate-bounce delay-500 duration-1000 select-none">
              🎁
            </div>
          </div>

          {/* ── Central Brand Lockup (KitKart style center) ── */}
          <div className="relative z-20 flex flex-col items-center text-center max-w-xl mx-auto px-4 py-5 sm:px-12 sm:py-10 bg-white/90 sm:bg-white/70 backdrop-blur-md rounded-2xl sm:rounded-full border border-white/90 shadow-[0_10px_40px_rgba(36,87,214,0.12)] w-full">
            {/* Shopping Cart Icon with Colorful Bags */}
            <div className="mb-2 sm:mb-3 relative inline-flex items-center justify-center">
              <div className="size-14 sm:size-20 rounded-2xl bg-[#2457D6] text-white flex items-center justify-center text-2xl sm:text-4xl shadow-[0_8px_20px_rgba(36,87,214,0.35)]">
                🛒
              </div>
            </div>

            {/* Brand Logo Title */}
            <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-none mb-1">
              <span className="text-[#2457D6]">Hypeee</span>
              <span className="text-[#E02424]">Cart</span>
              <span className="text-[#2457D6] text-2xl sm:text-4xl lg:text-5xl">.in</span>
            </h1>

            {/* Tagline */}
            <p className="font-serif italic font-bold text-sm sm:text-xl lg:text-2xl text-[#14284A] tracking-wide mt-1 mb-4 sm:mb-6">
              Shop Smart... Live Better...
            </p>

            {/* 4 Trust Badges Strip (matching KitKart screenshot) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 w-full mb-5 sm:mb-8 pt-2 border-t border-[#DCE5F3]/60">
              {/* Badge 1: Top Quality */}
              <div className="flex items-center sm:flex-col gap-2 sm:gap-1.5 text-left sm:text-center">
                <div className="size-7 sm:size-9 rounded-full bg-[#E02424] text-white flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-xs">
                  ✓
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-extrabold text-[#14284A] leading-tight">
                    Top Quality
                  </p>
                  <p className="text-[10px] text-[#5E5B52]">Products</p>
                </div>
              </div>

              {/* Badge 2: Fast Delivery */}
              <div className="flex items-center sm:flex-col gap-2 sm:gap-1.5 text-left sm:text-center">
                <div className="size-7 sm:size-9 rounded-full bg-[#E02424] text-white flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-xs">
                  🚚
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-extrabold text-[#14284A] leading-tight">
                    Fast
                  </p>
                  <p className="text-[10px] text-[#5E5B52]">Delivery</p>
                </div>
              </div>

              {/* Badge 3: Secure Payments */}
              <div className="flex items-center sm:flex-col gap-2 sm:gap-1.5 text-left sm:text-center">
                <div className="size-7 sm:size-9 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-xs">
                  🛡️
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-extrabold text-[#14284A] leading-tight">
                    Secure
                  </p>
                  <p className="text-[10px] text-[#5E5B52]">Payments</p>
                </div>
              </div>

              {/* Badge 4: 24/7 Support */}
              <div className="flex items-center sm:flex-col gap-2 sm:gap-1.5 text-left sm:text-center">
                <div className="size-7 sm:size-9 rounded-full bg-[#2457D6] text-white flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-xs">
                  🎧
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-extrabold text-[#14284A] leading-tight">
                    24/7
                  </p>
                  <p className="text-[10px] text-[#5E5B52]">Support</p>
                </div>
              </div>
            </div>

            {/* Glossy Red "Shop Now >" CTA Button (KitKart reference style) */}
            <Link
              to="/#trending"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-10 py-3 sm:py-4 rounded-full bg-gradient-to-r from-[#E02424] via-[#f03a3a] to-[#E02424] hover:from-[#c81e1e] hover:to-[#c81e1e] text-white font-extrabold text-sm sm:text-base tracking-wide shadow-[0_10px_25px_rgba(224,36,36,0.35)] hover:shadow-[0_15px_30px_rgba(224,36,36,0.45)] transform hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            >
              <span className="text-base sm:text-lg">🛒</span>
              <span>Shop Now</span>
              <span className="text-base sm:text-lg transition-transform group-hover:translate-x-1 font-bold">›</span>
            </Link>
          </div>
        </div>

        {/* ── Mobile Horizontal Product Highlight Showcase ── */}
        <div className="sm:hidden mt-5 pt-3 border-t border-[#DCE5F3]/80">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2457D6]">
              Featured Categories
            </span>
            <Link to="/collections" className="text-[10px] font-bold text-[#2457D6] hover:underline">
              View all ›
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none px-0.5">
            {orbitItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.link}
                className="shrink-0 flex flex-col items-center w-[72px] text-center"
              >
                <div className="size-15 rounded-xl bg-white border border-[#DCE5F3] p-1 shadow-2xs mb-1 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] font-bold text-[#14284A] leading-tight line-clamp-1">
                  {item.category}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
