## 1. Spike and project setup

- [x] 1.1 Run a minimal `devin.exe` invocation with `--agent-config` and `--export` to confirm the export JSON schema used to extract tool calls and final reasoning.
- [x] 1.2 Initialize the harness package/module (e.g., `prompt-eval` CLI entry point) with dependency files.
- [x] 1.3 Add a `skills/.gitkeep` or documented `README.md` explaining the skill directory convention.

## 2. Configuration and skill loading

- [x] 2.1 Define and validate the `config.yaml` schema for runner, grader, test cases, weights, checks, and grading prompts.
- [x] 2.2 Implement skill discovery: load `skills/<skill-name>/prompt.md`, `config.yaml`, `inputs/<case>/`, and `grading/<metric>.md`.
- [x] 2.3 Implement a `Skill` object that exposes prompt text, test cases, grader prompts, and pass/fail checks.

## 3. Runner execution

- [x] 3.1 Build the `devin` runner backend: generate an `agent-config` file with `read`, `write`/`edit`, `list_files`, and `done` permissions restricted to the temporary workspace.
- [x] 3.2 Implement sandbox creation: copy `inputs/<case>/` to a temp directory and invoke `devin.exe -p --model <model> --agent-config <config> --export <file> -- <prompt>`.
- [x] 3.3 Parse the exported conversation to apply `write`/`edit` tool calls to the sandbox, handle `read` and `list_files` calls, and detect the `done` call.
- [x] 3.4 Add a `max_turns` guard that terminates the run with a failure if `done` is never called.

## 4. Checks and grading

- [x] 4.1 Implement pass/fail checks: support `grep` assertions against files in the post-run workspace.
- [x] 4.2 Build the `devin` grader backend: invoke the grader model with each `grading/<metric>.md` prompt plus the workspace snapshot and original inputs.
- [x] 4.3 Parse grader responses into `{score, reasoning}` JSON, and fall back to a clear failure if parsing fails.
- [x] 4.4 Implement weighted score aggregation across metrics and test cases.

## 5. Result persistence and CLI

- [x] 5.1 Write one `results/<timestamp>.json` file per skill execution with run metadata, check results, per-metric scores/reasoning, and the weighted aggregate.
- [x] 5.2 Implement the CLI command `prompt-eval run <skill-name>` that executes a single skill.
- [x] 5.3 Implement `prompt-eval list <skill-name>` to print recent result files and aggregate scores.
- [x] 5.4 Add error handling and informative messages for missing directories, invalid config, and runner/grader failures.

## 6. Integration and acceptance

- [x] 6.1 Create an example skill directory (`skills/generate-four-files/` or similar) with `prompt.md`, `config.yaml`, inputs, and grading prompts to prove the first use case.
- [x] 6.2 Run the example end-to-end and verify that one result file is created, checks run, and the aggregate score is computed.
- [x] 6.3 Document the harness usage in `skills/README.md`.
