import { IMAPSyncManager } from './IMAPSyncManager';
import { EmailSearchQuery } from '../types';
import { logger } from '../utils/logger';

/**
 * Email Search API - A simple interface for searching indexed emails
 */
export class EmailSearchAPI {
    private syncManager: IMAPSyncManager;

    constructor(syncManager: IMAPSyncManager) {
        this.syncManager = syncManager;
    }

    /**
     * Search emails with various filters
     */
    async searchEmails(searchParams: {
        query?: string;
        subject?: string;
        from?: string;
        to?: string;
        account?: string;
        folder?: string;
        dateFrom?: string;
        dateTo?: string;
        flags?: string[];
        categories?: string[];
        page?: number;
        size?: number;
    }): Promise<any> {
        try {
            const query: EmailSearchQuery = {};

            // Build search query
            if (searchParams.query) query.text = searchParams.query;  // Map query to text field
            if (searchParams.subject) query.subject = searchParams.subject;
            if (searchParams.from) query.from = searchParams.from;
            if (searchParams.to) query.to = searchParams.to;
            if (searchParams.account) query.accountName = searchParams.account;
            if (searchParams.folder) query.folder = searchParams.folder;
            if (searchParams.categories) {
                // Ensure categories is always treated as an array
                query.categories = Array.isArray(searchParams.categories) 
                    ? searchParams.categories 
                    : [searchParams.categories];
            }
            if (searchParams.flags) query.flags = searchParams.flags;

            // Parse dates
            if (searchParams.dateFrom) {
                query.dateFrom = new Date(searchParams.dateFrom);
            }
            if (searchParams.dateTo) {
                query.dateTo = new Date(searchParams.dateTo);
            }

            // Pagination
            const page = searchParams.page || 1;
            const size = Math.min(searchParams.size || 10, 100); // Max 100 results per page
            const from = (page - 1) * size;

            const results = await this.syncManager.searchEmails(query, from, size);

            return {
                success: true,
                query: searchParams,
                pagination: {
                    page,
                    size,
                    total: results.total,
                    totalPages: Math.ceil(results.total / size)
                },
                results: results.hits
            };

        } catch (error) {
            logger.error('Search API error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get email statistics
     */
    async getStats(): Promise<any> {
        try {
            const stats = await this.syncManager.getEmailStats();
            const accountStatus = this.syncManager.getAccountStatus();

            return {
                success: true,
                emailStats: stats,
                accountStatus,
                connectedAccounts: this.syncManager.getConnectedAccountsCount(),
                totalAccounts: this.syncManager.getTotalAccountsCount()
            };

        } catch (error) {
            logger.error('Stats API error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get system health including Elasticsearch
     */
    async getHealth(): Promise<any> {
        try {
            const elasticsearchHealth = await this.syncManager.getElasticsearchHealth();
            const accountStatus = this.syncManager.getAccountStatus();

            return {
                success: true,
                elasticsearch: elasticsearchHealth,
                accounts: accountStatus,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Health API error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Search emails by account and folder
     */
    async searchByAccountAndFolder(account: string, folder?: string, text?: string, page: number = 1, size: number = 10): Promise<any> {
        const searchParams = {
            account,
            folder,
            text,
            page,
            size
        };

        return this.searchEmails(searchParams);
    }

    /**
     * Search emails within a date range
     */
    async searchByDateRange(dateFrom: string, dateTo: string, text?: string, page: number = 1, size: number = 10): Promise<any> {
        const searchParams = {
            dateFrom,
            dateTo,
            text,
            page,
            size
        };

        return this.searchEmails(searchParams);
    }

    /**
     * Search emails by sender
     */
    async searchBySender(from: string, page: number = 1, size: number = 10): Promise<any> {
        const searchParams = {
            from,
            page,
            size
        };

        return this.searchEmails(searchParams);
    }

    /**
     * Full-text search across all emails
     */
    async fullTextSearch(text: string, page: number = 1, size: number = 10): Promise<any> {
        const searchParams = {
            text,
            page,
            size
        };

        return this.searchEmails(searchParams);
    }
}
