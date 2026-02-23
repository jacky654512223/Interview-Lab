import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseResume(buffer, filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text || '';
  }
  if (['doc', 'docx'].includes(ext)) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (buffer.toString) return buffer.toString('utf-8');
  return '';
}
