// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: 2025-08-14T08:57:26.077Z

import { apiRequest } from '../client';

/**
 * api API functions
 */
export const api = {
  /**
   * register endpoint
   */
  register: (): Promise<void> => {
    return apiRequest.post<void>('/');
  },

  /**
   * login endpoint
   */
  login: (): Promise<void> => {
    return apiRequest.post<void>('/');
  },

  /**
   * systemHealth endpoint
   */
  systemHealth: (): Promise<void> => {
    return apiRequest.get<void>('/');
  },

  /**
   * apiStats endpoint
   */
  apiStats: (): Promise<void> => {
    return apiRequest.get<void>('/');
  },

  /**
   * realtimeMetrics endpoint
   */
  realtimeMetrics: (): Promise<void> => {
    return apiRequest.get<void>('/');
  },

  /**
   * configInfo endpoint
   */
  configInfo: (): Promise<void> => {
    return apiRequest.get<void>('/');
  },

};

/**
 * protected API functions
 */
export const protectedApi = {
  /**
   * userInfo endpoint
   * @requires Authentication
   */
  userInfo: (): Promise<void> => {
    return apiRequest.get<void>('/api/');
  },

  /**
   * updateProfile endpoint
   * @requires Authentication
   */
  updateProfile: (): Promise<void> => {
    return apiRequest.post<void>('/api/');
  },

};

