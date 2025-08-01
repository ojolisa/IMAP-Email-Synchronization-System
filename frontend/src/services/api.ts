import axios from 'axios';
import type { 
    Email, 
    EmailFolder, 
    EmailAccount, 
    EmailSearchParams, 
    EmailCategory,
    SuggestedReply,
    ReplyTemplate,
    ReplyGenerationOptions
} from '../types/email';

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
    },

    // AI Suggested Replies endpoints
    generateSuggestedReplies: async (messageId: string, options?: ReplyGenerationOptions): Promise<SuggestedReply[]> => {
        const { data } = await api.post(`/emails/${messageId}/suggested-replies`, options || {});
        return data;
    },

    testSuggestedReplies: async (): Promise<SuggestedReply[]> => {
        const { data } = await api.post('/suggested-replies/test');
        return data;
    },

    // Reply Template Management
    getReplyTemplates: async (): Promise<ReplyTemplate[]> => {
        const { data } = await api.get('/reply-templates');
        return data;
    },

    addReplyTemplate: async (template: Omit<ReplyTemplate, 'id'>): Promise<{ id: string; message: string }> => {
        const { data } = await api.post('/reply-templates', template);
        return data;
    },

    updateReplyTemplate: async (id: string, updates: Partial<Omit<ReplyTemplate, 'id'>>): Promise<{ message: string }> => {
        const { data } = await api.put(`/reply-templates/${id}`, updates);
        return data;
    },

    deleteReplyTemplate: async (id: string): Promise<{ message: string }> => {
        const { data } = await api.delete(`/reply-templates/${id}`);
        return data;
    }
};
