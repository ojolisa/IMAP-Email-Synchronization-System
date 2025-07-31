import { Client } from '@elastic/elasticsearch';
import { ElasticsearchConfig, EmailMessage, IndexedEmail, EmailSearchQuery, EmailSearchResult } from '../types';
import { logger } from '../utils/logger';

export class ElasticsearchService {
    private client: Client;
    private index: string;

    constructor(config: ElasticsearchConfig) {
        this.client = new Client({
            node: config.node
        });
        this.index = config.index;
    }

    /**
     * Initialize the Elasticsearch index with proper mappings
     */
    async initialize(): Promise<void> {
        try {
            // Check if the index exists
            const indexExists = await this.client.indices.exists({
                index: this.index
            });

            if (!indexExists) {
                // Create the index with mappings
                await this.client.indices.create({
                    index: this.index,
                    body: {
                        settings: {
                            number_of_shards: 1,
                            number_of_replicas: 0,
                            analysis: {
                                analyzer: {
                                    email_analyzer: {
                                        type: 'custom',
                                        tokenizer: 'standard',
                                        filter: ['lowercase', 'stop']
                                    }
                                }
                            }
                        },
                        mappings: {
                            properties: {
                                uid: { type: 'long' },
                                messageId: { type: 'keyword' },
                                subject: { 
                                    type: 'text',
                                    analyzer: 'email_analyzer',
                                    fields: {
                                        keyword: { type: 'keyword' }
                                    }
                                },
                                from: { 
                                    type: 'text',
                                    analyzer: 'email_analyzer',
                                    fields: {
                                        keyword: { type: 'keyword' }
                                    }
                                },
                                to: { 
                                    type: 'text',
                                    analyzer: 'email_analyzer',
                                    fields: {
                                        keyword: { type: 'keyword' }
                                    }
                                },
                                date: { type: 'date' },
                                body: { 
                                    type: 'text',
                                    analyzer: 'email_analyzer'
                                },
                                folder: { type: 'keyword' },
                                accountName: { type: 'keyword' },
                                flags: { type: 'keyword' },
                                indexed_at: { type: 'date' }
                            }
                        }
                    }
                });

                logger.info(`Created Elasticsearch index: ${this.index}`);
            } else {
                logger.info(`Elasticsearch index ${this.index} already exists`);
            }

            // Test the connection
            await this.client.ping();
            logger.info('Elasticsearch connection established successfully');

        } catch (error) {
            logger.error('Failed to initialize Elasticsearch:', error);
            throw error;
        }
    }

    /**
     * Index an email document
     */
    async indexEmail(email: EmailMessage): Promise<void> {
        try {
            const indexedEmail: IndexedEmail = {
                ...email,
                indexed_at: new Date()
            };

            // Use messageId as document ID to prevent duplicates
            const documentId = `${email.accountName}-${email.folder}-${email.uid}`;

            await this.client.index({
                index: this.index,
                id: documentId,
                body: indexedEmail
            });

            logger.debug(`Indexed email: ${email.subject} from ${email.accountName}`);

        } catch (error) {
            logger.error(`Failed to index email ${email.messageId}:`, error);
            throw error;
        }
    }

    /**
     * Bulk index multiple emails
     */
    async bulkIndexEmails(emails: EmailMessage[]): Promise<void> {
        if (emails.length === 0) return;

        try {
            const body = [];

            for (const email of emails) {
                const documentId = `${email.accountName}-${email.folder}-${email.uid}`;
                const indexedEmail: IndexedEmail = {
                    ...email,
                    indexed_at: new Date()
                };

                body.push({
                    index: {
                        _index: this.index,
                        _id: documentId
                    }
                });
                body.push(indexedEmail);
            }

            const response = await this.client.bulk({
                body,
                refresh: true
            });

            if (response.errors) {
                logger.warn('Some emails failed to index during bulk operation');
                response.items?.forEach((item: any, index: number) => {
                    if (item.index?.error) {
                        logger.error(`Failed to index email ${emails[index].messageId}:`, item.index.error);
                    }
                });
            } else {
                logger.info(`Successfully bulk indexed ${emails.length} emails`);
            }

        } catch (error) {
            logger.error('Failed to bulk index emails:', error);
            throw error;
        }
    }

