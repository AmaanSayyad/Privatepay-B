import TxItem from "../components/alias/TxItem.jsx";
import { Icons } from "../components/shared/Icons.jsx";
import { shortenAddress } from "../utils/string";
import { BASE_LOGO, USDC_LOGO, ETH_LOGO } from "../config.js";

export default function PrivateBalancePage() {
  return (
    <div className="flex min-h-screen w-full items-start justify-center py-32 px-4 md:px-10">
      <Transactions />
    </div>
  );
}

function Transactions() {
  return (
    <div className="overflow-hidden rounded-4xl bg-primary ">
      <div className="w-full rounded-2xl h-14 p flex items-center justify-center gap-2 text-sm text-white font-bold">
        <div className="bg-white size-6 rounded-xl p-1">
          <img
            src={BASE_LOGO}
            alt="base-logo"
            className="w-full h-full object-contain mix-blend-multiply"
          />
        </div>
        Transactions on Base Sepolia
      </div>
      <div
        className={
          "relative flex flex-col gap-2 w-full max-w-md items-start justify-center bg-light-white rounded-[32px] p-4 md:p-6"
        }
      >
        <div className="flex items-center justify-between w-full">
          <h1 className="font-bold text-lg text-[#19191B]">Private History</h1>
          <div className="size-10 p-2 bg-white rounded-full flex items-center justify-center">
            <Icons.allChain className="text-black" />
          </div>
        </div>

        <p className="text-[#A1A1A3] font-medium text-sm mt-1">Recently</p>

        <div className="flex flex-col w-full">
          <TxItem
            tokenImg={ETH_LOGO}
            chainImg={BASE_LOGO}
            title={"alice.privatepay.base - Receive"}
            isNounsies
            addressNounsies={"0x02919065a8Ef7A7826b3D9f3DEFef2FA0a4d1f34"}
            subtitle={`from ${shortenAddress(
              "0x19065a8Ef7A782Bb3D9f3DEFef2FA0a4d1f34"
            )}`}
            value={"0.05 ETH"}
            subValue={"$150"}
          />

          <TxItem
            tokenImg={USDC_LOGO}
            chainImg={BASE_LOGO}
            title={"bob.privatepay.base - Receive"}
            isNounsies
            addressNounsies={"0x02919065a8Ef7A782Bb3D9f3DEFef2F230a4d1f34"}
            subtitle={`from ${shortenAddress(
              "0x02234065a8Ef7A782Bb3D9f3DEFef2FA0a4d1f32"
            )}`}
            value={"10.00 USDC"}
            subValue={"$10"}
          />
        </div>
      </div>
    </div>
  );
}
