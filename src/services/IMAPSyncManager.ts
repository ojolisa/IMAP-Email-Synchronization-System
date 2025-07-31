import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { IMAPConfig, EmailMessage, IMAPAccount } from '../types';
import { logger } from '../utils/logger';
import { ElasticsearchService } from './ElasticsearchService';

export class IMAPSyncManager {
    private accounts: IMAPAccount[] = [];
    private isRunning: boolean = false;
    private elasticsearchService!: ElasticsearchService;

    constructor() {
        this.loadAccountsFromEnv();
        this.initializeElasticsearch();
    }

    private initializeElasticsearch(): void {
        const elasticsearchConfig = {
            node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
            index: process.env.ELASTICSEARCH_INDEX || 'imap-emails'
        };

        this.elasticsearchService = new ElasticsearchService(elasticsearchConfig);
        logger.info(`Elasticsearch configured with node: ${elasticsearchConfig.node}, index: ${elasticsearchConfig.index}`);
    }

    private loadAccountsFromEnv(): void {
        // Load IMAP accounts from environment variables
        const accountConfigs: IMAPConfig[] = [];

        // Dynamically discover all IMAP accounts from environment variables
        const imapAccountNumbers = this.getAvailableIMAPAccountNumbers();

        for (const accountNumber of imapAccountNumbers) {
            const hostKey = `IMAP${accountNumber}_HOST`;
            const portKey = `IMAP${accountNumber}_PORT`;
            const userKey = `IMAP${accountNumber}_USER`;
            const passwordKey = `IMAP${accountNumber}_PASSWORD`;
            const tlsKey = `IMAP${accountNumber}_TLS`;
            const nameKey = `IMAP${accountNumber}_NAME`;

            const host = process.env[hostKey];
            
            if (host && process.env[userKey] && process.env[passwordKey]) {
                accountConfigs.push({
                    host: host,
                    port: parseInt(process.env[portKey] || '993'),
                    user: process.env[userKey] || '',
                    password: process.env[passwordKey] || '',
                    tls: process.env[tlsKey] === 'true',
                    accountName: process.env[nameKey] || `Account${accountNumber}`,
                    tlsOptions: { rejectUnauthorized: false }
                });

                logger.info(`Discovered IMAP account ${accountNumber}: ${process.env[nameKey] || `Account${accountNumber}`}`);
            } else {
                logger.warn(`Incomplete configuration for IMAP account ${accountNumber}. Missing required fields: host, user, or password.`);
            }
        }

        // Initialize accounts
        this.accounts = accountConfigs.map(config => ({
            config,
            connection: null,
            isConnected: false
        }));

        logger.info(`Loaded ${this.accounts.length} IMAP accounts from environment variables`);
    }

    private getAvailableIMAPAccountNumbers(): number[] {
        const accountNumbers: Set<number> = new Set();
        
        // Scan all environment variables for IMAP account patterns
        Object.keys(process.env).forEach(key => {
            const match = key.match(/^IMAP(\d+)_/);
            if (match) {
                const accountNumber = parseInt(match[1]);
                accountNumbers.add(accountNumber);
            }
        });

        const sortedNumbers = Array.from(accountNumbers).sort((a, b) => a - b);
        logger.info(`Found IMAP account configurations for accounts: ${sortedNumbers.join(', ')}`);
        
        return sortedNumbers;
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('IMAP sync manager is already running');
            return;
        }

        this.isRunning = true;
        logger.info('Starting IMAP synchronization for all accounts...');

        // Initialize Elasticsearch
        try {
            await this.elasticsearchService.initialize();
            logger.info('Elasticsearch initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Elasticsearch:', error);
            // Continue without Elasticsearch if it fails
        }

        // Connect to all accounts and start syncing
        const connectionPromises = this.accounts.map(account => this.connectAndSync(account));
        await Promise.all(connectionPromises);

        logger.info('All IMAP accounts connected and syncing');
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        logger.info('Stopping IMAP synchronization...');

        // Disconnect all accounts
        const disconnectionPromises = this.accounts.map(account => this.disconnectAccount(account));
        await Promise.all(disconnectionPromises);

