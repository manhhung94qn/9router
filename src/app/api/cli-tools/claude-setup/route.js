const SCRIPT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
};

const RESET_ENV_KEYS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "API_TIMEOUT_MS",
];

const unixInstallScript = String.raw`#!/bin/sh
# 9Router Proxy — Claude Code Setup Script (macOS/Linux)
# Auto-generated — configures Claude Code to use your 9Router Proxy API key

set -e

RED=$(printf '\033[0;31m')
GREEN=$(printf '\033[0;32m')
YELLOW=$(printf '\033[1;33m')
BLUE=$(printf '\033[0;34m')
NC=$(printf '\033[0m')

echo "\${BLUE}================================\${NC}"
echo "\${BLUE}  9Router Proxy Claude Code Setup\${NC}"
echo "\${BLUE}================================\${NC}"
echo ""

ENDPOINT_URL="\${BASE_URL:-}"
API_KEY="\${API_KEY:-}"
OPUS_MODEL="\${OPUS_MODEL:-}"
SONNET_MODEL="\${SONNET_MODEL:-}"
HAIKU_MODEL="\${HAIKU_MODEL:-}"

if [ -z "$ENDPOINT_URL" ]; then
  echo "\${RED}Error: BASE_URL is required\${NC}"
  exit 1
fi
if [ -z "$API_KEY" ]; then
  echo "\${RED}Error: API_KEY is required\${NC}"
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "\${RED}Error: Node.js is required to update Claude Code settings automatically.\${NC}"
  echo "Install Node.js first, then run this command again."
  exit 1
fi

case "$ENDPOINT_URL" in
  */v1) ;;
  */v1/) ENDPOINT_URL="\${ENDPOINT_URL%/}" ;;
  *) ENDPOINT_URL="\${ENDPOINT_URL%/}/v1" ;;
esac

MASKED_KEY=$(printf '%s' "$API_KEY" | cut -c 1-10)
echo "Endpoint URL: \${GREEN}$ENDPOINT_URL\${NC}"
echo "API Key:      \${GREEN}\${MASKED_KEY}...\${NC}"
echo ""

export ENDPOINT_URL API_KEY OPUS_MODEL SONNET_MODEL HAIKU_MODEL

node <<'NODE'
const fs = require('fs');
const path = require('path');
const os = require('os');

const settingsDir = path.join(os.homedir(), '.claude');
const settingsPath = path.join(settingsDir, 'settings.json');

fs.mkdirSync(settingsDir, { recursive: true });

let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
  } catch (error) {
    console.error('Error: could not parse ' + settingsPath + '. Please fix or back it up before running setup.');
    process.exit(1);
  }
}

settings.hasCompletedOnboarding = true;
settings.env = settings.env && typeof settings.env === 'object' && !Array.isArray(settings.env)
  ? settings.env
  : {};

settings.env.ANTHROPIC_BASE_URL = process.env.ENDPOINT_URL;
settings.env.ANTHROPIC_AUTH_TOKEN = process.env.API_KEY;
if (process.env.OPUS_MODEL) settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = process.env.OPUS_MODEL;
if (process.env.SONNET_MODEL) settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = process.env.SONNET_MODEL;
if (process.env.HAIKU_MODEL) settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = process.env.HAIKU_MODEL;

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('  ✓ Updated ' + settingsPath);
NODE

echo ""
echo "\${GREEN}================================\${NC}"
echo "\${GREEN}  Configuration Complete!\${NC}"
echo "\${GREEN}================================\${NC}"
echo ""
echo "Claude Code is now configured for 9Router Proxy."
echo "\${YELLOW}Next steps:\${NC}"
echo "  1. Restart Claude Code or open a new terminal"
echo "  2. Run: \${BLUE}claude\${NC}"
echo ""
`.replaceAll("\\${", "${");

