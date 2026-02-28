import fs from 'fs';
import path from 'path';

export type LogEntry = {
  slug: string;
  title: string;
  date: string;
  year: number;
  content: string;
  tags: string[];
  image?: string;
  images?: string[]; // 여러 이미지 지원
};

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const frontmatter = match[1];
  const content = match[2].trim();
  const data: Record<string, string> = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    data[key] = value;
  }

  return { data, content };
}

function parseTags(raw: string): string[] {
  // "[daily, art]" 또는 "daily, art" 형태 모두 처리
  const cleaned = raw.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(',').map((t) => t.trim()).filter(Boolean);
}

function parseImages(raw: string): string[] {
  // "[/images/1.jpg, /images/2.jpg]" 또는 "/images/1.jpg, /images/2.jpg" 형태 모두 처리
  const cleaned = raw.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(',').map((img) => img.trim()).filter(Boolean);
}

export function getLogEntries(): LogEntry[] {
  const logDir = path.join(process.cwd(), 'content', 'log');
  if (!fs.existsSync(logDir)) return [];

  const files = fs
    .readdirSync(logDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse(); // 최신순

  return files
    .map((file) => {
      const slug = path.basename(file, '.md');
      const filePath = path.join(logDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = parseFrontmatter(raw);

      // 파일 생성/수정 시간 읽기
      const stats = fs.statSync(filePath);
      const fileCreatedAt = stats.birthtime; // 파일 생성 시간

      // frontmatter에 date가 있으면 우선 사용, 없으면 파일 생성 시간 사용
      let dateStr: string;
      if (data.date) {
        dateStr = data.date;
      } else {
        // 파일 생성 시간을 ISO 형식으로 변환
        dateStr = fileCreatedAt.toISOString();
      }

      const year = parseInt(dateStr.slice(0, 4), 10) || new Date().getFullYear();
      const tags = data.tags ? parseTags(data.tags) : [];

      const images = data.images ? parseImages(data.images) : [];

      return {
        slug,
        title: data.title ?? slug,
        date: dateStr,
        year,
        content,
        tags,
        image: data.image || undefined,
        images: images.length > 0 ? images : undefined,
      };
    })
    .filter((e) => e.title && e.date);
}

export function getLogByYear(): Record<number, LogEntry[]> {
  const entries = getLogEntries();
  const grouped: Record<number, LogEntry[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.year]) grouped[entry.year] = [];
    grouped[entry.year].push(entry);
  }

  return grouped;
}
