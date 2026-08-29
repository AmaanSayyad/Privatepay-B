// Dummy asset data for fallback/development — Base Sepolia only (chainId 84532)
import { BASE_LOGO } from "../../../config.js";

const BASE_CHAIN_ID = 84532;

export const ASSETS_DUMMY = {
  "aggregatedBalances": {
    "native": [
      {
        "chainId": BASE_CHAIN_ID,
        "balance": 0.17,
        "nativeToken": "ETH",
        "logo": BASE_LOGO
      }
    ],
    "erc20": [
      {
        "chainId": BASE_CHAIN_ID,
        "address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "balance": 350,
        "logo": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        "name": "USDC",
        "symbol": "USDC",
        "decimals": 6
      }
    ]
  },
  "stealthAddresses": [
    {
      "address": "0xe30e8F2A9135880952887A24CBd41cBE1f97b48A",
      "ephemeralPub": "0x0211ad17346ae99283e776432d0cfa611c49a26308b885ef061b920a8cc65a899e",
      "viewHint": "0xbb",
      "isTransacted": true,
      "createdAt": "2026-03-15T00:22:03.092Z",
      "nativeBalances": [
        {
          "chainId": BASE_CHAIN_ID,
          "balance": 0.02,
          "nativeToken": "ETH",
          "logo": BASE_LOGO
        }
      ],
      "erc20Balances": []
    },
    {
      "address": "0x3641aa178303fCf35D5DBe4B207895Ec3A7E872e",
      "ephemeralPub": "0x02a9a41bc30b7c776df71b10578e7493db0106845b7b1764af0dc2d97fb34ac3a3",
      "viewHint": "0x91",
      "isTransacted": true,
      "createdAt": "2026-03-15T00:23:19.936Z",
      "nativeBalances": [
        {
          "chainId": BASE_CHAIN_ID,
          "balance": 0.05,
          "nativeToken": "ETH",
          "logo": BASE_LOGO
        }
      ],
      "erc20Balances": [
        {
          "chainId": BASE_CHAIN_ID,
          "address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          "balance": 150,
          "logo": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
          "name": "USDC",
          "symbol": "USDC",
          "decimals": 6
        }
      ]
    },
    {
      "address": "0xC0f6685AFACb376bcAF528a18ac13A44e3E4C6be",
      "ephemeralPub": "0x02474fb5037a4d82c86c83ffc5fd3b8f044cd7ffd2e715cddb1d1526440113a2bb",
      "viewHint": "0xba",
      "isTransacted": true,
      "createdAt": "2026-03-15T00:24:11.787Z",
      "nativeBalances": [
        {
          "chainId": BASE_CHAIN_ID,
          "balance": 0.1,
          "nativeToken": "ETH",
          "logo": BASE_LOGO
        }
      ],
      "erc20Balances": [
        {
          "chainId": BASE_CHAIN_ID,
          "address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          "balance": 50,
          "logo": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
          "name": "USDC",
          "symbol": "USDC",
          "decimals": 6
        }
      ]
    }
  ]
};
