// ユーザー管理用React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from './user';

// クエリキー定数
export const userQueryKeys = {
  all: ['users'] as const,
  list: (params: any) => [...userQueryKeys.all, 'list', params] as const,
  detail: (id: number) => [...userQueryKeys.all, 'detail', id] as const,
};

// 全ユーザー一覧の取得（Admin用）
export function useAllUsers(params = { page: 1, limit: 100 }) {
  return useQuery({
    queryKey: userQueryKeys.list(params),
    queryFn: () => userApi.listUsers(params),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
}

// 特定ユーザーの詳細取得
export function useUser(id: number) {
  return useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: () => userApi.getUser(id),
    enabled: !!id,
  });
}

// ユーザー作成
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      // ユーザー一覧を再取得
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

// ユーザー更新
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      userApi.updateUser(id, data),
    onSuccess: (updatedUser) => {
      // ユーザー一覧と詳細を更新
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      queryClient.setQueryData(userQueryKeys.detail(updatedUser.user_id), updatedUser);
    },
  });
}

// ユーザー削除
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: (_, deletedId) => {
      // ユーザー一覧を再取得し、削除されたユーザーの詳細キャッシュを削除
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      queryClient.removeQueries({ queryKey: userQueryKeys.detail(deletedId) });
    },
  });
}