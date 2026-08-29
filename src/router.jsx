import { createBrowserRouter, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import AuthLayout from "./layouts/AuthLayout.jsx";
import ErrorPage from "./pages/ErrorPage.jsx";
import PlainLayout from "./layouts/PlainLayout.jsx";
import activityLogger from "./lib/activityLogger.js";

// Lazy load pages
const IndexPage = lazy(() => import("./pages/IndexPage.jsx"));
const PaymentPage = lazy(() => import("./pages/PaymentPage.jsx"));
const AliasDetailPage = lazy(() => import("./pages/AliasDetailPage.jsx").then(m => ({ default: m.AliasDetailPage })));
const TransferPage = lazy(() => import("./pages/TransferPage.jsx"));
const PaymentLinksPage = lazy(() => import("./pages/PaymentLinksPage.jsx"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage.jsx"));
const MainBalancePage = lazy(() => import("./pages/MainBalancePage.jsx"));
const PrivateBalancePage = lazy(() => import("./pages/PrivateBalancePage.jsx"));
const SendPage = lazy(() => import("./pages/SendPage.jsx"));
const BasePage = lazy(() => import("./pages/BasePage.jsx"));
const BitGoPage = lazy(() => import("./pages/BitGoPage.jsx"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

const LazyRoute = ({ Component, routeName }) => {
  const location = useLocation();
  useEffect(() => {
    activityLogger.logNavigation(document.referrer || "unknown", location.pathname, "ReactRouter");
    activityLogger.info("RouteLoad", `Loading route: ${routeName || location.pathname}`, {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      routeName,
    });
  }, [location.pathname, routeName]);
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
};

const EXCLUDED_SUBDOMAINS = [
  "www", "admin", "api", "app", "auth", "blog", "cdn", "dev", "forum",
  "mail", "shop", "support", "test", "server", "webmail",
];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    loader: () => {
      const host = window.location.hostname;
      const websiteHost = import.meta.env.VITE_WEBSITE_HOST || "private-pay-iqgp.vercel.app";
      const suffix = `.${websiteHost}`;
      if (host.endsWith(suffix)) {
        const subdomain = host.slice(0, -suffix.length);
        if (!EXCLUDED_SUBDOMAINS.includes(subdomain)) return { subdomain };
        return { subdomain: null };
      }
      return { subdomain: null };
    },
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <LazyRoute Component={IndexPage} routeName="Dashboard" /> },
      {
        path: "/:alias/detail/:parent",
        loader: ({ params, request }) => {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          return { fullAlias: `${params.alias}.privatepay.base`, aliasId: id };
        },
        element: <LazyRoute Component={AliasDetailPage} />,
        children: [{ path: "transfer", element: <LazyRoute Component={TransferPage} /> }],
      },
      { path: "/:alias/transfer", element: <LazyRoute Component={TransferPage} /> },
      { path: "/payment-links", element: <LazyRoute Component={PaymentLinksPage} routeName="Payment Links" /> },
      { path: "/transactions", element: <LazyRoute Component={TransactionsPage} routeName="Transactions" /> },
      { path: "/main-details", element: <LazyRoute Component={MainBalancePage} /> },
      { path: "/private-details", element: <LazyRoute Component={PrivateBalancePage} /> },
      { path: "/send", element: <LazyRoute Component={SendPage} routeName="Send" /> },
      { path: "/transfer", element: <LazyRoute Component={TransferPage} /> },
      { path: "/base", element: <LazyRoute Component={BasePage} routeName="Base" /> },
      { path: "/ens", element: <Navigate to="/send#ens" replace /> },
      { path: "/bitgo", element: <LazyRoute Component={BitGoPage} routeName="BitGo Shielded Hub" /> },
    ],
  },
  {
    path: "/payment",
    element: <PlainLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: ":alias_url", element: <LazyRoute Component={PaymentPage} /> },
    ],
  },
]);
