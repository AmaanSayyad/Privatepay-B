import { Link, useLocation } from "react-router-dom";
import { Shield, Send, Globe } from "lucide-react";
import { cnm } from "../../utils/style.js";

export default function PrivacyNavbar() {
    const location = useLocation();

    return (
        <div className="w-full flex justify-center mb-8 relative z-50">
            <div className="bg-white/80 backdrop-blur-md shadow-lg shadow-black/5 border border-black/10 rounded-full p-1.5 flex flex-wrap justify-center text-sm gap-2 font-medium">
                <Link
                    to={"/base"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-primary/10",
                        `${location.pathname.startsWith("/base") || location.pathname === "/send" ? "bg-primary text-white hover:bg-primary/90" : "text-gray-600"}`
                    )}
                >
                    <Send className="size-4" />
                    Send
                </Link>
                <Link
                    to={"/ens"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-primary/10",
                        `${location.pathname.startsWith("/ens") ? "bg-primary text-white hover:bg-primary/90" : "text-gray-600"}`
                    )}
                >
                    <Globe className="size-4" />
                    ENS Hub
                </Link>
            </div>
        </div>
    );
}
