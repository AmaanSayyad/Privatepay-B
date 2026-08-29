/**
 * PWA Utilities (Base)
 * Push notifications and PWA helpers for Private-Pay on Base.
 */

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export function showNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  const opts = {
    body: options.body ?? "",
    icon: options.icon ?? "/assets/private-pay-logo.svg",
    tag: options.tag ?? "default",
    requireInteraction: options.requireInteraction ?? false,
    ...options,
  };
  const n = new Notification(title, opts);
  n.onclick = () => {
    window.focus();
    if (opts.onClick) opts.onClick();
    n.close();
  };
  if (!opts.requireInteraction) setTimeout(() => n.close(), 5000);
  return n;
}

/** Notify user when ETH/USDC payment is received (Base) */

export function notifyPaymentReceived(amount, fromAddress) {
  const shortFrom = fromAddress ? `${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}` : "sender";
  showNotification("Payment Received", {
    body: `You received ${amount} ETH from ${shortFrom}`,

    tag: "payment-received",
    icon: "/assets/private-pay-logo.svg",
    onClick: () => { window.location.href = "/"; },
  });
}

export function isPWAInstalled() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.navigator.standalone === true) return true;
  if (document.referrer.includes("android-app://")) return true;
  return false;
}

/** Initialize PWA features (notifications). Call from main.jsx. */
export async function initializePWA() {
  document.addEventListener(
    "click",
    async () => {
      if (Notification.permission === "default") await requestNotificationPermission();
    },
    { once: true }
  );
}
