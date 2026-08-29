import { DISPLAY_CHAINS } from "../../config";

export default function Chains() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[#A1A1A3] text-sm mt-3">on Base</p>

      <div className="flex gap-1 items-center justify-center">
        {DISPLAY_CHAINS.map((chain) => {
          return (
            <div key={chain.id} className="size-7 rounded-full bg-[#A1A1A3]">
              <img
                src={chain.imageUrl}
                alt="ch"
                className="object-cover w-full h-full"
              />
            </div>
          )
        })}
      </div>
    </div>
  );
}
