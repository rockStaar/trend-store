import { useState } from "react";
import type { FaqItem } from "~/lib/product-faq";

type ProductFaqProps = {
  faqs: FaqItem[];
  productTitle?: string;
};

export function ProductFaq({ faqs, productTitle }: ProductFaqProps) {
  // Open the first question by default for immediate value, rest closed
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      className="py-14 sm:py-20 bg-[#F7F3EC] border-t border-[#E2DBD0]"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header inspired by Reference 2 */}
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[11px] uppercase tracking-widest font-bold text-[#B77943] mb-2">
            HAVE QUESTIONS?
          </p>
          <h2
            id="faq-heading"
            className="font-serif text-3xl sm:text-4xl text-[#282720] font-normal leading-tight"
          >
            We have got the answers
            <br />
            to your questions
          </h2>
          <p className="text-xs sm:text-sm text-[#7D786D] mt-2 max-w-md mx-auto">
            Everything you need to know about {productTitle || "this product"}, shipping across India, and guarantees.
          </p>
        </div>

        {/* Accordion container matching Reference 2 */}
        <div className="bg-white rounded-2xl border border-[#E2DBD0] shadow-sm divide-y divide-[#F0EBE1] overflow-hidden">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const buttonId = `faq-btn-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div key={index} className="transition-colors hover:bg-[#FAF6F0]/40">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className="w-full text-left py-4 sm:py-5 px-5 sm:px-7 flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:bg-[#FAF6F0]"
                  >
                    <span className="font-heading font-medium text-sm sm:text-base text-[#282720]">
                      {faq.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`shrink-0 size-7 rounded-full flex items-center justify-center text-[#7D786D] bg-[#F7F3EC] transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[#B77943]" : ""
                      }`}
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-all duration-300 ease-in-out px-5 sm:px-7 text-xs sm:text-sm text-[#5E5B52] leading-relaxed ${
                    isOpen ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0 pb-0 invisible"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pt-1">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer Assistance Footer Note */}
        <div className="mt-8 text-center text-xs text-[#7D786D]">
          <span>Still have a question? </span>
          <a
            href="/policies/contact"
            className="text-[#B77943] font-semibold hover:underline"
          >
            Chat with our team on WhatsApp →
          </a>
        </div>
      </div>
    </section>
  );
}

