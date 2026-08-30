import type { Character, CharacterSticker } from '@/lib/data/characters';

const REPOSITORY = 'flosnidor9/Trpg-Logs';
const BRANCH = 'incoming';
const DEFAULT_BRANCH = 'main';
// Character assets and their index live in Trpg-Logs.  The deployment workflow
// copies this file into src/content before building the static site.
const ARCHIVE_PATH = 'public/characters/characters.json';
const UPLOAD_RETRIES = 3;

type UploadFile = { path: string; content: string; encoding: 'base64' | 'utf-8' };

function stickerUploadFiles(stickerFiles: File[], stickers: CharacterSticker[]): Array<{ file: File; src: string }> {
  if (stickerFiles.length !== stickers.length) {
    throw new Error('스티커 파일과 저장 경로가 일치하지 않습니다. 다시 선택해 주세요.');
  }
  return stickerFiles.map((file, index) => ({ file, src: stickers[index].src }));
}

function api(path: string) { return `https://api.github.com/repos/${REPOSITORY}${path}`; }
function headers(token: string) { return { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` }; }

async function blobBase64(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

async function getRef(token: string, branch: string) {
  const response = await fetch(api(`/git/ref/heads/${branch}`), { headers: headers(token) });
  if (response.status === 404) return null;
  const data = await response.json() as { object?: { sha?: string } };
  if (!response.ok || !data.object?.sha) throw new Error('GitHub 브랜치를 불러오지 못했습니다.');
  return data.object.sha;
}

async function incomingHead(token: string) {
  const current = await getRef(token, BRANCH);
  if (current) return current;
  const main = await getRef(token, DEFAULT_BRANCH);
  if (!main) throw new Error('업로드 저장소의 main 브랜치를 찾을 수 없습니다.');
  const response = await fetch(api('/git/refs'), { method: 'POST', headers: { ...headers(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main }) });
  if (response.ok) return main;
  const concurrent = await getRef(token, BRANCH);
  if (concurrent) return concurrent;
  throw new Error('업로드 브랜치를 만들지 못했습니다.');
}

async function readArchive(token: string): Promise<Character[]> {
  const response = await fetch(api(`/contents/${ARCHIVE_PATH}`), { headers: headers(token) });
  if (response.status === 404) return [];
  const data = await response.json() as { content?: string };
  if (!response.ok || !data.content) throw new Error('기존 캐릭터 목록을 불러오지 못했습니다.');
  const raw = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), (character) => character.charCodeAt(0)));
  const parsed = JSON.parse(raw) as { characters?: Character[] };
  return Array.isArray(parsed.characters) ? parsed.characters : [];
}

async function commit(token: string, files: UploadFile[], message: string) {
  const parentSha = await incomingHead(token);
  const commitResponse = await fetch(api(`/git/commits/${parentSha}`), { headers: headers(token) });
  const parent = await commitResponse.json() as { tree?: { sha?: string } };
  if (!commitResponse.ok || !parent.tree?.sha) throw new Error('업로드 기준 커밋을 불러오지 못했습니다.');
  const requestHeaders = { ...headers(token), 'Content-Type': 'application/json' };
  const tree: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  for (const file of files) {
    const response = await fetch(api('/git/blobs'), { method: 'POST', headers: requestHeaders, body: JSON.stringify({ content: file.content, encoding: file.encoding }) });
    const blob = await response.json() as { sha?: string };
    if (!response.ok || !blob.sha) throw new Error(`파일을 저장하지 못했습니다: ${file.path}`);
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const treeResponse = await fetch(api('/git/trees'), { method: 'POST', headers: requestHeaders, body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const nextTree = await treeResponse.json() as { sha?: string };
  if (!treeResponse.ok || !nextTree.sha) throw new Error('업로드 트리를 만들지 못했습니다.');
  const nextCommitResponse = await fetch(api('/git/commits'), { method: 'POST', headers: requestHeaders, body: JSON.stringify({ message, tree: nextTree.sha, parents: [parentSha] }) });
  const nextCommit = await nextCommitResponse.json() as { sha?: string };
  if (!nextCommitResponse.ok || !nextCommit.sha) throw new Error('업로드 커밋을 만들지 못했습니다.');
  const update = await fetch(api(`/git/refs/heads/${BRANCH}`), { method: 'PATCH', headers: requestHeaders, body: JSON.stringify({ sha: nextCommit.sha, force: false }) });
  return update.status !== 422 && update.ok;
}

export async function uploadCharacter(token: string, character: Character, original: File, portrait: Blob, stickerFiles: File[] = []) {
  const archive = await readArchive(token);
  if (archive.some((entry) => entry.id === character.id)) throw new Error('같은 캐릭터 ID가 이미 있습니다.');
  const originalExtension = original.name.includes('.') ? original.name.slice(original.name.lastIndexOf('.')).toLowerCase() : '.webp';
  const root = `public/images/characters/${character.id}`;
  const nextArchive = { characters: [character, ...archive] };
  const files: UploadFile[] = [
    { path: `${root}/original${originalExtension}`, content: await blobBase64(original), encoding: 'base64' },
    { path: `${root}/portrait.webp`, content: await blobBase64(portrait), encoding: 'base64' },
    { path: ARCHIVE_PATH, content: JSON.stringify(nextArchive, null, 2), encoding: 'utf-8' },
  ];
  for (const { file, src } of stickerUploadFiles(stickerFiles, character.stickers ?? [])) {
    files.push({ path: `public${src}`, content: await blobBase64(file), encoding: 'base64' });
  }
  for (let attempt = 0; attempt < UPLOAD_RETRIES; attempt += 1) {
    if (await commit(token, files, `Add character: ${character.name}`)) return;
  }
  throw new Error('다른 업로드와 충돌했습니다. 잠시 후 다시 시도해 주세요.');
}

export async function updateCharacter(token: string, character: Character, stickerFiles: File[] = [], newStickers: CharacterSticker[] = []) {
  const archive = await readArchive(token);
  if (!archive.some((entry) => entry.id === character.id)) throw new Error('수정할 캐릭터를 찾을 수 없습니다.');
  const nextArchive = {
    characters: archive.map((entry) => entry.id === character.id ? character : entry),
  };
  const files: UploadFile[] = [{ path: ARCHIVE_PATH, content: JSON.stringify(nextArchive, null, 2), encoding: 'utf-8' }];
  for (const { file, src } of stickerUploadFiles(stickerFiles, newStickers)) {
    files.push({ path: `public${src}`, content: await blobBase64(file), encoding: 'base64' });
  }
  for (let attempt = 0; attempt < UPLOAD_RETRIES; attempt += 1) {
    if (await commit(token, files, `Update character: ${character.name}`)) return;
  }
  throw new Error('다른 수정과 충돌했습니다. 잠시 후 다시 시도해 주세요.');
}

export async function deleteCharacter(token: string, character: Character) {
  const archive = await readArchive(token);
  if (!archive.some((entry) => entry.id === character.id)) throw new Error('삭제할 캐릭터를 찾을 수 없습니다.');
  const nextArchive = { characters: archive.filter((entry) => entry.id !== character.id) };
  const files: UploadFile[] = [{ path: ARCHIVE_PATH, content: JSON.stringify(nextArchive, null, 2), encoding: 'utf-8' }];
  for (let attempt = 0; attempt < UPLOAD_RETRIES; attempt += 1) {
    if (await commit(token, files, `Delete character: ${character.name}`)) return;
  }
  throw new Error('다른 수정과 충돌했습니다. 잠시 후 다시 시도해 주세요.');
}

export function characterImagePaths(id: string, originalName: string) {
  const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase() : '.webp';
  return { original: `/images/characters/${id}/original${extension}`, cropped: `/images/characters/${id}/portrait.webp` };
}

export function characterStickerPaths(id: string, files: File[]) {
  const stamp = Date.now();
  return files.map((file, index) => {
    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '.webp';
    return { src: `/images/characters/${id}/stickers/sticker-${stamp}-${index + 1}${extension}` };
  });
}
