import { Link } from "react-router";
import type { Route } from "./+types/policy";
import { formatPageTitle, getShopNameFromRootMatch } from "~/lib/storefront-shop";

interface PolicyContent {
  title: string;
  badge: string;
  lastUpdated: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    listItems?: string[];
  }>;
}

const POLICIES: Record<string, PolicyContent> = {
  "shipping-policy": {
    title: "Shipping & Delivery Policy",
    badge: "Pan-India Logistics",
    lastUpdated: "October 2026",
    sections: [
      {
        heading: "1. Order Processing & Dispatch",
        paragraphs: [
          "All orders placed on our store are verified and dispatched within 24 to 48 business hours (excluding Sundays and national holidays).",
          "Once your order has shipped, you will receive an automated tracking link via SMS, Email, and WhatsApp to track your parcel in real-time.",
        ],
      },
      {
        heading: "2. Delivery Timelines Across India",
        paragraphs: [
          "We partner with India's most dependable logistics providers including BlueDart, Delhivery, Xpressbees, and DTDC to ensure safe and prompt transit.",
        ],
        listItems: [
          "Metro Cities (Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata): 2 to 4 business days.",
          "Tier 2 & Tier 3 Cities / State Capitals: 3 to 5 business days.",
          "Rest of India, Remote Locations & North East: 4 to 7 business days.",
        ],
      },
      {
        heading: "3. Shipping Charges & Cash on Delivery (COD)",
        paragraphs: [
          "We offer FREE Express Shipping on all prepaid orders above ₹999.",
          "For orders below ₹999, a nominal flat shipping fee of ₹49 is applied at checkout.",
          "Cash on Delivery (COD) is available on eligible pin codes across India. A nominal handling fee of ₹50 may apply to cover logistics costs for cash verification.",
        ],
      },
      {
        heading: "4. Address Accuracy & Non-Delivery",
        paragraphs: [
          "Please ensure full address details including landmark, city, and correct 6-digit PIN code are provided during checkout. In case of failed delivery attempts, our courier partner will re-attempt delivery before returning the package to our hub.",
        ],
      },
    ],
  },
  "refund-policy": {
    title: "7-Day Replacement & Refund Policy",
    badge: "Buyer Protection",
    lastUpdated: "October 2026",
    sections: [
      {
        heading: "1. 7-Day Replacement Guarantee",
        paragraphs: [
          "We want you to shop with complete peace of mind. If you receive a product that is damaged in transit, defective, or incorrect, you are fully covered under our 7-Day Free Replacement Policy from the date of delivery.",
        ],
      },
      {
        heading: "2. Eligibility Criteria",
        paragraphs: [
          "To initiate a replacement or return request, please ensure the following conditions are met:",
        ],
        listItems: [
          "Request must be raised within 7 calendar days from the date the order was marked as delivered.",
          "Product must be in its original packaging with all included accessories, manuals, and warranty tags intact.",
          "A short unboxing video or photographs clearly showing the defect or damage is required for instant courier claims.",
        ],
      },
      {
        heading: "3. How to Request Support",
        paragraphs: [
          "Simply send an email to support@varenya.in or reach our WhatsApp customer care with your Order ID and photo/video evidence. Our support team typically responds within 4 to 8 business hours.",
        ],
      },
      {
        heading: "4. Refunds for Prepaid Orders",
        paragraphs: [
          "If a replacement cannot be provided due to stock availability, a 100% refund will be issued to your original payment method (Bank Account / UPI / Card) within 3 to 5 business days after inspection.",
        ],
      },
    ],
  },
  "contact": {
    title: "Customer Support & Contact",
    badge: "Dedicated Helpdesk",
    lastUpdated: "October 2026",
    sections: [
      {
        heading: "Get in Touch With Us",
        paragraphs: [
          "Have questions about an order, delivery status, or one of our products? We are here to help you every step of the way.",
        ],
        listItems: [
          "Email Support: support@varenya.in (Response within 4–8 business hours)",
          "WhatsApp Helpdesk: +91 98765 43210 (Mon–Sat, 10:00 AM – 6:00 PM IST)",
          "Operating Hours: Monday to Saturday, 10:00 AM to 6:00 PM IST",
          "Address: Varenya Lifestyle Curations, Cyber City, Gurugram, Haryana 122002, India",
        ],
      },
      {
        heading: "Order Tracking",
        paragraphs: [
          "Tracking links are automatically dispatched via SMS & WhatsApp as soon as your parcel is picked up by our courier partner. You can also email us your 5-digit Order ID for an immediate status update.",
        ],
      },
    ],
  },
  "faq": {
    title: "Frequently Asked Questions",
    badge: "Help Center",
    lastUpdated: "October 2026",
    sections: [
      {
        heading: "How do I know my order is confirmed?",
        paragraphs: [
          "As soon as you complete your purchase, an instant confirmation notification with your Order ID will be sent to your registered Email and mobile number.",
        ],
      },
      {
        heading: "Do you offer Cash on Delivery (COD)?",
        paragraphs: [
          "Yes! Cash on Delivery is available on thousands of serviceable pin codes across India. You will see the COD option at checkout if your delivery pin code qualifies.",
        ],
      },
      {
        heading: "What payment methods do you support?",
        paragraphs: [
          "We support all major Indian payment methods through secure Shopify payment gateways:",
        ],
        listItems: [
          "UPI: Google Pay, PhonePe, Paytm, BHIM, CRED UPI",
          "Cards: RuPay, Visa, Mastercard, American Express (Debit & Credit)",
          "Net Banking: 50+ major Indian banks",
          "Cash on Delivery (COD) on eligible orders",
        ],
      },
      {
        heading: "Are all products quality-checked?",
        paragraphs: [
          "Yes. Every single product in our catalog undergoes rigorous quality checks before packaging to guarantee functionality, aesthetic finish, and safety.",
        ],
      },
      {
        heading: "What if my item arrives damaged or doesn't work?",
        paragraphs: [
          "No worries! Simply reach out to our WhatsApp or email support within 7 days of delivery. We will arrange a free replacement or full refund after quick verification.",
        ],
      },
    ],
  },
  "terms-of-service": {
    title: "Terms of Service",
    badge: "Legal Agreement",
    lastUpdated: "October 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        paragraphs: [
          "By accessing or purchasing from our store, you engage in our service and agree to be bound by the following terms and conditions.",
        ],
      },
      {
        heading: "2. Pricing and Currency",
        paragraphs: [
          "All product prices displayed on the store are listed in Indian Rupees (INR ₹) and are inclusive of all applicable Goods and Services Tax (GST) unless specified otherwise.",
        ],
      },
      {
        heading: "3. Accuracy of Information",
        paragraphs: [
          "We strive to display product colors, specifications, and dimensions as accurately as possible. Actual product colors may vary slightly depending on your screen settings.",
        ],
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    badge: "Data Protection",
    lastUpdated: "October 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        paragraphs: [
          "When you make a purchase or browse our store, we collect personal information you provide such as your name, address, email address, phone number, and delivery details solely for order fulfilment and courier updates.",
        ],
      },
      {
        heading: "2. Payment Security",
        paragraphs: [
          "We never store your credit/debit card numbers or UPI PINs. All payment transactions are encrypted and processed through industry-standard PCI-DSS compliant payment gateways.",
        ],
      },
      {
        heading: "3. Communications & Tracking",
        paragraphs: [
          "We use your phone number and email strictly for transactional communications: order confirmations, delivery alerts, and customer care responses.",
        ],
      },
    ],
  },
};

