import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const logsDirectory = path.join(process.cwd(), 'src/content/logs');

export type LogPost = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  content: string;
};

export function getAllLogPosts(): LogPost[] {
  // logs 디렉토리가 없으면 빈 배열 반환
  if (!fs.existsSync(logsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(logsDirectory);
  const allPosts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(logsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title || slug,
        date: data.date || '',
        tags: data.tags || [],
        content,
      };
    });

  // 날짜 기준 내림차순 정렬
  return allPosts.sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });
}

export function getLogPostBySlug(slug: string): LogPost | null {
  try {
    const fullPath = path.join(logsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      tags: data.tags || [],
      content,
    };
  } catch (error) {
    return null;
  }
}
