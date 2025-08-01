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
    categories?: string[];
}

export interface IMAPFolder {
    name: string;
    path: string;
    messageCount: number;
}

export interface EmailFolder {
    name: string;
    count: number;
}

export interface EmailSearchQuery {
    text?: string;
    subject?: string;
    from?: string;
    to?: string;
    accountName?: string;
    folder?: string;
    account?: string;
    categories?: string[];
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
    geminiResponse?: string;
}

export interface ReplyTemplate {
    id: string;
    context: string;
    template: string;
    category: string;
    embedding?: number[];
    metadata?: Record<string, any>;
}

export interface SuggestedReply {
    id: string;
    subject: string;
    body: string;
    confidence: number;
    templateUsed?: ReplyTemplate;
    reasoning: string;
}

export interface ReplyGenerationOptions {
    maxReplies?: number;
    minConfidence?: number;
    personalizeToSender?: boolean;
    includeOriginalEmail?: boolean;
}

// Extend IndexedEmail to include categorization
export interface IndexedEmailWithCategory extends IndexedEmail {
    category?: EmailCategory;
}
