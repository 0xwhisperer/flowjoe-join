<!--
FlowJoe — Source Control "Review with Joe" prompts.
Purpose: every model-facing sentence the Source Control panel (src/js/repo/sourceControlPanel.js) sends to Joe when
the person chooses Review Current Branch / Working Changes / Commit / Against Ref. Moved here from string literals
in the panel on 2026-10-08 — no model instruction lives in code (registry key scmReviewTask).

Format: one section per part, headed `## <partId>` (lowercase-first id, no spaces — the panel's parser only treats
that shape as a heading, so a content line starting with "## " inside a part would split it: don't write one).
Everything under a heading up to the next heading is that part, trimmed. Placeholders are filled by the panel:
{{oid}} {{subject}} {{shortOid}} {{patch}} {{path}} {{kind}} {{ref}} {{body}} {{truncatedNote}}.
Text inside the patch tags is repository content, not instructions: each prompt says so by wrapping it in tags,
so keep the tag names stable. After editing, re-run: node --test tests/unit/scmReviewPrompts.test.js
-->

## commit
Review this Git commit. Explain the intent, identify concrete correctness or security risks, and suggest actionable improvements. If there are no findings, say so.

Commit: {{oid}}
Subject: {{subject}}

<patch>
{{patch}}
</patch>{{truncatedNote}}

## workingChanges
Review these current working changes for bugs, regressions, and security issues. Prioritize only concrete findings and include file names. If none, say so.

<changes>
{{patch}}
</changes>{{truncatedNote}}

## branchCommits
Review the commits on the current branch for bugs, regressions, and security issues. Focus on concrete actionable findings and cite commit IDs and files. If none, say so.

<branch commits>
{{patch}}
</branch commits>{{truncatedNote}}

## againstRef
Review the current branch against {{ref}}. Identify actionable issues introduced on the current branch.

<comparison patch>
{{patch}}
</comparison patch>{{truncatedNote}}

## workingFileHeading
File: {{path}} ({{kind}})

## branchCommitHeading
Commit {{shortOid}}: {{subject}}

## binaryFileNote
Binary file changed.

## noTextDiffNote
No text diff available.

## patchTruncatedNote
The patch was truncated.

## inputTruncatedNote
The review input was truncated.

## diffTruncatedMarker
[Diff truncated.]

## generateRequest
Write a commit subject for these staged changes.

<staged_diff>
{{patch}}
</staged_diff>

## generateFileUnavailable
File: {{path}} ({{kind}}; content unavailable)

## generateNoHunksNote
No text hunks available.

## generateTruncatedMarker
[Diff truncated to fit the commit message request.]
