---
name: update-plan
description: Update PLAN.md at the repo root with new context from the current conversation — new decisions, resolved open questions, newly discovered issues/TODOs, or a changed implementation order. Use this whenever the user asks to record/save the conversation's context into PLAN.md, says things like "この会話のコンテクストをPLAN.mdに記録して", "PLANを更新して", "save this to the plan", or after a design/decision discussion wraps up and they want it captured before moving on. Do not use this for edits that belong in CLAUDE.md or docs/ (settled architecture, requirements, API/DB design) — PLAN.md is only for temporary, not-yet-documented context.
---

# update-plan

PLAN.md is this project's disposable working memory: a running log of decisions, open TODOs,
and next steps that haven't been written into `CLAUDE.md` / `docs/requirements.md` / `docs/design/`
yet. Those other files are the source of truth for settled specs; PLAN.md exists so nothing
discussed in conversation gets lost before it makes it into (or is superseded by) those docs.

Your job is to fold whatever new happened in *this* conversation into PLAN.md, in place —
never rewrite the whole file, never duplicate what's already there.

## Steps

1. **Read the current `PLAN.md`** at the repo root first. Its own header comment explains its
   purpose and rules ("完了した項目はチェックし、古くなったら削除してよい" etc.) — follow those rules,
   don't reinvent them.

2. **Scan the conversation for what actually changed.** Look for:
   - New decisions made (architecture choices, resolved ambiguities, format/schema choices agreed
     on with the user) → these go in `## 決定ログ（日付順）` as a new dated bullet, appended at the
     bottom (existing entries are oldest-first). Use today's date (check the `currentDate` context
     value, don't guess). Cite the doc/file where the full detail now lives if the decision was
     also written into `docs/` or `CLAUDE.md` in this same conversation — PLAN.md's entry should be
     a short pointer, not a re-explanation.
   - Newly found bugs/issues/gaps that need fixing before implementation → these go in
     `## 未対応の指摘事項（実装開始前に直すべき）` as a new `- [ ]` item, with a `file:line` reference
     if the issue is concrete and traceable to a specific file.
   - Open questions that got resolved in this conversation → remove them (or their sub-bullet) from
     `## 残る未決定事項`. If that empties the section, write `なし` plus a one-line pointer to where
     the resolutions are documented (e.g. `docs/design/05-open-questions.md`), matching the existing
     style in the file.
   - Any reordering or new step in the implementation plan → update `## 次にやること（実装順の想定）`,
     renumbering as needed. Don't just append — if a step was completed or superseded, remove or
     replace it so the list still reads as "what's actually next."
   - If `## 現在のフェーズ` no longer describes reality (e.g. a phase finished, implementation started),
     update that paragraph too.

3. **Only capture what's genuinely new.** If nothing in the conversation adds information beyond
   what PLAN.md already says, say so — don't pad the file with restatements.

4. **Keep the boundary with CLAUDE.md/docs/ clean.** If something you're about to add is actually a
   settled spec/architecture decision (the kind that belongs in `docs/design/` or `CLAUDE.md`) rather
   than transient conversation context, flag that to the user instead of writing it into PLAN.md —
   PLAN.md entries should stay short pointers to those docs, not a second copy of the content.

5. **Edit the file with targeted edits** (add/remove/reorder specific bullets or lines), not a full
   rewrite — this keeps the diff readable and avoids clobbering entries from other conversations.

6. **Report back concisely**: a short list of what was added/checked-off/removed, section by
   section. No need to repeat the entire updated file back to the user.