const unixUninstallScript = String.raw`#!/bin/sh
# 9Router Proxy Uninstaller for Claude Code
# Removes 9Router Proxy configuration from Claude Code

set -e

RED=$(printf '\033[0;31m')
GREEN=$(printf '\033[0;32m')
YELLOW=$(printf '\033[1;33m')
BLUE=$(printf '\033[0;34m')
NC=$(printf '\033[0m')

echo "\${BLUE}================================\${NC}"
echo "\${BLUE}  9Router Proxy Uninstall\${NC}"
echo "\${BLUE}================================\${NC}"
echo ""

backup_file() {
    f_path="$1"
    if [ -f "$f_path" ]; then
        cp "$f_path" "\${f_path}.backup.$(date +%Y%m%d%H%M%S)"
        echo "\${YELLOW}  Backed up: $f_path\${NC}"
    fi
}

remove_claude_vars() {
    f_path="$1"
    if [ -f "$f_path" ]; then
        sed '/^[[:space:]]*export ANTHROPIC_/d' "$f_path" > "\${f_path}.tmp" && mv "\${f_path}.tmp" "$f_path"
        sed '/^# 9Router Proxy configuration/d' "$f_path" > "\${f_path}.tmp" && mv "\${f_path}.tmp" "$f_path"
        sed '/^# Claude Code configuration/d' "$f_path" > "\${f_path}.tmp" && mv "\${f_path}.tmp" "$f_path"
        rm -f "\${f_path}.tmp" 2>/dev/null || true
    fi
}

remove_settings_json() {
    settings_file="$HOME/.claude/settings.json"

    if [ -f "$settings_file" ]; then
        backup_file "$settings_file"

        if command -v jq >/dev/null 2>&1; then
            tmp_file=$(mktemp)
            jq 'del(.env.ANTHROPIC_BASE_URL) |
                del(.env.ANTHROPIC_AUTH_TOKEN) |
                del(.env.ANTHROPIC_DEFAULT_HAIKU_MODEL) |
                del(.env.ANTHROPIC_DEFAULT_OPUS_MODEL) |
                del(.env.ANTHROPIC_DEFAULT_SONNET_MODEL) |
                del(.env.CLAUDE_CODE_DISABLE_1M_CONTEXT) |
                del(.disableLoginPrompt) |
                del(.statusLine) |
                if .env == {} then del(.env) else . end' "$settings_file" > "$tmp_file" && mv "$tmp_file" "$settings_file"
        else
            echo "\${YELLOW}  Warning: jq not installed, skipping settings.json cleanup\${NC}"
            echo "\${YELLOW}  Install jq: sudo apt install jq  (or brew install jq)\${NC}"
        fi
    fi
}

echo "\${YELLOW}Removing 9Router Proxy configuration...\${NC}"
echo ""

for rc_file in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.profile" "$HOME/.zprofile"; do
    if [ -f "$rc_file" ]; then
        echo "  Processing $rc_file"
        backup_file "$rc_file"
        remove_claude_vars "$rc_file"
        echo "  \${GREEN}✓ Cleaned $rc_file\${NC}"
    fi
done

echo "  Processing ~/.claude/settings.json"
remove_settings_json
echo "  \${GREEN}✓ Cleaned ~/.claude/settings.json\${NC}"

if [ -f "$HOME/.claude/statusline.sh" ]; then
    rm -f "$HOME/.claude/statusline.sh"
    echo "  \${GREEN}✓ Removed ~/.claude/statusline.sh\${NC}"
fi

echo ""
echo "\${GREEN}================================\${NC}"
echo "\${GREEN}  Uninstall Complete!\${NC}"
echo "\${GREEN}================================\${NC}"
echo ""
echo "9Router Proxy configuration has been removed from Claude Code."
echo ""
echo "\${YELLOW}Next steps:\${NC}"
echo "  1. Restart your terminal or run: \${BLUE}source ~/.bashrc\${NC}"
echo "  2. Log in to Claude Code: \${BLUE}claude login\${NC}"
echo ""
`.replaceAll("\\${", "${");

