const fs = require('fs');
const path = require('path');
const { loadAndValidate } = require('./config');

function loadSkill(skillsRoot, skillName) {
  const skillDir = path.resolve(skillsRoot, skillName);
  if (!fs.existsSync(skillDir)) {
    throw new Error(`Skill not found: ${skillName}`);
  }
  const promptPath = path.join(skillDir, 'prompt.md');
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Missing prompt.md for skill ${skillName}`);
  }
  const prompt = loadPrompt(promptPath);
  const config = loadAndValidate(skillDir);

  const inputsDir = path.join(skillDir, 'inputs');
  const testCases = discoverTestCases(inputsDir, config.testCases);

  const gradingDir = path.join(skillDir, 'grading');
  const graders = discoverGraders(gradingDir);

  return {
    name: skillName,
    skillDir,
    prompt,
    config,
    testCases,
    graders,
    resultsDir: path.join(skillDir, 'results'),
  };
}

function loadPrompt(promptPath) {
  const raw = fs.readFileSync(promptPath, 'utf8');
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

function discoverTestCases(inputsDir, testCasesConfig) {
  const cases = {};
  if (fs.existsSync(inputsDir)) {
    for (const entry of fs.readdirSync(inputsDir)) {
      const caseDir = path.join(inputsDir, entry);
      if (fs.statSync(caseDir).isDirectory()) {
        cases[entry] = caseDir;
      }
    }
  }
  for (const [id, override] of Object.entries(testCasesConfig)) {
    if (override && override.inputs) {
      cases[id] = path.resolve(inputsDir, override.inputs);
    } else if (!(id in cases)) {
      cases[id] = path.join(inputsDir, id);
    }
  }
  if (Object.keys(cases).length === 0) {
    throw new Error('No test cases found in inputs/');
  }
  return cases;
}

function discoverGraders(gradingDir) {
  const graders = {};
  if (!fs.existsSync(gradingDir)) return graders;
  for (const entry of fs.readdirSync(gradingDir)) {
    if (entry.endsWith('.md')) {
      const name = path.basename(entry, '.md');
      graders[name] = fs.readFileSync(path.join(gradingDir, entry), 'utf8');
    }
  }
  return graders;
}

module.exports = { loadSkill };
