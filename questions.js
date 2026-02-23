import { chat } from '../ai.js';
import { getQuestionBank } from '../questionBank.js';
import { sanitizeObject } from '../sanitizeMarkdown.js';

const STYLE_DESC = {
  落地型: '侧重实际执行、项目落地细节、问题解决能力',
  思维型: '侧重战略判断、逻辑思维、方案设计、能力迁移',
  压力型: '侧重应急处理、失败复盘、抗压能力、价值观匹配',
};

const SYSTEM = `你是一个专业的面试官，根据简历与岗位生成结构化面试问题。
输出必须是合法的 JSON，且仅包含一个 JSON 对象，不要 markdown 代码块或多余文字。
每个问题需包含底层逻辑拆解 logicBreakdown：intent（面试官问这道题的意图）、template（建议的回答模版/结构，如 STAR、背景-目标-行动-结果等）。`;

const FORMAT = `
{
  "questions": [
    {
      "category": "简历基础确认题",
      "question": "问题1",
      "whyAsked": "为什么会被问",
      "ability": "对应考察能力",
      "logicBreakdown": {
        "intent": "面试官问这道题的意图（1-2句）",
        "template": "建议的回答模版/结构（如：背景-目标-行动-结果；或 STAR；或要点1+要点2+总结）"
      }
    }
  ]
}

要求：每个类别生成 1-2 个问题（共 6-8 题，优先质量）；问题具体、贴合简历与岗位；whyAsked 与 ability 简洁（1句）；logicBreakdown 的 intent（1句）和 template（简短，如"STAR"或"背景-行动-结果"）要简洁。`;

// 真题库模式：基于真题问题和考察目标生成类似问题
export async function generateQuestionsFromBank(resumeText, company, position, stage) {
  const bank = getQuestionBank(company, position, stage);
  if (!bank) throw new Error(`未找到真题库：${company} - ${position} - ${stage}`);

  const SYSTEM_BANK = `你是一个专业的面试官，基于真题库中的真实面试问题和考察目标，结合用户简历生成类似的面试问题。
输出必须是合法的 JSON，且仅包含一个 JSON 对象，不要 markdown 代码块或多余文字。
每个问题需包含：category、question、whyAsked、ability、logicBreakdown。
logicBreakdown 包含：intent（面试官问这道题的意图，1-2句）、template（建议的回答模版/结构，如 STAR、背景-目标-行动-结果等）。`;

  const user = `真题库信息：
- 公司：${company}
- 岗位：${position}
- 面试阶段：${bank.name}
- 考察重点：${bank.focusPoints.join('、')}
- 真题示例问题：
${bank.sampleQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

用户简历内容（仅关键信息）：
---
${resumeText.slice(0, 6000)}
---

要求：
1. 基于真题示例问题，结合用户简历生成类似但不同的问题（不要直接照抄真题）
2. 保持真题的考察重点和风格
3. 问题要贴合用户简历中的具体经历
4. 生成 6-8 个问题（优先质量），覆盖真题库中的主要考察点
5. 每个问题标注类别、whyAsked（1句）、ability（简短），并包含 logicBreakdown：intent（1句）、template（简短，如"STAR"）`;

  const raw = await chat(SYSTEM_BANK, user);
  const jsonStr = raw.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  return { questions: sanitizeObject(list), questionBank: { company, position, stage, name: bank.name } };
}

// 通用模式：基于岗位和公司风格生成问题
export async function generateQuestions(resumeText, job, companyStyle, useQuestionBank = false, questionBankInfo = null) {
  if (useQuestionBank && questionBankInfo) {
    return generateQuestionsFromBank(
      resumeText,
      questionBankInfo.company,
      questionBankInfo.position,
      questionBankInfo.stage
    );
  }

  const styleDesc = STYLE_DESC[companyStyle] || STYLE_DESC['落地型'];
  const user = `岗位：${job}
公司风格：${companyStyle}。${styleDesc}

简历内容（仅关键信息）：
---
${resumeText.slice(0, 6000)}
---

请生成面试问题清单。${FORMAT}`;

  const raw = await chat(SYSTEM, user);
  const jsonStr = raw.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  return { questions: sanitizeObject(list) };
}
