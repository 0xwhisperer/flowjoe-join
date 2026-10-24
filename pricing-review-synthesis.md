# FlowJoe Pricing & Product Strategy: Synthesis of Shalom's Feedback

## Current launch terms — updated October 24, 2026

This is a historical review of an earlier pricing draft. The discussion below is retained as background, including Shalom's original suggestions and historical competitor comparisons; it does not establish current prices, verified implementation, privacy guarantees or a decision to reduce launch scope. Where it differs, the current terms here and the [pricing page](https://join.flowjoe.app/pricing.html) take precedence. The complete planned launch offering remains the target; commercial implementation and release verification are still required.

| Offering | Monthly payment | Annual or one-time payment |
|---|---|---|
| Solo | Free | Free |
| Pro, standard | $10/month | $96/year ($8/month equivalent) |
| Pro, Founder Forever | Standard $10/month if monthly is chosen; founder status retained | $72/year ($6/month equivalent, paid annually) |
| Co-Host on Pro | $6/month; maximum one position | $56/year; maximum one position |
| Team | $18/seat/month; two-seat minimum totals $36/month | $180/seat/year; two-seat minimum totals $360/year |
| Project Pass | No recurring subscription | $15 one-time for 30 days of Pro sharing |
| Project Pass with Co-Host | No recurring subscription | $21 one-time for the same 30 days with one assignable Co-Host |

- Pro allows the owner plus three guest editors, with unlimited viewers. A Co-Host uses one guest-editor place, leaving two for other guest editors. The owner remains a leader alongside the Co-Host and retains final control.
- A Pro account can add at most one paid Co-Host position. Assign it before or during a meeting; it can change between meetings or be replaced immediately. The new Co-Host gets a notification explaining the role. Removing or replacing the role preserves ordinary guest access unless the owner separately changes that access. Reconnecting restores Co-Host powers only while the person remains assigned.
- The Founder Forever offer is Pro annual only, available during the first 30 launch days or first 1,000 subscribers, whichever comes first. The account retains its founder rate through cancellation, lapse and Team changes; returning to Pro annual restores $72/year. Team uses standard rates. No separate founder Co-Host discount has been defined.
- Both Pass options are one-time 30-day purchases with no automatic renewal. The $21 option includes one Co-Host for its purchased term and does not start a Co-Host subscription. Every new Pass queues its full 30 days after all already-purchased terms, even when switching between $15 and $21. Each term retains its purchased option, adding time rather than simultaneous positions. Co-Host access changes only at the applicable boundary; new terms start automatically without disconnecting the meeting, reloading, reauthentication, a new invitation or another payment. Adjacent Co-Host terms preserve the current assignment; entering a base term removes only extra role powers while preserving ordinary guest access and participation. Later Co-Host availability uses the normal assignment and explanatory-notice rules, without silently restoring an expired assignment. Final paid-through expiry still pauses sharing. An active base Pass can add one Co-Host immediately for a flat $6 one-time payment until its original expiry, with remaining time and exact expiry shown before payment. No proration, remaining-days cutoff, added time, automatic renewal or recurring subscription; do not charge again for an already-upgraded term or grant duplicate positions. The $6 upgrade changes only the active base term; queued terms retain their purchased option. Pro begins immediately and saves the exact unused active Pass duration plus all queued terms in purchase order, preserving their base/Co-Host option and purchased $6 upgrade. Saved time does not run down during Pro or expire at its old calendar date. Resume it automatically and seamlessly when subscription access actually ends, with the interrupted term first; cancellation requests do not consume it while paid Pro continues. Active Pro follows its own entitlements; saved Co-Host access does not grant a recurring add-on or extra position during Pro. Preserve normal role/notification rules and avoid duplicate time from repeated events. Refunds, disputes, failed-payment grace and other plan overlaps still need an entitlement contract before implementation. The upgrade is approved commercial intent; checkout design, implementation and verification remain open. Verify actual fees and costs before claiming profitability or a loss leader. Existing paid-customer rules reserve the personal address for 12 months after paid access ends.
- Annual savings differ: standard Pro saves $24/year (20%); Team saves $36/seat/year (about 16.7%); Co-Host saves $16/year (about 22.2%). “Save with Annual” avoids claiming one uniform discount. Standard annual Pro with one annual Co-Host totals $152/year; Founder annual Pro with the same add-on totals $128/year.
- Team includes one assignable Co-Host for each paid member’s own session at no extra charge, alongside independent hosting and unlimited guest editors. The same assignment, replacement, explanatory notification, reconnect and role-removal rules apply, with the owner retaining final control. This per-host session allowance cannot be pooled into additional Co-Host positions in one session. Implementation and verification remain required. Studio/Enterprise remains the already-planned post-launch offering. Sharing addresses use `name.flowjoe.live`; `flowjoe.app` is for FlowJoe-controlled pages.

