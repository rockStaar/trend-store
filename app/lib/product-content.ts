/**
 * HypeeeCart — Product Content Sanitizer & Structured Editorial Story Parser
 *
 * Transforms raw, dropship-polluted, or unstructured Shopify product descriptions
 * into a clean, premium, structured content model matching the reference landing page:
 *  - 4 Trust Badges banner (Secure Ordering, Money Back, 100% Satisfaction, Easy Returns)
 *  - Rich Story Sections (Headline, Subhead, Paragraph, Clean '✓' Bullets, Supporting Images)
 *  - Short intro teaser for right-column product info
 *  - Clean specifications & FAQ integration
 */

import { filterSupplierNames } from "~/routes/product";

export type ProductImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type KeyFeature = {
  title: string;
  desc: string;
  bullets?: string[];
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type StorySection = {
  headline: string;
  subhead?: string;
  paragraph?: string;
  bullets: string[];
  image?: ProductImage;
};

export type StructuredProductContent = {
  shortIntro: string;
  storySections: StorySection[];
  keyFeatures: KeyFeature[];
  specifications: ProductSpec[];
  howToUse: string[];
  packageIncludes?: string[];
  sellerInfo?: { soldBy?: string; marketedBy?: string };
};

/**
 * Removes spammy dropshipper lines, repeated SEO keywords, and metadata dumps.
 */
export function sanitizeRawDescription(rawText: string | null | undefined): string {
  if (!rawText) return "";

  // 1. Remove dropshipper platform names (Meesho, Dropdash, etc.)
  let text = filterSupplierNames(rawText);

  // 2. Strip HTML tags safely if present
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");

  // 3. Normalize decode entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // 4. Filter line by line
  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];
  const seenLines = new Set<string>();
  let prevEmpty = false;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (!prevEmpty && cleanLines.length > 0) {
        cleanLines.push("");
        prevEmpty = true;
      }
      continue;
    }
    prevEmpty = false;

    const lower = line.toLowerCase();

    // Skip supplier/dropship metadata
    if (
      lower.startsWith("supplier name") ||
      lower.startsWith("supplier id") ||
      lower.startsWith("vendor id") ||
      lower.startsWith("seller code") ||
      lower.startsWith("dropship") ||
      lower.startsWith("meesho") ||
      lower.startsWith("name :") ||
      lower.startsWith("sku :") ||
      lower.startsWith("keywords:") ||
      lower.startsWith("keywords :") ||
      lower.startsWith("tags:") ||
      lower.startsWith("search terms:")
    ) {
      continue;
    }

    // Skip repeated lines (dropship descriptions often repeat the exact same line 5x)
    const normalized = lower.replace(/[^a-z0-9]/g, "");
    if (normalized.length > 20) {
      if (seenLines.has(normalized)) continue;
      seenLines.add(normalized);
    }

    // Collapse excessive duplicate emojis
    const cleanLine = line.replace(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*(\1\s*)+/gu, "$1 ");

    cleanLines.push(cleanLine);
  }

  return cleanLines.join("\n");
}

/**
 * Checks whether text contains structured e-commerce sections (Key Features, Package Includes, Numbered lists).
 */
export function isStructuredEcommerceDescription(text: string | null | undefined): boolean {
  if (!text) return false;
  return /key features|package includes|package contains|in the box|what['’]s included|why choose|\b\d+[\.\)]\s+[A-Za-z]/i.test(
    text,
  );
}

/**
 * Normalizes unformatted, run-on, or raw HTML product descriptions into clean line-separated text.
 * Ensures headers (Key Features, Package Includes, Numbered lists, Bullets) get isolated line breaks.
 */
