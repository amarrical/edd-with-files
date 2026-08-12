const fs = require('fs');
const path = require('path');

function ensureResultsDir(skill) {
  if (!fs.existsSync(skill.resultsDir)) {
    fs.mkdirSync(skill.resultsDir, { recursive: true });
  }
}

function writeResult(skill, caseName, runData, checkResults, graderResults) {
  ensureResultsDir(skill);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const filename = `${timestamp}.json`;
  const resultPath = path.join(skill.resultsDir, filename);
  const result = {
    skill: skill.name,
    testCase: caseName,
    timestamp: new Date().toISOString(),
    runner: skill.config.llm.runner,
    grader: skill.config.llm.grader,
    run: {
      completed: runData.completed,
      done: runData.done,
      timedOut: runData.timedOut,
      exitCode: runData.exitCode,
      stdout: runData.stdout,
      stderr: runData.stderr,
      reasoning: runData.reasoning,
      workspace: runData.workspace,
      toolCalls: runData.toolCalls.map(t => ({ name: t.name, arguments: t.arguments })),
    },
    checks: checkResults,
    metrics: graderResults,
    aggregate: aggregateScores(skill.config.weights, checkResults, graderResults),
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  return { path: resultPath, aggregate: result.aggregate };
}

function aggregateScores(weights, checkResults, graderResults) {
  const items = [];
  for (const check of checkResults) {
    const weight = weights[check.name] || 1;
    items.push({ name: check.name, score: check.passed ? 1 : 0, weight });
  }
  for (const [metric, result] of Object.entries(graderResults)) {
    const weight = weights[metric] || 1;
    items.push({ name: metric, score: result.score, weight });
  }
  if (items.length === 0) return { score: 0, items };
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const weightedSum = items.reduce((sum, i) => sum + i.score * i.weight, 0);
  return { score: totalWeight ? weightedSum / totalWeight : 0, items };
}

function listResults(skill) {
  if (!fs.existsSync(skill.resultsDir)) return [];
  return fs.readdirSync(skill.resultsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const p = path.join(skill.resultsDir, f);
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { writeResult, listResults };
