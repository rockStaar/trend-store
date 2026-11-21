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


function FreeShippingProgressBar() {
  return (
    <div className="bg-[#EAF0FC] border-b border-[#d2def5] px-5 py-3">
      <div className="flex items-center justify-between text-xs font-medium text-[#192A46]">
        <span className="text-[#2457D6] font-bold flex items-center gap-1.5">
          <span>🎉</span>
          <span>100% FREE Pan-India Delivery on All Orders!</span>
        </span>
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
          FREE
        </span>
      </div>
      <div className="w-full bg-[#d2def5] h-1.5 rounded-full overflow-hidden mt-1.5">
        <div className="h-full bg-emerald-600 rounded-full w-full" />
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
      className={`flex gap-3.5 py-4 border-b border-[#E4E7ED] transition-opacity ${pending ? "opacity-60" : ""}`}
      data-testid="cart-line"
      {...(pending ? { "aria-busy": "true" } : {})}
    >
      <div className="bg-[#F8F7F3] size-20 rounded-xl shrink-0 overflow-hidden border border-[#E4E7ED] p-1">
        {merchandise?.image ? (
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText ?? product?.title ?? merchandise.title ?? ""}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-sm text-[#192A46] font-bold leading-tight line-clamp-2">
            {product?.handle ? (
              <Link
                to={`/products/${product.handle}`}
                className="hover:text-[#2457D6] transition-colors"
                onClick={() => closeCartDrawer()}
              >
                {product.title ?? merchandise?.title ?? "Product"}
              </Link>
            ) : (
              (product?.title ?? merchandise?.title ?? "Product")
            )}
          </p>
          {optionText && optionText !== "Default Title" ? (
            <p className="text-[#64748B] mt-0.5 text-xs font-medium">{optionText}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2 pt-1">
          <p className={`text-sm font-extrabold text-[#192A46] ${pending ? "opacity-50" : ""}`}>
            {formatPrice(line.cost.totalAmount)}
          </p>

          <form
            {...formProps({ beforeSubmit: moveFocusBeforeRemoval })}
            className="flex items-center gap-1 border border-[#E4E7ED] rounded-xl bg-white p-0.5 shadow-2xs"
          >
            <button {...register("set")} />
            <input type="hidden" {...register("lineId", { value: line.id })} />
            <button
              {...register("decrease")}
              className="size-7 inline-flex items-center justify-center text-[#192A46] hover:bg-[#F8F7F3] rounded-lg text-sm font-bold disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              readOnly
              {...register("quantity", { value: line.quantity, interactive: true })}
              className="w-8 text-center text-xs font-black text-[#192A46] border-0 bg-transparent p-0 focus:outline-none"
              aria-label="Quantity"
            />
            <button
              {...register("increase")}
              className="size-7 inline-flex items-center justify-center text-[#192A46] hover:bg-[#F8F7F3] rounded-lg text-sm font-bold disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Increase quantity"
            >
              +
            </button>
            <button
              {...register("remove")}
              className="text-[#64748B] hover:text-red-600 px-1.5 text-xs ms-1 border-s border-[#E4E7ED] transition-colors cursor-pointer"
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
      <div className="py-12 text-center text-[#64748B] text-sm">
        <p>Loading cart items…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center py-16 px-4">
        <div className="size-16 rounded-full bg-[#F8F7F3] border border-[#E4E7ED] flex items-center justify-center text-2xl mb-4">
          🛍️
        </div>
        <p className="font-heading text-lg font-bold text-[#192A46]">Your cart is empty</p>
        <p className="text-[#64748B] mt-1 text-xs max-w-xs leading-relaxed">
          Discover viral problem-solvers and everyday essentials curated for modern Indian homes.
        </p>
        <Link
          to="/collections"
          onClick={() => closeCartDrawer()}
          className="mt-6 bg-[#2457D6] hover:bg-[#1e47b0] text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md active:scale-95"
        >
          Explore Trending Finds →
        </Link>
      </div>
    );
  }

  return (
    <ul role="list" className="divide-y divide-[#E4E7ED]">
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
    <div className="border-t border-[#E4E7ED] shrink-0 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between" aria-busy={isPending}>
          <span className="text-[#192A46] text-sm font-bold">
            Subtotal
            {isPending ? <span className="text-xs font-normal text-[#64748B]"> (updating…)</span> : null}
          </span>
          <span
            className={`text-xl font-black text-[#2457D6] ${isPending ? "text-[#64748B]" : ""}`}
          >
            {formatPrice(cart.cost.totalAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-[#64748B] border-b border-[#E4E7ED] pb-2.5">
          <span>Pan-India Delivery</span>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            FREE Delivery on All Orders
          </span>
        </div>

        <div className="space-y-2 pt-1">
          {/* Prepaid Checkout (10% OFF) */}
          <Link
            to="/checkout/cod?prepaid=1"
            onClick={() => closeCartDrawer()}
            className="w-full h-12 rounded-xl bg-[#2457D6] hover:bg-[#1e47b0] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>⚡</span>
            <span>PROCEED TO CHECKOUT (10% OFF)</span>
          </Link>

          {/* Cash on Delivery option */}
          <Link
            to="/checkout/cod"
            onClick={() => closeCartDrawer()}
            className="w-full h-11 rounded-xl bg-white hover:bg-[#F8F7F3] text-[#192A46] border-2 border-[#192A46] font-extrabold text-xs tracking-wide shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>💵</span>
            <span>ORDER VIA CASH ON DELIVERY</span>
          </Link>

          {cart.checkoutUrl ? (
            <div className="w-full pt-1">
              <ShopPayButton width="100%" borderRadius="8px" />
            </div>
          ) : null}
        </div>

        {/* Indian Payment & Trust Strip in Cart */}
        <div className="pt-2 text-center space-y-1">
          <p className="text-[11px] font-bold text-[#192A46]">
            ⚡ Pay with UPI (GPay, PhonePe, Paytm), Cards or Cash on Delivery
          </p>
          <p className="text-[10px] text-[#64748B]">
            Dispatches in 24 Hours • 5-Day Free Replacement Guarantee
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
        className="drawer-right bg-white text-[#192A46] border-s border-[#E4E7ED] shadow-2xl"
        aria-labelledby="cart-drawer-title"
        data-testid="cart-drawer"
        closedby="any"
      >
        <div className="flex h-full flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between py-3.5 px-5 border-b border-[#E4E7ED] bg-white">
            <div className="flex items-center gap-2.5">
              <h2
                id="cart-drawer-title"
                tabIndex={-1}
                className="font-heading font-extrabold text-lg text-[#192A46]"
              >
                Shopping Bag
              </h2>
              <span className="bg-[#2457D6] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalQuantity}
              </span>
            </div>
            <button
              type="button"
              commandfor={CART_DRAWER_ID}
              command="close"
              className="button-icon inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#F8F7F3] hover:bg-[#EAF0FC] text-[#192A46] transition-colors text-sm font-bold"
              aria-label="Close cart drawer"
              onClick={() => closeCartDrawer()}
            >
              ✕
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
