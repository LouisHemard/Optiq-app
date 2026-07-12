export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface Photo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  cameraModel: string | null;
  lensModel: string | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLength: number | null;
  perfectCount?: number;
  hasVotedPerfect?: boolean;
  userId: string;
  user: User;
  _count?: { reviews: number; likes: number };
  isLikedByMe?: boolean;
}

export interface Annotation {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  color: string;
  comment?: string | null;
}

export interface Review {
  id: string;
  content: string;
  userId: string;
  author: User;
  annotations: Annotation[];
  createdAt: string;
}
