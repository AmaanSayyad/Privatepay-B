import Nounsies from "../shared/Nounsies.jsx";

export default function TxItem({
  tokenImg,
  chainImg,
  title,
  subtitle,
  value,
  subValue,
  isNounsies = false,
  addressNounsies,
}) {
  return (
    <div className="flex gap-4 w-full py-3">
      <div className="relative size-12">
        {isNounsies ? (
          <div className="size-12 rounded-full overflow-hidden relative">
            <Nounsies address={addressNounsies} />
          </div>
        ) : (
          <div className="size-12 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center p-1.5">
            <img
              src={tokenImg}
              alt="Base"
              className="object-contain w-full h-full"
            />
          </div>
        )}

        {chainImg && (
          <img
            src={chainImg}
            alt=""
            className="absolute top-0 -right-2 object-contain size-6"
          />
        )}
      </div>

      <div className="flex items-start justify-between w-full gap-3">
        <div className="flex flex-col">
          <h1 className="font-bold text-[#161618] break-all">{title}</h1>
          {subtitle && (
            <p className="font-medium text-[#A1A1A3] text-sm">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-col text-end items-end">
          <h1 className="font-bold text-[#161618]">{value}</h1>
          {subValue && (
            <p className="font-medium text-[#A1A1A3] text-sm">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}
