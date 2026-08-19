
<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.50.1 -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**For every user request in this project, run `backlog instructions overview` before answering or taking action.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:
- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->

## Environment & Tooling Guardrails

### Windows PowerShell & CLI Tools
- **Markdown Payloads**: When passing multiline or markdown text (containing backticks or quotes) to CLI tools (such as `gh pr comment` or `gh pr review`), write the content to a file and pass `-F <path>` to avoid PowerShell backtick escape parsing errors.

## Architectural Invariants for Tab Organizing Pipeline

1. **Pass-1 Metadata Preservation**: Labeled tab records produced in Pass 1 must preserve `domain` and `url` so downstream anti-domain heuristics in `validateGroupingPlan` can detect website-based grouping violations.
2. **Hallucination Filtering**: Tab IDs from LLM clustering plans must always be validated against the known input tab IDs (`validTabIds`) in both `validateGroupingPlan` and `normalizePlanGroups`/`reconcilePlanWithRawTabs`.
3. **Degenerate Plan Recovery**: If Pass 2 returns a degenerate single-group plan or extreme collapse, the service worker must automatically fall back to semantic topic clusters derived from Pass-1 clean labels (`entity` / `subject`).
4. **Context Scaling**: While latency profiles enforce conservative context ceilings, explicit user-configured `num_ctx` in settings must be respected to support large tab sets (120–150+ tabs) without artificial context exhaustion.
5. **Dense Prompt Indexing (`1..N`)**: LLM clustering prompts must ALWAYS map native browser tab IDs (such as 9-digit Chrome IDs) to dense, 1-based sequential indices `1..N` and translate them back on normalization. This eliminates multi-digit numeric range hallucinations, reduces ID token overhead by ~70%, and speeds up model generation.
6. **Hierarchical Topic Fallback & Semantic Singleton Merging**: Reconcilers and fallback clusterers must cluster by shared token roots and entity stems rather than exact string equality `(t.entity || t.subject)`. Small groups and 1-tab singletons must be scored against valid clusters before being relegated to `Other`, preventing massive 30+ tab `Other` dumps.
7. **High-Density Micro-Signal Extraction**: URL and DOM extractors must parse deterministic structured signals (search queries `?q=`, subreddits `/r/`, repo bios `owner/repo`, JSON-LD triples) client-side so models never rely on ambiguous naked titles alone.
8. **Preview Dismissal vs. Mutation Undo Lifecycle**: Tab organization preview actions that have not yet mutated the browser state must be labeled `Cancel`; `Undo` must strictly be reserved for reverting applied browser state mutations.
