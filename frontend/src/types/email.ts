export interface Email {
    id: string;
    subject: string;
    from: string;
    to: string[];
    date: string;
    body: string;
    folder: string;
    account: string;
    categories: EmailCategory[];
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
