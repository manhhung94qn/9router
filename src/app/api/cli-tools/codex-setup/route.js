"use server";

import { NextResponse } from "next/server";

const SCRIPT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
};

// ── Unix Install ──────────────────────────────────────────────────────────────
const unixInstallScript = String.raw`#!/bin/sh

# 9Router Installer for Codex CLI (Linux/macOS)
# Configures Codex CLI to use 9Router LLM Gateway

set -e

# Configuration (auto-populated by server)
ENDPOINT_URL="\${BASE_URL}"
API_KEY="\${API_KEY}"
CODEX_SMALL="\${CODEX_SMALL_MODEL}"
CODEX_MEDIUM="\${CODEX_MEDIUM_MODEL}"
CODEX_LARGE="\${CODEX_LARGE_MODEL}"

# Colors
RED=$(printf '\033[0;31m')
GREEN=$(printf '\033[0;32m')
YELLOW=$(printf '\033[1;33m')
BLUE=$(printf '\033[0;34m')
NC=$(printf '\033[0m')

echo "\${BLUE}================================\${NC}"
echo "\${BLUE}  9Router - Codex CLI Setup\${NC}"
echo "\${BLUE}================================\${NC}"
echo ""

# Validate configuration
if [ -z "$ENDPOINT_URL" ]; then
    echo "\${RED}Error: Endpoint URL not configured\${NC}"
    echo "Please use the install link from your 9Router dashboard."
    exit 1
fi

if [ -z "$API_KEY" ]; then
    echo "\${RED}Error: API key not configured\${NC}"
    echo "Please use the install link from your 9Router dashboard."
    exit 1
fi

if [ -z "$CODEX_SMALL" ]; then
    echo "\${RED}Error: Small model not configured\${NC}"
    exit 1
fi

if [ -z "$CODEX_MEDIUM" ]; then
    echo "\${RED}Error: Medium (default) model not configured\${NC}"
    exit 1
fi

if [ -z "$CODEX_LARGE" ]; then
    echo "\${RED}Error: Large model not configured\${NC}"
    exit 1
fi

# Mask API key for display
MASKED_KEY=$(echo "$API_KEY" | cut -c 1-10)
echo "Endpoint URL:    \${GREEN}$ENDPOINT_URL\${NC}"
echo "API Key:         \${GREEN}\${MASKED_KEY}...\${NC}"
echo "Small (Fast):    \${GREEN}$CODEX_SMALL\${NC}"
echo "Medium (Default):\${GREEN}$CODEX_MEDIUM\${NC}"
echo "Large (Powerful):\${GREEN}$CODEX_LARGE\${NC}"
echo ""

# Check Node.js >= 22
echo "\${BLUE}Checking prerequisites...\${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo "\${RED}Error: Node.js is not installed\${NC}"
    echo ""
    echo "Codex CLI requires Node.js 22 or later."
    echo "Install Node.js from: \${BLUE}https://nodejs.org\${NC}"
    echo ""
    echo "  \${BLUE}macOS:\${NC}        brew install node"
    echo "  \${BLUE}Ubuntu/Debian:\${NC} curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

NODE_MAJOR=$(node --version | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 22 ] 2>/dev/null; then
    echo "\${RED}Error: Node.js 22+ is required (found $(node --version))\${NC}"
    echo ""
    echo "Please upgrade Node.js: \${BLUE}https://nodejs.org\${NC}"
    exit 1
fi
echo "  \${GREEN}✓ Node.js $(node --version)\${NC}"

# Check npm
if ! command -v npm >/dev/null 2>&1; then
    echo "\${RED}Error: npm is not installed\${NC}"
    echo "Please install npm (usually comes with Node.js)."
    exit 1
fi
echo "  \${GREEN}✓ npm $(npm --version)\${NC}"

# Install Codex CLI if not found
echo ""
# Ensure npm global bin is on PATH (needed for nvm/custom prefix)
NPM_GLOBAL_BIN=$(npm bin -g 2>/dev/null || npm prefix -g 2>/dev/null | xargs -I{} echo {}/bin)
if [ -n "$NPM_GLOBAL_BIN" ] && [ -d "$NPM_GLOBAL_BIN" ]; then
    export PATH="$NPM_GLOBAL_BIN:$PATH"
fi

if command -v codex >/dev/null 2>&1; then
    echo "\${BLUE}Codex CLI already installed\${NC}"
else
    echo "\${BLUE}Installing Codex CLI...\${NC}"
    npm install -g @openai/codex
    if command -v codex >/dev/null 2>&1; then
        echo "  \${GREEN}✓ Codex CLI installed\${NC}"
    else
        echo "\${YELLOW}Warning: Codex CLI installed but not found on PATH\${NC}"
        echo "You may need to restart your terminal or add npm global bin to PATH."
        echo "  npm global bin: \${BLUE}$NPM_GLOBAL_BIN\${NC}"
    fi
fi

# Setup ~/.codex directory
echo ""
echo "\${BLUE}Configuring Codex CLI...\${NC}"
CODEX_DIR="$HOME/.codex"
mkdir -p "$CODEX_DIR"

# Backup existing config.toml
if [ -f "$CODEX_DIR/config.toml" ]; then
    cp "$CODEX_DIR/config.toml" "$CODEX_DIR/config.toml.backup.$(date +%Y%m%d%H%M%S)"
    echo "  \${YELLOW}Backed up: ~/.codex/config.toml\${NC}"
fi

# Write config.toml
cat > "$CODEX_DIR/config.toml" << TOML_EOF
model = "$CODEX_MEDIUM"
model_provider = "9router"
model_catalog_json = "~/.codex/models.json"

[model_providers.9router]
name = "9Router"
base_url = "$ENDPOINT_URL/v1"
experimental_bearer_token = "$API_KEY"
wire_api = "responses"

[features]
apps = false
TOML_EOF
echo "  \${GREEN}✓ Written ~/.codex/config.toml\${NC}"

# Write models.json
cat > "$CODEX_DIR/models.json" << MODELS_EOF
{
  "models": [
    {
      "slug": "$CODEX_SMALL",
      "display_name": "$CODEX_SMALL",
      "description": "$CODEX_SMALL via 9Router (Fast)",
      "default_reasoning_level": "medium",
      "supported_reasoning_levels": [
        { "effort": "low", "description": "Minimal reasoning" },
        { "effort": "medium", "description": "Balanced reasoning" },
        { "effort": "high", "description": "Deep reasoning" },
        { "effort": "xhigh", "description": "Maximum reasoning" }
      ],
      "shell_type": "shell_command",
      "visibility": "list",
      "supported_in_api": true,
      "priority": 1,
      "availability_nux": null,
      "upgrade": null,
      "base_instructions": "",
      "model_messages": null,
      "supports_reasoning_summaries": false,
      "default_reasoning_summary": "auto",
      "support_verbosity": true,
      "default_verbosity": null,
      "apply_patch_tool_type": null,
      "web_search_tool_type": "text",
      "truncation_policy": { "mode": "tokens", "limit": 400000 },
      "supports_parallel_tool_calls": true,
      "supports_image_detail_original": false,
      "context_window": 400000,
      "auto_compact_token_limit": null,
      "effective_context_window_percent": 95,
      "experimental_supported_tools": [],
      "input_modalities": ["text", "image"],
      "supports_search_tool": false
    },
    {
      "slug": "$CODEX_MEDIUM",
      "display_name": "$CODEX_MEDIUM",
      "description": "$CODEX_MEDIUM via 9Router (Default)",
      "default_reasoning_level": "medium",
      "supported_reasoning_levels": [
        { "effort": "low", "description": "Minimal reasoning" },
        { "effort": "medium", "description": "Balanced reasoning" },
        { "effort": "high", "description": "Deep reasoning" },
        { "effort": "xhigh", "description": "Maximum reasoning" }
      ],
      "shell_type": "shell_command",
      "visibility": "list",
      "supported_in_api": true,
      "priority": 2,
      "availability_nux": null,
      "upgrade": null,
      "base_instructions": "",
      "model_messages": null,
      "supports_reasoning_summaries": false,
      "default_reasoning_summary": "auto",
      "support_verbosity": true,
      "default_verbosity": null,
      "apply_patch_tool_type": null,
      "web_search_tool_type": "text",
      "truncation_policy": { "mode": "tokens", "limit": 400000 },
      "supports_parallel_tool_calls": true,
      "supports_image_detail_original": false,
      "context_window": 400000,
      "auto_compact_token_limit": null,
      "effective_context_window_percent": 95,
      "experimental_supported_tools": [],
      "input_modalities": ["text", "image"],
      "supports_search_tool": false
    },
    {
      "slug": "$CODEX_LARGE",
      "display_name": "$CODEX_LARGE",
      "description": "$CODEX_LARGE via 9Router (Powerful)",
      "default_reasoning_level": "medium",
      "supported_reasoning_levels": [
        { "effort": "low", "description": "Minimal reasoning" },
        { "effort": "medium", "description": "Balanced reasoning" },
        { "effort": "high", "description": "Deep reasoning" },
        { "effort": "xhigh", "description": "Maximum reasoning" }
      ],
      "shell_type": "shell_command",
      "visibility": "list",
      "supported_in_api": true,
      "priority": 3,
      "availability_nux": null,
      "upgrade": null,
      "base_instructions": "",
      "model_messages": null,
      "supports_reasoning_summaries": false,
      "default_reasoning_summary": "auto",
      "support_verbosity": true,
      "default_verbosity": null,
      "apply_patch_tool_type": null,
      "web_search_tool_type": "text",
      "truncation_policy": { "mode": "tokens", "limit": 400000 },
      "supports_parallel_tool_calls": true,
      "supports_image_detail_original": false,
      "context_window": 400000,
      "auto_compact_token_limit": null,
      "effective_context_window_percent": 95,
      "experimental_supported_tools": [],
      "input_modalities": ["text", "image"],
      "supports_search_tool": false
    }
  ]
}
MODELS_EOF
echo "  \${GREEN}✓ Written ~/.codex/models.json\${NC}"

# Write auth.json only if missing or empty (preserve existing auth state)
if [ ! -f "$CODEX_DIR/auth.json" ] || [ ! -s "$CODEX_DIR/auth.json" ]; then
    echo '{}' > "$CODEX_DIR/auth.json"
    echo "  \${GREEN}✓ Written ~/.codex/auth.json\${NC}"
else
    echo "  \${GREEN}✓ Kept existing ~/.codex/auth.json\${NC}"
fi

# Remove models cache to prevent stale OpenAI models
if [ -f "$CODEX_DIR/models_cache.json" ]; then
    rm -f "$CODEX_DIR/models_cache.json"
    echo "  \${GREEN}✓ Removed ~/.codex/models_cache.json\${NC}"
fi

echo ""
echo "\${GREEN}================================\${NC}"
echo "\${GREEN}  Configuration Complete!\${NC}"
echo "\${GREEN}================================\${NC}"
echo ""
echo "Codex CLI is now configured to use 9Router:"
echo "  Endpoint:          \${BLUE}$ENDPOINT_URL/v1\${NC}"
echo "  API Key:           \${BLUE}\${MASKED_KEY}...\${NC}"
echo "  Small (Fast):      \${BLUE}$CODEX_SMALL\${NC}"
echo "  Medium (Default):  \${BLUE}$CODEX_MEDIUM\${NC}"
echo "  Large (Powerful):  \${BLUE}$CODEX_LARGE\${NC}"
echo ""
echo "\${YELLOW}Next steps:\${NC}"
echo "  Run: \${BLUE}codex\${NC}"
echo ""
`.replaceAll("\\${", "${");

