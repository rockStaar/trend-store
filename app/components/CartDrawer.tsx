import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { Link } from "react-router";

import { useCart, useCartForm } from "~/lib/cart";
import { closeCartDrawer, configureOpenCartAction, CART_DRAWER_ID } from "~/lib/cart-drawer";
import { formatPrice } from "~/lib/money";

import { publishCartViewed } from "./AnalyticsTrackers";

function CartErrorBanner() {
  const errors = useCart((state) => state.errors);
  const [dismissedAt, setDismissedAt] = useState(0);
  const messages = useMemo(() => {
    const lines = [...errors.lines.values()].flatMap((group) => group.userErrors);
    return [...errors.network, ...errors.cart.userErrors, ...lines].map((error) => error.message);
  }, [errors]);

  if (messages.length === 0 || errors.lastUpdatedAt <= dismissedAt) return null;

  return (
    <div className="border border-red-200 bg-red-50 text-red-800 mx-4 mb-2 rounded-lg p-3 text-xs" role="alert">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          {messages.map((message) => (
            <p key={message} className="text-red-700 font-medium">
              {message}
            </p>
          ))}
        </div>
        <button
          type="button"
          className="text-red-600 hover:text-red-800 text-xs underline cursor-pointer"
          onClick={() => setDismissedAt(errors.lastUpdatedAt)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function hasPendingCost(pending: {
  cost?: boolean;
  discountCodes: Set<string>;
  lines: Set<string>;
}): boolean {
  return pending.cost ?? (pending.lines.size > 0 || pending.discountCodes.size > 0);
}

function useCartStatusMessage(): string {
  const pending = useCart((state) => state.pending);
  const revalidating = useCart((state) => "revalidating" in state && state.revalidating === true);
  const networkErrors = useCart((state) => state.errors.network);
  const isPending = hasPendingCost(pending) || revalidating;
  const [sawPending, setSawPending] = useState(false);

  useEffect(() => {
    if (isPending) setSawPending(true);
  }, [isPending]);

  if (isPending) return "Updating cart totals";
  if (sawPending && networkErrors.length === 0) return "Cart totals updated";
  return "";
}

type CartLineView = {
  id: string;
  quantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  attributes?: Array<{ key: string; value: string | null }>;
  merchandise?: {
    title?: string | null;
    selectedOptions?: Array<{ name: string; value: string }> | null;
    image?: { url: string; altText?: string | null } | null;
    product?: { title?: string | null; handle?: string | null } | null;
  } | null;
};

// Free Shipping Threshold in INR
const FREE_SHIPPING_THRESHOLD = 999;

function FreeShippingProgressBar() {
  const cart = useCart((state) => state.data);
  const subtotal = Number.parseFloat(cart.cost?.subtotalAmount?.amount ?? "0");
  const isEligible = subtotal >= FREE_SHIPPING_THRESHOLD;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const percentage = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <div className="bg-[#FAF6F0] border-b border-[#E2DBD0] px-5 py-3">
      <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-[#282720]">
        {isEligible ? (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <span>🎉</span>
            <span>You unlocked FREE Express Pan-India Delivery!</span>
          </span>
        ) : (
          <span>
            Add <strong className="text-[#B77943]">₹{Math.round(remaining)}</strong> more for <strong>FREE Delivery</strong>
          </span>
        )}
        <span className="text-[11px] text-[#7D786D]">{percentage}%</span>
      </div>
      <div className="w-full bg-[#E2DBD0] h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isEligible ? "bg-emerald-600" : "bg-[#B77943]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function CartLineItem({
  line,
  emptyCartFocusId,
}: {
  line: CartLineView;
  emptyCartFocusId: string;
}) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);
  const merchandise = line.merchandise;
  const product = merchandise?.product;
  const pending = pendingLines.has(line.id);
  const optionText = merchandise?.selectedOptions
    ?.map((option: { name: string; value: string }) => option.value)
    .join(" / ");

  const moveFocusBeforeRemoval = (event: SubmitEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    if (!form.contains(document.activeElement)) return;
    const intent = event.nativeEvent.submitter?.getAttribute("value");
    const quantity = new FormData(form).get("quantity");
    const removesLine =
      intent === "remove" ||
      (intent === "decrease" && line.quantity <= 1) ||
      (intent === "set" && Number(quantity) <= 0);
    if (!removesLine) return;

    const item = form.closest("li");
    const neighbour = item?.nextElementSibling ?? item?.previousElementSibling;
    const selector = intent === "set" ? 'input[name="quantity"]' : `button[value="${intent}"]`;
    const target =
      neighbour?.querySelector<HTMLElement>(selector) ?? document.getElementById(emptyCartFocusId);
    target?.focus();
  };

  return (
    <li
      className={`flex gap-3.5 py-4 border-b border-[#F0EBE1] transition-opacity ${pending ? "opacity-60" : ""}`}
      data-testid="cart-line"
      {...(pending ? { "aria-busy": "true" } : {})}
    >
      <div className="bg-[#EFE9DE] size-20 rounded-lg shrink-0 overflow-hidden border border-[#E2DBD0]">
        {merchandise?.image ? (
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText ?? product?.title ?? merchandise.title ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-sm text-[#282720] font-semibold leading-tight line-clamp-2">
            {product?.handle ? (
              <Link
                to={`/products/${product.handle}`}
                className="hover:text-[#B77943] transition-colors"
                onClick={() => closeCartDrawer()}
              >
                {product.title ?? merchandise?.title ?? "Product"}
              </Link>
            ) : (
              (product?.title ?? merchandise?.title ?? "Product")
            )}
          </p>
          {optionText && optionText !== "Default Title" ? (
            <p className="text-[#635F53] mt-0.5 text-xs font-normal">{optionText}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2 pt-1">
          <p className={`text-sm font-bold text-[#282720] ${pending ? "opacity-50" : ""}`}>
            {formatPrice(line.cost.totalAmount)}
          </p>

          <form
            {...formProps({ beforeSubmit: moveFocusBeforeRemoval })}
            className="flex items-center gap-1 border border-[#E2DBD0] rounded-md bg-white p-0.5"
          >
            <button {...register("set")} />
            <input type="hidden" {...register("lineId", { value: line.id })} />
            <button
              type="submit"
              {...register("decrease")}
              className="size-7 inline-flex items-center justify-center text-[#282720] hover:bg-[#EFE9DE] rounded text-sm font-bold disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              {...register("quantity", { value: line.quantity, interactive: true })}
              className="w-8 text-center text-xs font-semibold text-[#282720] border-0 bg-transparent p-0 focus:outline-none"
              aria-label="Quantity"
            />
            <button
              type="submit"
              {...register("increase")}
              className="size-7 inline-flex items-center justify-center text-[#282720] hover:bg-[#EFE9DE] rounded text-sm font-bold disabled:opacity-40"
              aria-label="Increase quantity"
            >
              +
            </button>
            <button
              type="submit"
              {...register("remove")}
              className="text-[#7D786D] hover:text-red-600 px-1 text-xs ms-1 border-s border-[#E2DBD0]"
              aria-label="Remove item"
            >
              ✕
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

function CartLines() {
  const loading = useCart((state) => state.loading);
  const lines = useCart((state) => state.data.lines.nodes);

  if (loading) {
    return (
      <div className="py-12 text-center text-[#635F53] text-sm">
        <p>Loading cart items…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center py-16 px-4">
        <div className="size-16 rounded-full bg-[#FAF6F0] border border-[#E2DBD0] flex items-center justify-center text-2xl mb-4">
          🛍️
        </div>
        <p className="font-heading text-lg font-bold text-[#282720]">Your cart is empty</p>
        <p className="text-[#635F53] mt-1 text-xs max-w-xs">
          Discover viral problem-solvers and everyday essentials for modern Indian homes.
        </p>
        <Link
          to="/#trending"
          onClick={() => closeCartDrawer()}
          className="mt-6 bg-[#B77943] text-white hover:bg-[#9E6433] px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
        >
          Explore Trending Finds →
        </Link>
      </div>
    );
  }

  return (
    <ul role="list" className="divide-y divide-[#F0EBE1]">
      {lines.map((line) => (
        <CartLineItem key={line.id} line={line} emptyCartFocusId="cart-drawer-title" />
      ))}
    </ul>
  );
}

function CartFooter() {
  const cart = useCart((state) => state.data);
  const pending = useCart((state) => state.pending);
  const revalidating = useCart((state) => "revalidating" in state && state.revalidating === true);
  const hasLines = cart.lines.nodes.length > 0;
  const isPending = hasPendingCost(pending) || revalidating;

  if (!hasLines) return null;

  return (
    <div className="border-t border-[#E2DBD0] shrink-0 bg-[#FAF6F0] p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between" aria-busy={isPending}>
          <span className="text-[#282720] text-sm font-semibold">
            Subtotal
            {isPending ? <span className="text-xs font-normal text-[#7D786D]"> (updating…)</span> : null}
          </span>
          <span
            className={`text-lg font-bold text-[#282720] ${isPending ? "text-[#7D786D]" : ""}`}
          >
            {formatPrice(cart.cost.totalAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-[#635F53] border-b border-[#E2DBD0] pb-2">
          <span>Delivery Across India</span>
          <span className="text-emerald-700 font-medium">Free or Flat ₹49</span>
        </div>

        {cart.checkoutUrl ? (
          <div className="space-y-2 pt-1">
            <a
              href={cart.checkoutUrl}
              className="bg-[#B77943] hover:bg-[#9E6433] text-white inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold tracking-wide shadow-md transition-all active:scale-[0.98]"
            >
              🔒 Proceed to Secure Checkout
            </a>
            <div className="w-full">
              <ShopPayButton width="100%" borderRadius="8px" />
            </div>
          </div>
        ) : null}

        {/* Indian Payment & Trust Strip in Cart */}
        <div className="pt-2 text-center space-y-1">
          <p className="text-[11px] font-medium text-[#282720]">
            ⚡ Pay with UPI (GPay, PhonePe, Paytm), Cards or COD
          </p>
          <p className="text-[10px] text-[#7D786D]">
            Dispatches in 24 Hours • 7-Day Free Replacement Guarantee
          </p>
        </div>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const cart = useCart((state) => state.data);
  const statusMessage = useCartStatusMessage();

  useEffect(() => {
    configureOpenCartAction();
    const dialog = document.getElementById(CART_DRAWER_ID);
    if (!(dialog instanceof HTMLDialogElement)) return;
    const handleToggle = () => {
      if (dialog.open) publishCartViewed(cart);
    };
    dialog.addEventListener("toggle", handleToggle);
    return () => dialog.removeEventListener("toggle", handleToggle);
  }, [cart]);

  return (
    <>
      <span
        role="status"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-cart-status
      >
        {statusMessage}
      </span>
      <dialog
        id={CART_DRAWER_ID}
        className="drawer-right bg-[#F7F3EC] text-[#282720] border-s border-[#E2DBD0] shadow-2xl"
        aria-labelledby="cart-drawer-title"
        data-testid="cart-drawer"
        closedby="any"
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between py-3.5 px-5 border-b border-[#E2DBD0] bg-white">
            <div className="flex items-center gap-2.5">
              <h2
                id="cart-drawer-title"
                tabIndex={-1}
                className="font-heading font-bold text-lg text-[#282720]"
              >
                Shopping Bag
              </h2>
              <span className="bg-[#B77943] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {totalQuantity}
              </span>
            </div>
            <button
              type="button"
              commandfor={CART_DRAWER_ID}
              command="close"
              className="button-icon focus-visible:outline-accent inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#EFE9DE] hover:bg-[#E5DFD3] text-[#282720] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
              aria-label="Close cart drawer"
              onClick={() => closeCartDrawer()}
            >
              <img src="/icons/icon-x.svg" alt="" className="size-4" aria-hidden="true" />
            </button>
          </div>

          <FreeShippingProgressBar />
          <CartErrorBanner />

          <div className="flex-1 overflow-y-auto px-5 py-2">
            <CartLines />
          </div>

          <CartFooter />
        </div>
      </dialog>
    </>
  );
}
