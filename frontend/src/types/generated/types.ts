// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: 2025-08-14T08:57:26.074Z

/**
 * User Authentication APIs
 */
export interface RegisterReq {
  name: string;
  email: string;
  password: string;
}

export interface RegisterRes {
  id: number;
  name: string;
  email: string;
}

export interface LoginReq {
  email: string;
  password: string;
}

export interface LoginRes {
  access_token: string;
  expire_time: number;
}

export interface UserInfoRes {
  id: number;
  name: string;
  email: string;
}

/**
 * Organization Management APIs
 */
export interface Org {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrgReq {
  name: string;
}

export interface GetOrgReq {
  id: number;
}

export interface UpdateOrgReq {
  id: number;
  name: string;
}

export interface AddOrgMemberReq {
  org_id: number;
  user_id: number;
  role_name: string;
}

export interface RemoveOrgMemberReq {
  org_id: number;
  user_id: number;
}

export interface CommonRes {
  message: string;
  success: boolean;
}