export function normalizeEcommerceText(raw: string): string {
  let text = raw;

  // 1. Decode HTML & common entities
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // 2. Insert line breaks before major section markers (even if inline or stuck to previous words)
  text = text.replace(/\s*(Key Features|Features|Product Highlights)\s*[:\-]/gi, "\n\nKey Features:\n");
  text = text.replace(/\s*(Package Includes?|Package Contents?|In The Box|What['’]s Included)\s*[:\-]/gi, "\n\nPackage Includes:\n");
  text = text.replace(/\s*(Why Choose (?:Our\s+)?[^?!\n]+\??)/gi, "\n\n$1\n");
  text = text.replace(/\s*(Transform Your [^!.\n]+!*)/gi, "\n\n$1\n");
  text = text.replace(/\s*(Sold By\s*:\s*[^\n]+)/gi, "\n\n$1\n");
  text = text.replace(/\s*(Marketed By\s*:\s*[^\n]+)/gi, "\n$1\n");

  // 3. Insert line breaks before numbered items: "1. Compact...", "2. Safe...", etc.
  text = text.replace(/\s*(\b\d+[\.\)]\s+[A-Za-z][^:\n•✓✔]{2,50}:?)/g, "\n\n$1\n");

  // 4. Insert line breaks before bullet points: "• Lightweight...", "✓ Energy...", etc.
  // Note: Only match '-' if followed by whitespace so hyphenated words like 'energy-consuming' are kept intact!
  text = text.replace(/\s*([•✓✔*]|-(?=\s))\s*/g, "\n• ");

  return text;
}

/**
 * Parses structured e-commerce descriptions (common in dropshipping and modern retail listings)
 * into rich, discrete sections, numbered feature cards, package inclusions, and technical specifications.
 */
export function parseStructuredEcommerceContent(
  rawText: string,
  title: string,
  images: ProductImage[] = [],
): StructuredProductContent {
  const isHeater = (title + " " + rawText).toLowerCase().includes("heater");
  const heaterHeroImage: ProductImage = {
    url: "/uploads/products/handy-heater-demo.jpg",
    altText: "Say NO to Cold - Wall Outlet Handy Heater Demo",
  };

  const normalized = normalizeEcommerceText(rawText);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let state: "INTRO" | "KEY_FEATURES" | "PACKAGE_INCLUDES" | "WHY_CHOOSE" | "CTA" | "SELLER" = "INTRO";
  const introLines: string[] = [];
  let currentFeature: KeyFeature | null = null;
  const keyFeatures: KeyFeature[] = [];
  const packageIncludes: string[] = [];
  let whyChooseHeadline = "";
  const whyChooseBullets: string[] = [];
  let ctaHeadline = "";
  const ctaLines: string[] = [];
  const sellerInfo: { soldBy?: string; marketedBy?: string } = {};
  const specifications: ProductSpec[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^(key features|features|product highlights)\s*:?$/i.test(line)) {
      if (currentFeature) {
        keyFeatures.push(currentFeature);
        currentFeature = null;
      }
      state = "KEY_FEATURES";
      continue;
    }

    if (/^(package includes?|package contents?|in the box|what['’]s included)\s*:?$/i.test(line)) {
      if (currentFeature) {
        keyFeatures.push(currentFeature);
        currentFeature = null;
      }
      state = "PACKAGE_INCLUDES";
      continue;
    }

    if (/^why choose (our\s+)?/i.test(line)) {
      if (currentFeature) {
        keyFeatures.push(currentFeature);
        currentFeature = null;
      }
      state = "WHY_CHOOSE";
      whyChooseHeadline = line.replace(/\?*$/, "?");
      continue;
    }

    if (/^transform your [^!.]+!*$/i.test(line)) {
      if (currentFeature) {
        keyFeatures.push(currentFeature);
        currentFeature = null;
      }
      state = "CTA";
      ctaHeadline = line;
      continue;
    }

    if (/^sold by\s*:/i.test(line)) {
      if (currentFeature) {
        keyFeatures.push(currentFeature);
        currentFeature = null;
      }
      state = "SELLER";
      sellerInfo.soldBy = line.replace(/^sold by\s*:\s*/i, "").trim();
      continue;
    }

    if (/^marketed by\s*:/i.test(line)) {
      state = "SELLER";
      sellerInfo.marketedBy = line.replace(/^marketed by\s*:\s*/i, "").trim();
      continue;
    }

    const numMatch = line.match(/^(\d+[\.\)]\s+[^:]+):?$/);
    if (numMatch && (state === "KEY_FEATURES" || state === "INTRO")) {
      if (currentFeature) {
        keyFeatures.push(currentFeature);
      }
      state = "KEY_FEATURES";
      currentFeature = {
        title: numMatch[1].trim(),
        desc: "",
        bullets: [],
      };
      continue;
    }

    if (state === "KEY_FEATURES") {
      if (currentFeature) {
        const cleanBullet = line.replace(/^[•✓✔\-\*]\s*/, "").trim();
        if (cleanBullet) {
          currentFeature.bullets = currentFeature.bullets || [];
          currentFeature.bullets.push(cleanBullet);
          currentFeature.desc = currentFeature.bullets.join(" ");
        }
      }
      continue;
    }

    if (state === "PACKAGE_INCLUDES") {
      const cleanItem = line.replace(/^[•✓✔\-\*]\s*/, "").trim();
      if (cleanItem) packageIncludes.push(cleanItem);
      continue;
    }

    if (state === "WHY_CHOOSE") {
      const cleanBullet = line.replace(/^[•✓✔\-\*]\s*/, "").trim();
      if (cleanBullet) whyChooseBullets.push(cleanBullet);
      continue;
    }

    if (state === "CTA") {
      ctaLines.push(line);
      continue;
    }

    if (state === "INTRO") {
      introLines.push(line);
      continue;
    }
  }

  if (currentFeature) {
    keyFeatures.push(currentFeature);
  }

  // Extract specs from feature bullets
  for (const feat of keyFeatures) {
    if (feat.bullets) {
      for (const b of feat.bullets) {
        if (/heats up to (\d+\s*(?:square feet|sq\.?\s*ft\.?))/i.test(b)) {
          const m = b.match(/heats up to (\d+\s*(?:square feet|sq\.?\s*ft\.?))/i);
          if (m) specifications.push({ label: "Coverage Area", value: `Up to ${m[1]}` });
        }
        if (/consumes only (\d+[-–]\d+\s*watts?)/i.test(b)) {
          const m = b.match(/consumes only (\d+[-–]\d+\s*watts?)/i);
          if (m) specifications.push({ label: "Power Consumption", value: m[1] });
        }
        if (/(\d+[-–]hour timer)/i.test(b)) {
          const m = b.match(/(\d+[-–]hour timer)/i);
          if (m) specifications.push({ label: "Timer", value: `${m[1]} with Auto Shut-Off` });
        }
        if (/adjustable from (\d+°F to \d+°F)/i.test(b)) {
          const m = b.match(/adjustable from (\d+°F to \d+°F)/i);
          if (m) specifications.push({ label: "Digital Thermostat", value: m[1] });
        }
      }
    }
  }

  if (packageIncludes.length > 0) {
    specifications.push({
      label: "Package Contents",
      value: packageIncludes.join(", "),
    });
  }

  if (sellerInfo.soldBy) {
    specifications.push({ label: "Sold By", value: sellerInfo.soldBy });
  }
  if (sellerInfo.marketedBy) {
    specifications.push({ label: "Marketed By", value: sellerInfo.marketedBy });
  }

  // Fallback specs
  specifications.push(
    { label: "Product", value: title },
    { label: "Quality Grade", value: "Premium Certified Build" },
    { label: "Replacement", value: "5 Days Free Doorstep Replacement" },
    { label: "Delivery", value: "100% Free Express Shipping" },
  );

  // Construct story sections with intelligent headline/subhead extraction
  const fullIntroText = introLines.join(" ");
  const sentences = fullIntroText.split(/(?<=[.!?])\s+/);

  let introHeadline = `Stay Warm and Cozy with ${title}!`;
  let introSubhead = "";
  let introParagraph = "";

  if (sentences.length > 0 && sentences[0].length < 90) {
    introHeadline = sentences[0];
    if (sentences.length > 1 && sentences[1].endsWith("?") && sentences[1].length < 120) {
      introSubhead = sentences[1];
      introParagraph = sentences.slice(2).join(" ");
    } else {
      introParagraph = sentences.slice(1).join(" ");
    }
  } else {
    introParagraph = fullIntroText;
  }

  const storySections: StorySection[] = [];

  // 1. Intro section: gets the user's requested demo image!
  storySections.push({
    headline: introHeadline,
    subhead: introSubhead || undefined,
    paragraph: introParagraph || undefined,
    bullets: [],
    image: isHeater ? heaterHeroImage : (images.length > 1 ? images[1] : undefined),
  });

  // 2. Why Choose section
  if (whyChooseHeadline || whyChooseBullets.length > 0) {
    storySections.push({
      headline: whyChooseHeadline || `Why Choose Our ${title}?`,
      subhead: "Engineered for maximum comfort, instant warmth, and reliable safety",
      paragraph: "",
      bullets: whyChooseBullets,
      image: isHeater && images.length > 1 ? images[1] : (images.length > 2 ? images[2] : undefined),
    });
  }

  // 3. CTA section
  if (ctaHeadline || ctaLines.length > 0) {
    storySections.push({
      headline: ctaHeadline || "Transform Your Daily Routine Today!",
      subhead: undefined,
      paragraph: ctaLines.join(" "),
      bullets: [],
    });
  }

  const shortIntro =
    introParagraph ||
    `Experience premium convenience and reliable performance with the ${title}. Thoughtfully designed for modern Indian homes.`;

  return {
    shortIntro,
    storySections,
    keyFeatures,
    specifications,
    howToUse: [],
    packageIncludes,
    sellerInfo,
  };
}

/**
 * Parses continuous or structured description text into rich story sections matching Image 2.
 */
export function parseEditorialStorySections(
  cleanText: string,
  images: ProductImage[] = [],
  isMantraDevice: boolean = false,
): StorySection[] {
  if (!cleanText || cleanText.length < 20) return [];

  // Normalize checkmarks and bullets
  let str = cleanText.replace(/✓\s*/g, "\n✓ ");
  str = str.replace(/✔\s*/g, "\n✓ ");

  // Known section starters in Indian spiritual / home products
  const sectionStarters = [
    "🔱 Bring the Power",
    "🙏 Calm Your Mind",
    "🕉 32 Mantras",
    "🕉️ 32 Mantras",
    "✨ Make OM Part",
    "✨ One Sound",
    "🕉 Remove Negative",
    "🕉️ Remove Negative",
  ];

  for (const starter of sectionStarters) {
    str = str.replace(new RegExp(starter, "g"), "\n\n" + starter);
  }

  // Put newlines before generic emoji headers if they have title-like words
  str = str.replace(
    /([.!?]|✓\s*[^\n]+?)\s+([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🔱🕉️🧘✨🙏🌺🌿]\s*[A-Z0-9][^.!?\n]{3,60}\.)/gu,
    "$1\n\n$2",
  );

  const rawBlocks = str.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const sections: StorySection[] = [];

  // Local fallback images for mantra device if catalog has few images
  const mantraFallbackImages: ProductImage[] = [
    { url: "/uploads/products/mantra-device-hanuman.jpg", altText: "32 in 1 Mantra Device glowing with Hanuman Chalisa" },
    { url: "/uploads/products/mantra-device-back.jpg", altText: "Mantra device 2-pin plug and rotary volume dial" },
    { url: "/uploads/products/mantra-device-shiva.jpg", altText: "Mantra device ambient light with Lord Shiva" },
  ];

  // Start assigning from secondary images (images[1], images[2], ...)
  let imageIdx = 1;
  let fallbackIdx = 0;

  for (const block of rawBlocks) {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const bullets: string[] = [];
    const textLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("✓") || line.startsWith("✔") || line.startsWith("•") || line.startsWith("- ")) {
        const cleanBullet = line.replace(/^[✓✔•\-]\s*/, "").trim();
        if (cleanBullet.length > 2) bullets.push(cleanBullet);
      } else {
        textLines.push(line);
      }
    }

    let remaining = textLines.join(" ");

    // Check for inline emoji list at the end of a section
    // e.g. "🔱 OM Mantra Sound 🧘 Meditation 🧘 Prayer & Pooja ✨ Positive Ambience 🌿 Relaxation"
    const inlineEmojiListRegex =
      /((?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🔱🕉️🧘✨🙏🌺🌿]\s*[^.!?\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🔱🕉️🧘✨🙏🌺🌿]{3,35}\s*){2,})$/u;
    const inlineMatch = remaining.match(inlineEmojiListRegex);
    if (inlineMatch) {
      const listStr = inlineMatch[1];
      remaining = remaining.slice(0, remaining.length - listStr.length).trim();
      const items = listStr.match(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🔱🕉️🧘✨🙏🌺🌿]\s*[^.!?\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🔱🕉️🧘✨🙏🌺🌿]{3,35}/gu,
      );
      if (items) {
        bullets.push(
          ...items.map((it) =>
            it.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🔱🕉️🧘✨🙏🌺🌿]\s*/u, "").trim(),
          ),
        );
      }
    }

    const sentences = remaining.split(/(?<=[.!?])\s+/);
    if (sentences.length === 0 || !sentences[0]) continue;

    const headline = sentences[0].trim();
    let subhead = "";
    let paragraph = "";

    if (sentences.length === 2) {
      paragraph = sentences[1].trim();
    } else if (sentences.length > 2) {
      if (sentences[1].length < 75) {
        subhead = sentences[1].trim();
        paragraph = sentences.slice(2).join(" ").trim();
      } else {
        paragraph = sentences.slice(1).join(" ").trim();
      }
    }

    // Assign a distinct secondary product image to this section if available
    let assignedImage: ProductImage | undefined =
      images && images.length > imageIdx ? images[imageIdx] : undefined;

    if (assignedImage) {
      imageIdx++;
    } else if (isMantraDevice && fallbackIdx < mantraFallbackImages.length) {
      assignedImage = mantraFallbackImages[fallbackIdx++];
    }

    sections.push({
      headline,
      subhead: subhead || undefined,
      paragraph: paragraph || undefined,
      bullets,
      image: assignedImage,
    });
  }

  return sections;
}

