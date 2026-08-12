const path = require('path');
const { loadSkill } = require('./skill');
const { runDevin } = require('./runner');
const { runChecks } = require('./checks');
const { runGraders } = require('./grader');
const { writeResult, listResults } = require('./results');

function main(args) {
  const [command, skillName] = args;
  if (!command) {
    console.log('Usage: prompt-eval <run|list> <skill-name>');
    process.exit(1);
  }
  const promptsRoot = path.resolve('prompts');
  const skill = loadSkill(promptsRoot, skillName);

  if (command === 'run') {
    runCommand(skill);
  } else if (command === 'list') {
    listCommand(skill);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

function runCommand(skill) {
  for (const [caseName, caseDir] of Object.entries(skill.testCases)) {
    console.log(`Running ${skill.name} case ${caseName}...`);
    const runData = runDevin(skill, caseName, caseDir, skill.config);
    const checkResults = runChecks(skill.config.checks, runData.workspace);
    const graderResults = runGraders(skill.graders, runData.workspace, caseDir, skill.config);
    const result = writeResult(skill, caseName, runData, checkResults, graderResults);
    console.log(`  result: ${result.path}`);
    console.log(`  done: ${runData.done}, checks: ${passed(checkResults)}/${checkResults.length}, aggregate: ${result.aggregate.score.toFixed(3)}`);
  }
}

function passed(checks) {
  return checks.filter(c => c.passed).length;
}

function listCommand(skill) {
  const results = listResults(skill);
  console.log(`Results for ${skill.name}:`);
  for (const r of results.slice(-10).reverse()) {
    console.log(`  ${r.timestamp} ${r.testCase}: ${r.aggregate.score.toFixed(3)}`);
  }
}

module.exports = { main };
