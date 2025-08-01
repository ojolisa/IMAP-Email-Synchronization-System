export interface Email {
    id: string;
    uid: number;
    messageId: string;
    subject: string;
    from: string;
    to: string | string[];
    date: string;
    body: string;
    folder: string;
    account: string;
    accountName: string;
    categories: EmailCategory[];
    category?: EmailCategoryInfo;
    flags: string[];
}

export interface EmailCategoryInfo {
    messageId: string;
    category: EmailCategory;
    confidence: number;
    categorizedAt: string;
    geminiResponse?: string;
}

export interface EmailFolder {
    name: string;
    count: number;
}

export interface EmailAccount {
    id: string;
    email: string;
}

export type EmailCategory = 'INTERESTED' | 'MEETING_BOOKED' | 'NOT_INTERESTED' | 'SPAM' | 'OUT_OF_OFFICE';

export interface EmailSearchParams {
    query: string;
    folder?: string;
    account?: string;
    categories?: EmailCategory[];
}