// ── Unix Uninstall ────────────────────────────────────────────────────────────
const unixUninstallScript = String.raw`#!/bin/sh

# 9Router Cleaner for Codex CLI (Linux/macOS)
# Removes 9Router configuration from Codex CLI.
# Preserves ~/.codex/auth.json so users keep their own Codex auth state.

set -e

# Colors
RED=$(printf '\033[0;31m')
GREEN=$(printf '\033[0;32m')
YELLOW=$(printf '\033[1;33m')
BLUE=$(printf '\033[0;34m')
NC=$(printf '\033[0m')

echo "\${BLUE}================================\${NC}"
echo "\${BLUE}  9Router - Codex CLI Clear\${NC}"
echo "\${BLUE}================================\${NC}"
echo ""

CODEX_DIR="$HOME/.codex"

if [ ! -d "$CODEX_DIR" ]; then
    echo "\${YELLOW}Nothing to clear: $CODEX_DIR does not exist.\${NC}"
    exit 0
fi

echo "\${YELLOW}Clearing 9Router configuration from $CODEX_DIR...\${NC}"
echo ""

removed_any=0

# Helper: backup then remove a file
backup_and_remove() {
    f_path="$1"
    if [ -f "$f_path" ]; then
        cp "$f_path" "\${f_path}.backup.$(date +%Y%m%d%H%M%S)"
        rm -f "$f_path"
        echo "  \${GREEN}- Removed:\${NC} $f_path \${YELLOW}(backup saved)\${NC}"
        removed_any=1
    else
        echo "  \${BLUE}- Skip:\${NC} $f_path (not found)"
    fi
}

backup_and_remove "$CODEX_DIR/config.toml"
backup_and_remove "$CODEX_DIR/models.json"

# models_cache.json is a Codex-generated cache; no backup needed.
if [ -f "$CODEX_DIR/models_cache.json" ]; then
    rm -f "$CODEX_DIR/models_cache.json"
    echo "  \${GREEN}- Removed:\${NC} $CODEX_DIR/models_cache.json"
    removed_any=1
else
    echo "  \${BLUE}- Skip:\${NC} $CODEX_DIR/models_cache.json (not found)"
fi

# Preserve auth.json
if [ -f "$CODEX_DIR/auth.json" ]; then
    echo "  \${GREEN}- Kept:\${NC}    $CODEX_DIR/auth.json \${YELLOW}(preserved)\${NC}"
fi

echo ""
if [ "$removed_any" = "1" ]; then
    echo "\${GREEN}================================\${NC}"
    echo "\${GREEN}  Clear Complete!\${NC}"
    echo "\${GREEN}================================\${NC}"
else
    echo "\${YELLOW}================================\${NC}"
    echo "\${YELLOW}  Nothing was removed.\${NC}"
    echo "\${YELLOW}================================\${NC}"
fi
echo ""
echo "9Router configuration has been removed from Codex CLI."
echo "Your Codex auth state (auth.json) was preserved."
echo ""
echo "\${YELLOW}Next steps:\${NC}"
echo "  Re-run the setup command from your 9Router dashboard"
echo "  to use a 9Router API key with Codex again."
echo ""
`.replaceAll("\\${", "${");

