/// <reference types="vite/client" />
// src/services/dataSource.ts
import * as mockApi from './mockApi';
import * as realApi from './api';
import * as mockAuth from './mockAuth';
import * as realAuth from './api/auth';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const dataApi = isMock ? mockApi : realApi;
export const authApi = isMock ? mockAuth : realAuth;
