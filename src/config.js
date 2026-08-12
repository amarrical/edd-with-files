const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const DEFAULTS = {
  runner: { provider: 'devin', model: 'swe-1-6-fast', max_turns: 10 },
  grader: { provider: 'devin', model: 'swe-1-6-fast' },
};

function loadAndValidate(skillDir) {
  const configPath = path.join(skillDir, 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config.yaml for skill at ${skillDir}`);
  }
  const raw = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  const config = mergeDefaults(raw);
  validate(config);
  return config;
}

function mergeDefaults(raw) {
  return {
    llm: {
      runner: { ...DEFAULTS.runner, ...raw?.llm?.runner },
      grader: { ...DEFAULTS.grader, ...raw?.llm?.grader },
    },
    testCases: raw?.testCases || { default: {} },
    weights: raw?.weights || {},
    checks: raw?.checks || [],
  };
}

function validate(config) {
  if (!config.llm?.runner?.provider) throw new Error('config: llm.runner.provider is required');
  if (!config.llm?.runner?.model) throw new Error('config: llm.runner.model is required');
  if (!config.llm?.grader?.provider) throw new Error('config: llm.grader.provider is required');
  if (!config.llm?.grader?.model) throw new Error('config: llm.grader.model is required');
  if (!config.weights || typeof config.weights !== 'object') throw new Error('config: weights must be an object');
  if (!Array.isArray(config.checks)) throw new Error('config: checks must be an array');
  if (!config.testCases || typeof config.testCases !== 'object') throw new Error('config: testCases must be an object');
  for (const [id, tc] of Object.entries(config.testCases)) {
    if (tc && typeof tc !== 'object') throw new Error(`config: testCases.${id} must be an object`);
  }
  for (const check of config.checks) {
    if (!check.type) throw new Error('config: each check must have a type');
    if (check.type === 'grep') {
      if (!check.file) throw new Error('config: grep check requires file');
      if (!check.pattern) throw new Error('config: grep check requires pattern');
    }
  }
}

module.exports = { loadAndValidate };
