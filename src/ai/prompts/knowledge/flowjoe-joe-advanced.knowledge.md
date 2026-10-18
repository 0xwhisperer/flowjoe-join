# FlowJoe Joe Advanced Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: joe/byob.mdx, joe/agent-bridge.mdx, joe/permissions.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe advanced Joe setup — Bring Your Own Brain model selection and API-key storage, the Agent Bridge (MCP) server for external terminal agents, and Joe's flow permission levels.

Loading this knowledge is not evidence that an API key, CLI brain, Agent Bridge connection, or specific permission level is configured.

## Bring Your Own Brain (BYOB)

Total privacy, zero subscription fees, and complete control over your AI models.

FlowJoe operates on a **Bring Your Own Brain (BYOB)** model. Unlike traditional SaaS tools that charge high monthly subscription fees with hefty markups on AI usage, FlowJoe runs entirely locally and connects directly to AI providers using your own API keys.

**Why BYOB?**
- **Zero Subscription Markups:** You only pay the raw token usage fees directly to the AI providers (such as OpenAI or Anthropic). For typical note-taking and outlining, this costs pennies a month compared to a $20/month subscription.
- **Model Choice:** You choose exactly which model drives Joe—whether you want the speed of a lighter model or the reasoning of a frontier model.
- **Privacy & Control:** Your keys and chats are never routed through FlowJoe servers. Connections are established directly from your local desktop application to the AI API endpoint.

**API Key Storage & Fallbacks.**
FlowJoe uses a multi-tier storage design for your keys to balance security and convenience:
- **OS Secure Storage (Default):** Inside the desktop Electron wrapper, FlowJoe prioritizes storing keys in your operating system's native secure credential manager (macOS Keychain, Windows Credential Manager, Linux Secret Service).
- **Plaintext Safety:** Keys are never written to project JSON files, shared synced directories, or git version control systems.

**Viewing & Copying Your Key.**
For easy verification, you can inspect or copy your stored API key:
- Open **Settings → APIs → API Settings**.
- By default, the key is hidden behind a password mask (`••••••••`).
- Click the **Eye icon** on the input field to reveal the plaintext key, allowing you to quickly verify or copy it to your clipboard.

**Configuring Your AI Brain.**
To adjust your model config:
- Open **Settings → APIs → API Settings** and paste your key.
- Click the model settings button inside the Joe panel — or the brain name in the status bar — to pick the brain behind Joe:
- **OpenAI models (API key):** **Sol 6.1**, **Luna 6** (the default), **Sol 6**, and **Astra 6**, plus **Luna**, **Terra**, and **Sol** from the GPT-5.6 family.
- **CLI brains (no API key):** route Joe through an agent CLI you have already installed and signed into on your own machine — **Fable 5.1**, **Opus 5.5**, **Opus 5**, **Sonnet 5.5**, **Sonnet 5**, **Haiku**, **Grok**, **Antigravity**, or **Antigravity (3.7)**.
- **Temperature and response length are managed automatically per model** — there is no manual temperature dial, and GPT-5.6 / GPT-6 models run at their fixed default temperature.

Also covered in the full docs for this area: Where to get an OpenAI key; What CLI brains need first; What happens with no key and no CLI brain; Making Joe faster: the optional TypeSafe key; It also trims a big flow map; Checking that a key works; CLI brains in shared conversations.

## Agent Bridge (MCP)

Connect terminal-based AI agents and developer scripts directly to your local FlowJoe workspace.

FlowJoe is designed for both human and agentic collaboration. Through the **Agent Bridge**, FlowJoe hosts a local **Model Context Protocol (MCP)** server, exposing your outlines, workspaces, and media galleries to external terminal-driven agents.

**How It Works.**
The Agent Bridge acts as a secure local loopback server. When active, it translates FlowJoe's complex visual structure and files into a standard format that external LLM agents can read and write:

Also covered in the full docs for this area: Setting Up the Bridge; The Automation Seatbelt.

## Permissions & Privacy

You control what Joe sees and what Joe is allowed to propose.

Because FlowJoe is local-first, privacy and safety are built directly into the AI integration. You control Joe's level of access to your workspace.

**Permission Levels.**
In Settings, or at the top of the Joe chat panel, you can set Joe's global permission level:
- **Off** — Joe cannot access your flow or read files. The AI interface is disabled. — Absolute lock
- **Read-Only** — Joe can read your selected node structure, notes, and references to answer questions, but cannot write. — Cannot mutate

Also covered in the full docs for this area: Visual & Content Access Gates.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Bring Your Own Brain (BYOB)](flowjoe-docs:joe/byob)
- [Agent Bridge (MCP)](flowjoe-docs:joe/agent-bridge)
- [Permissions & Privacy](flowjoe-docs:joe/permissions)
