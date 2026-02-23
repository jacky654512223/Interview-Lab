export type CompanyStyle = '落地型' | '思维型' | '压力型';

export interface LogicBreakdown {
  intent: string;   // 面试官问这道题的意图
  template: string; // 建议的回答模版/结构
}

export interface QuestionItem {
  category: string;
  question: string;
  whyAsked: string;
  ability: string;
  logicBreakdown?: LogicBreakdown; // 底层逻辑拆解，可开关显示
}

export interface QuestionBankStage {
  key: string;
  name: string;
  description: string;
  focusPoints: string[];
  sampleQuestions: string[];
}

export interface QuestionBankItem {
  company: string;
  position: string;
  stages: QuestionBankStage[];
}

export interface QuestionBankInfo {
  company: string;
  position: string;
  stage: string;
  name: string;
}

export interface OptimizeResult {
  structure: { 背景: string; 目标: string; 行动: string; 结果: string; 复盘: string };
  abilityShown: string[];
  abilityMissing: string[];
  logicFlaws: { type: string; desc: string }[];
  upgrade: { revisedAnswer: string; changes: { point: string; reason: string }[] };
}

export const FOLLOW_UP_LABELS = [
  '数据真实性追问',
  '决策逻辑追问',
  '风险处理追问',
  '失败复盘追问',
  '权衡取舍追问',
  '资源限制追问',
] as const;