## Historical review — earlier draft, not current commercial terms


This document reflects on the thoughtful review shared by Shalom, exploring her perspectives alongside the current FlowJoe architecture, recent pricing refinements, and product roadmap. Rather than a critique, this is a collaborative volley of ideas looking at where her instincts highlight sharp user insights, where our recent architectural breakthroughs address her questions, and how we can fold her best suggestions into our launch strategy.

---

## 1. Context: The Snapshot Reviewed

Shalom's review was based on an earlier working draft of the pricing model. Since that draft was shared, several key decisions have crystallized in the codebase and plan:
- **Team's Distinct Purpose:** Defined as **Decentralized Peer-to-Peer Desktop Meshing** (mounting teammate branches live in your local tree with offline queueing), rather than just an administrative license bundle.
- **Privacy-Preserving Verification:** Replaced raw hardware serial tracking with an irreversible salted hash of the operating system installation ID combined with account verification, ensuring swappable parts (like RAM or hard drives) are never inspected.
- **Plugin Sandbox:** Confirmed that plugins are strictly declarative (custom fields, domain templates, prompts, and formatters) with zero outbound network permissions, resolving data-leakage risks.
- **Unified Pricing Ladder:** Solo ($0), Pro ($8/mo annual or $10 monthly), Project Pass ($15 one-time, 30 days), Co-Host Add-on (+$6/mo), Team ($15/seat/mo annual or $18 monthly, 2-seat min = $30/mo), and Studio (20+ seats volume).

---

## 2. Collaborative Volley: Idea by Idea

### A. Tiers: Launch with Solo + Pro First vs. Showing Team
* **Shalom's Perspective:** From a lean launch perspective, keeping it to Solo ($0) and Pro ($8 or $5) keeps things simple. If a host needs more than 3 editors, offer an "add a seat" option and hold the full Team tier for later when customer demand proves itself.
* **Exploring the Idea:**
  * Her instinct to keep the initial offering focused and avoid premature administrative complexity is very sound.
  * What makes Team special in our current architecture is that it isn’t just an "admin seat bundle." It unlocks **Peer Nodes in the desktop app**—allowing two colleagues on separate computers to mount each other’s branches locally and sync edits without central cloud hosting.
  * Keeping the Team card visible on the pricing page serves an important framing role: it shows users the full ladder (Solo for individuals, Pro for client reviews, Team for peer collaboration), which makes the $8 Pro price look very approachable.

---

### B. Price Point Defense ($8 vs. $5 or an Early Adopter Promo)
* **Shalom's Perspective:** As a new entrant, is $8/month defensible right out of the gate? Would starting at $5 or running an early adopter promotion gain more initial traction?
* **Exploring the Idea:**
  * For software that provisions an automated private tunnel (`name.flowjoe.app`) and live real-time presence, $8/month ($96/year) is already very accessible compared to peers like Figma ($15/mo), Miro ($8–$10/mo), or Loom ($12.50/mo).
  * Setting a base price at $5 can inadvertently anchor the product's perceived value lower without necessarily driving higher volume.
  * **Her promotional idea is a winner:** Keeping the published price at $8, while offering a limited-time **Launch Special** or **Founding Member annual discount** gives early supporters a great incentive without permanently discounting the brand.