const windowsInstallScript = String.raw`# 9Router Proxy — Claude Code Setup Script (Windows PowerShell 5.1+)
# Auto-generated — configures Claude Code to use your 9Router Proxy API key

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Blue
Write-Host "  9Router Proxy Claude Code Setup" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

$ENDPOINT_URL = $env:BASE_URL
$API_KEY = $env:API_KEY
$OPUS_MODEL = $env:OPUS_MODEL
$SONNET_MODEL = $env:SONNET_MODEL
$HAIKU_MODEL = $env:HAIKU_MODEL

if ([string]::IsNullOrWhiteSpace($ENDPOINT_URL)) {
    Write-Host "Error: BASE_URL is required" -ForegroundColor Red
    exit 1
}
if ([string]::IsNullOrWhiteSpace($API_KEY)) {
    Write-Host "Error: API_KEY is required" -ForegroundColor Red
    exit 1
}

$ENDPOINT_URL = $ENDPOINT_URL.TrimEnd('/')
if (-not $ENDPOINT_URL.EndsWith('/v1')) {
    $ENDPOINT_URL = "$ENDPOINT_URL/v1"
}

$MASKED_KEY = $API_KEY.Substring(0, [Math]::Min(10, $API_KEY.Length))
Write-Host "Endpoint URL: " -NoNewline
Write-Host $ENDPOINT_URL -ForegroundColor Green
Write-Host "API Key:      " -NoNewline
Write-Host "$MASKED_KEY..." -ForegroundColor Green
Write-Host ""

$settingsDir = Join-Path $HOME ".claude"
$settingsPath = Join-Path $settingsDir "settings.json"

if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

$settings = $null
if (Test-Path $settingsPath) {
    try {
        $content = Get-Content $settingsPath -Raw -ErrorAction Stop
        if (-not [string]::IsNullOrWhiteSpace($content)) {
            $settings = $content | ConvertFrom-Json -ErrorAction Stop
        }
    } catch {
        Write-Host "Error: could not parse $settingsPath. Please fix or back it up before running setup." -ForegroundColor Red
        exit 1
    }
}

if ($null -eq $settings) {
    $settings = New-Object PSObject
}

function Set-Prop {
    param($Obj, [string]$Name, $Value)
    if ($null -eq ($Obj.PSObject.Properties[$Name])) {
        $Obj | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
    } else {
        $Obj.$Name = $Value
    }
}

Set-Prop $settings "hasCompletedOnboarding" $true
if ($null -eq $settings.PSObject.Properties["env"] -or $null -eq $settings.env) {
    Set-Prop $settings "env" (New-Object PSObject)
}

Set-Prop $settings.env "ANTHROPIC_BASE_URL" $ENDPOINT_URL
Set-Prop $settings.env "ANTHROPIC_AUTH_TOKEN" $API_KEY
if (-not [string]::IsNullOrWhiteSpace($OPUS_MODEL)) { Set-Prop $settings.env "ANTHROPIC_DEFAULT_OPUS_MODEL" $OPUS_MODEL }
if (-not [string]::IsNullOrWhiteSpace($SONNET_MODEL)) { Set-Prop $settings.env "ANTHROPIC_DEFAULT_SONNET_MODEL" $SONNET_MODEL }
if (-not [string]::IsNullOrWhiteSpace($HAIKU_MODEL)) { Set-Prop $settings.env "ANTHROPIC_DEFAULT_HAIKU_MODEL" $HAIKU_MODEL }

$jsonContent = $settings | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($settingsPath, $jsonContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "  OK Updated $settingsPath" -ForegroundColor Green
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Claude Code is now configured for 9Router Proxy."
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart Claude Code or open a new terminal"
Write-Host "  2. Run: " -NoNewline
Write-Host "claude" -ForegroundColor Blue
Write-Host ""
`;

