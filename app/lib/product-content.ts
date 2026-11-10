/**
 * HypeeeCart — Product Content Sanitizer & Structured Feature Parser
 *
 * Transforms raw, dropship-polluted, or unstructured Shopify product descriptions
 * into a clean, premium, structured content model:
 *  - shortIntro: Concise, compelling introductory description for the right-column hero.
 *  - keyFeatures: Polished feature bullet items with strong titles & descriptions.
 *  - specifications: Clean key-value pairs (Material, Dimensions, Power, Package Contents).
 *  - howToUse: Optional step-by-step usage instructions.
 *  - visualSpotlights: Pairs genuine extra gallery images with feature highlights.
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
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type StructuredProductContent = {
  shortIntro: string;
  overviewParagraphs: string[];
  keyFeatures: KeyFeature[];
  specifications: ProductSpec[];
  howToUse: string[];
  visualSpotlights: Array<{
    image: ProductImage;
    feature: KeyFeature;
  }>;
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

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

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
    if (normalized.length > 15) {
      if (seenLines.has(normalized)) continue;
      seenLines.add(normalized);
    }

    // Collapse excessive emojis (more than 2 consecutive emojis)
    line = line.replace(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*(\1\s*)+/gu, "$1 ");

    cleanLines.push(line);
  }

  return cleanLines.join("\n");
}

/**
 * Intelligent category fallback features when source product lacks explicit bullet points.
 */
