import { chat } from '../ai.js';
import { sanitizeObject } from '../sanitizeMarkdown.js';

const SYSTEM = `你是面试回答优化教练。根据用户对面试问题的回答，输出四层结构化分析。输出必须是合法的 JSON，且仅包含一个 JSON 对象，不要 markdown 代码块或多余文字。`;

const FORMAT = `
{
  "structure": {
    "背景": "有 或 无",
    "目标": "有 或 无",
    "行动": "有 或 无",
    "结果": "有 或 无",
    "复盘": "有 或 无"
  },
  "abilityShown": ["当前回答所展示的核心能力1", "能力2"],
  "abilityMissing": ["结合岗位与问题考察重点，当前回答缺失的能力1", "能力2"],
  "logicFlaws": [
    { "type": "漏洞类型（如：因果不成立、成果无法归因、决策依据不充分、数据缺乏对比基准）", "desc": "简要说明问题所在" }
  ],
  "upgrade": {
    "revisedAnswer": "基于用户回答优化后的完整表达版本，保留用户经历与核心逻辑，针对结构缺失与逻辑漏洞做针对性优化",
    "changes": [
      { "point": "修改点简述", "reason": "修改原因" }
    ]
  }
}

要求：structure 五标签必须为「有」或「无」；abilityShown/abilityMissing 各 1～2 条（简洁）；logicFlaws 可 0～3 条（只写关键漏洞）；upgrade.changes 列出 2-3 个主要修改点（简洁）。`;

export async function optimizeAnswer(question, answer, questionCategory, job = '') {
  // 精简输入，只保留关键信息
  const shortAnswer = answer.length > 1000 ? answer.slice(0, 1000) + '...' : answer;
  const user = `问题类型：${questionCategory || '通用'}
${job ? `岗位：${job}` : ''}

问题：${question}

回答：${shortAnswer}

请输出四层分析（简洁）。${FORMAT}`;

  const raw = await chat(SYSTEM, user);
  const jsonStr = raw.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const result = JSON.parse(jsonStr);
  return sanitizeObject(result);
}
