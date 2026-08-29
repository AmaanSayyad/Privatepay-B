import { Icons } from "../components/shared/Icons.jsx";
import Transactions from "../components/transactions/transactions.jsx";

export default function TransactionsPage() {
  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-light-white pb-24">
      <div
        className={
          "relative flex flex-col gap-2 w-full max-w-md items-start justify-center bg-white rounded-3xl border border-gray-200 shadow-sm p-4 md:p-6"
        }
      >
        <div className="flex items-center justify-between w-full">
          <h1 className="font-athletics font-bold text-lg text-gray-900">Transactions</h1>
          <div className="size-10 p-2 bg-white rounded-full flex items-center justify-center">
            <Icons.allChain className="text-black" />
          </div>
        </div>
        <Transactions />
      </div>
    </div>
  );
}
