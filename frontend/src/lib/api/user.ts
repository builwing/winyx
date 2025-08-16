// ユーザー管理API
import { apiRequest } from './client';
import type { UserInfo, UserListRes, UserCreateReq, UserUpdateReq, UserDeleteRes } from '@/types/generated/types';

export class UserApi {
  // ユーザー一覧の取得（Admin用）
  async listUsers(params: { page?: number; limit?: number } = {}): Promise<UserListRes> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    
    const url = `/api/v1/admin/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return apiRequest.get<UserListRes>(url);
  }

  // 特定ユーザーの詳細取得
  async getUser(id: number): Promise<UserInfo> {
    return apiRequest.get<UserInfo>(`/api/v1/admin/users/${id}`);
  }

  // ユーザーの作成
  async createUser(data: UserCreateReq): Promise<UserInfo> {
    return apiRequest.post<UserInfo>('/api/v1/admin/users', data);
  }

  // ユーザー情報の更新
  async updateUser(id: number, data: UserUpdateReq): Promise<UserInfo> {
    return apiRequest.put<UserInfo>(`/api/v1/admin/users/${id}`, data);
  }

  // ユーザーの削除
  async deleteUser(id: number): Promise<UserDeleteRes> {
    return apiRequest.delete<UserDeleteRes>(`/api/v1/admin/users/${id}`);
  }
}

export const userApi = new UserApi();