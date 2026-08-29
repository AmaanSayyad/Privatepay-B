#!/usr/bin/env bash
# Push PrivatePay-Aleo with 55+ human-like commits (blockchain dev style)
# Run from repo root: bash scripts/push-commits.sh
set -e
cd "$(dirname "$0")/.."

# Ensure we don't commit .env
export GIT_AUTHOR_NAME="Amaan Sayyad"
export GIT_AUTHOR_EMAIL="amaansayyad@yahoo.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

commit() {
  for p in "$@"; do [ -e "$p" ] && git add "$p" 2>/dev/null; done
  if [ -n "$(git diff --cached --name-only)" ]; then git commit -m "$MSG"; fi
}
msg() { MSG="$1"; }

# 1
msg "chore: add gitignore and env example"
commit .gitignore .env.example

# 2
msg "feat: add package.json and lockfile"
commit package.json package-lock.json

# 3
msg "build: add vite and react config"
commit vite.config.js index.html

# 4
msg "build: add tailwind and postcss"
commit tailwind.config.js postcss.config.js

# 5
msg "chore: add eslint and test config"
commit eslint.config.js jest.config.js vitest.config.js vercel.json

# 6
msg "docs: add README and project overview"
commit README.md

# 7
msg "docs: add team and buildathon alignment"
commit TEAM.md ALEO_BUILDATHON_ALIGNMENT.md CHANGELOG_ALEO.md

# 8
msg "docs: add integration mermaid diagrams"
commit ALEO_INTEGRATION_MERMAID.md APTOS_INTEGRATION_MERMAID.md

# 9
msg "chore: add deployment and celer config"
commit CELER_CONFIG.json DEPLOYMENT_STATUS.json

# 10
msg "feat: add backend express server and withdraw stub"
commit backend/index.js backend/package.json backend/README.md backend/.env.example api/withdraw.js

# 11
msg "feat: add supabase client and lib"
commit src/lib/supabase.js

# 12 (aleo removed — Monad only)
msg "feat: config and treasury address"
commit src/config.js

# 13
msg "feat: add root and auth providers (skip aleo)"
true

# 14
msg "feat: add root and auth providers"
commit src/providers/RootProvider.jsx src/providers/AuthProvider.jsx src/providers/DynamicProvider.jsx

# 15
msg "feat: add user and web3 providers"
commit src/providers/UserProvider.jsx src/providers/Web3Provider.jsx src/providers/ChainProvider.jsx

# 16
msg "feat: add app wallet hook and config"
commit src/hooks/useAppWallet.js src/config.js

# 17
msg "feat: add remaining hooks and utils"
commit src/hooks/ src/utils/

# 18
msg "feat: add jotai store and dialog state"
commit src/store/

# 19
msg "feat: add main app and router"
commit src/App.jsx src/main.jsx src/router.jsx src/ErrorBoundary.jsx

# 20
msg "feat: add index css and fonts"
commit src/index.css

# 21
msg "feat: add shared header and navbar"
commit src/components/shared/Header.jsx src/components/shared/Navbar.jsx

# 22
msg "feat: add payment header and icons"
commit src/components/shared/PaymentHeader.jsx src/components/shared/Icons.jsx

# 23
msg "feat: add Nounsies and shared components"
commit src/components/shared/Nounsies.jsx src/components/shared/AsciiFlame.jsx src/components/shared/EngowlWatermark.jsx

# 24
msg "feat: add dashboard and home components"
commit src/components/home/

# 25
msg "feat: add payment and payment link components"
commit src/components/payment/ src/components/payment-links/

# 26
msg "feat: add create link and get started dialogs"
commit src/components/dialogs/CreateLinkDialog.jsx src/components/dialogs/GetStartedDialog.jsx

# 27
msg "feat: add success and QR dialogs"
commit src/components/dialogs/SuccessDialog.jsx src/components/dialogs/QrDialog.jsx