/**
 * Intelligent category fallback features when a product has NO description at all.
 */
function getCategoryFallbackFeatures(cleanTitle: string): KeyFeature[] {
  const combined = cleanTitle.toLowerCase();

  // 1. Mantra / Bell / Audio / Religious Device
  if (
    combined.includes("mantra") ||
    combined.includes("chanting") ||
    combined.includes("bell") ||
    combined.includes("audio") ||
    combined.includes("speaker") ||
    combined.includes("sound") ||
    combined.includes("puja") ||
    combined.includes("om ") ||
    combined.includes("chalisa") ||
    combined.includes("bhajan")
  ) {
    return [
      {
        title: "Crystal Clear Audio",
        desc: "Equipped with high-fidelity acoustic drivers delivering clear, soothing sound with zero distortion or background hiss.",
      },
      {
        title: "Easy Volume & Track Control",
        desc: "Smooth dedicated rotary dial allows seamless volume tuning from gentle ambient background chanting to room-filling audio.",
      },
      {
        title: "Continuous Chanting Loop",
        desc: "Engineered for 24/7 continuous uninterrupted playback during meditation, daily puja rituals, or peaceful home ambience.",
      },
      {
        title: "Direct Plug & Play",
        desc: "Plugs straight into any standard 2-pin household electrical socket with zero battery worries or complicated wiring.",
      },
      {
        title: "Energy Efficient Build",
        desc: "Ultra-low power consumption circuit allows continuous round-the-clock spiritual ambience at negligible electricity cost.",
      },
    ];
  }

  // 2. Cleaning / Duster / Car Care
  if (
    combined.includes("duster") ||
    combined.includes("clean") ||
    combined.includes("car care") ||
    combined.includes("microfiber brush")
  ) {
    return [
      {
        title: "Extendable Telescopic Handle",
        desc: "Smoothly extends to easily reach tall vehicle roofs, high ceilings, ceiling fans, and windshields without straining.",
      },
      {
        title: "Electrostatic Microfiber Fibers",
        desc: "Dense, ultra-soft microfiber strands attract and lock in dust like a magnet without scratching surfaces or shedding lint.",
      },
      {
        title: "Compact & Space Saving",
        desc: "Detachable and collapsible design stores neatly in your car trunk, glove box, or utility closet.",
      },
      {
        title: "Multi-Surface Versatility",
        desc: "Ideal for cars, SUVs, bikes, home furniture, glass windows, air conditioner vents, and office workstations.",
      },
      {
        title: "Washable & Reusable",
        desc: "Easily shakes clean after light use and rinses in lukewarm water for hundreds of reusable cleaning cycles.",
      },
    ];
  }

  // 3. Bathroom Shelf / Storage Rack (STRICT CHECK: must be an actual shelf, never spiritual devices)
  if (
    (combined.includes("shelf") || combined.includes("rack") || combined.includes("caddy")) &&
    (combined.includes("bathroom") || combined.includes("shower") || combined.includes("storage"))
  ) {
    return [
      {
        title: "Drill-Free Seamless Mounting",
        desc: "High-strength waterproof adhesive strips provide solid wall mounting without drilling holes or damaging tile surfaces.",
      },
      {
        title: "Rustproof & Moisture Resistant",
        desc: "Durable multi-layer protective coating prevents rust, corrosion, and discoloration in humid bathroom environments.",
      },
      {
        title: "Quick-Drain Hollow Base",
        desc: "Slotted drainage design prevents water pooling, keeping bathroom bottles, soaps, and accessories dry and hygienic.",
      },
      {
        title: "Heavy Load Capacity",
        desc: "Reinforced load-bearing frame effortlessly supports multiple large shampoo, conditioner, and body wash bottles.",
      },
      {
        title: "Space-Optimizing Corner Fit",
        desc: "Transforms unused 90-degree corner space into practical, clutter-free vertical storage.",
      },
    ];
  }

  // 4. Bottle / Flask / Drinkware
  if (
    combined.includes("bottle") ||
    combined.includes("flask") ||
    combined.includes("mug") ||
    combined.includes("tumbler")
  ) {
    return [
      {
        title: "Double-Wall Vacuum Insulation",
        desc: "Maintains optimal temperatures, keeping beverages piping hot for up to 12 hours or refreshingly ice-cold for 24 hours.",
      },
      {
        title: "Food-Grade Stainless Steel",
        desc: "Interior crafted from premium 304 food-grade stainless steel that is 100% BPA-free and leaves zero metallic taste.",
      },
      {
        title: "Guaranteed Leakproof Seal",
        desc: "Precision threaded cap with food-safe silicone gasket prevents accidental leaks inside backpacks, handbags, and cars.",
      },
      {
        title: "Condensation-Free Exterior",
        desc: "Powder-coated textured finish prevents exterior condensation sweat and provides a confident, non-slip grip.",
      },
      {
        title: "Everyday Portability",
        desc: "Thoughtfully sized to fit standard automobile cup holders, gym bag pockets, and backpack side pouches.",
      },
    ];
  }

  // 5. Universal Domestic Quality Assured
  return [
    {
      title: "Premium Engineering",
      desc: "Carefully constructed using high-grade, durable materials built to withstand active everyday domestic use.",
    },
    {
      title: "Ergonomic & Practical Design",
      desc: "Designed for effortless, comfortable handling with intuitive everyday functionality for all household members.",
    },
    {
      title: "Zero Transit Damage Guarantee",
      desc: "Packed with multi-layer protective packaging to ensure safe, flawless doorstep arrival across India.",
    },
    {
      title: "Easy to Clean & Maintain",
      desc: "Features wipe-clean, stain-resistant surfaces that maintain their fresh, polished appearance with minimal care.",
    },
    {
      title: "Verified Batch Quality",
      desc: "Each production batch is individually inspected to meet strict household reliability and safety standards.",
    },
  ];
}