// ── Windows Install ───────────────────────────────────────────────────────────
// Use String.raw but escape the 2 PowerShell backtick-newline sequences we need.
const windowsInstallScript = (
  String.raw`# 9Router Installer for Codex CLI (Windows PowerShell 5.1+)
# Configures Codex CLI to use 9Router LLM Gateway

$ErrorActionPreference = "Stop"

# Configuration (auto-populated by server)
$ENDPOINT_URL = $env:BASE_URL
$API_KEY = $env:API_KEY
$CODEX_SMALL = $env:CODEX_SMALL_MODEL
$CODEX_MEDIUM = $env:CODEX_MEDIUM_MODEL
$CODEX_LARGE = $env:CODEX_LARGE_MODEL

Write-Host "================================" -ForegroundColor Blue
Write-Host "  9Router - Codex CLI Setup" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

# Validate configuration
if ([string]::IsNullOrWhiteSpace($ENDPOINT_URL)) {
    Write-Host "Error: Endpoint URL not configured" -ForegroundColor Red
    Write-Host "Please use the install link from your 9Router dashboard."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($API_KEY)) {
    Write-Host "Error: API key not configured" -ForegroundColor Red
    Write-Host "Please use the install link from your 9Router dashboard."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($CODEX_SMALL)) {
    Write-Host "Error: Small model not configured" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($CODEX_MEDIUM)) {
    Write-Host "Error: Medium (default) model not configured" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($CODEX_LARGE)) {
    Write-Host "Error: Large model not configured" -ForegroundColor Red
    exit 1
}

# Mask API key for display
$MASKED_KEY = $API_KEY.Substring(0, [Math]::Min(10, $API_KEY.Length))
Write-Host "Endpoint URL:     " -NoNewline
Write-Host "$ENDPOINT_URL" -ForegroundColor Green
Write-Host "API Key:          " -NoNewline
Write-Host "$MASKED_KEY..." -ForegroundColor Green
Write-Host "Small (Fast):     " -NoNewline
Write-Host "$CODEX_SMALL" -ForegroundColor Green
Write-Host "Medium (Default): " -NoNewline
Write-Host "$CODEX_MEDIUM" -ForegroundColor Green
Write-Host "Large (Powerful): " -NoNewline
Write-Host "$CODEX_LARGE" -ForegroundColor Green
Write-Host ""

# Check Node.js >= 22
Write-Host "Checking prerequisites..." -ForegroundColor Blue

try {
    $nodeVersion = node --version 2>$null
} catch {
    $nodeVersion = $null
}

if (-not $nodeVersion) {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Codex CLI requires Node.js 22 or later."
    Write-Host "Download from: https://nodejs.org"
    exit 1
}

$nodeMajor = [int]($nodeVersion -replace '^v','').Split('.')[0]
if ($nodeMajor -lt 22) {
    Write-Host "Error: Node.js 22+ is required (found $nodeVersion)" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org"
    exit 1
}
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Node.js $nodeVersion"

# Check npm
try {
    $npmVersion = npm --version 2>$null
} catch {
    $npmVersion = $null
}

if (-not $npmVersion) {
    Write-Host "Error: npm is not installed" -ForegroundColor Red
    Write-Host "Please install npm (usually comes with Node.js)."
    exit 1
}
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " npm $npmVersion"

# Install Codex CLI if not found
Write-Host ""
# Ensure npm global prefix is on PATH (Windows shims live at prefix dir directly)
$npmGlobalBin = try { (npm config get prefix 2>$null).Trim() } catch { $null }
if ($npmGlobalBin -and (Test-Path $npmGlobalBin)) {
    $env:PATH = "$npmGlobalBin;$env:PATH"
}

$codexCmd = Get-Command codex -ErrorAction SilentlyContinue
if ($codexCmd) {
    Write-Host "Codex CLI already installed" -ForegroundColor Blue
} else {
    Write-Host "Installing Codex CLI..." -ForegroundColor Blue
    npm install -g @openai/codex
    $codexCmd = Get-Command codex -ErrorAction SilentlyContinue
    if ($codexCmd) {
        Write-Host "  " -NoNewline
        Write-Host "OK" -ForegroundColor Green -NoNewline
        Write-Host " Codex CLI installed"
    } else {
        Write-Host "Warning: Codex CLI installed but not found on PATH" -ForegroundColor Yellow
        Write-Host "You may need to restart your terminal or add npm global bin to PATH."
    }
}

# Setup ~/.codex directory
Write-Host ""
Write-Host "Configuring Codex CLI..." -ForegroundColor Blue
$codexDir = Join-Path $env:USERPROFILE ".codex"
if (-not (Test-Path $codexDir)) {
    New-Item -ItemType Directory -Path $codexDir -Force | Out-Null
}

# Backup existing config.toml
$configPath = Join-Path $codexDir "config.toml"
if (Test-Path $configPath) {
    $backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $configPath $backupPath
    Write-Host "  Backed up: $configPath" -ForegroundColor Yellow
}

# Write config.toml
$configContent = @"
model = "$CODEX_MEDIUM"
model_provider = "9router"
model_catalog_json = "~/.codex/models.json"

[model_providers.9router]
name = "9Router"
base_url = "$ENDPOINT_URL/v1"
experimental_bearer_token = "$API_KEY"
wire_api = "responses"

[features]
apps = false
"@
[System.IO.File]::WriteAllText($configPath, $configContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Written config.toml"

# Write models.json
$modelsPath = Join-Path $codexDir "models.json"
$modelsContent = @"
{
  "models": [
    {
      "slug": "$CODEX_SMALL",
      "display_name": "$CODEX_SMALL",
      "description": "$CODEX_SMALL via 9Router (Fast)",
      "default_reasoning_level": "medium",
      "supported_reasoning_levels": [
        { "effort": "low", "description": "Minimal reasoning" },
        { "effort": "medium", "description": "Balanced reasoning" },
        { "effort": "high", "description": "Deep reasoning" },
        { "effort": "xhigh", "description": "Maximum reasoning" }
      ],
      "shell_type": "shell_command",
      "visibility": "list",
      "supported_in_api": true,
      "priority": 1,
      "availability_nux": null,
      "upgrade": null,
      "base_instructions": "",
      "model_messages": null,
      "supports_reasoning_summaries": false,
      "default_reasoning_summary": "auto",
      "support_verbosity": true,
      "default_verbosity": null,
      "apply_patch_tool_type": null,
      "web_search_tool_type": "text",
      "truncation_policy": { "mode": "tokens", "limit": 400000 },
      "supports_parallel_tool_calls": true,
      "supports_image_detail_original": false,
      "context_window": 400000,
      "auto_compact_token_limit": null,
      "effective_context_window_percent": 95,
      "experimental_supported_tools": [],
      "input_modalities": ["text", "image"],
      "supports_search_tool": false
    },
    {
      "slug": "$CODEX_MEDIUM",
      "display_name": "$CODEX_MEDIUM",
      "description": "$CODEX_MEDIUM via 9Router (Default)",
      "default_reasoning_level": "medium",
      "supported_reasoning_levels": [
        { "effort": "low", "description": "Minimal reasoning" },
        { "effort": "medium", "description": "Balanced reasoning" },
        { "effort": "high", "description": "Deep reasoning" },
        { "effort": "xhigh", "description": "Maximum reasoning" }
      ],
      "shell_type": "shell_command",
      "visibility": "list",
      "supported_in_api": true,
      "priority": 2,
      "availability_nux": null,
      "upgrade": null,
      "base_instructions": "",
      "model_messages": null,
      "supports_reasoning_summaries": false,
      "default_reasoning_summary": "auto",
      "support_verbosity": true,
      "default_verbosity": null,
      "apply_patch_tool_type": null,
      "web_search_tool_type": "text",
      "truncation_policy": { "mode": "tokens", "limit": 400000 },
      "supports_parallel_tool_calls": true,
      "supports_image_detail_original": false,
      "context_window": 400000,
      "auto_compact_token_limit": null,
      "effective_context_window_percent": 95,
      "experimental_supported_tools": [],
      "input_modalities": ["text", "image"],
      "supports_search_tool": false
    },
    {
      "slug": "$CODEX_LARGE",
      "display_name": "$CODEX_LARGE",
      "description": "$CODEX_LARGE via 9Router (Powerful)",
      "default_reasoning_level": "medium",
      "supported_reasoning_levels": [
        { "effort": "low", "description": "Minimal reasoning" },
        { "effort": "medium", "description": "Balanced reasoning" },
        { "effort": "high", "description": "Deep reasoning" },
        { "effort": "xhigh", "description": "Maximum reasoning" }
      ],
      "shell_type": "shell_command",
      "visibility": "list",
      "supported_in_api": true,
      "priority": 3,
      "availability_nux": null,
      "upgrade": null,
      "base_instructions": "",
      "model_messages": null,
      "supports_reasoning_summaries": false,
      "default_reasoning_summary": "auto",
      "support_verbosity": true,
      "default_verbosity": null,
      "apply_patch_tool_type": null,
      "web_search_tool_type": "text",
      "truncation_policy": { "mode": "tokens", "limit": 400000 },
      "supports_parallel_tool_calls": true,
      "supports_image_detail_original": false,
      "context_window": 400000,
      "auto_compact_token_limit": null,
      "effective_context_window_percent": 95,
      "experimental_supported_tools": [],
      "input_modalities": ["text", "image"],
      "supports_search_tool": false
    }
  ]
}
"@
[System.IO.File]::WriteAllText($modelsPath, $modelsContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Written models.json"

# Write auth.json only if missing or empty (preserve existing auth state)
$authPath = Join-Path $codexDir "auth.json"
if (-not (Test-Path $authPath) -or (Get-Item $authPath).Length -eq 0) {
    [System.IO.File]::WriteAllText($authPath, "{}", [System.Text.UTF8Encoding]::new($false))
    Write-Host "  " -NoNewline
    Write-Host "OK" -ForegroundColor Green -NoNewline
    Write-Host " Written auth.json"
} else {
    Write-Host "  " -NoNewline
    Write-Host "OK" -ForegroundColor Green -NoNewline
    Write-Host " Kept existing auth.json"
}

# Remove models cache to prevent stale OpenAI models
$cachePath = Join-Path $codexDir "models_cache.json"
if (Test-Path $cachePath) {
    Remove-Item $cachePath -Force
    Write-Host "  " -NoNewline
    Write-Host "OK" -ForegroundColor Green -NoNewline
    Write-Host " Removed models_cache.json"
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Codex CLI is now configured to use 9Router:"
Write-Host "  Endpoint:          " -NoNewline
Write-Host "$ENDPOINT_URL/v1" -ForegroundColor Blue
Write-Host "  API Key:           " -NoNewline
Write-Host "$MASKED_KEY..." -ForegroundColor Blue
Write-Host "  Small (Fast):      " -NoNewline
Write-Host "$CODEX_SMALL" -ForegroundColor Blue
Write-Host "  Medium (Default):  " -NoNewline
Write-Host "$CODEX_MEDIUM" -ForegroundColor Blue
Write-Host "  Large (Powerful):  " -NoNewline
Write-Host "$CODEX_LARGE" -ForegroundColor Blue
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  Run: " -NoNewline
Write-Host "codex" -ForegroundColor Blue
Write-Host ""`
);