function getCategoryFallbackFeatures(cleanTitle: string, cleanText: string): KeyFeature[] {
  const combined = `${cleanTitle} ${cleanText}`.toLowerCase();

  // 1. Mantra / Bell / Audio / Religious Device
  if (
    combined.includes("mantra") ||
    combined.includes("chanting") ||
    combined.includes("bell") ||
    combined.includes("audio") ||
    combined.includes("speaker") ||
    combined.includes("sound") ||
    combined.includes("puja")
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
    combined.includes("car") ||
    combined.includes("microfiber") ||
    combined.includes("brush")
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

  // 3. Bathroom / Shelf / Rack / Adhesive / Organizer
  if (
    combined.includes("shelf") ||
    combined.includes("corner") ||
    combined.includes("rack") ||
    combined.includes("bathroom") ||
    combined.includes("adhesive") ||
    combined.includes("organizer")
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
    combined.includes("tumbler") ||
    combined.includes("cup")
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
      desc: `Carefully constructed using high-grade, durable materials built to withstand active everyday domestic use.`,
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

  const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

  const keyFeatures: KeyFeature[] = [];
  const specifications: ProductSpec[] = [];
  const howToUse: string[] = [];
  const overviewLines: string[] = [];

  let currentSection: "overview" | "features" | "specs" | "howToUse" = "overview";

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Section header detection
    if (
      lower.includes("key feature") ||
      lower.includes("features:") ||
      lower.startsWith("features") ||
      lower.includes("highlights")
    ) {
      currentSection = "features";
      continue;
    }
    if (
      lower.includes("specification") ||
      lower.includes("specs:") ||
      lower.startsWith("product details") ||
      lower.startsWith("specifications")
    ) {
      currentSection = "specs";
      continue;
    }
    if (
      lower.includes("how to use") ||
      lower.includes("instructions") ||
      lower.includes("directions")
    ) {
      currentSection = "howToUse";
      continue;
    }

    // Specification key-value extraction (e.g. "Material : ABS Plastic")
    const specMatch = line.match(
      /^(material|color|dimensions?|size|weight|voltage|power|type|package contents?|in the box|capacity|net quantity|country of origin)\s*[:\-]\s*(.+)$/i,
    );
    if (specMatch) {
      const label = specMatch[1].trim();
      const value = specMatch[2].trim();
      // Only include meaningful specs (exclude meesho supplier ids)
      if (value.length > 0 && !value.toLowerCase().includes("supplier")) {
        specifications.push({
          label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
          value: filterSupplierNames(value),
        });
      }
      continue;
    }

    // Bullet feature extraction
    const bulletMatch = line.match(/^[-*•✔✅\d.]+\s*(.+)$/);
    if (bulletMatch || currentSection === "features") {
      const content = bulletMatch ? bulletMatch[1].trim() : line;
      if (content.length > 5) {
        // Check if feature has a title and description (e.g. "Title: Description" or "Title - Description")
        const splitMatch = content.match(/^([^:\-–—]{3,35})\s*[:\-–—]\s*(.+)$/);
        if (splitMatch) {
          keyFeatures.push({
            title: splitMatch[1].trim(),
            desc: splitMatch[2].trim(),
          });
        } else {
          keyFeatures.push({
            title: content.slice(0, 30).trim(),
            desc: content,
          });
        }
      }
      continue;
    }

    if (currentSection === "howToUse") {
      const cleanStep = line.replace(/^[-*•\d.]+\s*/, "").trim();
      if (cleanStep.length > 5) howToUse.push(cleanStep);
      continue;
    }

    // Otherwise treat as overview paragraph line
    overviewLines.push(line);
  }

  // 1. Build Key Features: If fewer than 3 features were extracted from raw text, use category fallback
  const finalFeatures: KeyFeature[] =
    keyFeatures.length >= 3 ? keyFeatures.slice(0, 6) : getCategoryFallbackFeatures(cleanTitle, cleanText);

  // 2. Short Intro for the right column:
  let shortIntro = "";
  if (overviewLines.length > 0) {
    const candidate = overviewLines[0].trim();
    if (candidate.length >= 30 && candidate.length <= 260) {
      shortIntro = candidate;
    } else if (candidate.length > 260) {
      // Trim to first sentence or clean 200 chars
      const periodIdx = candidate.indexOf(". ");
      if (periodIdx > 30 && periodIdx < 240) {
        shortIntro = candidate.slice(0, periodIdx + 1).trim();
      } else {
        shortIntro = candidate.slice(0, 200).replace(/\s+\S*$/, "") + "…";
      }
    }
  }

  if (!shortIntro) {
    shortIntro = `Experience premium convenience and reliable performance with the ${cleanTitle}. Thoughtfully designed for modern Indian homes, practical everyday use, and lasting satisfaction.`;
  }

  // 3. Clean Overview Paragraphs (1 or 2 clean paragraphs)
  const overviewParagraphs: string[] = [];
  if (overviewLines.length > 0) {
    const combinedOverview = overviewLines.join(" ").trim();
    if (combinedOverview.length > 40) {
      // Split into paragraphs if long
      overviewParagraphs.push(combinedOverview.slice(0, 450).trim());
    }
  }
  if (overviewParagraphs.length === 0) {
    overviewParagraphs.push(
      `The ${cleanTitle} combines functional elegance with reliable craftsmanship. Whether for daily rituals, home organization, or personal convenience, it is engineered to deliver dependable results day after day.`,
    );
  }

  // 4. Default specifications if none were explicitly parsed
  if (specifications.length === 0) {
    specifications.push(
      { label: "Product", value: cleanTitle },
      { label: "Quality Grade", value: "Premium Tested Quality" },
      { label: "Packaging", value: "Secure Multi-Layer Box" },
      { label: "Replacement", value: "5 Days Free Doorstep Replacement" },
      { label: "Delivery", value: "100% Free Express Shipping" },
    );
  }

  // 5. Visual Spotlights (Image + Text Pairings)
  // Take genuine extra images from gallery (skip index 0, which is the main hero image)
  const visualSpotlights: Array<{ image: ProductImage; feature: KeyFeature }> = [];
  const extraImages = images.slice(1);

  if (extraImages.length > 0) {
    const count = Math.min(extraImages.length, finalFeatures.length, 3);
    for (let i = 0; i < count; i++) {
      if (extraImages[i]?.url) {
        visualSpotlights.push({
          image: extraImages[i],
          feature: finalFeatures[i],
        });
      }
    }
  }

  return {
    shortIntro,
    overviewParagraphs,
    keyFeatures: finalFeatures,
    specifications,
    howToUse,
    visualSpotlights,
  };
}

