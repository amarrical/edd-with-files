const fs = require('fs');
const path = require('path');

function runChecks(checks, workspace) {
  const results = [];
  for (const check of checks) {
    if (check.type === 'grep') {
      results.push(runGrep(check, workspace));
    } else {
      results.push({ name: check.name || check.type, passed: false, message: `Unknown check type: ${check.type}` });
    }
  }
  return results;
}

function runGrep(check, workspace) {
  const target = path.join(workspace, check.file);
  let content = '';
  let exists = false;
  try {
    content = fs.readFileSync(target, 'utf8');
    exists = true;
  } catch {
    exists = false;
  }
  const regex = new RegExp(check.pattern, check.flags || '');
  const passed = exists && regex.test(content);
  return {
    name: check.name || `grep ${check.file} ${check.pattern}`,
    passed,
    message: passed ? 'pattern found' : exists ? 'pattern not found' : 'file not found',
    file: check.file,
    pattern: check.pattern,
  };
}

module.exports = { runChecks };
