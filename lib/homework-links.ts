const models: Record<string, string> = {
  read_alouds: 'Read aloud', repeat_sentences: 'Repeat sentence',
  describe_images: 'Describe image', retell_lectures: 'Retell lecture',
  core_swts: 'Summarize Written Text', write_emails: 'Write Essay',
  core_ssts: 'Summarize Spoken Text', summarize_group_discussions: 'Summarize Group Discussion',
  respond_situations: 'Respond to a situation',
  swts: 'Summarize Written Text', essays: 'Write Essay',
  ssts: 'Summarize Spoken Text', ptea_respond_situations: 'Respond to a situation',
};
const prefixes: Record<string, string> = {
  RA: models.read_alouds, RS: models.repeat_sentences, DI: models.describe_images,
  RL: models.retell_lectures, SWT: models.core_swts, WE: models.write_emails,
  SST: models.core_ssts, SGD: models.summarize_group_discussions, RTS: models.respond_situations,
};
export interface ParsedHomeworkLink { url: string; type: string | null; title?: string; error?: string }
const clean = (url: string) => url.replace(/[).,;!\]}]+$/, '');
const isApeuni = (url: URL) => url.hostname === 'apeuni.com' || url.hostname.endsWith('.apeuni.com');

// Pasted shares can join an answer ID directly to the next exercise heading.
const separateShares = (text: string) => text.replace(
  /([?&]answer_id=\d+)(?=(?:RA|RS|DI|RL|SWT|WE|SST|SGD|RTS)\s*(?:\(C\)\s*)?#\s*\d+)/gi,
  '$1\n',
);

export function homeworkLinkKey(text: string): string {
  const raw = separateShares(text).match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (!raw) return text;
  try {
    const url = new URL(clean(raw));
    const model = url.searchParams.get('model');
    const answer = url.searchParams.get('answer_id');
    if (isApeuni(url) && model && answer) return `apeuni:${model.toLowerCase()}:${answer}`;
    url.hash = '';
    url.searchParams.sort();
    return url.href;
  } catch { return text; }
}

// A mobile share may span several lines; each URL still represents one answer.
export function parseHomeworkLinks(text: string): ParsedHomeworkLink[] {
  text = separateShares(text);
  const results: ParsedHomeworkLink[] = [];
  const pattern = /https?:\/\/[^\s<>"']+/gi;
  let previousEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const context = text.slice(previousEnd, match.index);
    previousEnd = pattern.lastIndex;
    const raw = clean(match[0]);
    try {
      const url = new URL(raw);
      if (!isApeuni(url)) {
        results.push({ url: raw, type: null, error: 'Link không thuộc APEUni.' });
        continue;
      }
      const model = url.searchParams.get('model')?.toLowerCase();
      const modelType = model ? models[model] : undefined;
      const matches = Array.from(context.matchAll(/\b(RA|RS|DI|RL|SWT|WE|SST|SGD|RTS)\s*(?:\(C\)\s*)?#\s*\d+/gi));
      const prefix = matches[matches.length - 1]?.[1].toUpperCase();
      const prefixType = prefix ? prefixes[prefix] : undefined;
      const heading = matches[matches.length - 1];
      // Preserve the share heading even when its exercise-code format is unfamiliar.
      // Bare punctuation between adjacent URLs is not a heading.
      const titleText = (heading ? context.slice(heading.index) : context).replace(/\s+/g, ' ').trim();
      const title = /[\p{L}\p{N}]/u.test(titleText) ? titleText : '';
      if (modelType && prefixType && modelType !== prefixType) {
        results.push({ url: raw, type: null, error: 'Dạng bài trong nội dung chia sẻ không khớp với URL.' });
        continue;
      }
      const type = modelType || (!model ? prefixType : undefined) || null;
      results.push({ url: url.href, type, ...(title ? { title } : {}), ...(!type ? { error: 'Không nhận diện được dạng bài. Hãy dán đầy đủ nội dung chia sẻ APEUni.' } : {}) });
    } catch {
      results.push({ url: raw, type: null, error: 'URL không hợp lệ.' });
    }
  }
  if (!results.length && text.trim()) results.push({ url: text.trim(), type: null, error: 'Không tìm thấy link http hoặc https.' });
  return results;
}