---

### C. The Zoom / Screen-Share Alternative
* **Shalom's Perspective:** What prevents someone from simply jumping on Zoom or Google Meet and sharing their screen with a client instead of purchasing a sharing tunnel?
* **Exploring the Idea:**
  * This is an observant question that touches on how real users behave.
  * Screen sharing is passive and one-way: clients can't navigate at their own pace, inspect high-resolution media, interact with spreadsheets or calendars, or leave organized notes.
  * FlowJoe's live collaboration turns a passive presentation into an active workshop: clients can move cards, type into shared notes, and brainstorm with Joe AI directly on the canvas. Highlighting this interactive difference in our messaging directly resolves this objection.

---

### D. Plugin Safety & Governance
* **Shalom's Perspective:** Community plugins could introduce security risks or require significant operational oversight, and might make sense as a paid or vetted feature.
* **Exploring the Idea:**
  * Her caution around third-party plugins is completely understandable given how script-heavy extensions in other apps can pose data risks.
  * FlowJoe's design solves this at the structural level: plugins are **declarative templates, custom fields, and layout grammars**. They do not execute external arbitrary code and have **zero outbound network access**. Because they cannot make network calls, private project files can never be transmitted externally.

---

### E. Trial Abuse & Machine Privacy
* **Shalom's Perspective:** Hardware-level locking can raise privacy concerns for a privacy-first tool and can be circumvented via virtual machines or reinstalls.
* **Exploring the Idea:**
  * Shalom identified the exact vulnerability and privacy trade-off with raw hardware identifiers.
  * We've refined this to use an irreversible salted hash of the operating system installation identity, paired with email account verification. It never touches swappable hardware serials (like RAM or hard drives), protecting user privacy while preventing rapid burner script abuse.

---

### F. The $15 Project Pass
* **Shalom's Perspective:** As someone who avoids recurring subscriptions herself, she strongly supports the non-recurring pass concept, suggesting $15 for 45 days.
* **Exploring the Idea:**
  * It's encouraging to see her validate the Project Pass—many creators work in bursts and prefer paying only when they have an active project.
  * Keeping the duration at **30 days** aligns neatly with a standard client sprint or review cycle, whereas 45 days begins to overlap with two full months and could inadvertently discourage ongoing monthly adoption.

---

### G. The Viral Loop & Guest Conversion
* **Shalom's Perspective:** If guests join in their browser without an account, when and how do we encourage them to get the app? She suggests a session-ended screen and exploring a Dropbox-style referral system.
* **Exploring the Idea:**
  * **This is exceptional, actionable advice.** When a client finishes a live review and leaves the session, a clean, elegant "Session Ended" screen can present a simple invitation: *"Presented with FlowJoe. Download the free desktop app for your own workspace."*
  * Adding a referral perk—such as granting a host a free month when an invited client becomes a paid host—is virtually cost-free for FlowJoe due to our zero-cloud architecture, and turns active hosts into natural evangelists.

---

## 3. Summary & Takeaways

Shalom's review provides thoughtful validation and practical marketing instincts:
1. **Adopt Her Guest Exit Screen:** Build a dedicated, elegant download prompt on the guest "Session Ended" page.
2. **Consider a Launch Promo:** Keep the anchor price at $8/mo ($96/yr), but consider offering an early-adopter or founding-member rate during launch week.
3. **Emphasize Active vs. Passive Sharing:** Clearly differentiate FlowJoe’s interactive canvas from passive screen sharing in our marketing copy.
4. **The Existing Roadmap Holds Firm:** Our refined architecture already addresses her technical concerns regarding plugins, machine privacy, and the distinct purpose of team peer nodes.
