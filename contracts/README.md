# Private-Pay Treasury Contract

Single contract that holds the app’s treasury logic plus **meta-address registry**, **stealth payment** bookkeeping, and a **DarkPool-style commitment pool**. Used on **Base Sepolia** only (Private-Pay is Base, ENS, BitGo focused).

## What it does

### 1. Treasury (simple flow)
- **Receives ETH** – Senders send ETH to this contract. The app uses `VITE_BASE_TREASURY_ADDRESS` / `VITE_SHARED_TREASURY_ADDRESS` in `.env`.
- **Withdrawals** – Only the **relayer** (or owner) can call `withdraw(to, amount)`. Your backend checks Supabase, then calls `withdraw(userAddress, amount)` using `VITE_TREASURY_PRIVATE_KEY` or `TREASURY_PRIVATE_KEY`.

### 2. Meta address registry (for infinite stealth addresses)
- Each user has one **meta address** on-chain: `(spendPub, viewPub)` (BIP 0352 / EIP 5564 style).
- Senders read it via `getMetaAddress(userId)`, then **off-chain** derive a one-time **stealth address** using ECDH + ephemeral key. So one meta → many stealth addresses (infinite).
- **setMetaAddress(userId, spendPub, viewPub)** – Relayer/Owner sets meta for a user (e.g. `userId = keccak256(username)`).

### 3. Stealth payments (keyed by recipient + ephemeral)
- **depositToStealth(recipientId, ephemeralPub)** – Sender pays **ETH** into a “stealth slot” identified by `(recipientId, ephemeralPub)` instead of a raw address. No recipient address on-chain until withdrawal.
- **withdrawStealth(recipientId, ephemeralPub, to, amount)** – Relayer releases that balance to `to` after verifying the recipient off-chain (e.g. signature from stealth key).

### 4. DarkPool-style commitment pool (mixer)
- **depositToPool(commitment)** – Deposit under a commitment (e.g. `hash(secret)`). No address tied to the deposit on-chain.
- **withdrawFromPoolWithApproval(nullifier, amount, to, signature)** – Withdraw using a nullifier and a **relayer signature** so the contract trusts the relayer approved this withdrawal. Same nullifier cannot be reused. (A ZK proof + verifier can replace the relayer later for full privacy.)

---

## Deploy (Base Sepolia)

### Constructor argument (Deploy & Verify)

The contract has **one** constructor parameter:

| Parameter   | Type    | What to enter |
|------------|---------|----------------|
| **relayer_** | address | The **0x...** address allowed to call `withdraw`, `withdrawBatch`, `setMetaAddress`, `withdrawStealth`, and to sign pool withdrawals. Use the **public address** of the EOA that holds your relayer key (the same key as `TREASURY_PRIVATE_KEY` / `VITE_TREASURY_PRIVATE_KEY` in your backend). If you prefer, you can pass the **deployer address** (your wallet) so owner and relayer are the same; you can change relayer later with `setRelayer(newRelayer)`. |

So in Basescan/Remix “Deploy & Verify” (or any UI that asks for constructor arguments), enter **one** value: the relayer address (e.g. `0x1234...`). Do not leave it empty (the contract reverts on `address(0)`).

---

1. **Install deps** (if not already):
   ```bash
   npm install
   ```

2. **Set in `.env`** (see root `.env.example`):
   - `VITE_BASE_RPC_URL` – Base Sepolia RPC (e.g. `https://sepolia.base.org`).
   - `DEPLOYER_PRIVATE_KEY` or `VITE_TREASURY_PRIVATE_KEY` or `TREASURY_PRIVATE_KEY` – Key that will pay gas and own the contract.
   - `RELAYER_ADDRESS` – Address allowed to call `withdraw`, `withdrawStealth`, and to sign pool withdrawals (e.g. your backend EOA). **This is the value you pass as `relayer_` when deploying.**

3. **Compile and deploy**:
   ```bash
   npm run contract:compile
   npm run contract:deploy
   ```
   This runs `hardhat run scripts/deploy-treasury.cjs --network baseSepolia`.

4. **Use the deployed address**:
   - Set `VITE_SHARED_TREASURY_ADDRESS`, `VITE_BASE_TREASURY_ADDRESS`, `VITE_ENS_TREASURY_ADDRESS`, and `VITE_BITGO_TREASURY_ADDRESS` to the deployed address in `.env` (same treasury for Base/ENS/BitGo unless you use separate contracts).

---

## Contract API (summary)

| Function | Who | Description |
|----------|-----|-------------|
| **Treasury** | | |
| `receive()` | Anyone | Accept native token (e.g. ETH). |
| `withdraw(to, amount)` | Relayer/Owner | Send `amount` wei to `to`. |
| `withdrawBatch(tos, amounts)` | Relayer/Owner | Batch withdraw. |
| **Meta addresses** | | |
| `setMetaAddress(userId, spendPub, viewPub)` | Relayer/Owner | Set meta address for user (33 or 65 byte pubkeys). |
| `getMetaAddress(userId)` | Anyone | Get (spendPub, viewPub). |
| **Stealth** | | |
| `depositToStealth(recipientId, ephemeralPub)` | Anyone | Pay ETH into stealth slot. |
| `withdrawStealth(recipientId, ephemeralPub, to, amount)` | Relayer/Owner | Release stealth balance to `to`. |
| **Pool (mixer)** | | |
| `depositToPool(commitment)` | Anyone | Deposit under commitment. |
| `withdrawFromPoolWithApproval(nullifier, amount, to, signature)` | Anyone | Withdraw with relayer-signed approval; nullifier used once. |
| **Admin** | | |
| `setRelayer(addr)` | Owner | Change relayer. |
| `transferOwnership(addr)` | Owner | Change owner. |

---

## Backend integration (Base Sepolia)

- **Simple flow**: Check balance in Supabase, then `treasury.withdraw(destinationAddress, ethers.parseEther(amount))` using the key from `VITE_TREASURY_PRIVATE_KEY` (or `TREASURY_PRIVATE_KEY` on server).
- **Stealth flow**: After verifying recipient (e.g. signature from stealth key), call `treasury.withdrawStealth(recipientId, ephemeralPub, destinationAddress, amount)`.
- **Pool flow**: Relayer signs `(nullifier, amount, to, chainId)` with the relayer key; user (or backend) calls `withdrawFromPoolWithApproval(nullifier, amount, to, signature)`.
