export interface IMAPConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
    tlsOptions?: any;
    accountName: string;
}

export interface EmailMessage {
    uid: number;
    messageId: string;
    subject: string;
    from: string;
    to: string;
    date: Date;
    body: string;
    folder: string;
    accountName: string;
    flags: string[];
}

export interface IMAPAccount {
    config: IMAPConfig;
    connection: any;
    isConnected: boolean;
}

export interface ElasticsearchConfig {
    node: string;
    index: string;
}

export interface IndexedEmail {
    uid: number;
    messageId: string;
    subject: string;
    from: string;
    to: string;
    date: Date;
    body: string;
    folder: string;
    accountName: string;
    flags: string[];
    indexed_at: Date;
}

export interface EmailSearchQuery {
    text?: string;
    subject?: string;
    from?: string;
    to?: string;
    accountName?: string;
    folder?: string;
    dateFrom?: Date;
    dateTo?: Date;
    flags?: string[];
}

export interface EmailSearchResult {
    total: number;
    hits: IndexedEmail[];
}

export type CategoryLabel = 'INTERESTED' | 'MEETING_BOOKED' | 'NOT_INTERESTED' | 'SPAM' | 'OUT_OF_OFFICE';

export interface EmailCategory {
    messageId: string;
    category: CategoryLabel;
    confidence: number;
    categorizedAt: Date;
}

// Extend IndexedEmail to include categorization
export interface IndexedEmailWithCategory extends IndexedEmail {
    category?: EmailCategory;
}
