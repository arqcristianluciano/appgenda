#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs project npm dependencies + Playwright/Chromium for headless browser
# automation (scraping, API-driven flows, etc.).
#
# Interactive browser flows are NOT viable in this environment (egress firewall
# blocks tunneling). For those, use Claude Code CLI locally.
#
# Cloud service API tokens (Vercel, Supabase, etc.) should be added via the
# Claude Code web UI: Settings → Environments → Environment Variables.
# Suggested names: VERCEL_TOKEN, SUPABASE_TOKEN, GITHUB_TOKEN, etc.

set -euo pipefail

# Only run in the cloud environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# 1. Project dependencies
if [ ! -d node_modules ] || [ package.json -nt node_modules/.installed ]; then
  echo "[hook] installing npm dependencies..."
  npm install --no-audit --no-fund --silent
  touch node_modules/.installed
fi

# 2. Playwright + Chromium (installed once, cached by container)
PW_HOME=/opt/pw-tools
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export PLAYWRIGHT_BROWSERS_PATH

if [ ! -f "$PW_HOME/node_modules/playwright/package.json" ]; then
  echo "[hook] installing Playwright..."
  mkdir -p "$PW_HOME"
  ( cd "$PW_HOME" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent playwright )
fi

if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell"* ] 2>/dev/null && \
   [ -z "$(ls -d ${PLAYWRIGHT_BROWSERS_PATH}/chromium-* 2>/dev/null | head -1)" ]; then
  echo "[hook] downloading Chromium..."
  ( cd "$PW_HOME" && npx --yes playwright install chromium --with-deps >/dev/null 2>&1 || \
    npx --yes playwright install chromium >/dev/null 2>&1 )
fi

# 3. Persist env for the session
{
  echo "export PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"
  echo "export PLAYWRIGHT_HOME=$PW_HOME"
  echo "export NODE_PATH=\"$PW_HOME/node_modules:\${NODE_PATH:-}\""
} >> "${CLAUDE_ENV_FILE:-/dev/null}"

echo "[hook] ready. project deps + Playwright + Chromium installed."
