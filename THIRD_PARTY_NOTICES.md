# Third-Party Notices

Updated: 2026-09-26
Status: Draft release artifact

This file is intended to ship with FlowJoe releases. It tracks third-party software and bundled assets that FlowJoe uses, plus the upstream license files that must remain available to users.

This file is not yet a final legal/compliance artifact. Before public release, the release process must generate or verify a complete transitive dependency notice set from `package-lock.json`, confirm what the packaged app actually includes, and expose this file or equivalent notices from the app UI.

**Picking this up later:** "Required Before Public Release" below is the actionable list. Its first item, the license-text bundle generator, is fully spec'd but intentionally not built yet — see its "Status 2026-09-10" note for why and what to re-check before building it.

## Current Notice Inventory

| Component | Version / Source | FlowJoe Use | License | Bundled License Source |
| --- | --- | --- | --- | --- |
| FullCalendar Standard | `@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/list`, `@fullcalendar/interaction`, all `6.1.20` | Calendar workbench UI (month/week/day/list views, local event create/edit/drag/resize) in the isolated `src/calendar-workbench/` iframe island. Standard plugins ONLY — no FullCalendar Premium/Scheduler package, CSS, or code is used. FullCalendar v6 injects its component CSS at runtime via JS (no `<link>` stylesheet ships). | MIT (Copyright (c) 2021 Adam Shaw) | `node_modules/@fullcalendar/core/LICENSE.md`, plus a matching `LICENSE.md` in each of the `daygrid`/`timegrid`/`list`/`interaction` packages |
| Preact | `10.12.1` | Transitive runtime dependency of `@fullcalendar/core` (FullCalendar v6's internal view layer); used only inside the `src/calendar-workbench/` island | MIT (Copyright (c) 2015-present Jason Miller) | `src/vendor/PREACT-LICENSE.txt` (ships next to the vendored FullCalendar build) |
| PDF.js / `pdfjs-dist` | `4.10.38` | PDF preview and rendering | Apache-2.0 | `node_modules/pdfjs-dist/LICENSE` |
| PDF.js cMaps | From `pdfjs-dist` | PDF character map support when shipped | BSD-style Adobe notice | `node_modules/pdfjs-dist/cmaps/LICENSE` |
| PDF.js standard fonts - Liberation | From `pdfjs-dist` | PDF standard font assets when shipped | SIL Open Font License 1.1 | `node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION` |
| PDF.js standard fonts - Foxit/PDFium | From `pdfjs-dist` | PDF standard font assets when shipped | BSD-style notice | `node_modules/pdfjs-dist/standard_fonts/LICENSE_FOXIT` |
| JSZip | Vendored `src/js/jszip.min.js`, header reports `v3.10.1`; official docs: https://stuk.github.io/jszip/; official license: https://raw.githubusercontent.com/Stuk/jszip/main/LICENSE.markdown | Zip/package import/export and document conversion helpers | Dual MIT or GPLv3; FlowJoe should use the MIT option | `licenses/jszip-MIT.txt` (upstream MIT text, retrieved 2026-09-10), plus the header in `src/js/jszip.min.js` |
| pako | Bundled inside vendored JSZip build; referenced source: https://github.com/nodeca/pako/blob/main/LICENSE | Deflate/inflate support used by JSZip | MIT per vendored JSZip header; current upstream pako versions may also include Zlib-covered files, so confirm bundled version before final release | `licenses/pako-MIT.txt` (upstream MIT text, retrieved 2026-09-10) |
| DOMPurify | npm dependency | HTML sanitization | `(MPL-2.0 OR Apache-2.0)` | `node_modules/dompurify/LICENSE` |
| markdown-it | npm dependency | Markdown parsing/rendering | MIT | `node_modules/markdown-it/LICENSE` |
| Prettier | npm dependency | HTML code formatting in the Monaco editor | MIT (Copyright © James Long and contributors) | `node_modules/prettier/LICENSE` |
| jsdom | npm **devDependency** (no longer a runtime dependency) | DOM parsing utilities in the unit-test harness only; not shipped in packaged builds | MIT | `node_modules/jsdom/LICENSE.txt` |
| OpenAI Node SDK | npm dependency | OpenAI API integration | Apache-2.0 | `node_modules/openai/LICENSE` |
| Monaco Editor | `monaco-editor@0.52.2` | Code editor component for code-file slot items (syntax highlighting, multi-cursor, diff view, minimap). The same editor that powers VS Code. Lazy-loaded on first use (~5MB). | MIT (Copyright (c) 2016 - present Microsoft Corporation) | `node_modules/monaco-editor/LICENSE` |
| cloudflared | Pinned release `2026.9.3`, source https://github.com/cloudflare/cloudflared (binaries from its GitHub release, checksum-verified; see `scripts/cloudflared/manifest.json`) | The tunnel program for browser collaboration. Shipped unmodified INSIDE the installer (`<resources>/cloudflared/`) as a separate executable that FlowJoe starts as a child process; users never install it | Apache-2.0 (Copyright Cloudflare, Inc.) | `licenses/cloudflared-Apache-2.0.txt` (upstream LICENSE at tag `2026.9.3`) |
| Electron | Desktop runtime | Application shell | MIT plus bundled notices | `node_modules/electron/LICENSE`, `node_modules/electron/dist/LICENSE`, packaged `LICENSE.electron.txt` |
| Chromium via Electron | Desktop/browser engine | Embedded Chromium runtime | Multiple third-party licenses | Packaged `LICENSES.chromium.html` |
| Tiptap | `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/suggestion`, `@tiptap/extension-bubble-menu`, `@tiptap/extension-code-block`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-color`, `@tiptap/extension-details`, `@tiptap/extension-hard-break`, `@tiptap/extension-highlight`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-subscript`, `@tiptap/extension-superscript`, `@tiptap/extension-table`, `@tiptap/extension-task-item`, `@tiptap/extension-task-list`, `@tiptap/extension-text`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-underline`, `@tiptap/extension-youtube`, all `3.30.5` | Rich-text editing engine behind Node Summary, Flow Summary, the slot Preview view, and gallery slot/stack notes | MIT (Copyright (c) 2025, Tiptap GmbH) | `LICENSE.md` in each `node_modules/@tiptap/*` package |
| Tiptap details extensions (beta) | `@tiptap/extension-details-content`, `@tiptap/extension-details-summary`, both `3.0.0-beta.11` | Collapsible details blocks in the rich-text toolbar surfaces. Pinned to a beta line — re-check the version and license at release time | MIT (Copyright (c) 2025, Tiptap GmbH) | `node_modules/@tiptap/extension-details-content/LICENSE.md`, `node_modules/@tiptap/extension-details-summary/LICENSE.md` |
| tiptap-markdown | `0.9.0` | Markdown serialization/deserialization for the rich-text editor | MIT (Copyright (c) 2021, Antoine Guingand) | `node_modules/tiptap-markdown/LICENSE` |
| ProseMirror | Transitive dependency of Tiptap (`prosemirror-*` packages) | Document model, transactions, and view layer underneath Tiptap | MIT | `LICENSE` in each `node_modules/prosemirror-*` package |
| Tippy.js | `6.3.7` | Popup positioning for the rich-text slash-command, emoji, and bubble menus | MIT (Copyright (c) 2017-present atomiks) | `node_modules/tippy.js/LICENSE` |
| Popper.js / `@popperjs/core` | Transitive dependency of Tippy.js | Positioning engine underneath Tippy.js | MIT | `node_modules/@popperjs/core/LICENSE.md` |
| highlight.js | `11.12.0` | Syntax highlighting for code blocks in the rich-text editor | BSD-3-Clause (Copyright (c) 2006, Ivan Sagalaev) | `node_modules/highlight.js/LICENSE` |
| lowlight | `3.3.0` | highlight.js adapter that produces the syntax tree Tiptap code blocks render | MIT (Copyright (c) Titus Wormer) | `node_modules/lowlight/license` |
| heic-to | `1.6.5`, vendored CSP build from `dist/csp/heic-to.js` | On-device HEIC/HEIF to JPEG conversion before media storage; kept as a separate replaceable renderer asset | LGPL-3.0 | `licenses/heic-to-LGPL-3.0.txt`; source: https://github.com/hoppergee/heic-to/tree/v1.6.5 |
| libheif | `1.23.5`, compiled into the vendored `heic-to` CSP build | HEIF/HEIC image decoding used by `heic-to` | LGPL-3.0 | `licenses/heic-to-LGPL-3.0.txt`; source: https://github.com/strukturag/libheif/tree/v1.23.5 |
| libde265 | `1.0.16`, compiled into the vendored `heic-to` CSP build | HEVC decoding used by libheif | LGPL-3.0, with an exception referring to GPL-3.0 | `licenses/heic-to-LGPL-3.0.txt` and `licenses/GPL-3.0.txt`; source: https://github.com/strukturag/libde265/tree/v1.0.16 |
| Git (bundled) | From dugite-native `v2.53.0-4`, fetched per platform by `scripts/fetch-bundled-git.js` and shipped as a separate program in `resources/git`. **macOS arm64:** Git `2.53.0` built by dugite-native. **Windows x64:** Git for Windows MinGit `2.53.0.windows.4`. The app-focused build removes some non-core features; this is not a FlowJoe-maintained source fork. Sources: https://github.com/git/git/tree/v2.53.0, https://github.com/git-for-windows/git/tree/v2.53.0.windows.4, and https://github.com/desktop/dugite-native/releases/tag/v2.53.0-4 | Separate executable invoked by `src/electron/gitRunner.js` for repo import, history, diff, branch, commit, push and pull operations; FlowJoe does not link Git into its code or expose an unrestricted Git terminal | GPL-2.0-only. Commercial use and redistribution are permitted under the license terms. When redistributing these binaries, FlowJoe must meet GPLv2's source and notice conditions for the exact versions shipped. **Release check:** confirm the source-delivery method for these exact builds before public distribution; a permanent third-party source link may not by itself satisfy the requirement | `licenses/git-GPL-2.0.txt` (Git `COPYING`; Windows archive also includes `LICENSE.txt`) |
| MinGit runtime components (Windows only) | Shipped inside the Windows Git archive: MSYS2 runtime and core utilities (`usr/bin`, 91 files), curl/libcurl, OpenSSL (`libssl-3`, `libcrypto-3`), libssh2, PCRE2, expat, zlib, libiconv and gettext `libintl` | Runtime support for Windows Git (HTTPS, TLS, compression and regex) | Mixed licenses, including GPL/LGPL, curl's license, Apache-2.0, BSD-3-Clause, MIT and Zlib. This bundle is **not all MIT or Apache**. The exact archive's component notices and license texts still need to be checked before public distribution | Upstream packaging: https://github.com/git-for-windows/build-extra (MinGit) and the individual projects' license files |
| Git LFS (bundled with Git) | Git LFS `3.7.1`, included in the platform-specific Git exec directory in the dugite-native `v2.53.0-4` archives | Bundled with the archive; FlowJoe does not expose a `git lfs` command. Repo import detects LFS filter attributes and skips those filtered files instead of running filter drivers | Upstream project license: MIT. Its license also identifies Go-licensed portions and other Go-module components with their own licenses; confirm the release archive's complete third-party notices before public distribution | https://github.com/git-lfs/git-lfs/blob/v3.7.1/LICENSE.md; release versions: https://github.com/desktop/dugite-native/releases/tag/v2.53.0-4 |
| Git Credential Manager (bundled with Git) | Git Credential Manager `2.9.0`, included in the dugite-native `v2.53.0-4` archives with a .NET runtime | Used for GitHub sign-in, account listing and sign-out, and as the bundled Git credential helper for remote operations. FlowJoe calls it as a separate executable through `src/electron/gitCredentialManagerRunner.js`, with a limited command allowlist | Git Credential Manager project: MIT. The bundled .NET product runtime has platform-specific terms (MIT on macOS; .NET Library License on Windows) and requires its corresponding third-party notices. Identify the exact runtime version and include its required notices before public distribution | https://github.com/git-ecosystem/git-credential-manager/blob/v2.9.0/LICENSE; .NET terms and notice guidance: https://github.com/dotnet/core/blob/main/license-information.md; release versions: https://github.com/desktop/dugite-native/releases/tag/v2.53.0-4 |
| dugite | `3.2.3` | Node wrapper that locates and runs the bundled git | MIT (Copyright (c) 2016 GitHub and contributors) | `licenses/dugite-MIT.txt`, `node_modules/dugite/LICENSE` |
| Univer | `@univerjs/preset-sheets-core`, `@univerjs/preset-docs-core`, `@univerjs/preset-docs-drawing`, all `0.10.10` | Spreadsheet and rich-document workbench islands (isolated iframe surfaces). Apache-2.0 requires the license text and a NOTICE file if upstream ships one — verify before release | Apache-2.0 | `LICENSE` in each `node_modules/@univerjs/*` package |
| React and React-DOM | `18.3.1` | View layer required by the Univer workbench islands; not used by the main FlowJoe renderer | MIT (Copyright (c) Meta Platforms, Inc. and affiliates) | `node_modules/react/LICENSE`, `node_modules/react-dom/LICENSE` |
| RxJS | `7.8.1` | Reactive streams used internally by Univer | Apache-2.0 | `node_modules/rxjs/LICENSE.txt` |
| xterm.js | `@xterm/xterm` `6.0.0`, `@xterm/addon-fit` `0.11.0` | Terminal emulator UI for the integrated Terminal | MIT (Copyright (c) 2017-2019, The xterm.js authors) | `node_modules/@xterm/xterm/LICENSE`, `node_modules/@xterm/addon-fit/LICENSE` |
| node-pty | `1.1.0` | Pseudo-terminal process bridge behind the integrated Terminal. **Native module** — ships compiled per-platform binaries | MIT (Copyright (c) 2012-2015, Christopher Jeffrey; portions Microsoft) | `node_modules/node-pty/LICENSE`, plus `licenses/conpty-MIT.txt` and `licenses/winpty-MIT.txt` for the bundled Windows PTY backends |
| Model Context Protocol SDK | `@modelcontextprotocol/sdk` `1.29.0` | Agent Bridge / MCP server and client integration | MIT (Copyright (c) 2024 Anthropic, PBC) | `node_modules/@modelcontextprotocol/sdk/LICENSE` |
| Zod | `4.4.3` | Schema validation for MCP tool definitions and flow-mutation payloads | MIT (Copyright (c) 2025 Colin McDonnell) | `node_modules/zod/LICENSE` |
| i18next | `26.3.6` | Localization runtime for all 20 shipped app languages | MIT (Copyright (c) 2011-present i18next) | `node_modules/i18next/LICENSE` |
| canvas-confetti | `1.6.0` | Confetti effect rendered to an HTML canvas for celebratory moments. Independent project by Kiril Vatev (`catdad`) — unrelated to Canva | ISC (Copyright (c) 2020, Kiril Vatev) | `node_modules/canvas-confetti/LICENSE` |
| tiff | `7.1.3` | TIFF image decoding for gallery media | MIT (Copyright (c) 2015 Michael Zasso) | `node_modules/tiff/LICENSE` |

## Required Before Public Release

- **Generate a complete dependency license-text bundle.** The table above covers all direct runtime dependencies by name, and the transitive set is fully counted in "Transitive Dependency Scan" below — but neither collects the actual license *text* for the transitive packages. Exact spec for the generator, decided but not yet built:
  - **Input:** `package-lock.json` `packages` entries where `dev`/`devOptional` is not true (the same filter used for the 386-package scan).
  - **Per package:** resolve its installed directory, read the first file matching `LICENSE*`/`LICENCE*`/`license*` (case-insensitive) at that package's root, and use the `license` field from that package's own installed `package.json` as the declared type — not the lockfile's `license` field, which is absent for 17 packages that do declare it in their installed manifest (see "Transitive Dependency Scan").
  - **Missing license file:** flag it in the output rather than silently skipping. Measured 2026-09-10: **27 of 386** packages ship with no `LICENSE*`/`LICENCE*`/`license*` file, but the real exception list is much shorter than that number suggests —
    - **11** are `@napi-rs/canvas-*` per-platform native binaries. These are already excluded from packaged builds by the existing `build.files` rule (`"!node_modules/@napi-rs/**"` in `package.json`), so the generator can skip anything under `@napi-rs/` entirely rather than resolve a license for code that never ships.
    - **10** are one `@radix-ui/react-*` / `@radix-ui/rect` family — worth a two-minute check for whether they share one license text before writing per-package handling for each.
    - **6** are genuinely distinct and need a real look: `@univerjs/protocol` (already resolved — Apache-2.0, by cross-referencing the npm registry and upstream repo, which a generator cannot do automatically; seed its result by hand or carry an exceptions list), `franc-min`, `ot-json1`, `ot-text-unicode`, `react-remove-scroll-bar`, `unicount`.
  - **Vendored (non-npm) code:** the generator will never see JSZip, pako, ConPTY, or winpty, because none are npm packages in this tree — it must separately copy in everything already collected under `licenses/` (`jszip-MIT.txt`, `pako-MIT.txt`, `conpty-MIT.txt`, `winpty-MIT.txt`).
  - **Output:** one concatenated `THIRD_PARTY_LICENSES.txt` (or per-package files under a generated directory), grouped by license type, each entry naming the package, version, and copyright line. Where this lands — a build step's output under `.gitignore`, versus a committed artifact refreshed by CI — is an open call; either way it must land inside `build.files`' `**/*` so it packages (nothing currently excludes a plausible output path).
  - **When it runs:** decide whether it's a manual `npm run` task invoked before a release, or wired into `npm run build` itself.
  - **Status 2026-09-10: deliberately on hold, not stalled.** The spec above is complete enough to hand to a fresh session with no re-discovery needed — sizing was done (small, ~150-200 lines, no new dependencies, roughly half a day including the 6 hand-checked exceptions) and the user chose to spec rather than build. Reason: the dependency set isn't final — more building is expected before this ships, and generating a bundle now would mean re-running it (and re-reviewing the 6 exceptions) after every future dependency change until then. **Re-open this when the dependency set is believed final**, i.e. shortly before an actual release build. At that point the two remaining decisions (output location, manual-vs-wired-into-build) still need an answer, and the "27 missing license file" / "@radix-ui family" / "6 distinct" counts above should be re-measured rather than trusted, since new dependencies may have shifted them.
- ~~Confirm the Apache-2.0 obligations for Univer and RxJS: reproduce any upstream `NOTICE` file.~~ **Resolved 2026-09-10:** no Apache-2.0 package in the production tree ships a `NOTICE` file (checked across the whole non-dev tree; the only `NOTICE` files present belong to Playwright and `bare-path`, all dev-only). The remaining Apache-2.0 obligation is therefore just shipping the license text itself, which the generated bundle must do.
- ~~`node-pty` ships third-party Windows binaries with no license file present.~~ **Resolved 2026-09-10:** both are MIT. **ConPTY/OpenConsole** (`third_party/conpty/.../OpenConsole.exe`, `conpty.dll`) traces to Microsoft's own Windows Terminal project (`microsoft/terminal`), MIT-licensed, Copyright (c) Microsoft Corporation — text fetched from upstream and checked into `licenses/conpty-MIT.txt`. **winpty** (`prebuilds/win32-*/winpty-agent.exe`, `winpty.node`, `conpty_console_list.node` — the legacy Windows PTY backend node-pty falls back to) is Ryan Prichard's independent `winpty` project, MIT, Copyright (c) 2011-2016 Ryan Prichard — `licenses/winpty-MIT.txt`. Neither ships its own license file inside `node_modules/`, which is why both needed an upstream fetch rather than a `node_modules` copy. The macOS build is unaffected either way: it uses `bin/darwin-arm64-*/node-pty.node` and `build/Release/pty.node` only. Also present: `.pdb` debug-symbol files under `prebuilds/win32-*/` — not a licensing concern, but worth excluding from a release build as dead weight.
- Re-check `@tiptap/extension-details-content` / `-details-summary`, which are pinned to a `3.0.0-beta.11` prerelease.
- Confirm which dependencies are actually shipped in macOS and Windows builds.
- Copy or generate full third-party license text into this root file or a paired root artifact.
- ~~Include JSZip and pako upstream MIT license text, not only the minified file header.~~ **Done 2026-09-10:** `licenses/jszip-MIT.txt` and `licenses/pako-MIT.txt`. FlowJoe elects JSZip's MIT option; the GPLv3 alternative is deliberately not reproduced.
- ~~Include PDF.js nested cMap and standard-font license text if those directories ship.~~ **Measured 2026-09-10:** no source file references `cmaps`, `standard_fonts`, `cMapUrl`, or `standardFontDataUrl`, so FlowJoe does not configure PDF.js to load them. They are still present inside `node_modules/pdfjs-dist/` and the broad `build.files` rule copies `node_modules`, so the directories may ship as dead weight even though nothing reads them. Keep their license rows (harmless, and correct if a future change enables them), and consider excluding the directories from packaged builds.
- Preserve Electron-generated `LICENSE.electron.txt` and `LICENSES.chromium.html`.
- Add an app UI path, such as `About FlowJoe -> Open Source Licenses`, that opens this file or a rendered equivalent.
- Review non-code assets: icons, favicons, placeholder images, bundled PDFs, marketing assets, and any embedded fonts.

## Bundled License Texts

Upstream license text that is not otherwise present in `node_modules/` is checked into `licenses/` so it ships with the app:

```text
licenses/jszip-MIT.txt
licenses/pako-MIT.txt
licenses/cloudflared-Apache-2.0.txt
licenses/conpty-MIT.txt
licenses/winpty-MIT.txt
licenses/heic-to-LGPL-3.0.txt
licenses/GPL-3.0.txt
```

`jszip-MIT.txt` and `pako-MIT.txt` exist because JSZip is **vendored** as a minified file (`src/js/jszip.min.js`) rather than installed from npm, so there is no `node_modules/jszip/LICENSE` for a generator to find; pako is bundled inside that same vendored build.

`conpty-MIT.txt` and `winpty-MIT.txt` exist because node-pty bundles compiled third-party Windows binaries (ConPTY/OpenConsole from Microsoft's Windows Terminal project, and Ryan Prichard's winpty) without including either project's license file in the npm package.

`heic-to-LGPL-3.0.txt` accompanies the separately loaded CSP build in `src/vendor/heic-to-csp.js`; the LGPL text refers to the GPL, whose full text is `GPL-3.0.txt`. The decoder is intentionally kept out of the main application bundle so it can be replaced independently; the upstream projects and exact versions are listed above.

Every other dependency's license text is available in its own installed package and should be collected from there by the release generator.

`licenses/` is not excluded by the `build.files` rules in `package.json`, so it is included in packaged builds.

## Transitive Dependency Scan

Measured 2026-09-10 from `package-lock.json`, counting non-dev packages only (386 total).

| License | Packages |
| --- | --- |
| MIT | 301 |
| Apache-2.0 | 32 |
| BSD-3-Clause | 15 |
| ISC | 14 |
| BSD-2-Clause | 2 |
| Python-2.0 | 1 (`argparse@2.0.1`) |
| `(MPL-2.0 OR Apache-2.0)` | 1 (DOMPurify) |
| 0BSD | 1 (`tslib@2.8.1`) |
| Not declared in lockfile | 19 |

The npm production-dependency scan found no copyleft (GPL/AGPL/LGPL), source-available (BUSL/SSPL/Polyform), non-commercial, or Commons Clause terms. This scan covers packages in `package-lock.json`; it does not cover separately bundled software such as the Git distribution inventoried above.

**On the 19 "not declared" packages:** 17 are lockfile metadata gaps only — the installed package's own `package.json` declares MIT or ISC (`ansi-regex`, `ansi-styles`, `cliui`, `color-convert`, `color-name`, `emoji-regex`, `escalade`, `get-caller-file`, `is-fullwidth-code-point`, `prettier`, `require-directory`, `string-width`, `strip-ansi`, `wrap-ansi`, `y18n`, `yargs`, `yargs-parser`). These need no research, only a generator that reads the installed manifest rather than the lockfile field.

**Two genuinely need upstream resolution before release:**

- ~~`@univerjs/protocol@0.1.46` — declares no license and ships no LICENSE file.~~ **Resolved 2026-09-10:** the tarball omits the field, but the npm registry's package-level metadata declares **Apache-2.0**, and the upstream repository (`github.com/dream-num/univer`) carries the full Apache-2.0 text. Two independent sources agree, so treat it as Apache-2.0 with the rest of the Univer tree. Worth re-checking if the package is ever upgraded — `0.1.46` trails the `@univerjs/*` presets' own versioning.
- ~~`@univerjs/telemetry@0.10.10` — no `license` field.~~ **Resolved 2026-09-10:** its bundled `LICENSE` is the full Apache-2.0 text. Treat it as Apache-2.0 alongside the other Univer packages.

`argparse@2.0.1` is **Python-2.0** (PSF license, permissive, GPL-compatible) and arrives transitively; it requires preserving the PSF notice, which `node_modules/argparse/LICENSE` carries.

## Preliminary Commercial Distribution Review

Initial scan date: 2026-06-01. Re-scanned 2026-09-10 across the non-dev packages in `package-lock.json`.

Neither npm dependency scan found a commercial-distribution blocker such as GPL-only, AGPL, LGPL, non-commercial, Commons Clause, SSPL, Polyform, BUSL, proprietary, or unlicensed runtime terms. The 2026-09-10 pass covered all 386 non-dev packages in `package-lock.json` rather than a first-pass sample, and every package whose license was unstated has since been identified (see "Transitive Dependency Scan"). These conclusions do not include the separately bundled Git, MinGit, Git LFS, or Git Credential Manager components listed above.

One nuance worth stating plainly: JSZip is **dual** MIT-or-GPLv3. FlowJoe elects MIT, which is the only reason no GPL obligation attaches. That election should be recorded in any compliance answer, not left implicit.

This is still not final clearance. Remaining work: confirm which packages are actually included in macOS and Windows builds (as opposed to merely present in the tree), collect per-package license text into a generated bundle, review non-code assets, and expose the notices from the app UI.

## Known Upstream License Locations

These files are present in the current workspace and should be used as sources for the final generated notice bundle:

```text
node_modules/@fullcalendar/core/LICENSE.md
node_modules/@fullcalendar/daygrid/LICENSE.md
node_modules/@fullcalendar/timegrid/LICENSE.md
node_modules/@fullcalendar/list/LICENSE.md
node_modules/@fullcalendar/interaction/LICENSE.md
node_modules/preact/LICENSE
node_modules/pdfjs-dist/LICENSE
node_modules/pdfjs-dist/cmaps/LICENSE
node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION
node_modules/pdfjs-dist/standard_fonts/LICENSE_FOXIT
node_modules/dompurify/LICENSE
node_modules/markdown-it/LICENSE
node_modules/prettier/LICENSE
node_modules/jsdom/LICENSE.txt
node_modules/openai/LICENSE
node_modules/monaco-editor/LICENSE
node_modules/@tiptap/core/LICENSE.md
node_modules/@tiptap/starter-kit/LICENSE.md
node_modules/tiptap-markdown/LICENSE
node_modules/tippy.js/LICENSE
node_modules/@popperjs/core/LICENSE.md
node_modules/highlight.js/LICENSE
node_modules/lowlight/license
node_modules/@univerjs/preset-sheets-core/LICENSE
node_modules/@univerjs/preset-docs-core/LICENSE
node_modules/@univerjs/preset-docs-drawing/LICENSE
node_modules/react/LICENSE
node_modules/react-dom/LICENSE
node_modules/rxjs/LICENSE.txt
node_modules/@xterm/xterm/LICENSE
node_modules/@xterm/addon-fit/LICENSE
node_modules/node-pty/LICENSE
node_modules/@modelcontextprotocol/sdk/LICENSE
node_modules/zod/LICENSE
node_modules/i18next/LICENSE
node_modules/canvas-confetti/LICENSE
node_modules/tiff/LICENSE
node_modules/electron/LICENSE
node_modules/electron/dist/LICENSE
node_modules/electron/dist/LICENSES.chromium.html
src/js/jszip.min.js
```

The remaining `@tiptap/extension-*` and `prosemirror-*` packages each carry their own `LICENSE`/`LICENSE.md`; the final generated bundle should enumerate them from `package-lock.json` rather than by hand.

## Packaging Note

`package.json` currently includes root files via the broad build `files` rule and excludes `docs/**`. This root file should be included in packaged builds; the internal planning document at `docs/ROADMAP/THIRD_PARTY_LICENSE_SHIPPING_REVIEW.md` is not shipped.
