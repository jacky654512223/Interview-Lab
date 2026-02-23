import { chat } from '../ai.js';
import { sanitizeObject } from '../sanitizeMarkdown.js';

const SYSTEM = `你是面试复盘教练。根据用户本轮模拟面试中多道题的优化反馈记录，输出一份简洁的总结报告。
输出必须是合法的 JSON，且仅包含一个 JSON 对象，不要 markdown 代码块或多余文字。`;

const FORMAT = `
{
  "score": 75,
  "scoreDesc": "一句话说明分数含义（如：整体表现良好，在结构完整性上还有提升空间）",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["优化建议1", "优化建议2"]
}

要求：score 为 1-100 的整数；strengths、weaknesses、suggestions 各 2-4 条，简洁具体；不要使用 ** 等 markdown 符号。`;

export async function generateSessionSummary(feedbackHistory, job = '', questionBankName = '') {
  if (!feedbackHistory?.length) {
    return {
      score: 0,
      scoreDesc: '本轮未提交任何回答，无法生成评估。建议下次至少完成几道题的作答后再查看总结。',
      strengths: [],
      weaknesses: [],
      suggestions: ['多完成几道题的作答后再查看总结', '可针对单题先练习结构（背景-目标-行动-结果）'],
    };
  }

  const summaryInput = feedbackHistory.map((item, i) => {
    const f = item.feedback || {};
    return `【第${i + 1}题】${item.category}：${item.question?.slice(0, 80)}...
结构：${JSON.stringify(f.structure || {})}
展示能力：${(f.abilityShown || []).join('、')}
缺失能力：${(f.abilityMissing || []).join('、')}
逻辑漏洞：${(f.logicFlaws || []).map((x) => x.type).join('、') || '无'}`;
  }).join('\n\n');

  const user = `本轮面试信息：${job ? `岗位：${job}` : ''} ${questionBankName ? `真题：${questionBankName}` : ''}

各题优化反馈汇总：
---
${summaryInput}
---

请根据以上反馈，输出总结报告。${FORMAT}`;

  const raw = await chat(SYSTEM, user);
  const jsonStr = raw.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const result = JSON.parse(jsonStr);
  return sanitizeObject(result);
}