export function meta({ matches, params }: Route.MetaArgs) {
  const shopName = getShopNameFromRootMatch(matches[0]);
  const handle = params.handle ?? "policy";
  const policy = POLICIES[handle] ?? POLICIES["shipping-policy"];
  return [
    { title: formatPageTitle(policy.title, shopName) },
    { name: "description", content: `${policy.title} for ${shopName}. Read our customer commitments and terms.` },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const handle = params.handle ?? "shipping-policy";
  const policy = POLICIES[handle];
  if (!policy) {
    throw new Response("Policy Not Found", { status: 404 });
  }
  return { policy, handle };
}

export default function PolicyRoute({ loaderData }: Route.ComponentProps) {
  const { policy } = loaderData;

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <div className="max-w-3xl px-margin mx-auto w-full py-10 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="text-[#635F53] flex items-center gap-1.5 text-xs">
            <li>
              <Link to="/" className="hover:text-[#282720] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-[#282720] font-medium">{policy.title}</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="border-b border-[#E2DBD0] pb-6 mb-8">
          <span className="inline-block uppercase tracking-wider text-[11px] font-semibold bg-[#B77943]/15 text-[#B77943] px-2.5 py-1 rounded-full mb-3">
            {policy.badge}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[#282720]">
            {policy.title}
          </h1>
          <p className="text-xs text-[#7D786D] mt-2">
            Last updated: {policy.lastUpdated} • Applicable for all Indian orders
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-8 text-[#282720] leading-relaxed text-sm">
          {policy.sections.map((section, idx) => (
            <section key={idx} className="bg-white/70 border border-[#E2DBD0] rounded-lg p-6 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-[#282720] font-heading">
                {section.heading}
              </h2>
              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-[#5E5B52] leading-relaxed">
                  {p}
                </p>
              ))}
              {section.listItems && section.listItems.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5 text-[#5E5B52] pt-1 pl-1">
                  {section.listItems.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {/* Helpdesk banner */}
        <div className="mt-10 p-6 bg-[#EFE9DE] border border-[#E2DBD0] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-semibold text-base text-[#282720]">
              Still have questions or need assistance?
            </h3>
            <p className="text-xs text-[#635F53] mt-0.5">
              Our support team is available Mon–Sat (10 AM to 6 PM IST) to resolve your query.
            </p>
          </div>
          <Link
            to="/policies/contact"
            className="shrink-0 bg-[#B77943] text-white hover:bg-[#9E6433] px-5 py-2.5 rounded-md text-xs font-semibold tracking-wide transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
