import OpenAI from 'openai';

// 三选一，优先级：Groq（免费）> DeepSeek > OpenAI
const groqKey = process.env.GROQ_API_KEY;
const deepseekKey = process.env.DEEPSEEK_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

let provider = 'openai';
let apiKey = openaiKey;
let baseURL;
let model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (groqKey) {
  provider = 'groq';
  apiKey = groqKey;
  baseURL = 'https://api.groq.com/openai/v1';
  model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
} else if (deepseekKey) {
  provider = 'deepseek';
  apiKey = deepseekKey;
  baseURL = 'https://api.deepseek.com/v1'; // OpenAI 兼容路径
  model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
} else if (openaiKey) {
  provider = 'openai';
  apiKey = openaiKey;
}

const openai = new OpenAI({ apiKey, baseURL });

export async function chat(systemPrompt, userContent) {
  if (!apiKey) {
    throw new Error(
      '未配置 AI API Key。请在 Render 的 Environment 中添加其一：GROQ_API_KEY（推荐，免费）或 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。本地开发则在 server/.env 中配置。'
    );
  }
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4, // 降低温度，更快响应
    max_tokens: provider === 'groq' ? 4000 : 3000, // Groq 可以更多，其他限制输出长度
  });
  const text = completion.choices[0]?.message?.content?.trim() || '';
  if (!text) throw new Error(`${provider} 返回为空，请重试或更换 API Key`);
  return text;
}
