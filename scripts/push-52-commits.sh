#!/usr/bin/env bash
# Push Private-Pay codebase in 52 logical commits (Base, ENS, BitGo only)
# Run from repo root.

set -e
cd "$(dirname "$0")/.."

git config user.name "Amaan Sayyad"
git config user.email "amaansayyad@yahoo.com"

commit() {
  local msg="$1"
  shift
  if [[ $# -gt 0 ]]; then
    git add "$@" 2>/dev/null || true
  fi
  if git diff --cached --quiet 2>/dev/null; then
    return 0
  fi
  git commit -m "$msg"
}

# 1
commit "chore: add .gitignore and env template for Base deployment" .gitignore .env.example

# 2
commit "chore: add root package.json, lockfiles and test/lint config" package.json package-lock.json bun.lock eslint.config.js jest.config.js vitest.config.js

# 3
commit "chore: add Vite, PostCSS, Tailwind and Vercel config" vite.config.js postcss.config.js tailwind.config.js index.html vercel.json

# 5
commit "feat(config): add Base network config and chain list" src/config.js

# 6
commit "feat: add app shell, main entry and global styles" src/App.jsx src/main.jsx src/index.css

# 7
commit "feat: add React error boundary for graceful failure handling" src/ErrorBoundary.jsx

# 8
commit "feat(routes): add app router with lazy-loaded routes" src/router.jsx

# 9
commit "feat(auth): add AuthProvider and UserProvider" src/providers/AuthProvider.jsx src/providers/UserProvider.jsx

# 10
commit "feat(chain): add ChainProvider for Base network context" src/providers/ChainProvider.jsx

# 11
commit "feat(wallet): add ConnectKit and RootProvider for Base" src/providers/ConnectKitProvider.jsx src/providers/RootProvider.jsx

# 12
commit "feat(store): add auth, balance, dialog and payment-card stores" src/store/auth-store.js src/store/balance-store.js src/store/dialog-store.js src/store/payment-card-store.js

# 13
commit "feat(lib): add ethers EIP-712 signing helper for auth" src/lib/ethers.js

# 14
commit "feat(supabase): add client and backend helpers for payments" src/lib/supabase.js

# 15
commit "chore: add activity logger and style, string, process utilities" src/lib/activityLogger.js src/utils/style.js src/utils/string.js src/utils/process.js

# 16
commit "chore: add formatting, localStorage, PWA and JWT utilities" src/utils/formatting-utils.js src/utils/localStorageUtils.js src/utils/pwa-utils.js src/utils/jwtGenerator.js

# 17
commit "feat(utils): add asset aggregation helpers for balance views" src/utils/assets-utils.js

# 18
commit "feat(transfer): add transaction confirmation and polling helper" src/components/transfer/helpers.js

# 19
commit "feat(hooks): add useAppWallet for ConnectKit signer and connection" src/hooks/useAppWallet.js

# 20
commit "feat(hooks): add session, event and activity log hooks" src/hooks/use-event.js src/hooks/use-session.js src/hooks/useActivityLog.js

# 21
commit "feat(ens): add ENS profile resolution hook" src/hooks/useEnsProfile.js

# 22
commit "feat(layouts): add Auth, Payment, Plain and Root layouts" src/layouts/AuthLayout.jsx src/layouts/PaymentLayout.jsx src/layouts/PlainLayout.jsx src/layouts/RootLayout.jsx

# 23
commit "feat(ui): add Header, Icons and Navbar" src/components/shared/Header.jsx src/components/shared/Icons.jsx src/components/shared/Navbar.jsx

# 24
commit "feat(ui): add MobileNav and PrivacyNavbar" src/components/shared/MobileNav.jsx src/components/shared/PrivacyNavbar.jsx

# 25
commit "feat(ui): add Chains, PaymentHeader and branding components" src/components/shared/Chains.jsx src/components/shared/PaymentHeader.jsx src/components/shared/AsciiFlame.jsx src/components/shared/EngowlWatermark.jsx src/components/shared/Nounsies.jsx

# 26
commit "chore: add EnvDebug component for environment checks" src/components/debug/EnvDebug.jsx

# 27
commit "feat(dialogs): add CreateLink and GetStarted dialogs" src/components/dialogs/CreateLinkDialog.jsx src/components/dialogs/GetStartedDialog.jsx

# 28
commit "feat(dialogs): add ChainSelection and TokenSelection dialogs" src/components/dialogs/ChainSelectionDialog.jsx src/components/dialogs/TokenSelectionDialog.jsx

# 29
commit "feat(dialogs): add QrDialog, SuccessDialog and OnrampDialog" src/components/dialogs/QrDialog.jsx src/components/dialogs/SuccessDialog.jsx src/components/dialogs/OnrampDialog.jsx

# 30
commit "feat(api): add PrivatePay API client for backend calls" src/api/privatepay.js

# 31
commit "feat(dashboard): add main dashboard and BalanceChart" src/components/home/dashboard/Dashboard.jsx src/components/home/dashboard/BalanceChart.jsx

# 32
commit "feat(dashboard): add PaymentLinksDashboard and dummy data" src/components/home/dashboard/PaymentLinksDashboard.jsx src/components/home/dashboard/dummy.js

# 33
commit "feat(wallet): add BalanceDisplay, PrivacyControls and SeedPhraseBackupModal" src/components/wallet/BalanceDisplay.jsx src/components/wallet/PrivacyControls.jsx src/components/wallet/SeedPhraseBackupModal.jsx

# 34
commit "feat(payment): add Payment component for payment link flows" src/components/payment/Payment.jsx

# 35
commit "feat(payment-links): add PaymentLinks list and management" src/components/payment-links/PaymentLinks.jsx

# 36
commit "feat(alias): add AliasDetail, AssetItem and TxItem components" src/components/alias/AliasDetail.jsx src/components/alias/AssetItem.jsx src/components/alias/TxItem.jsx

# 37
commit "feat(transactions): add transactions list component" src/components/transactions/transactions.jsx

# 38
commit "feat(assets): add assets view component" src/components/assets/assets.jsx

# 39
commit "feat(pages): add Index and Error pages" src/pages/IndexPage.jsx src/pages/ErrorPage.jsx

# 40
commit "feat(pages): add Base hub page" src/pages/BasePage.jsx

# 41
commit "feat(pages): add Send and Transfer pages for Base" src/pages/SendPage.jsx src/pages/TransferPage.jsx

# 42
commit "feat(ens): add ENS resolution page" src/pages/EnsPage.jsx

# 43
commit "feat(bitgo): add BitGo custody page and client" src/pages/BitGoPage.jsx src/lib/bitgo.js

# 44
commit "feat(pages): add Payment and PaymentLinks pages" src/pages/PaymentPage.jsx src/pages/PaymentLinksPage.jsx

# 45
commit "feat(pages): add MainBalance, PrivateBalance and Transactions pages" src/pages/MainBalancePage.jsx src/pages/PrivateBalancePage.jsx src/pages/TransactionsPage.jsx

# 46
commit "feat(pages): add Points and AliasDetail pages" src/pages/PointsPage.jsx src/pages/AliasDetailPage.jsx

# 47
commit "feat(assets): add app assets (icons, SVGs, lottie)" src/assets/icons/copy.svg src/assets/icons/qr-code.svg src/assets/lottie/success.json src/assets/radar-bg.svg src/assets/react.svg src/assets/private-pay-logo.svg src/assets/private-pay.svg src/assets/traitsIpfsLinks.json

# 48
commit "chore: add bridge circuit placeholder (Circom)" src/circuits/bridge.circom

# 49
commit "feat(public): add public assets, manifest and Base branding" public/manifest.json public/_redirects public/assets/card-1.png public/assets/card-2.png public/assets/card-3.png public/assets/card-4.png public/assets/font/AthleticsBold.woff public/assets/font/AthleticsExtraBold.woff public/assets/font/AthleticsLight.woff public/assets/font/AthleticsMedium.woff public/assets/font/AthleticsRegular.woff public/assets/nouns-placeholder.png public/assets/nouns.png public/assets/private-pay-logo.svg public/assets/radar-bg.png public/assets/spy.mp4 public/baselogo.png public/bitgo.png public/bitgo\ logo.png public/ethereum-eth-logo.png public/ethereum-name-service-ens-logo.png public/usd-coin-usdc-logo.png baselogo.png

# 50
commit "feat(contracts): add PrivatePay treasury for Base and Hardhat deploy" contracts/PrivatePayTreasury.sol contracts/README.md hardhat.config.cjs scripts/deploy-treasury.cjs

# 51
commit "feat(api): add withdraw and BitGo serverless routes" api/withdraw.js api/bitgo-balance.js api/bitgo-generate-address.js api/bitgo-send.js

# 52 (if you get 51 commits, split this into two: docs-only then scripts+README)
commit "docs: add Supabase schema and migrations; BitGo and dev scripts; README" docs/supabase/schema.sql docs/supabase/base_sepolia_schema.sql docs/supabase/points-system.sql docs/supabase/fix-payment_links-username.sql docs/supabase/fix-varchar-length.sql docs/supabase/fix_permissions.sql docs/supabase/bitgo_integration.sql docs/supabase/ens_integration.sql docs/supabase/update_balances_v2.sql scripts/bitgo-check.js scripts/bitgo-list-wallets.js scripts/bitgo-test-address.js scripts/bitgo-verify-token.js scripts/check_imports.mjs scripts/import_test.mjs scripts/test-paymaster.js scripts/push-50-commits.sh scripts/push-52-commits.sh scripts/push-commits.sh README.md build.txt

echo "Done. Total commits: $(git rev-list --count HEAD 2>/dev/null || echo 0)"
echo "Push with: git remote add origin https://github.com/AmaanSayyad/Private-Pay-.git 2>/dev/null; git push -u origin main"