// ── Windows Uninstall ─────────────────────────────────────────────────────────
const windowsUninstallScript = String.raw`# 9Router Cleaner for Codex CLI (Windows PowerShell 5.1+)
# Removes 9Router configuration from Codex CLI.
# Preserves $env:USERPROFILE\.codex\auth.json so users keep their own Codex auth state.

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Blue
Write-Host "  9Router - Codex CLI Clear" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

$codexDir = Join-Path $env:USERPROFILE ".codex"

if (-not (Test-Path $codexDir)) {
    Write-Host "Nothing to clear: $codexDir does not exist." -ForegroundColor Yellow
    exit 0
}

Write-Host "Clearing 9Router configuration from $codexDir..." -ForegroundColor Yellow
Write-Host ""

$removedAny = $false
$stamp = Get-Date -Format "yyyyMMddHHmmss"

function Backup-And-Remove {
    param([string]$Path)
    if (Test-Path $Path) {
        $backup = "$Path.backup.$stamp"
        Copy-Item -Path $Path -Destination $backup -Force
        Remove-Item -Path $Path -Force
        Write-Host "  - Removed: " -NoNewline -ForegroundColor Green
        Write-Host "$Path " -NoNewline
        Write-Host "(backup saved)" -ForegroundColor Yellow
        $script:removedAny = $true
    } else {
        Write-Host "  - Skip: " -NoNewline -ForegroundColor Blue
        Write-Host "$Path (not found)"
    }
}

Backup-And-Remove (Join-Path $codexDir "config.toml")
Backup-And-Remove (Join-Path $codexDir "models.json")

# models_cache.json is a Codex-generated cache; no backup needed.
$cachePath = Join-Path $codexDir "models_cache.json"
if (Test-Path $cachePath) {
    Remove-Item -Path $cachePath -Force
    Write-Host "  - Removed: " -NoNewline -ForegroundColor Green
    Write-Host "$cachePath"
    $removedAny = $true
} else {
    Write-Host "  - Skip: " -NoNewline -ForegroundColor Blue
    Write-Host "$cachePath (not found)"
}

# Preserve auth.json
$authPath = Join-Path $codexDir "auth.json"
if (Test-Path $authPath) {
    Write-Host "  - Kept:    " -NoNewline -ForegroundColor Green
    Write-Host "$authPath " -NoNewline
    Write-Host "(preserved)" -ForegroundColor Yellow
}

Write-Host ""
if ($removedAny) {
    Write-Host "================================" -ForegroundColor Green
    Write-Host "  Clear Complete!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
} else {
    Write-Host "================================" -ForegroundColor Yellow
    Write-Host "  Nothing was removed." -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "9Router configuration has been removed from Codex CLI."
Write-Host "Your Codex auth state (auth.json) was preserved."
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  Re-run the setup command from your 9Router dashboard"
Write-Host "  to use a 9Router API key with Codex again."
Write-Host ""`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "unix";
  const mode = searchParams.get("mode") || "install";

  let script;
  if (platform === "windows") {
    script = mode === "uninstall" ? windowsUninstallScript : windowsInstallScript;
  } else {
    script = mode === "uninstall" ? unixUninstallScript : unixInstallScript;
  }

  return new NextResponse(script, { headers: SCRIPT_HEADERS });
}
