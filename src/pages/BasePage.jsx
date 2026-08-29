/**
 * Base hub — EVM-only.
 * Send ETH/USDC on Base Sepolia via the Send page.
 */

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardBody, Chip } from "@nextui-org/react";
import { Send, ExternalLink, CheckCircle } from "lucide-react";
import { useAppWallet } from "../hooks/useAppWallet.js";
import { BASE_LOGO, baseSepolia } from "../config.js";

export default function BasePage() {
  const { isConnected, connect } = useAppWallet();
  const explorerUrl = baseSepolia.blockExplorers.default.url;

  return (
    <div className="flex flex-col items-center justify-start w-full gap-6 p-4 md:p-6 pt-24 pb-28 md:pb-24 bg-light-white min-h-screen">
      <div className="flex flex-col items-center gap-2 mb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <h1 className="font-bold text-4xl md:text-5xl text-gray-900 tracking-tight">
            Base
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Chip size="sm" variant="flat" color="secondary" className="font-bold text-[10px]">
              L2
            </Chip>
            <Chip size="sm" variant="flat" color="warning" className="font-bold text-[10px]">
              SEPOLIA
            </Chip>
          </div>
        </motion.div>
      </div>

      {!isConnected ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white border border-gray-200 shadow-lg rounded-3xl">
            <CardBody className="flex flex-col items-center justify-center py-16 gap-8">
              <div className="w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center p-4">
                <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-bold text-2xl text-gray-900">Connect Wallet</h3>
                <p className="text-gray-500 text-sm max-w-[280px] leading-relaxed mx-auto">
                  Connect your wallet to send ETH/USDC and use Private-Pay on Base.
                </p>
              </div>
              <button
                type="button"
                onClick={() => connect()}
                className="w-full bg-primary hover:bg-primary-800 text-white font-bold h-12 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Connect Wallet
              </button>
            </CardBody>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-col w-full max-w-2xl gap-6">
          <Card className="bg-white border border-gray-200 shadow-md rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center p-2">
                    <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Base Sepolia</h3>
                    <p className="text-xs text-gray-500">Fast & Low-cost L2</p>
                  </div>
                </div>
                <Chip size="sm" color="success" variant="flat" className="font-bold text-[10px]">
                  CONNECTED
                </Chip>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-700">Native token</span>
                  <span className="font-semibold text-gray-900">ETH</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-700">Explorer</span>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold flex items-center gap-1"
                  >
                    Basescan <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-md rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center p-2">
                  <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Send & Withdraw</h3>
                  <p className="text-xs text-gray-500">Transfer ETH/USDC or withdraw from treasury</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-700">Send ETH & USDC privately</span>
                  <CheckCircle size={16} className="text-primary shrink-0" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-700">Withdraw dual-currency balance</span>
                  <CheckCircle size={16} className="text-primary shrink-0" />
                </div>
              </div>
              <Link
                to="/send"
                className="mt-4 w-full bg-primary hover:bg-primary-800 text-white font-semibold h-12 rounded-2xl flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Open Send & Withdraw
              </Link>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
