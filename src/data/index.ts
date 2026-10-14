import type { Api } from './api';
import { demoApi } from './demo';
import { liveApi } from './live';
import { isLive } from './supabaseClient';

export const api: Api = isLive ? liveApi : demoApi;
export type { Api } from './api';
