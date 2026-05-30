"use client";

import { useMemo, useState } from "react";
import { Button, Modal, ModelSelectModal, SegmentedControl } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import ApiKeySelect from "./ApiKeySelect";

const CODEX_INSTALL_COMMAND = "npm install -g @openai/codex";

const ensureV1 = (url) => {
  const trimmed = (url || "").replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
};

const shQuote = (value) => `'${String(value ?? "").replace(/'/g, `'\\''`)}'`;
const psQuote = (value) => `'${String(value ?? "").replace(/'/g, "''")}'`;

const getScriptUrl = (platform, mode) => {
  if (typeof window === "undefined") return `/api/cli-tools/codex-setup?platform=${platform}&mode=${mode}`;
  const url = new URL("/api/cli-tools/codex-setup", window.location.origin);
  url.searchParams.set("platform", platform);
  url.searchParams.set("mode", mode);
  return url.toString();
};

const commandBlockClass = "px-3 py-2 bg-black/5 dark:bg-white/5 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all border border-border";

export default function CodexAutoSetupModal({
  isOpen,
  onClose,
  tool,
  baseUrl,
  selectedApiKey,
  onSelectedApiKeyChange,
  apiKeys = [],
  cloudEnabled = false,
  modelMappings = {},
  onModelMappingChange,
  activeProviders = [],
  hasActiveProviders = false,
  modelAliases = {},
}) {
  const { copied, copy } = useCopyToClipboard();
  const [platform, setPlatform] = useState("unix");
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(null);

  const endpointUrl = ensureV1(baseUrl);
  const apiKey = (selectedApiKey && selectedApiKey.trim())
    || (apiKeys?.length > 0 ? apiKeys[0].key : "")
    || (!cloudEnabled ? "sk_9router" : "");
  const requiresApiKey = !apiKey;

  const modelValues = useMemo(() => {
    const values = {};
    (tool?.defaultModels || []).forEach((model) => {
      values[model.alias] = modelMappings[model.alias] || model.defaultValue || "";
    });
    return values;
  }, [tool?.defaultModels, modelMappings]);

  const buildInstallCommand = () => {
    const scriptUrl = getScriptUrl(platform, "install");
    const allEnv = [
      ["BASE_URL", endpointUrl],
      ["API_KEY", apiKey],
      ["CODEX_SMALL_MODEL", modelValues.small],
      ["CODEX_MEDIUM_MODEL", modelValues.medium],
      ["CODEX_LARGE_MODEL", modelValues.large],
    ].filter(([, value]) => value);

    if (platform === "windows") {
      const parts = allEnv.map(([key, value]) => `$env:${key}=${psQuote(value)}`);
      return `${parts.join("; ")}; irm ${psQuote(scriptUrl)} | iex`;
    }

    const exportLines = allEnv.map(([k, v]) => `export ${k}=${shQuote(v)}`).join("; ");
    return `( ${exportLines}; curl -fsSL ${shQuote(scriptUrl)} | sh )`;
  };

  const buildUninstallCommand = () => {
    const scriptUrl = getScriptUrl(platform, "uninstall");
    if (platform === "windows") return `irm ${psQuote(scriptUrl)} | iex`;
    return `curl -fsSL ${shQuote(scriptUrl)} | sh`;
  };

  const installCommand = buildInstallCommand();
  const uninstallCommand = buildUninstallCommand();

  const openModelSelector = (alias) => {
    setCurrentAlias(alias);
    setModelModalOpen(true);
  };

  const handleModelSelect = (model) => {
    if (currentAlias) onModelMappingChange(currentAlias, model.value);
  };

  const copyCommand = (text, id) => copy(text, id);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="OpenAI Codex - Automatic Setup" size="full">
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-text-main">
            Configure Codex CLI to use <span className="font-semibold">9Router Proxy</span> with one command. Select your OS and model mapping, then copy the generated terminal command.
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-main">Step 1: Install Codex CLI</h3>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-text-main">
              The setup script below will <span className="font-semibold">automatically install Codex CLI</span> if not already present (requires Node.js 22+).
              You can also install it manually:
            </div>
            <pre className={commandBlockClass}>{CODEX_INSTALL_COMMAND}</pre>
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-text-main">Step 2: Select OS and model mapping</h3>
            <SegmentedControl
              value={platform}
              onChange={setPlatform}
              size="md"
              className="w-full justify-stretch"
              options={[
                { value: "unix", label: "macOS / Linux", icon: "terminal" },
                { value: "windows", label: "Windows", icon: "window" },
              ]}
            />

            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-2">
                <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Endpoint</span>
                <span className="min-w-0 rounded bg-surface/40 px-2 py-2 text-xs text-text-muted sm:py-1.5 break-all">{endpointUrl}</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-start sm:gap-2">
                <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm sm:pt-1.5">API Key</span>
                <ApiKeySelect value={selectedApiKey} onChange={onSelectedApiKeyChange} apiKeys={apiKeys} cloudEnabled={cloudEnabled} />
              </div>

              {(tool?.defaultModels || []).map((model) => (
                <div key={model.alias} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:gap-2">
                  <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">{model.name}</span>
                  <div className="relative w-full min-w-0">
                    <input
                      type="text"
                      value={modelValues[model.alias] || ""}
                      onChange={(e) => onModelMappingChange(model.alias, e.target.value)}
                      placeholder="provider/model-id"
                      className="w-full min-w-0 pl-2 pr-7 py-2 bg-surface rounded border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 sm:py-1.5"
                    />
                    {modelValues[model.alias] && (
                      <button type="button" onClick={() => onModelMappingChange(model.alias, "")} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-red-500 rounded transition-colors" title="Clear">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openModelSelector(model.alias)}
                    disabled={!hasActiveProviders}
                    className={`w-full sm:w-auto rounded border px-2 py-2 text-xs transition-colors sm:py-1.5 whitespace-nowrap sm:shrink-0 ${hasActiveProviders ? "bg-surface border-border text-text-main hover:border-primary cursor-pointer" : "opacity-50 cursor-not-allowed border-border"}`}
                  >
                    Select Model
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-main">Install command</h3>
              <Button variant="ghost" size="sm" onClick={() => copyCommand(installCommand, "install-command")} disabled={requiresApiKey}>
                <span className="material-symbols-outlined text-[14px] mr-1">{copied === "install-command" ? "check" : "content_copy"}</span>
                {copied === "install-command" ? "Copied!" : "Copy"}
              </Button>
            </div>
            {requiresApiKey && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
                Automatic setup requires an API key for cloud endpoints. Create or select an API key before copying the install command.
              </div>
            )}
            <pre className={`${commandBlockClass} ${requiresApiKey ? "opacity-60" : ""}`}>{requiresApiKey ? "Select an API key to generate the install command." : installCommand}</pre>
            <div className="rounded-lg border border-border bg-surface/30 px-3 py-2 text-xs text-text-muted">
              <p className="font-semibold text-text-main mb-1">Instructions</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Copy the install command above.</li>
                <li>Paste it into the terminal where Codex CLI is installed.</li>
                <li>Restart Codex or open a new terminal, then run <code className="px-1 bg-black/5 dark:bg-white/5 rounded">codex</code>.</li>
              </ol>
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Uninstall 9Router config</h3>
              <Button variant="ghost" size="sm" onClick={() => copyCommand(uninstallCommand, "uninstall-command")}>
                <span className="material-symbols-outlined text-[14px] mr-1">{copied === "uninstall-command" ? "check" : "content_copy"}</span>
                {copied === "uninstall-command" ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">This removes only the 9Router Codex environment values and preserves other settings.</p>
            <pre className={commandBlockClass}>{uninstallCommand}</pre>
          </section>
        </div>
      </Modal>

      <ModelSelectModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        onSelect={handleModelSelect}
        selectedModel={currentAlias ? modelValues[currentAlias] : null}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title={`Select model for ${currentAlias}`}
      />
    </>
  );
}
