// 組織管理用React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from './org';
import type { CreateOrgReq, UpdateOrgReq } from '@/types/generated/types';

// クエリキー定数
export const orgQueryKeys = {
  all: ['orgs'] as const,
  myOrgs: () => [...orgQueryKeys.all, 'my-orgs'] as const,
  detail: (id: number) => [...orgQueryKeys.all, 'detail', id] as const,
};

// 自分が所属する組織一覧の取得
export function useMyOrgs() {
  return useQuery({
    queryKey: orgQueryKeys.myOrgs(),
    queryFn: () => orgApi.listMyOrgs(),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
}

// 特定組織の詳細取得
export function useOrg(id: number) {
  return useQuery({
    queryKey: orgQueryKeys.detail(id),
    queryFn: () => orgApi.getOrg(id),
    enabled: !!id,
  });
}

// 組織作成
export function useCreateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrgReq) => orgApi.createOrg(data),
    onSuccess: () => {
      // 組織一覧を再取得
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.myOrgs() });
    },
  });
}

// 組織更新
export function useUpdateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<UpdateOrgReq, 'id'> }) => 
      orgApi.updateOrg(id, data),
    onSuccess: (updatedOrg) => {
      // 組織一覧と詳細を更新
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.myOrgs() });
      queryClient.setQueryData(orgQueryKeys.detail(updatedOrg.id), updatedOrg);
    },
  });
}

// 組織削除
export function useDeleteOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => orgApi.deleteOrg(id),
    onSuccess: (_, deletedId) => {
      // 組織一覧を再取得し、削除された組織の詳細キャッシュを削除
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.myOrgs() });
      queryClient.removeQueries({ queryKey: orgQueryKeys.detail(deletedId) });
    },
  });
}

// メンバー追加
export function useAddOrgMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId, roleName }: { orgId: number; userId: number; roleName: string }) =>
      orgApi.addOrgMember(orgId, userId, roleName),
    onSuccess: (_, { orgId }) => {
      // 該当組織の情報を再取得
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(orgId) });
    },
  });
}

// メンバー削除
export function useRemoveOrgMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: number; userId: number }) =>
      orgApi.removeOrgMember(orgId, userId),
    onSuccess: (_, { orgId }) => {
      // 該当組織の情報を再取得
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(orgId) });
    },
  });
}