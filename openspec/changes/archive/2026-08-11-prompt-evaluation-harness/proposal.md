## Why

The current prompt evaluation workflow relies on promptfoo, which treats prompts as string-in/string-out and executes each test case as a separate run. This breaks down for file-based skills that read multiple input files, write several output files, and modify existing files. We need a dedicated harness that can execute file-based skills once, grade them from multiple angles, and keep a record of scores over time so prompt authors can identify which prompt lines are load bearing.

## What Changes

- Add a new `prompt-eval` command-line harness that runs under the repository root.
- Introduce a skill directory convention (`skills/<skill-name>/`) containing:
  - `prompt.md` — the prompt under test
  - `config.yaml` — runner and grader LLM configuration, test cases, weights, and pass/fail checks
  - `inputs/<case>/` — per-test-case fixture files
  - `grading/<metric>.md` — custom grader prompts, one per metric
  - `results/<timestamp>.json` — one execution result file
- Execute the skill once per test case in a temporary sandbox, giving the runner LLM tool access (read, edit/write, list, done) and requiring a `done` tool call to signal completion.
- Run all pass/fail checks (simple grep assertions) against the sandbox after the runner finishes.
- Run all grader prompts against the same grader LLM once per execution, producing a numeric score and reasoning for each metric.
- Aggregate per-test-case scores with configured weights into an overall score and write one readable result file.
- Support multiple LLM backends, starting with `devin.exe` via configuration, so users can swap the runner model while keeping the grader model constant.

## Capabilities

### New Capabilities

- `prompt-evaluation`: Execute file-based LLM skills in a sandbox, grade outputs with a separate LLM, and collect scored results over time.

### Modified Capabilities

- None.

## Impact

- New harness code and configuration schema.
- New `skills/` top-level directory for test definitions (not shipped as part of the production application).
- No breaking changes to existing application code; the harness is a standalone testing/development tool.
