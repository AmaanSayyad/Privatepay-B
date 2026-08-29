#!/usr/bin/env bash
# Push PrivatePay-Monad codebase in 50 logical commits (professional blockchain dev style)
# Run from repo root. Uses git config: Amaan Sayyad <amaansayyad@yahoo.com>

set -e
cd "$(dirname "$0")/.."

# Author for all commits
git config user.name "Amaan Sayyad"
git config user.email "amaansayyad@yahoo.com"

# Helper: commit a group of files with a message
commit() {
  local msg="$1"
  shift
  if [[ $# -gt 0 ]]; then
    git add "$@"
  fi
  if git diff --cached --quiet 2>/dev/null; then
    return 0
  fi
  git commit -m "$msg"
}

# 1
commit "chore: add .gitignore and .env.example for PrivatePay Monad" .gitignore .env.example

# 2
commit "chore: add root package.json and npm lockfile" package.json package-lock.json

# 3
commit "chore: add bun lockfile for alternative package manager" bun.lock

# 4
commit "chore: add ESLint, Jest and Vitest config" eslint.config.js jest.config.js vitest.config.js

# 5
commit "chore: add Vite, PostCSS and Tailwind config" vite.config.js postcss.config.js tailwind.config.js

# 6
commit "chore: add index.html and Vercel deployment config" index.html vercel.json

# 7
commit "feat(chain): add Monad testnet config and display chains" src/config.js

# 8
commit "feat: add app shell, main entry and global styles" src/App.jsx src/main.jsx src/index.css

# 9
commit "feat: add React error boundary for graceful failure handling" src/ErrorBoundary.jsx

# 10
commit "feat(routes): add app router with lazy-loaded routes" src/router.jsx

# 11
commit "feat(auth): add AuthProvider and UserProvider" src/providers/AuthProvider.jsx src/providers/UserProvider.jsx

# 12
commit "feat(chain): add ChainProvider for network context" src/providers/ChainProvider.jsx

# 13
commit "feat(wallet): add ConnectKit and RootProvider for Monad EVM" src/providers/ConnectKitProvider.jsx src/providers/RootProvider.jsx

# 14
commit "feat(store): add auth, balance, dialog and payment-card stores" src/store/auth-store.js src/store/balance-store.js src/store/dialog-store.js src/store/payment-card-store.js

# 15
commit "feat(lib): add ethers EIP-712 signing helper for auth" src/lib/ethers.js

# 16
commit "feat(supabase): add client, payments, balances, points and withdrawals" src/lib/supabase.js

# 17
commit "chore: add activity logger for analytics and debugging" src/lib/activityLogger.js

# 18
commit "chore: add style, string and process utilities" src/utils/style.js src/utils/string.js src/utils/process.js

# 19
commit "chore: add formatting, localStorage, PWA and JWT utilities" src/utils/formatting-utils.js src/utils/localStorageUtils.js src/utils/pwa-utils.js src/utils/jwtGenerator.js

# 20
commit "feat(utils): add asset aggregation helpers for balance views" src/utils/assets-utils.js

# 21
commit "feat(transfer): add transaction confirmation and polling helper" src/components/transfer/helpers.js

# 22
commit "feat(hooks): add useAppWallet for ConnectKit signer and connection" src/hooks/useAppWallet.js

# 23
commit "feat(hooks): add session, event and activity log hooks" src/hooks/use-event.js src/hooks/use-session.js src/hooks/useActivityLog.js

# 24
commit "feat(layouts): add Auth, Payment, Plain and Root layouts" src/layouts/AuthLayout.jsx src/layouts/PaymentLayout.jsx src/layouts/PlainLayout.jsx src/layouts/RootLayout.jsx

# 25
commit "feat(ui): add Header, Icons and bottom Navbar" src/components/shared/Header.jsx src/components/shared/Icons.jsx src/components/shared/Navbar.jsx

# 26
commit "feat(ui): add MobileNav and PrivacyNavbar" src/components/shared/MobileNav.jsx src/components/shared/PrivacyNavbar.jsx

# 27
commit "feat(ui): add Chains, PaymentHeader and branding components" src/components/shared/Chains.jsx src/components/shared/PaymentHeader.jsx src/components/shared/AsciiFlame.jsx src/components/shared/EngowlWatermark.jsx src/components/shared/Nounsies.jsx

# 28
commit "chore: add EnvDebug component for environment checks" src/components/debug/EnvDebug.jsx

# 29
commit "feat(dialogs): add CreateLink and GetStarted dialogs" src/components/dialogs/CreateLinkDialog.jsx src/components/dialogs/GetStartedDialog.jsx

# 30
commit "feat(dialogs): add ChainSelection and TokenSelection dialogs" src/components/dialogs/ChainSelectionDialog.jsx src/components/dialogs/TokenSelectionDialog.jsx

# 31
commit "feat(dialogs): add QrDialog, SuccessDialog and OnrampDialog" src/components/dialogs/QrDialog.jsx src/components/dialogs/SuccessDialog.jsx src/components/dialogs/OnrampDialog.jsx

# 32
commit "feat(api): add PrivatePay API client for backend calls" src/api/privatepay.js

# 33
commit "feat(dashboard): add main dashboard component" src/components/home/dashboard/Dashboard.jsx

# 34
commit "feat(dashboard): add BalanceChart, PaymentLinksDashboard and dummy data" src/components/home/dashboard/BalanceChart.jsx src/components/home/dashboard/PaymentLinksDashboard.jsx src/components/home/dashboard/dummy.js

# 35
commit "feat(wallet): add BalanceDisplay, PrivacyControls and SeedPhraseBackupModal" src/components/wallet/BalanceDisplay.jsx src/components/wallet/PrivacyControls.jsx src/components/wallet/SeedPhraseBackupModal.jsx

# 36
commit "feat(payment): add Payment component for payment link flows" src/components/payment/Payment.jsx

# 37
commit "feat(payment-links): add PaymentLinks list and management" src/components/payment-links/PaymentLinks.jsx

# 38
commit "feat(alias): add AliasDetail, AssetItem and TxItem components" src/components/alias/AliasDetail.jsx src/components/alias/AssetItem.jsx src/components/alias/TxItem.jsx

# 39
commit "feat(transactions): add transactions list component" src/components/transactions/transactions.jsx

# 40
commit "feat(assets): add assets view component" src/components/assets/assets.jsx

# 41
commit "feat(pages): add Index and Error pages" src/pages/IndexPage.jsx src/pages/ErrorPage.jsx

# 42
commit "feat(pages): add Monad hub page" src/pages/MonadPage.jsx

# 43
commit "feat(pages): add Send and Transfer pages for MON" src/pages/SendPage.jsx src/pages/TransferPage.jsx

# 44
commit "feat(pages): add Payment and PaymentLinks pages" src/pages/PaymentPage.jsx src/pages/PaymentLinksPage.jsx

# 45
commit "feat(pages): add MainBalance, PrivateBalance and Transactions pages" src/pages/MainBalancePage.jsx src/pages/PrivateBalancePage.jsx src/pages/TransactionsPage.jsx

# 46
commit "feat(pages): add Points and AliasDetail pages" src/pages/PointsPage.jsx src/pages/AliasDetailPage.jsx

# 47
commit "feat(assets): add app assets (icons, lottie, SVGs)" src/assets/icons/copy.svg src/assets/icons/qr-code.svg src/assets/lottie/success.json src/assets/radar-bg.svg src/assets/react.svg src/assets/private-pay-logo.svg src/assets/private-pay.svg src/assets/traitsIpfsLinks.json

# 48
commit "chore: add bridge circuit placeholder (Circom)" src/circuits/bridge.circom

# 49
commit "feat(public): add public assets, manifest and Monad branding" public/manifest.json public/_redirects public/monad.jpg public/assets/card-1.png public/assets/card-2.png public/assets/card-3.png public/assets/card-4.png public/assets/font/AthleticsBold.woff public/assets/font/AthleticsExtraBold.woff public/assets/font/AthleticsLight.woff public/assets/font/AthleticsMedium.woff public/assets/font/AthleticsRegular.woff public/assets/nouns-placeholder.png public/assets/nouns.png public/assets/radar-bg.png public/assets/spy.mp4 public/assets/private-pay-logo.svg public/zk/axelar-pool/WithdrawAndBridge.wasm

# 50: backend, scripts, docs and README
git add docs/supabase/schema.sql docs/supabase/points-system.sql docs/supabase/fix-payment_links-username.sql docs/supabase/fix-varchar-length.sql
git add api/withdraw.js backend/index.js backend/package.json backend/package-lock.json backend/.env.example
git add scripts/check_imports.mjs scripts/compile-circuit.sh scripts/import_test.mjs scripts/init-bridge.ts scripts/sync-axelar-pool-zk-artifacts.mjs scripts/test-paymaster.js
git add build.txt README.md
git add -u screenshots/ 2>/dev/null || true
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "feat: add backend, withdraw API, scripts and Supabase docs; update README"
fi

echo "Done. Total commits: $(git rev-list --count HEAD)"
echo "Push with: git push -u origin main"
