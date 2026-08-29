import { Link, useLocation } from "react-router-dom";
import { DollarSign, LayoutDashboard, Wallet, Globe, Shield } from "lucide-react";
import { cnm } from "../../utils/style.js";

export default function Navbar() {
  const location = useLocation();

  return (
    <div className="fixed z-50 bottom-0 left-0 w-full py-5 flex items-center justify-center bg-white md:bg-transparent border-t border-gray-100 md:border-t-0" style={{ overflow: "visible" }}>
      <div className="bg-white shadow-xl shadow-black/10 border border-gray-200 rounded-full p-1 flex text-sm gap-1.5 font-medium max-w-[95vw] overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Link
          to={"/"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            location.pathname === "/" ? "bg-primary text-white" : ""
          )}
        >
          <LayoutDashboard className="size-3.5" />
          <span>Dashboard</span>
        </Link>

        <Link
          to={"/payment-links"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            location.pathname === "/payment-links" ? "bg-primary text-white" : ""
          )}
        >
          <Wallet className="size-3.5" />
          <span>Payment Links</span>
        </Link>

        <Link
          to={"/transactions"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            location.pathname === "/transactions" ? "bg-primary text-white" : ""
          )}
        >
          <DollarSign className="size-3.5" />
          <span>Transactions</span>
        </Link>

        <Link
          to={"/send#ens"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            location.pathname === "/send" && location.hash === "#ens" ? "bg-primary text-white" : ""
          )}
        >
          <Globe className="size-3.5" />
          <span>ENS Hub</span>
        </Link>

        <Link
          to={"/bitgo"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            location.pathname === "/bitgo" ? "bg-primary text-white" : ""
          )}
        >
          <Shield className="size-3.5" />
          <span>BitGo Shield</span>
        </Link>

      </div>
    </div>
  );
}
