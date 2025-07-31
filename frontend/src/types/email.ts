export interface Email {
    id: string;
    subject: string;
    from: string;
    to: string[];
    date: string;
    body: string;
    folder: string;
    account: string;
    categories: string[];
}

export interface EmailFolder {
    name: string;
    count: number;
}

export interface EmailAccount {
    id: string;
    email: string;
}

export interface EmailSearchParams {
    query: string;
    folder?: string;
    account?: string;
    categories?: string[];
}
