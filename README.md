# prompt-eval-harness — agent notes

## What this project is

A file-based LLM skill evaluation harness. It runs a `prompt.md` against one or more test cases in a temporary workspace, applies the resulting tool calls, runs pass/fail `grep` checks, grades the resulting files with a separate LLM grader, and writes one scored JSON result file per execution.

## How to run things

- `npm install` (requires Node.js >= 18)
- `npm test` runs `node --test`, but there are no `*.test.js` files yet
- `npx prompt-eval run <skill-name>` — run a skill's test cases
- `npx prompt-eval list <skill-name>` — list recent result files
- Example: `npx prompt-eval run generate-four-files`

## Agent execution constraints

- **Do not run `npx prompt-eval` yourself.** The harness spawns `devin.exe`, which an agent cannot execute reliably. If you need to run an evaluation, ask the user to run `npx prompt-eval run <skill-name>` and share the output.
- **Update this file with new findings.** If you discover a convention, gotcha, or project-specific fact that would help the next agent make changes, append it to `devin.md` before finishing.

## Project layout

- `bin/prompt-eval.js` — CLI entry point
- `src/` — harness implementation
  - `cli.js` — `run` and `list` commands
  - `config.js` — loads `config.yaml`, merges defaults, validates schema
  - `runner.js` — creates sandbox, invokes `devin`, parses the exported run
  - `checks.js` — `grep` checks against workspace files
  - `grader.js` — invokes grader LLM and parses `{score, reasoning}` JSON
  - `results.js` — writes `results/<timestamp>.json`
  - `skill.js` — loads prompt, discovers test cases and grader prompts
- `prompts/<skill-name>/` — one directory per skill under test
  - `prompt.md` — the prompt under test
  - `config.yaml` — required; defines `llm.runner`, `llm.grader`, `testCases`, `weights`, `checks`
  - `inputs/<case>/` — fixture files copied into the temporary workspace
  - `grading/<metric>.md` — grader prompt for each metric
  - `results/` — JSON artifacts; ignored by git
- `openspec/` — spec-driven change artifacts (proposals, specs, tasks, archive)
- `.devin/skills/` and `.devin/workflows/` — OpenSpec helper skills

## Important conventions

1. **The prompt directory is `prompts/`, not `skills/`**. `src/cli.js` resolves `path.resolve('prompts')`. The spec archive mentions `skills/`, but the running code uses `prompts/`.
2. **Every runnable skill needs `prompt.md` + `config.yaml`**. `dbtune-setup` and `generate-four-files` are complete. `dbtune-start` currently has `prompt.md` and `inputs/default/` but no `config.yaml`, so it cannot be run by the harness until `config.yaml` is added.
3. **Frontmatter in `prompt.md` is stripped**. `src/skill.js` removes a leading `--- ... ---` block before sending the prompt to the runner. If a skill header is present and does not follow that exact frontmatter format, remove it manually; otherwise the literal header text will be passed to the runner and can break execution.
4. **The runner requires `devin` on PATH**. `src/runner.js` spawns:
   ```
   devin -p --model <model> --config <agent-config> --export <export-file> \
         --permission-mode <mode> --respect-workspace-trust false -- <prompt>
   ```
   The runner LLM must signal completion by calling the `done` tool. `max_turns` is enforced.
5. **Grader prompts must return JSON**. Each `grading/<metric>.md` prompt is invoked with `Workspace:` and `Inputs:` lines appended plus the instruction to return `{"score": number between 0 and 1, "reasoning": string}`. Grader output is extracted from markdown code fences if necessary.
6. **Checks are `grep` only**. Each check must be `{name, type: 'grep', file: '<workspace-relative>', pattern: '<regex>', flags: ''}`. `pattern` is compiled as a `RegExp`.
7. **Weights drive the aggregate score**. `weights` in `config.yaml` maps a check or metric name to a weight; anything not listed defaults to `1`.
8. **Sandbox lives under `<temp>/prompt-eval/<skill-name>-<random>/`**. `inputs/<case>/` is copied in; the agent is granted read/write only inside that workspace. The generated `agent-config` and `export` JSON files are deleted after parsing so they do not contaminate grading.

## `config.yaml` schema

```yaml
llm:
  runner:
    provider: devin
    model: swe-1-6-fast
    max_turns: 10
    timeoutSeconds: 120
    permissionMode: accept-edits
  grader:
    provider: devin
    model: swe-1-6-fast
    timeoutSeconds: 120
testCases:
  default: {}
weights:
  allFilesPresent: 2
checks:
  - name: allFilesPresent
    type: grep
    file: a.txt
    pattern: A
```

## Adding a new skill

1. Create `prompts/<name>/`
2. Add `prompt.md` (no frontmatter unless the harness should strip it)
3. Add `config.yaml` with `llm`, `testCases`, `weights`, and `checks`
4. Add `inputs/default/` with fixture files
5. Add `grading/<metric>.md` prompts for any metrics you want graded

## Common gotchas for changes

- Do not add or remove comments unless asked.
- Keep dependencies pinned; `package.json` pins `yaml` to `2.7.0`.
- `.gitignore` ignores `node_modules/`, `tmp-spike/`, and `prompts/**/results/*.json`.
- The runner export parser (`src/runner.js`) inspects `exportData.steps`, counts `source === 'agent'` steps, collects `tool_calls`, treats `function_name === 'done'` as completion, and extracts the last `reasoning_content`.
- When asked to create a new prompt, also create a blank `prompt.md` and a default `config.yaml`.
