import { chat } from '../ai.js';
import { sanitizeObject } from '../sanitizeMarkdown.js';

const DIRECTIONS = {
  数据真实性追问: '你提到的项目成果数据，如何验证真实性？是否有具体统计依据？',
  决策逻辑追问: '当时做这个决策的核心依据是什么？是否有考虑其他备选方案？',
  风险处理追问: '项目执行过程中遇到的最大风险是什么？如何应对的？',
  失败复盘追问: '项目中存在的不足是什么？如果重新执行，会做哪些优化？',
  权衡取舍追问: '项目中遇到资源冲突/需求冲突时，如何权衡取舍？依据是什么？',
  资源限制追问: '项目执行过程中，资源（人力、预算、时间）是否有限制？如何在限制内达成目标？',
};

const SYSTEM = `你是面试官，针对候选人的项目回答进行深挖追问。根据追问方向，生成 1 个具体、可操作的追问问题（一句话或短段），贴合用户刚才的回答内容，不要泛泛而谈。输出 JSON：{ "question": "追问问题内容" }，不要 markdown 或多余文字。`;

export async function generateFollowUp(projectAnswer, direction) {
  const directionPrompt = DIRECTIONS[direction] || direction;
  const user = `追问方向：${direction}
方向说明：${directionPrompt}

候选人的项目回答：
---
${projectAnswer.slice(0, 4000)}
---

请生成一句具体的追问问题。`;

  const raw = await chat(SYSTEM, user);
  const jsonStr = raw.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  const result = { question: parsed.question || directionPrompt };
  return sanitizeObject(result);
}
