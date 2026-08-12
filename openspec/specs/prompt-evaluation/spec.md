# prompt-evaluation Specification

## Purpose
The prompt evaluation harness executes file-based LLM skills in a sandbox, grades the resulting files with a separate LLM, and persists scored results so prompt authors can compare runs and identify load-bearing prompt lines.
## Requirements
### Requirement: Skill directory convention
The harness SHALL discover skills from a `skills/<skill-name>/` directory that contains a `prompt.md`, a `config.yaml`, an `inputs/` directory, a `grading/` directory, and a `results/` directory.

#### Scenario: Harness loads a skill
- **WHEN** the harness is pointed at `skills/<skill-name>/`
- **THEN** it SHALL read `prompt.md` as the skill prompt, `config.yaml` as the evaluation plan, `inputs/<case>/` as test fixtures, and `grading/<metric>.md` as grader prompts.

### Requirement: Sandboxed runner execution
The harness SHALL execute the skill once per test case in a temporary workspace, providing the runner LLM with `read`, `write`, `edit`, `list_files`, and `done` tools. The runner SHALL signal completion by calling `done`.

#### Scenario: Skill writes multiple files
- **WHEN** a test case starts with input files in the temporary workspace
- **THEN** the runner LLM MAY read, write, and edit files in that workspace
- **AND** the harness SHALL consider the run complete once the runner calls `done`.

#### Scenario: Runner never calls done
- **WHEN** the runner reaches the configured maximum number of turns without calling `done`
- **THEN** the harness SHALL stop the run and record the test case as failed.

### Requirement: Pass/fail checks
After the runner finishes, the harness SHALL evaluate all configured checks, which MUST support a `grep` assertion against a target file in the workspace.

#### Scenario: Grep check passes
- **WHEN** a check asserts that `output-a.txt` contains the pattern `needle`
- **AND** the pattern is present
- **THEN** the check SHALL be recorded as passed.

#### Scenario: Grep check fails
- **WHEN** a check asserts that `output-a.txt` contains the pattern `needle`
- **AND** the pattern is absent
- **THEN** the check SHALL be recorded as failed.

### Requirement: Grader execution
The harness SHALL run each configured grader prompt once per test case, using the same grader LLM, and parse a structured result containing a numeric score between 0 and 1 and a reasoning string.

#### Scenario: Grader returns score and reasoning
- **WHEN** a grader prompt is invoked with the workspace snapshot and the original inputs
- **THEN** the grader response SHALL be parsed into a `score` and `reasoning`
- **AND** the harness SHALL store both values in the result file.

#### Scenario: Grader returns invalid structure
- **WHEN** the grader response cannot be parsed into a numeric score
- **THEN** the harness SHALL record the metric as failed with the raw response preserved for debugging.

### Requirement: Weighted aggregation
The harness SHALL compute a weighted aggregate score across test cases and metrics according to the weights in `config.yaml`.

#### Scenario: Aggregate with weighted metrics
- **WHEN** two metrics have weights `2.0` and `1.0` and scores `1.0` and `0.0`
- **THEN** the aggregate score SHALL be `0.666...`.

### Requirement: Result persistence
The harness SHALL write one result file per skill execution to `skills/<skill-name>/results/<timestamp>.json`, including the runner and grader configuration, the final workspace state (or paths to files), pass/fail check results, per-metric scores and reasoning, and the weighted aggregate.

#### Scenario: Result file written
- **WHEN** a skill execution finishes
- **THEN** the harness SHALL create `results/2026-08-07T111300Z.json`
- **AND** the file SHALL contain enough information to compare scores across runs.

### Requirement: Configurable LLM providers
The harness SHALL allow the runner and grader LLMs to be configured independently, supporting at least `devin.exe` as a backend with options for model, permission mode, and working directory.

#### Scenario: Swap runner model
- **WHEN** the user changes `llm.runner.model` in `config.yaml`
- **THEN** subsequent runs SHALL use the new model for execution while keeping the grader model unchanged.

