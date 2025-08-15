// 組織管理API
import { apiRequest } from './client';
import type { Org, CreateOrgReq, UpdateOrgReq, CommonRes } from '@/types/generated/types';

export class OrgApi {
  // 自分が所属する組織一覧の取得
  async listMyOrgs(): Promise<Org[]> {
    return apiRequest.get<Org[]>('/api/v1/orgs');
  }

  // 組織の作成
  async createOrg(data: CreateOrgReq): Promise<Org> {
    return apiRequest.post<Org>('/api/v1/orgs', data);
  }

  // 特定の組織情報の取得
  async getOrg(id: number): Promise<Org> {
    return apiRequest.get<Org>(`/api/v1/orgs/${id}`);
  }

  // 組織情報の更新
  async updateOrg(id: number, data: Omit<UpdateOrgReq, 'id'>): Promise<Org> {
    return apiRequest.put<Org>(`/api/v1/orgs/${id}`, data);
  }

  // 組織の削除
  async deleteOrg(id: number): Promise<CommonRes> {
    return apiRequest.delete<CommonRes>(`/api/v1/orgs/${id}`);
  }

  // 組織へのメンバー追加
  async addOrgMember(orgId: number, userId: number, roleName: string): Promise<CommonRes> {
    return apiRequest.post<CommonRes>(`/api/v1/orgs/${orgId}/members`, {
      user_id: userId,
      role_name: roleName
    });
  }

  // 組織メンバーの削除
  async removeOrgMember(orgId: number, userId: number): Promise<CommonRes> {
    return apiRequest.delete<CommonRes>(`/api/v1/orgs/${orgId}/members/${userId}`);
  }
}

export const orgApi = new OrgApi();