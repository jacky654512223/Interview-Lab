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
  baseURL = 'https://api.deepseek.com';
  model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
} else if (openaiKey) {
  provider = 'openai';
  apiKey = openaiKey;
}

const openai = new OpenAI({ apiKey, baseURL });

export async function chat(systemPrompt, userContent) {
  if (!apiKey) {
    throw new Error(
      '请任选一种方式配置 API Key（在 server/.env 中）：\n' +
      '1. Groq（免费，推荐）：注册 https://console.groq.com 获取 Key，填写 GROQ_API_KEY=xxx\n' +
      '2. DeepSeek：https://platform.deepseek.com 获取 Key，填写 DEEPSEEK_API_KEY=sk-xxx（需账户有余额）\n' +
      '3. OpenAI：填写 OPENAI_API_KEY=sk-xxx（需账户有额度）'
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