        logger.info('IMAP synchronization stopped');
    }

    private async connectAndSync(account: IMAPAccount): Promise<void> {
        try {
            logger.info(`Connecting to IMAP account: ${account.config.accountName}`);

            const imap = new Imap({
                user: account.config.user,
                password: account.config.password,
                host: account.config.host,
                port: account.config.port,
                tls: account.config.tls,
                tlsOptions: account.config.tlsOptions,
                keepalive: true
            });

            account.connection = imap;

            return new Promise((resolve, reject) => {
                imap.once('ready', async () => {
                    try {
                        account.isConnected = true;
                        logger.info(`Connected to ${account.config.accountName}`);

                        // Start syncing emails from the last 30 days
                        await this.syncRecentEmails(account);

                        // Set up IDLE mode for real-time updates
                        await this.setupIdleMode(account);

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                imap.once('error', (error: Error) => {
                    logger.error(`IMAP error for ${account.config.accountName}:`, error);
                    account.isConnected = false;
                    reject(error);
                });

                imap.once('end', () => {
                    logger.info(`IMAP connection ended for ${account.config.accountName}`);
                    account.isConnected = false;
                });

                imap.connect();
            });

        } catch (error) {
            logger.error(`Failed to connect to ${account.config.accountName}:`, error);
            throw error;
        }
    }

    private async syncRecentEmails(account: IMAPAccount): Promise<void> {
        const imap = account.connection;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Format date for IMAP search (DD-MMM-YYYY format)
        const formatIMAPDate = (date: Date): string => {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                           'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const day = date.getDate().toString().padStart(2, '0');
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const formattedDate = formatIMAPDate(thirtyDaysAgo);

        return new Promise((resolve, reject) => {
            imap.openBox('INBOX', false, (error: Error, box: any) => {
                if (error) {
                    logger.error(`Failed to open INBOX for ${account.config.accountName}:`, error);
                    reject(error);
                    return;
                }

                logger.info(`Syncing emails from last 30 days for ${account.config.accountName}`);

                // Search for emails from the last 30 days
                // Use proper IMAP search syntax: [['SINCE', date]]
                imap.search([['SINCE', formattedDate]], (error: Error, results: number[]) => {
                    if (error) {
                        logger.error(`Failed to search emails for ${account.config.accountName}:`, error);
                        reject(error);
                        return;
                    }

                    if (!results || results.length === 0) {
                        logger.info(`No recent emails found for ${account.config.accountName}`);
                        resolve();
                        return;
                    }

                    logger.info(`Found ${results.length} recent emails for ${account.config.accountName}`);

                    // Fetch and process emails
                    this.fetchAndProcessEmails(account, results, 'INBOX')
                        .then(() => resolve())
                        .catch(reject);
                });
            });
        });
    }

    private async fetchAndProcessEmails(account: IMAPAccount, uids: number[], folder: string): Promise<void> {
        const imap = account.connection;

        return new Promise((resolve, reject) => {
            const fetch = imap.fetch(uids, {
                bodies: '',
                struct: true,
                envelope: true
            });

            fetch.on('message', (msg: any, seqno: number) => {
                let buffer = '';
                let attributes: any;

                msg.on('body', (stream: any) => {
                    stream.on('data', (chunk: any) => {
                        buffer += chunk.toString('utf8');
                    });
                });

                msg.once('attributes', (attrs: any) => {
                    attributes = attrs;
                });

                msg.once('end', async () => {
                    try {
                        const parsed = await simpleParser(buffer);
                        
                        const getEmailText = (addr: any): string => {
                            if (!addr) return '';
                            if (Array.isArray(addr)) {
                                return addr.map(a => a.text || a.address || '').join(', ');
                            }
                            return addr.text || addr.address || '';
                        };

                        const email: EmailMessage = {
                            uid: attributes.uid,
                            messageId: parsed.messageId || '',
                            subject: parsed.subject || '',
                            from: getEmailText(parsed.from),
                            to: getEmailText(parsed.to),
                            date: parsed.date || new Date(),
                            body: parsed.text || parsed.html || '',
                            folder: folder,
                            accountName: account.config.accountName,
                            flags: attributes.flags || []
                        };

                        await this.processEmail(email);

                    } catch (error) {
                        logger.error(`Failed to parse email for ${account.config.accountName}:`, error);
                    }
                });
            });

            fetch.once('error', (error: Error) => {
                logger.error(`Failed to fetch emails for ${account.config.accountName}:`, error);
                reject(error);
            });

            fetch.once('end', () => {
                logger.info(`Finished fetching emails for ${account.config.accountName}`);
                resolve();
            });
        });
    }

    private async setupIdleMode(account: IMAPAccount): Promise<void> {
        const imap = account.connection;

        logger.info(`Setting up IDLE mode for ${account.config.accountName}`);

        // Listen for new mail events
        imap.on('mail', (numNewMsgs: number) => {
            logger.info(`${numNewMsgs} new email(s) received for ${account.config.accountName}`);
            this.handleNewMail(account);
        });

        // Start IDLE mode
        imap.on('ready', () => {
            imap.openBox('INBOX', false, (error: Error) => {
                if (error) {
                    logger.error(`Failed to open INBOX for IDLE mode in ${account.config.accountName}:`, error);
                    return;
                }

                // Start IDLE
                try {
                    imap.on('update', (seqno: number, info: any) => {
                        logger.info(`Email update received for ${account.config.accountName}, seqno: ${seqno}`);
                    });

                    // Keep the connection alive with IDLE
                    setInterval(() => {
                        if (account.isConnected && imap.state === 'authenticated') {
                            imap.search(['UNSEEN'], (error: Error, results: number[]) => {
                                if (!error && results && results.length > 0) {
                                    logger.info(`Found ${results.length} unseen emails for ${account.config.accountName}`);
                                    this.fetchAndProcessEmails(account, results, 'INBOX');
                                }
                            });
                        }
                    }, 30000); // Check every 30 seconds

                } catch (error) {
                    logger.error(`Failed to setup IDLE for ${account.config.accountName}:`, error);
                }
            });
        });
    }

    private async handleNewMail(account: IMAPAccount): Promise<void> {
        const imap = account.connection;

        try {
            // Search for unseen emails
            imap.search(['UNSEEN'], (error: Error, results: number[]) => {
                if (error) {
                    logger.error(`Failed to search for new emails in ${account.config.accountName}:`, error);
                    return;
                }

                if (results && results.length > 0) {
                    logger.info(`Processing ${results.length} new email(s) for ${account.config.accountName}`);
                    this.fetchAndProcessEmails(account, results, 'INBOX');
                }
            });

        } catch (error) {
            logger.error(`Failed to handle new mail for ${account.config.accountName}:`, error);
        }
    }

    private async processEmail(email: EmailMessage): Promise<void> {
        // Log the email details
        logger.info(`Processing email: ${email.subject} from ${email.from} (${email.accountName})`);
        
        try {
            // Check if email already exists in Elasticsearch
            const exists = await this.elasticsearchService.emailExists(
                email.accountName, 
                email.folder, 
                email.uid
            );

            if (!exists) {
                // Index the email in Elasticsearch
                await this.elasticsearchService.indexEmail(email);
                logger.debug(`Successfully indexed email: ${email.subject}`);
            } else {
                logger.debug(`Email already indexed: ${email.subject}`);
            }

        } catch (error) {
            logger.error(`Failed to index email ${email.messageId}:`, error);
            // Continue processing even if indexing fails
        }
        
        // Log the email details for debugging
        console.log('Email Details:', {
            uid: email.uid,
            subject: email.subject,
            from: email.from,
            date: email.date,
            account: email.accountName,
            folder: email.folder
        });
    }

    public getAccountStatus(): { accountName: string; isConnected: boolean; host: string; user: string }[] {
        return this.accounts.map(account => ({
            accountName: account.config.accountName,
            isConnected: account.isConnected,
            host: account.config.host,
            user: account.config.user
        }));
    }

    public getConnectedAccountsCount(): number {
        return this.accounts.filter(account => account.isConnected).length;
    }

    public getTotalAccountsCount(): number {
        return this.accounts.length;
    }

    public async searchEmails(query: any, from: number = 0, size: number = 10): Promise<any> {
        try {
            return await this.elasticsearchService.searchEmails(query, from, size);
        } catch (error) {
            logger.error('Failed to search emails:', error);
            throw error;
        }
    }

    public async getEmailStats(): Promise<any> {
        try {
            return await this.elasticsearchService.getEmailStats();
        } catch (error) {
            logger.error('Failed to get email statistics:', error);
            throw error;
        }
    }

    public async getElasticsearchHealth(): Promise<any> {
        try {
            return await this.elasticsearchService.getHealth();
        } catch (error) {
            logger.error('Failed to get Elasticsearch health:', error);
            throw error;
        }
    }

    private async disconnectAccount(account: IMAPAccount): Promise<void> {
        if (account.connection && account.isConnected) {
            try {
                account.connection.end();
                account.isConnected = false;
                logger.info(`Disconnected from ${account.config.accountName}`);
            } catch (error) {
                logger.error(`Failed to disconnect from ${account.config.accountName}:`, error);
            }
        }
    }
}
