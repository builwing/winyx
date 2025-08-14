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