/**
 * Parses structured product details from Shopify product data.
 */
export function parseProductContent({
  title,
  description,
  images = [],
}: {
  title: string;
  description: string | null | undefined;
  images?: ProductImage[];
}): StructuredProductContent {
  const cleanTitle = filterSupplierNames(title);
  const cleanText = sanitizeRawDescription(description);

  // If this product description contains structured e-commerce sections
  // (Key features, package inclusions, numbered lists, why choose us),
  // parse it into dedicated high-conversion sections and feature cards!
  if (isStructuredEcommerceDescription(cleanText)) {
    return parseStructuredEcommerceContent(cleanText, cleanTitle, images);
  }

  const isMantra =
    cleanTitle.toLowerCase().includes("mantra") ||
    cleanTitle.toLowerCase().includes("chanting") ||
    cleanTitle.toLowerCase().includes("om ") ||
    cleanTitle.toLowerCase().includes("chalisa") ||
    cleanTitle.toLowerCase().includes("bhajan") ||
    cleanText.toLowerCase().includes("mantra");

  // Parse rich story sections matching the reference screenshot in Image 2
  const storySections = parseEditorialStorySections(cleanText, images, isMantra);

  const keyFeatures: KeyFeature[] = [];
  const specifications: ProductSpec[] = [];
  const howToUse: string[] = [];

  // Parse key-value specifications from text if present
  const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const specMatch = line.match(
      /^(material|color|dimensions?|size|weight|voltage|power|type|package contents?|in the box|capacity|net quantity|country of origin)\s*[:\-]\s*(.+)$/i,
    );
    if (specMatch) {
      const label = specMatch[1].trim();
      const value = specMatch[2].trim();
      if (value.length > 0 && !value.toLowerCase().includes("supplier")) {
        specifications.push({
          label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
          value: filterSupplierNames(value),
        });
      }
    }
  }

  // If story sections exist, convert their first section bullets into keyFeatures
  if (storySections.length > 0) {
    for (const sec of storySections) {
      for (const bullet of sec.bullets) {
        if (keyFeatures.length < 6) {
          keyFeatures.push({
            title: bullet,
            desc: sec.paragraph || `Enjoy genuine ${bullet.toLowerCase()} crafted for daily convenience.`,
          });
        }
      }
    }
  }

  // If still no key features, use title-based category fallback (never matching "corner" generically)
  const finalFeatures: KeyFeature[] =
    keyFeatures.length >= 3 ? keyFeatures.slice(0, 6) : getCategoryFallbackFeatures(cleanTitle);

  // Short intro teaser for right-column product info
  let shortIntro = "";
  if (storySections.length > 0 && storySections[0].paragraph) {
    shortIntro = storySections[0].paragraph;
  } else if (cleanText.length > 20) {
    const firstSentence = cleanText.split(/(?<=[.!?])\s+/)[0];
    if (firstSentence && firstSentence.length <= 220) {
      shortIntro = firstSentence;
    }
  }

  if (!shortIntro) {
    shortIntro = `Experience premium convenience and reliable performance with the ${cleanTitle}. Thoughtfully designed for modern Indian homes, practical everyday use, and lasting satisfaction.`;
  }

  // Default specifications if none were explicitly parsed
  if (specifications.length === 0) {
    specifications.push(
      { label: "Product", value: cleanTitle },
      { label: "Quality Grade", value: "Premium Tested Quality" },
      { label: "Packaging", value: "Secure Multi-Layer Box" },
      { label: "Replacement", value: "5 Days Free Doorstep Replacement" },
      { label: "Delivery", value: "100% Free Express Shipping" },
    );
  }

  return {
    shortIntro,
    storySections,
    keyFeatures: finalFeatures,
    specifications,
    howToUse,
  };
}
