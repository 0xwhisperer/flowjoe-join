# FlowJoe Joe Advanced Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: joe/byob.mdx, joe/agent-bridge.mdx, joe/permissions.mdx
Generated: 2026-10-20 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe advanced Joe setup — Bring Your Own Brain model selection and API-key storage, the Agent Bridge (MCP) server for external terminal agents, and Joe's flow permission levels.

Loading this knowledge is not evidence that an API key, CLI brain, Agent Bridge connection, or specific permission level is configured.

## Bring Your Own Brain (BYOB)

Choose Joe’s connection, set up your keys, and use a brain that suits your work.

**Bring Your Own Brain (BYOB)** lets you choose the intelligence behind Joe. Use your own provider API key, or connect a supported command-line assistant you already use. Your workspace lives locally; the context needed for an AI request goes to the chosen provider.
A command-line tool, or **CLI**, is an app you run by typing commands in a terminal. FlowJoe can use some of these tools behind the scenes, so you keep talking to Joe in the familiar chat panel.

**Why BYOB?**
- **Your account, your usage:** API brains use your provider key and its usage charges. CLI brains use that tool’s account, plan, and limits. FlowJoe adds no markup to either connection. How much context you send affects usage; see Token usage with Joe.
- **Model Choice:** You choose exactly which model drives Joe—whether you want the speed of a lighter model or the reasoning of a frontier model.
- **Privacy & Control:** Owner requests go from your desktop to the selected provider or installed tool, rather than through a FlowJoe AI service. Shared guests use the owner’s authorized connection; they do not receive its credentials.

**API Key Storage & Fallbacks.**
FlowJoe uses a multi-tier storage design for your keys to balance security and convenience:
- **Desktop storage:** Supported keys are encrypted using your operating system’s secure-storage service when available and saved in FlowJoe’s app data. A standalone browser, or unavailable secure storage, uses local browser storage with weaker protection.
- **Export choice:** Keys are excluded from portable exports by default. You can explicitly include an OpenAI key, so review that checkbox before sharing a package.

**Viewing & Copying Your Key.**
For easy verification, you can inspect or copy your stored API key:
- Open **Settings → APIs → API Settings**.
- By default, the key is hidden behind a password mask (`••••••••`).
- Click the **Eye icon** on the input field to reveal the plaintext key, allowing you to quickly verify or copy it to your clipboard.

**Configuring Your AI Brain.**
To adjust your model config:
- For an API brain, add its key in **Settings → APIs**. For a CLI brain, install and sign into its tool first, as described below.
- Click the model settings button inside the Joe panel — or the brain name in the status bar — to pick the brain behind Joe:
- **OpenAI models (API key):** **Sol 6.1**, **Luna 6** (the default), **Sol 6**, and **Astra 6**, plus **Luna**, **Terra**, and **Sol** from the GPT-5.6 family.
- **Gemini API:** **Gemini 3.8 Flash** uses a separate Google Gemini API key. See setup below.

Also covered in the full docs for this area: Where to get an OpenAI key; Set up Gemini chat; What CLI brains need first; Which brains can work with your Flow?; A CLI brain, Agent Bridge, or Forge?; What happens with no key and no CLI brain; Making Joe faster: the optional TypeSafe key; It also trims a big flow map; Checking that a key works; CLI brains in shared conversations.

## Agent Bridge (MCP)

Let a local coding assistant work with your Flow while you stay in control.

Joe works the same on every brain that uses Flow tools (OpenAI, Gemini, Claude, Grok, Codex, Gemini CLI): in his own chat he can hand the owner a restore, export, import or outside-changes review, find pictures, read shared terminal lines, read a browser page in parts, and undo or list his changes.
Antigravity has them on a Mac only; Agent Bridge assistants and the FlowJoe CLI never get these tools.
A page the owner explicitly asks about still reaches every brain.
The **Agent Bridge** connects your active Flow to compatible AI assistants and developer tools on your computer. A coding assistant can work with your plan, references, and notes—not just the files in a code folder. MCP is the connection format these tools use.

**Turn it on.**
- Open **Settings → Joe AI → Agent Bridge (MCP)** in the desktop app.
- Turn on **Let coding assistants use FlowJoe**. FlowJoe connects every assistant it finds by itself.
- Kimi needs one step: run its copied command in a terminal.
- To skip one, untick it under **Choose assistants**.
FlowJoe asks once before turning on and names the assistants it will connect; it never connects one without that yes. If a terminal turned the bridge on, **Look again** asks the same question first.

Also covered in the full docs for this area: Advanced; Choose how changes are approved; How MCP relates to Joe’s actions; Two FlowJoe apps open at once; What connected tools can do.

## Permissions & privacy

Choose what Joe can read and which changes he can propose.

Joe can help at the level you choose—from a conversation about an idea to a reviewed reorganization of your Flow.

**Choose Joe’s access.**
Set the default in **Settings → Joe AI**. The selector in Chat overrides that default for the current conversation. Starting a new conversation clears the override.
- **Off** — Chat and explain FlowJoe, without automatic access to your Flow or tools to read or change it.
- **Read** — Read permitted Flow content to answer questions, without changing it.
- **Propose** — Read permitted content and offer changes for you to review.

Also covered in the full docs for this area: Keep content out of Joe’s reach; Ask about current app facts; Check the next message.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Bring Your Own Brain (BYOB)](flowjoe-docs:joe/byob)
- [Agent Bridge (MCP)](flowjoe-docs:joe/agent-bridge)
- [Permissions & privacy](flowjoe-docs:joe/permissions)
