export type FaqItem = {
  question: string;
  answer: string;
  category?: "product" | "shipping" | "warranty" | "payment";
};

export type ProductFaqInput = {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  vendor?: string | null;
  metafieldFaqJson?: string | null;
};

export function getProductFaqs(product: ProductFaqInput): FaqItem[] {
  // If the merchant specified custom metafield FAQs in Shopify admin, use them
  if (product.metafieldFaqJson) {
    try {
      const parsed = JSON.parse(product.metafieldFaqJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          question: String(item.question || item.q || ""),
          answer: String(item.answer || item.a || ""),
          category: item.category || "product",
        }));
      }
    } catch {
      // Ignore parse error and fallback to smart contextual FAQs
    }
  }

  const titleLower = product.title.toLowerCase();
  const desc = product.description || "";

  // Contextual question tailored to product characteristics
  let productUsageQuestion = {
    question: `How do I use and care for the ${product.title}?`,
    answer: `The ${product.title} is designed for intuitive everyday use. Refer to the included quick-start guide in the package. For best longevity, clean gently with a dry or slightly damp microfiber cloth and store in a cool, dry place away from direct sunlight.`,
    category: "product" as const,
  };

  let productContentsQuestion = {
    question: `What is included in the box?`,
    answer: `Your package contains 1x genuine ${product.title}, user manual, and all standard manufacturer accessories. Every item undergoes rigorous quality check before dispatch.`,
    category: "product" as const,
  };

  let productFeatureQuestion = {
    question: `What makes this ${product.title} special?`,
    answer: desc && desc.length > 30
      ? desc.slice(0, 220) + (desc.length > 220 ? "…" : "")
      : `Carefully curated for premium daily living, the ${product.title} brings together ergonomic design, durability, and practical elegance to enhance your everyday lifestyle.`,
    category: "product" as const,
  };

  if (titleLower.includes("vacuum") || titleLower.includes("cleaner")) {
    productUsageQuestion = {
      question: "How long does the battery last and how do I recharge it?",
      answer:
        "It features a high-density rechargeable battery providing 25-35 minutes of continuous high-power suction on a single charge. It recharges conveniently using any standard USB-C cable (included) in approximately 2 hours.",
      category: "product",
    };
    productContentsQuestion = {
      question: "What accessories and nozzles come in the box?",
      answer:
        "The package includes the portable vacuum main unit, 1x washable HEPA filter, 1x crevice nozzle for tight gaps, 1x brush attachment for car vents & keyboards, 1x blower attachment, and 1x USB-C fast charging cable.",
      category: "product",
    };
  } else if (titleLower.includes("lamp") || titleLower.includes("light") || titleLower.includes("diffuser")) {
    productUsageQuestion = {
      question: "How do I operate the light modes and settings?",
      answer:
        "The device features intuitive touch or button controls to cycle through warm, natural, and soft glow modes. A quick tap changes brightness or lighting temperature.",
      category: "product",
    };
  } else if (titleLower.includes("bottle") || titleLower.includes("cup") || titleLower.includes("flask")) {
    productUsageQuestion = {
      question: "Is this food-grade and how long does it retain temperature?",
      answer:
        "Crafted from 100% BPA-free, high-grade stainless steel with vacuum insulation, it maintains hot beverages for up to 12 hours and chilled drinks cold for up to 24 hours.",
      category: "product",
    };
  }

  return [
    productFeatureQuestion,
    productUsageQuestion,
    productContentsQuestion,
    {
      question: "How long does Pan-India delivery take?",
      answer:
        "We dispatch all orders within 24 business hours from our fulfillment warehouse. Standard express delivery takes 3 to 5 business days across 19,000+ pincodes across India. You will receive an SMS and WhatsApp tracking link as soon as your parcel ships.",
      category: "shipping",
    },
    {
      question: "Is Cash on Delivery (COD) available?",
      answer:
        "Yes, Cash on Delivery (COD) is available pan-India. We also support all secure prepaid methods including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and NetBanking.",
      category: "payment",
    },
    {
      question: "What is your replacement and warranty policy?",
      answer:
        "Grow & Glow provides a 7-Day Hassle-Free Free Replacement Guarantee. If your order arrives damaged, defective, or not working as expected, simply contact our WhatsApp support team with a short unboxing video or photo, and we will dispatch a brand-new replacement promptly.",
      category: "warranty",
    },
    {
      question: "How can I contact Grow & Glow customer care?",
      answer:
        "You can chat with our customer support directly via WhatsApp or email us at support@growandglow.in. Our dedicated team is available Monday to Saturday from 10:00 AM to 6:00 PM IST to assist with orders, tracking, and product queries.",
      category: "warranty",
    },
  ];
}

