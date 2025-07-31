import axios from 'axios';
import type { Email, EmailFolder, EmailAccount, EmailSearchParams, EmailCategory } from '../types/email';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const emailApi = {
    search: async (params: EmailSearchParams): Promise<Email[]> => {
        const { data } = await api.get('/emails/search', {
            params: {
                ...params,
                categories: params.categories?.join(',') // Convert array to comma-separated string
            }
        });
        return data.results || [];
    },

    getFolders: async (accountId?: string): Promise<EmailFolder[]> => {
        const { data } = await api.get('/folders', { params: { accountId } });
        return data;
    },

    getAccounts: async (): Promise<EmailAccount[]> => {
        const { data } = await api.get('/accounts');
        return data;
    },

    getCategories: async (): Promise<EmailCategory[]> => {
        const { data } = await api.get('/categories');
        return data as EmailCategory[];
    }
};