const windowsUninstallScript = String.raw`# 9Router Proxy Uninstaller for Claude Code (Windows PowerShell 5.1+)
# Removes 9Router Proxy configuration from Claude Code

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Blue
Write-Host "  9Router Proxy Uninstall" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Removing environment variables..." -ForegroundColor Yellow

[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", $null, "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", $null, "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_DEFAULT_HAIKU_MODEL", $null, "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_DEFAULT_OPUS_MODEL", $null, "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_DEFAULT_SONNET_MODEL", $null, "User")

Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Removed ANTHROPIC_BASE_URL"
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Removed ANTHROPIC_AUTH_TOKEN"
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Removed ANTHROPIC_DEFAULT_HAIKU_MODEL"
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Removed ANTHROPIC_DEFAULT_OPUS_MODEL"
Write-Host "  " -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host " Removed ANTHROPIC_DEFAULT_SONNET_MODEL"

Remove-Item Env:ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_DEFAULT_HAIKU_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_DEFAULT_OPUS_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_DEFAULT_SONNET_MODEL -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Cleaning Claude Code settings..." -ForegroundColor Yellow

$settingsPath = Join-Path $env:USERPROFILE ".claude\settings.json"

if (Test-Path $settingsPath) {
    $backupPath = "$settingsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $settingsPath $backupPath
    Write-Host "  Backed up: $settingsPath" -ForegroundColor Yellow

    try {
        $content = Get-Content $settingsPath -Raw -ErrorAction Stop
        if ($content) {
            $settings = ConvertFrom-Json $content

            if (Get-Member -InputObject $settings -Name "env" -MemberType Properties) {
                $envObj = $settings.env
                $newEnv = New-Object PSObject
                $envObj.PSObject.Properties | ForEach-Object {
                    if ($_.Name -ne "ANTHROPIC_BASE_URL" -and
                        $_.Name -ne "ANTHROPIC_AUTH_TOKEN" -and
                        $_.Name -ne "ANTHROPIC_DEFAULT_HAIKU_MODEL" -and
                        $_.Name -ne "ANTHROPIC_DEFAULT_OPUS_MODEL" -and
                        $_.Name -ne "ANTHROPIC_DEFAULT_SONNET_MODEL" -and
                        $_.Name -ne "CLAUDE_CODE_DISABLE_1M_CONTEXT") {
                        $newEnv | Add-Member -MemberType NoteProperty -Name $_.Name -Value $_.Value
                    }
                }

                if (($newEnv.PSObject.Properties | Measure-Object).Count -eq 0) {
                    $cleanSettings = New-Object PSObject
                    $settings.PSObject.Properties | ForEach-Object {
                        if ($_.Name -ne "env") {
                            $cleanSettings | Add-Member -MemberType NoteProperty -Name $_.Name -Value $_.Value
                        }
                    }
                    $settings = $cleanSettings
                } else {
                    $settings.env = $newEnv
                }
            }

            $propsToRemove = @("disableLoginPrompt", "statusLine")
            $hasPropsToRemove = $false
            foreach ($prop in $propsToRemove) {
                if (Get-Member -InputObject $settings -Name $prop -MemberType Properties) {
                    $hasPropsToRemove = $true
                    break
                }
            }
            if ($hasPropsToRemove) {
                $newSettings = New-Object PSObject
                $settings.PSObject.Properties | ForEach-Object {
                    if ($_.Name -notin $propsToRemove) {
                        $newSettings | Add-Member -MemberType NoteProperty -Name $_.Name -Value $_.Value
                    }
                }
                $settings = $newSettings
            }

            $jsonContent = $settings | ConvertTo-Json -Depth 10
            [System.IO.File]::WriteAllText($settingsPath, $jsonContent, [System.Text.UTF8Encoding]::new($false))

            Write-Host "  " -NoNewline
            Write-Host "OK" -ForegroundColor Green -NoNewline
            Write-Host " Cleaned $settingsPath"
        }
    } catch {
        Write-Host "  Warning: Could not parse settings.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "  settings.json not found, skipping" -ForegroundColor Yellow
}

$statuslinePath = Join-Path $env:USERPROFILE ".claude\statusline.ps1"
if (Test-Path $statuslinePath) {
    Remove-Item $statuslinePath -Force
    Write-Host "  " -NoNewline
    Write-Host "OK" -ForegroundColor Green -NoNewline
    Write-Host " Removed $statuslinePath"
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  Uninstall Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "9Router Proxy configuration has been removed from Claude Code."
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart PowerShell or open a new terminal"
Write-Host "  2. Log in to Claude Code: " -NoNewline
Write-Host "claude login" -ForegroundColor Blue
Write-Host ""
`;

const scripts = {
  unix: {
    install: unixInstallScript,
    uninstall: unixUninstallScript,
  },
  windows: {
    install: windowsInstallScript,
    uninstall: windowsUninstallScript,
  },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const mode = searchParams.get("mode");

  if (!scripts[platform]?.[mode]) {
    return new Response("Invalid platform or mode. Expected platform=unix|windows and mode=install|uninstall.\n", {
      status: 400,
      headers: SCRIPT_HEADERS,
    });
  }

  return new Response(scripts[platform][mode], { headers: SCRIPT_HEADERS });
}
