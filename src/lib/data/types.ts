export type Tag = string;

export type Post = {
  id: string;
  title: string;
  slug: string;
  tags: Tag[];
  thumbnail: string; // /images/... 경로
  createdAt: string; // ISO 날짜 문자열
};

export type Folder = {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  tags: Tag[];
  posts: Post[];
};
