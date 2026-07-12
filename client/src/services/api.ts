import axios from 'axios';
import type { Photo, Review, User } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('optiq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export async function login(credentials: { email: string; password: string }): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export interface CreateUserPayload {
  email: string;
  username: string;
  password: string;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

export async function uploadPhoto(formData: FormData): Promise<Photo> {
  const { data } = await api.post<Photo>('/photos', formData);
  return data;
}

export async function getFeed(params?: Record<string, string | number | undefined>): Promise<Photo[]> {
  const { data } = await api.get<Photo[]>('/photos/feed', { params });
  return data;
}

export async function getPhotoById(id: string): Promise<Photo> {
  const { data } = await api.get<Photo>(`/photos/${id}`);
  return data;
}

export async function getPhotoReviews(photoId: string): Promise<Review[]> {
  const { data } = await api.get<Review[]>(`/reviews/photo/${photoId}`);
  return data;
}

export interface CreateReviewPayload {
  photoId: string;
  content: string;
  annotations?: { type: string; data: Record<string, unknown>; color?: string; comment?: string }[];
}

export async function createReview(payload: CreateReviewPayload): Promise<Review> {
  const { data } = await api.post<Review>('/reviews', payload);
  return data;
}

export async function incrementPerfect(photoId: string): Promise<void> {
  await api.patch(`/photos/${photoId}/perfect`);
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  await api.post('/users/me/password', payload);
}

export async function deleteMe(): Promise<void> {
  await api.delete('/users/me');
}

export async function updatePhoto(id: string, payload: { title?: string; description?: string }): Promise<Photo> {
  const { data } = await api.patch<Photo>(`/photos/${id}`, payload);
  return data;
}

export async function deletePhoto(id: string): Promise<void> {
  await api.delete(`/photos/${id}`);
}

export async function updateReview(id: string, content: string): Promise<Review> {
  const { data } = await api.patch<Review>(`/reviews/${id}`, { content });
  return data;
}

export async function deleteReview(id: string): Promise<void> {
  await api.delete(`/reviews/${id}`);
}

export async function toggleLike(photoId: string): Promise<{ liked: boolean; likesCount: number }> {
  const { data } = await api.post<{ liked: boolean; likesCount: number }>(`/photos/${photoId}/like`);
  return data;
}

export async function getExplorePhotos(): Promise<Photo[]> {
  const { data } = await api.get<Photo[]>('/photos/explore');
  return data;
}

export interface UpdateSettingsPayload {
  bio?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
}

export async function updateMe(payload: UpdateSettingsPayload): Promise<AuthUser & { bio: string | null; isPrivate: boolean }> {
  const { data } = await api.patch('/users/me', payload);
  return data;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  isPrivate: boolean;
  createdAt: string;
  _count: { followers: number; following: number; photos: number };
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isOwner: boolean;
  photos: Photo[];
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(`/users/${userId}/profile`);
  return data;
}

export async function toggleFollow(userId: string): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/users/${userId}/follow`);
  return data;
}

export interface FollowRequestItem {
  id: string;
  followerId: string;
  follower: { id: string; username: string; avatarUrl: string | null };
  createdAt: string;
}

export async function getFollowRequests(): Promise<FollowRequestItem[]> {
  const { data } = await api.get<FollowRequestItem[]>('/users/me/follow-requests');
  return data;
}

export async function acceptFollowRequest(requestId: string): Promise<void> {
  await api.post(`/users/follow-requests/${requestId}/accept`);
}

export async function declineFollowRequest(requestId: string): Promise<void> {
  await api.post(`/users/follow-requests/${requestId}/decline`);
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>('/notifications');
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<number>('/notifications/unread-count');
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function searchUsers(q: string): Promise<User[]> {
  const { data } = await api.get<User[]>('/users/search', { params: { q } });
  return data;
}