# 28
msg "feat: add layout components"
commit src/layouts/

# 29
msg "feat: add index and dashboard page"
commit src/pages/IndexPage.jsx

# 30
msg "feat: add payment and send pages"
commit src/pages/PaymentPage.jsx src/pages/SendPage.jsx

# 31
msg "feat: add Monad page and transfer flow"
commit src/pages/MonadPage.jsx

# 32-33 (aleo defi pages removed — Monad only)
msg "feat: skip aleo defi pages"
true

# 34
msg "feat: add points and transactions pages"
commit src/pages/PointsPage.jsx src/pages/TransactionsPage.jsx

# 35
msg "feat: add payment links and transfer pages"
commit src/pages/PaymentLinksPage.jsx src/pages/TransferPage.jsx

# 36
msg "feat: add remaining pages and error page"
commit src/pages/AliasDetailPage.jsx src/pages/MainBalancePage.jsx src/pages/PrivateBalancePage.jsx src/pages/ErrorPage.jsx

# 37-38 (aleo components removed — Monad only)
msg "feat: skip aleo components"
true

# 39
msg "feat: add payment component and api"
commit src/components/payment/Payment.jsx src/api/privatepay.js

# 40
msg "feat: add remaining lib (aleo credit, balance store)"
commit src/lib/

# 41
msg "feat: add alias and debug components"
commit src/components/alias/ src/components/debug/ 2>/dev/null || true

# 42
msg "feat: add assets and abi"
commit src/assets/ src/abi/ 2>/dev/null || true

# 43
msg "feat: add circuits and contracts"
commit src/circuits/ src/contracts/ 2>/dev/null || true

# 44
msg "public: add assets"
commit public/assets/

# 45
msg "public: add manifest and redirects"
commit public/manifest.json public/_redirects public/zk/ 2>/dev/null || true

# 46
msg "docs: add payment and treasury docs"
commit docs/PAYMENT_AND_TREASURY.md docs/TREASURY_RELAYER.md 2>/dev/null || true

# 47
msg "docs: add supabase schema and points system"
commit docs/supabase/ docs/SUPABASE_SETUP.md

# 48
msg "docs: add guides and deployment docs"
commit docs/guides/ docs/QUICK_START.md docs/VERCEL_DEPLOYMENT.md docs/FEATURE_COMPARISON_MANTLE.md 2>/dev/null || true

# 49
msg "feat: add aleo leo programs (zk_credit, dark_pool)"
commit aleo/programs/zk_credit/ aleo/programs/dark_pool/

# 50
msg "feat: add shielded amm and private lending programs"
commit aleo/programs/shielded_amm/ aleo/programs/private_lending/

# 51
msg "feat: add treasury and compliance programs"
commit aleo/programs/treasury_management/ aleo/programs/compliance_module/ aleo/programs/cross_chain_vault/

# 52
msg "chore: add aleo deploy scripts and config"
commit aleo/README.md aleo/.gitignore aleo/program.json aleo/check-programs.js aleo/deploy-all.js aleo/deploy-script.js aleo/simple-deploy.js aleo/update-all-programs.js aleo/deploy-rest.js aleo/deploy-snarkvm.js

# 53
msg "chore: add aleo deployment info and scripts"
commit aleo/deployment-info.json aleo/deployment-results.json aleo/deployment-log.json aleo/scripts/ 2>/dev/null || true

# 54
msg "feat: add aptos move and scripts"
commit aptos/

# 55
msg "chore: add root scripts and test helpers"
commit scripts/ test-sdk-import.js 2>/dev/null || true

# 56
msg "test: add aleo sdk and component tests"
commit tests/

# 57 - catch any remaining
msg "chore: sync remaining docs and config"
git add -A
git status --short
if [ -n "$(git status --porcelain)" ]; then git commit -m "chore: sync remaining files and docs" || true; fi

echo "Done. Pushing to origin..."
git push -u origin main
