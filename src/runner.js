const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { randomUUID } = require('crypto');

function createSandbox(inputsDir, name) {
  const parent = path.join(os.tmpdir(), 'prompt-eval');
  fs.mkdirSync(parent, { recursive: true });
  const prefix = name ? `${name}-` : 'prompt-eval-';
  const base = fs.mkdtempSync(path.join(parent, prefix));
  if (fs.existsSync(inputsDir)) {
    copyDir(inputsDir, base);
  }
  return base;
}

function copyDir(src, dest) {
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function runDevin(skill, caseName, caseDir, config) {
  const workspace = createSandbox(caseDir, skill.name);
  const runId = randomUUID();
  const configPath = path.join(workspace, `.agent-config-${runId}.json`);
  const exportPath = path.join(workspace, `.export-${runId}.json`);

  const agentConfig = buildAgentConfig(workspace, config);
  fs.writeFileSync(configPath, JSON.stringify(agentConfig, null, 2));

  const args = [
    '-p',
    '--model', config.llm.runner.model,
    '--config', configPath,
    '--export', exportPath,
    '--permission-mode', config.llm.runner.permissionMode || 'accept-edits',
    '--respect-workspace-trust', 'false',
    '--', skill.prompt,
  ];

  const start = new Date().toISOString();
  const result = spawnSync('devin', args, {
    cwd: workspace,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: (config.llm.runner.timeoutSeconds || 120) * 1000,
  });

  let exportData = null;
  let done = false;
  let toolCalls = [];
  let reasoning = null;
  let timedOut = result.signal === 'SIGTERM';

  if (fs.existsSync(exportPath)) {
    try {
      exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      ({ done, toolCalls, reasoning } = analyzeExport(exportData, config.llm.runner.max_turns));
    } catch (e) {
      // keep export null
    }
  }

  cleanConfigFiles(workspace, configPath, exportPath);

  return {
    workspace,
    start,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status,
    timedOut,
    export: exportData,
    done,
    toolCalls,
    reasoning,
    completed: done && result.status === 0,
  };
}

function buildAgentConfig(workspace, config) {
  const escaped = workspace.replace(/\\/g, '\\\\');
  return {
    permissions: {
      allow: [
        `Read(${escaped}\\**)`,
        `Write(${escaped}\\**)`,
      ],
    },
  };
}

function analyzeExport(exportData, maxTurns) {
  let done = false;
  const toolCalls = [];
  let reasoning = null;
  const steps = exportData?.steps || [];
  let agentSteps = 0;
  for (const step of steps) {
    if (step.source === 'agent') {
      agentSteps += 1;
      if (step.reasoning_content) reasoning = step.reasoning_content;
      for (const call of step.tool_calls || []) {
        toolCalls.push({
          id: call.tool_call_id,
          name: call.function_name,
          arguments: call.arguments,
        });
        if (call.function_name === 'done') {
          done = true;
        }
      }
    }
  }
  if (agentSteps > (maxTurns || 10) && !done) {
    done = false;
  }
  return { done, toolCalls, reasoning };
}

function cleanConfigFiles(workspace, configPath, exportPath) {
  try { fs.unlinkSync(configPath); } catch {}
  try { fs.unlinkSync(exportPath); } catch {}
}

module.exports = { runDevin };
