/**
 * 浏览器语音识别（语音转文字），基于 Web Speech API
 * 支持：Chrome、Edge、Safari（部分）。Firefox 不支持。
 */
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; 0: { transcript: string }; length: number };
  };
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export interface UseSpeechRecognitionOptions {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
  lang?: string;
}

let recognitionInstance: SpeechRecognitionInstance | null = null;

export function startSpeechRecognition(options: UseSpeechRecognitionOptions): () => void {
  const { onResult, onError, onEnd, lang = 'zh-CN' } = options;
  const API = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!API) {
    onError?.('当前浏览器不支持语音识别，请使用 Chrome 或 Edge');
    return () => {};
  }

  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (_) {}
    recognitionInstance = null;
  }

  const recognition = new API();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  let fullTranscript = '';

  recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
    let interim = '';
    let final = '';
    const results = event.results;
    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i];
      const transcript = result?.[0]?.transcript ?? '';
      if (result?.isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (final) fullTranscript += final;
    onResult(fullTranscript + interim, interim.length === 0 && final.length > 0);
  };

  recognition.onerror = (event: { error: string }) => {
    const msg = event.error === 'not-allowed' ? '请允许使用麦克风' : event.error === 'no-speech' ? '未检测到语音' : `识别错误：${event.error}`;
    onError?.(msg);
  };

  recognition.onend = () => {
    if (recognitionInstance === recognition && fullTranscript) {
      onResult(fullTranscript, true);
    }
    recognitionInstance = null;
    onEnd?.();
  };

  try {
    recognition.start();
    recognitionInstance = recognition;
  } catch (e) {
    onError?.(e instanceof Error ? e.message : '无法启动语音识别');
    return () => {};
  }

  return () => {
    try {
      recognition.stop();
    } catch (_) {}
    recognitionInstance = null;
  };
}

export function stopSpeechRecognition(): void {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (_) {}
    recognitionInstance = null;
  }
}
