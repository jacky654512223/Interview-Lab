/**
 * 去除 AI 返回内容中的 Markdown 符号（如 ** * __ _ ## 等），避免前端显示异常
 */
function stripMarkdown(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **粗体** → 粗体
    .replace(/\*(.+?)\*/g, '$1')       // *斜体* → 斜体
    .replace(/__(.+?)__/g, '$1')       // __粗体__ → 粗体
    .replace(/_(.+?)_/g, '$1')         // _斜体_ → 斜体（注意不要误伤中文间隔号）
    .replace(/^#+\s*/gm, '')           // ## 标题 → 标题
    .replace(/`(.+?)`/g, '$1')         // `代码` → 代码
    .replace(/\*\*/g, '')              // 残留 **
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/~~(.+?)~~/g, '$1')       // ~~删除线~~ → 删除线
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [链接](url) → 链接
    .trim();
}

/**
 * 递归清洗对象中所有字符串类型的值
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return stripMarkdown(obj);
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item));
  if (typeof obj === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      out[key] = sanitizeObject(value);
    }
    return out;
  }
  return obj;
}

export { stripMarkdown, sanitizeObject };
