# Prompts

This is a self-contained prompt evaluation fixture. Each prompt lives in a directory under `prompts/<prompt-name>/` and contains:

- `prompt.md` — the prompt under test.
- `config.yaml` — runner and grader configuration, test cases, weights, and pass/fail checks.
- `inputs/<case>/` — per-test-case fixture files.
- `grading/<metric>.md` — one grader prompt per metric.
- `results/` — one JSON file is written here for every execution.

## Example

```bash
npx prompt-eval run generate-four-files
npx prompt-eval list generate-four-files
```
