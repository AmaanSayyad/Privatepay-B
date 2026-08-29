import { ScrollRestoration } from "react-router-dom";
import Dashboard from "../components/home/dashboard/Dashboard";

export default function IndexPage() {
  return (
    <div className="pb-24 md:pb-0">
      <Dashboard />
      <ScrollRestoration />
    </div>
  );
}
