export const TRPG_UPLOAD_REPOSITORY = 'flosnidor9/Trpg-Logs';
const TRPG_UPLOAD_ROOT = 'public/images/afterTheRoll';

export type TrpgUploadDraft = {
  title: string;
  scenarioTitle: string;
  description: string;
  date: string;
  tags: string[];
  format: 'roll20' | 'ccfolia' | 'cca';
  locked: boolean;
  mainChannels: string[];
  sourceFileName: string;
  sourceHtml: string;
};

function yamlValue(value: string) {
  return JSON.stringify(value);
}

function safeSegment(value: string, fallback: string) {
  const normalized = value.normalize('NFC').trim().replace(/[\\/:*?"<>|]/g, '-');
  return normalized.replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '') || fallback;
}

function slugFromFileName(fileName: string, fallback: string) {
  return safeSegment(fileName.replace(/\.[^/.]+$/, ''), fallback);
}

export function buildTrpgUploadFiles(draft: TrpgUploadDraft) {
  const year = draft.date.slice(0, 4);
  const scenario = safeSegment(draft.scenarioTitle, 'untitled-scenario');
  const postSlug = slugFromFileName(draft.sourceFileName, safeSegment(draft.title, 'untitled-log'));
  const folderPath = `${TRPG_UPLOAD_ROOT}/${year}/${scenario}`;
  const htmlFileName = `${postSlug}.source.html`;
  const markdown = [
    '---',
    `title: ${yamlValue(draft.title)}`,
    `description: ${yamlValue(draft.description)}`,
    `date: ${yamlValue(draft.date)}`,
    'tags:',
    ...draft.tags.map((tag) => `  - ${yamlValue(tag)}`),
    `htmlPath: ${yamlValue(htmlFileName)}`,
    `sourceFormat: ${yamlValue(draft.format)}`,
    ...(draft.mainChannels.length > 0 ? ['mainChannels:', ...draft.mainChannels.map((channel) => `  - ${yamlValue(channel)}`)] : []),
    ...(draft.locked ? ['locked: true'] : []),
    '---',
    '',
  ].join('\n');

  return {
    folderPath,
    files: [
      { path: `${folderPath}/${htmlFileName}`, content: draft.sourceHtml },
      { path: `${folderPath}/${postSlug}.md`, content: markdown },
    ],
  };
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function getExistingFileSha(token: string, path: string) {
  const response = await fetch(`https://api.github.com/repos/${TRPG_UPLOAD_REPOSITORY}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('GitHub 저장소의 기존 파일을 확인하지 못했습니다.');
  const data = (await response.json()) as { sha?: string };
  return data.sha ?? null;
}

export async function commitTrpgUpload(token: string, draft: TrpgUploadDraft) {
  const upload = buildTrpgUploadFiles(draft);
  const existing = await Promise.all(upload.files.map((file) => getExistingFileSha(token, file.path)));
  if (existing.some(Boolean)) {
    throw new Error('같은 이름의 로그가 이미 있습니다. 원본 파일명 또는 제목을 바꿔 다시 올려 주세요.');
  }

  await Promise.all(
    upload.files.map(async (file) => {
      const response = await fetch(`https://api.github.com/repos/${TRPG_UPLOAD_REPOSITORY}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add TRPG log: ${draft.title}`,
          content: encodeUtf8Base64(file.content),
        }),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message || 'GitHub에 로그를 저장하지 못했습니다.');
      }
    }),
  );

  return upload.folderPath;
}
