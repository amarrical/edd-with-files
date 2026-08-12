## Context

The project currently has no dedicated prompt evaluation harness. The user wants to replace ad-hoc promptfoo usage with a file-aware harness. See `proposal.md` for motivation and scope.

## Goals / Non-Goals

**Goals:**
- Execute a file-based skill once per test case and capture the resulting workspace.
- Run all pass/fail checks and multiple grader prompts against the same execution.
- Keep every execution result in a separate JSON file under the skill directory for easy comparison.
- Make runner and grader LLMs independently configurable, with `devin.exe` as the first supported backend.

**Non-Goals:**
- A web UI or database-backed result history.
- Automatic prompt ablation or load-bearing line detection (the user will do this manually by comparing result files).
- Support for non-file-based or chat-style prompt evaluation.
- Distributed or parallel execution across multiple machines.

## Decisions

### Decision: Tool-use sandbox instead of inline file strings
- **Choice**: Provide the runner LLM with `read`, `write`, `edit`, `list_files`, and `done` tools.
- **Rationale**: Matches how the actual skills will run (`/skill-name @file`) and naturally supports skills that read multiple files and modify existing files in place. It also makes the harness agnostic to how the LLM formats file content.
- **Alternative considered**: Pasting file contents into the prompt and expecting the model to emit full file contents in markdown blocks. Rejected because it does not scale to multi-file edits and is brittle for large files.

### Decision: Separate runner and grader LLMs
- **Choice**: Keep `llm.runner` and `llm.grader` as distinct configuration blocks.
- **Rationale**: Lets the user swap the skill executor while keeping grading consistent, which is essential for comparing model behavior and identifying load-bearing prompt lines.
- **Alternative considered**: A single `llm` block for both. Rejected because it would couple execution and evaluation models.

### Decision: One result file per execution
- **Choice**: Write `skills/<skill-name>/results/<timestamp>.json` for each run.
- **Rationale**: Makes reasoning and workspace snapshots easy to read and diff, and aligns with the user's stated goal of collecting grade runs over time.
- **Alternative considered**: A single JSONL file per skill. Rejected because the user wants readable per-execution files with reasoning.

### Decision: `devin.exe` as the first provider
- **Choice**: Implement `devin.exe` as the initial LLM backend, invoked non-interactively with `-p`, `--model`, `--agent-config`, and `--export`.
- **Rationale**: The user already has `devin.exe` installed and is familiar with it as a local agent.
- **Alternative considered**: Direct OpenAI/Anthropic HTTP clients. Rejected to avoid requiring API keys and to leverage the existing `devin.exe` tool-calling runtime.

### Decision: JSON result file stores workspace by relative paths
- **Choice**: The result JSON records the relative paths of input and output files and includes a copy of output file contents only when files are small enough.
- **Rationale**: Keeps result files self-contained for small outputs without bloating large binary outputs.
- **Trade-off**: Very large output files will be referenced by path rather than embedded.

## Risks / Trade-offs

- **Parsing `devin.exe` export format** → Spike: run a minimal tool-using prompt with `--export` to confirm the JSON schema before finalizing the parser.
- **Runner escapes the sandbox** → Mitigation: set `devin.exe` working directory to the temp workspace and configure permissions to allow only `Read`/`Write` under that workspace.
- **`done` tool not robust** → Mitigation: provide a clear tool description in the injected system message and fall back to a maximum-turn limit.
- **Result files grow unbounded** → Mitigation: results are written under each skill directory; user can archive or prune as needed. No automatic pruning is implemented.
- **Score format inconsistency** → Mitigation: require graders to return JSON with `score` and `reasoning` keys; fall back to a regular expression and mark the metric as failed if parsing fails.