    /**
     * Search emails with filters
     */
    async searchEmails(query: EmailSearchQuery, from: number = 0, size: number = 10): Promise<EmailSearchResult> {
        try {
            const searchBody: any = {
                query: {
                    bool: {
                        must: [],
                        filter: []
                    }
                },
                sort: [
                    { date: { order: 'desc' } }
                ],
                from,
                size
            };

            // Add text search across multiple fields
            if (query.text) {
                searchBody.query.bool.must.push({
                    multi_match: {
                        query: query.text,
                        fields: ['subject^2', 'body', 'from', 'to'],
                        type: 'best_fields',
                        fuzziness: 'AUTO'
                    }
                });
            }

            // Add specific field filters
            if (query.subject) {
                searchBody.query.bool.filter.push({
                    match: { subject: query.subject }
                });
            }

            if (query.from) {
                searchBody.query.bool.filter.push({
                    match: { from: query.from }
                });
            }

            if (query.to) {
                searchBody.query.bool.filter.push({
                    match: { to: query.to }
                });
            }

            if (query.accountName) {
                searchBody.query.bool.filter.push({
                    term: { accountName: query.accountName }
                });
            }

            if (query.folder) {
                searchBody.query.bool.filter.push({
                    term: { folder: query.folder }
                });
            }

            if (query.flags && query.flags.length > 0) {
                searchBody.query.bool.filter.push({
                    terms: { flags: query.flags }
                });
            }

            // Add date range filter
            if (query.dateFrom || query.dateTo) {
                const dateRange: any = {};
                if (query.dateFrom) {
                    dateRange.gte = query.dateFrom;
                }
                if (query.dateTo) {
                    dateRange.lte = query.dateTo;
                }

                searchBody.query.bool.filter.push({
                    range: { date: dateRange }
                });
            }

            // If no filters, match all
            if (searchBody.query.bool.must.length === 0 && searchBody.query.bool.filter.length === 0) {
                searchBody.query = { match_all: {} };
            }

            const response = await this.client.search({
                index: this.index,
                body: searchBody
            });

            const hits = response.hits.hits?.map((hit: any) => ({
                ...hit._source,
                _score: hit._score
            })) || [];

            const total = typeof response.hits.total === 'number' 
                ? response.hits.total 
                : (response.hits.total as any)?.value || 0;

            return {
                total,
                hits
            };

        } catch (error) {
            logger.error('Failed to search emails:', error);
            throw error;
        }
    }

    /**
     * Get aggregated statistics by account and folder
     */
    async getEmailStats(): Promise<any> {
        try {
            const response = await this.client.search({
                index: this.index,
                body: {
                    size: 0,
                    aggs: {
                        by_account: {
                            terms: {
                                field: 'accountName',
                                size: 100
                            },
                            aggs: {
                                by_folder: {
                                    terms: {
                                        field: 'folder',
                                        size: 100
                                    }
                                }
                            }
                        },
                        total_emails: {
                            value_count: {
                                field: 'messageId'
                            }
                        }
                    }
                }
            });

            const totalEmails = (response.aggregations?.total_emails as any)?.value || 0;
            const accountStats = (response.aggregations?.by_account as any)?.buckets || [];

            return {
                totalEmails,
                accountStats
            };

        } catch (error) {
            logger.error('Failed to get email statistics:', error);
            throw error;
        }
    }

    /**
     * Delete emails by account name
     */
    async deleteEmailsByAccount(accountName: string): Promise<void> {
        try {
            await this.client.deleteByQuery({
                index: this.index,
                body: {
                    query: {
                        term: { accountName }
                    }
                }
            });

            logger.info(`Deleted all emails for account: ${accountName}`);

        } catch (error) {
            logger.error(`Failed to delete emails for account ${accountName}:`, error);
            throw error;
        }
    }

    /**
     * Check if email exists in index
     */
    async emailExists(accountName: string, folder: string, uid: number): Promise<boolean> {
        try {
            const documentId = `${accountName}-${folder}-${uid}`;
            const response = await this.client.exists({
                index: this.index,
                id: documentId
            });

            return response;

        } catch (error) {
            logger.error(`Failed to check if email exists: ${accountName}-${folder}-${uid}`, error);
            return false;
        }
    }

    /**
     * Get health status of Elasticsearch
     */
    async getHealth(): Promise<any> {
        try {
            const health = await this.client.cluster.health();
            const indexStats = await this.client.indices.stats({ index: this.index });

            return {
                cluster: health,
                index: indexStats.indices?.[this.index] || {}
            };

        } catch (error) {
            logger.error('Failed to get Elasticsearch health:', error);
            throw error;
        }
    }
}
