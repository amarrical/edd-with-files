const { spawnSync } = require('child_process');

function runGraders(graders, workspace, inputsDir, config) {
  const results = {};
  for (const [metric, promptTemplate] of Object.entries(graders)) {
    results[metric] = gradeMetric(metric, promptTemplate, workspace, inputsDir, config);
  }
  return results;
}

function gradeMetric(metric, promptTemplate, workspace, inputsDir, config) {
  const prompt = buildPrompt(promptTemplate, workspace, inputsDir);
  const model = config.llm.grader.model;
  const result = spawnSync('devin', [
    '-p',
    '--model', model,
    '--', prompt,
  ], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: (config.llm.grader.timeoutSeconds || 120) * 1000,
  });

  if (result.error || result.status !== 0) {
    return { score: 0, reasoning: `grader failed: ${result.stderr || result.error?.message || 'unknown'}` };
  }

  return parseScore(result.stdout || '');
}

function buildPrompt(template, workspace, inputsDir) {
  let prompt = template;
  prompt += `\n\nWorkspace: ${workspace}\n`;
  prompt += `Inputs: ${inputsDir}\n`;
  prompt += 'Return only JSON: {"score": number between 0 and 1, "reasoning": string}';
  return prompt;
}

function parseScore(output) {
  let text = output.trim();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) text = jsonMatch[1].trim();
  try {
    const parsed = JSON.parse(text);
    const score = Number(parsed.score);
    if (Number.isNaN(score) || score < 0 || score > 1) throw new Error('score out of range');
    return { score, reasoning: String(parsed.reasoning || '') };
  } catch {
    return { score: 0, reasoning: `failed to parse grader output: ${text}` };
  }
}

module.exports = { runGraders };
