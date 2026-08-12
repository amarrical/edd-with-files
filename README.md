# prompt-eval-harness

A file-based LLM skill evaluation harness. It runs a prompt against one or more test cases, applies the resulting tool calls to a temporary workspace, runs pass/fail checks, grades outputs with a separate LLM, and writes one scored JSON result file per execution.

## Requirements

- Node.js >= 18
- `devin.exe` on your PATH

## Install

```bash
npm install
```

## Usage

Run a skill:

```bash
npx prompt-eval run <skill-name>
```

List recent results for a skill:

```bash
npx prompt-eval list <skill-name>
```

## Example

```bash
npx prompt-eval run generate-four-files
```

## Skill structure

Each prompt lives in `prompts/<prompt-name>/` and contains:

- `prompt.md` — the prompt under test
- `config.yaml` — runner and grader configuration, test cases, weights, and pass/fail checks
- `inputs/<case>/` — per-test-case fixture files
- `grading/<metric>.md` — one grader prompt per metric
- `results/` — one JSON file per execution

See [prompts/README.md](prompts/README.md) for more details.

## Evaluating skills

When evaluating a skill, remove the skill header (YAML frontmatter) from the top of `prompt.md`. The harness passes the prompt file contents directly to the runner, and the header can prevent the test from working correctly.

## Temporary files

Each `npx prompt-eval run` execution creates a temporary workspace under the system temp directory in a `prompt-eval/` folder (for example, `C:\Users\<user>\AppData\Local\Temp\prompt-eval` on Windows or `/tmp/prompt-eval` on Linux and macOS). These workspaces are used to apply tool calls, write intermediate config files, and capture runner output. Check this directory if you need to inspect the generated files from a run.

## Tests

```bash
npm test
```
