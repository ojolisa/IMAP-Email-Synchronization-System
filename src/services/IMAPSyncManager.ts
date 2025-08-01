import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { IMAPConfig, EmailMessage, IMAPAccount, IndexedEmailWithCategory, IMAPFolder, EmailFolder } from '../types';
import { logger } from '../utils/logger';
import { ElasticsearchService } from './ElasticsearchService';
import { EmailCategorizationService } from './EmailCategorizationService';
import { NotificationService } from './NotificationService';
import { promisify } from 'util';

export class IMAPSyncManager {
    private accounts: IMAPAccount[] = [];
    private isRunning: boolean = false;
    private elasticsearchService!: ElasticsearchService;
    private categorizationService!: EmailCategorizationService;
    private notificationService!: NotificationService;
    private folderCache: Map<string, IMAPFolder[]> = new Map();
    private lastProcessedUID: Map<string, number> = new Map(); // Track last processed UID per account

    constructor() {
        this.loadAccountsFromEnv();
        this.initializeElasticsearch();
        this.initializeCategorization();
        this.notificationService = new NotificationService();
    }

    async getFolders(accountId?: string): Promise<EmailFolder[]> {
        try {
            const folders: EmailFolder[] = [];
            
            // If accountId is provided, only get folders for that account
            const targetAccounts = accountId 
                ? this.accounts.filter(acc => acc.config.user === accountId)
                : this.accounts;

            for (const account of targetAccounts) {
                if (!account.isConnected) {
                    // Connect if not already connected
                    await this.connectToAccount(account);
                }

                const imapFolders = await this.getIMAPFolders(account);
                
                // Get email counts from Elasticsearch for each folder
                for (const folder of imapFolders) {
                    try {
                        const countResult = await this.elasticsearchService.searchEmails({
                            accountName: account.config.accountName,
                            folder: folder.name
                        }, 0, 0);
                        
                        folders.push({
                            name: folder.name,
                            count: countResult.total
                        });
                    } catch (error) {
                        logger.warn(`Failed to get count for folder ${folder.name}: ${error}`);
                        folders.push({
                            name: folder.name,
                            count: 0
                        });
                    }
                }
            }

            return folders;
        } catch (error) {
            logger.error('Error getting folders:', error);
            throw error;
        }
    }

    async getAccounts(): Promise<{ id: string; email: string; }[]> {
        return this.accounts.map(account => ({
            id: account.config.accountName,
            email: account.config.user
        }));
    }

    private async getIMAPFolders(account: IMAPAccount): Promise<IMAPFolder[]> {
        return new Promise((resolve, reject) => {
            const imap = account.connection;
            
            imap.getBoxes((err: Error | null, boxes: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const folders: IMAPFolder[] = [];
                
                const processBoxes = (boxList: any, prefix = '') => {
                    Object.keys(boxList).forEach((key) => {
                        const box = boxList[key];
                        const path = prefix + key;
                        
                        folders.push({
                            name: path,
                            path: path,
                            messageCount: box.messages?.total || 0
                        });

                        if (box.children) {
                            processBoxes(box.children, path + box.delimiter);
                        }
                    });
                };

                processBoxes(boxes);
                resolve(folders);
            });
        });
    }

    private initializeElasticsearch(): void {
        const elasticsearchConfig = {
            node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
            index: process.env.ELASTICSEARCH_INDEX || 'imap-emails'
        };

        this.elasticsearchService = new ElasticsearchService(elasticsearchConfig);
        logger.info(`Elasticsearch configured with node: ${elasticsearchConfig.node}, index: ${elasticsearchConfig.index}`);
    }

    private async connectToAccount(account: IMAPAccount): Promise<void> {
        if (account.isConnected) {
            return;
        }

        return new Promise((resolve, reject) => {
            const imap = new Imap(account.config);

            imap.once('ready', () => {
                account.connection = imap;
                account.isConnected = true;
                logger.info(`Connected to IMAP server for ${account.config.user}`);
                resolve();
            });

            imap.once('error', (err: Error) => {
                account.isConnected = false;
                logger.error(`IMAP connection error for ${account.config.user}:`, err);
                reject(err);
            });

            imap.connect();
        });
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

                        // Start syncing only the last 10 emails
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

        return new Promise((resolve, reject) => {
            imap.openBox('INBOX', false, (error: Error, box: any) => {
                if (error) {
                    logger.error(`Failed to open INBOX for ${account.config.accountName}:`, error);
                    reject(error);
                    return;
                }

                logger.info(`Syncing last 10 emails for ${account.config.accountName}`);

                // Get the total number of messages in the mailbox
                const totalMessages = box.messages.total;
                
                if (totalMessages === 0) {
                    logger.info(`No emails found for ${account.config.accountName}`);
                    resolve();
                    return;
                }

                // Calculate the range for the last 10 emails
                const startSeq = Math.max(1, totalMessages - 9); // Get last 10 emails
                const endSeq = totalMessages;
                
                logger.info(`Found ${totalMessages} total emails. Fetching emails ${startSeq} to ${endSeq} for ${account.config.accountName}`);

                // Fetch the last 10 emails by sequence number
                const fetch = imap.seq.fetch(`${startSeq}:${endSeq}`, {
                    bodies: '',
                    struct: true,
                    envelope: true
                });

                const uids: number[] = [];
                
                fetch.on('message', (msg: any, seqno: number) => {
                    msg.once('attributes', (attrs: any) => {
                        uids.push(attrs.uid);
                    });
                });

                fetch.once('error', (error: Error) => {
                    logger.error(`Failed to fetch recent emails for ${account.config.accountName}:`, error);
                    reject(error);
                });

                fetch.once('end', () => {
                    if (uids.length > 0) {
                        logger.info(`Found ${uids.length} recent emails to process for ${account.config.accountName}`);
                        
                        // Set the initial last processed UID to the highest UID from this batch
                        const accountKey = `${account.config.accountName}-INBOX`;
                        const maxUID = Math.max(...uids);
                        this.lastProcessedUID.set(accountKey, maxUID);
                        logger.info(`Set initial last processed UID to ${maxUID} for ${account.config.accountName}`);
                        
                        // Process emails using the collected UIDs
                        this.fetchAndProcessEmails(account, uids, 'INBOX')
                            .then(() => resolve())
                            .catch(reject);
                    } else {
                        logger.info(`No recent emails to process for ${account.config.accountName}`);
                        resolve();
                    }
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

                    // Keep the connection alive with a simple ping, no email processing
                    setInterval(() => {
                        if (account.isConnected && imap.state === 'authenticated') {
                            // Just check connection status, don't process emails
                            logger.debug(`Connection check for ${account.config.accountName} - Status: ${imap.state}`);
                        }
                    }, 300000); // Check every 5 minutes instead of 30 seconds

                } catch (error) {
                    logger.error(`Failed to setup IDLE for ${account.config.accountName}:`, error);
                }
            });
        });
    }

    private async handleNewMail(account: IMAPAccount): Promise<void> {
        const imap = account.connection;

        try {
            // Get the current mailbox state to find the newest emails
            imap.openBox('INBOX', false, (error: Error, box: any) => {
                if (error) {
                    logger.error(`Failed to open INBOX for new mail handling in ${account.config.accountName}:`, error);
                    return;
                }

                const totalMessages = box.messages.total;
                const accountKey = `${account.config.accountName}-INBOX`;
                const lastProcessedUID = this.lastProcessedUID.get(accountKey) || 0;
                
                // Only fetch emails with UID higher than the last processed UID
                if (totalMessages > 0) {
                    // Search for emails with UID greater than last processed
                    const searchCriteria = lastProcessedUID > 0 
                        ? [['UID', `${lastProcessedUID + 1}:*`]]
                        : [['UID', `${totalMessages}:*`]]; // If no last UID, get only the latest
                    
                    imap.search(searchCriteria, (searchError: Error, results: number[]) => {
                        if (searchError) {
                            logger.error(`Failed to search for new emails in ${account.config.accountName}:`, searchError);
                            return;
                        }

                        if (results && results.length > 0) {
                            logger.info(`Processing ${results.length} new email(s) with UIDs > ${lastProcessedUID} for ${account.config.accountName}`);
                            this.fetchAndProcessEmails(account, results, 'INBOX');
                        } else {
                            logger.debug(`No new emails found for ${account.config.accountName}`);
                        }
                    });
                } else {
                    logger.info(`No emails in mailbox for ${account.config.accountName}`);
                }
            });

        } catch (error) {
            logger.error(`Failed to handle new mail for ${account.config.accountName}:`, error);
        }
    }

    private initializeCategorization(): void {
        try {
            this.categorizationService = new EmailCategorizationService();
            logger.info('Email categorization service initialized');
        } catch (error) {
            logger.error('Failed to initialize email categorization:', error);
            // Continue without categorization if it fails
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
                // Update the last processed UID for this account
                const accountKey = `${email.accountName}-${email.folder}`;
                const currentLastUID = this.lastProcessedUID.get(accountKey) || 0;
                if (email.uid > currentLastUID) {
                    this.lastProcessedUID.set(accountKey, email.uid);
                }

                // Categorize the email
                let emailWithCategory: IndexedEmailWithCategory = { 
                    ...email,
                    indexed_at: new Date()
                };
                
                if (this.categorizationService) {
                    try {
                        const category = await this.categorizationService.categorizeEmail(email);
                        emailWithCategory.category = category;
                        
                        // Log the Gemini response along with the categorization
                        logger.info(`Email categorized - Subject: "${email.subject}", Category: ${category.category}, Gemini Response: "${category.geminiResponse}"`);
                        console.log(`📧 New Email Indexed:
  Subject: ${email.subject}
  From: ${email.from}
  Category: ${category.category}
  🤖 Gemini Response: "${category.geminiResponse}"
  ⏰ Indexed at: ${new Date().toISOString()}`);
                        
                        // Send notifications for INTERESTED emails
                        if (category.category === 'INTERESTED') {
                            await this.notificationService.notifyInterestedEmail(emailWithCategory);
                        }
                    } catch (error) {
                        logger.error(`Failed to categorize email ${email.messageId}:`, error);
                        console.log(`❌ Failed to categorize email: ${email.subject} - ${error}`);
                    }
                } else {
                    // Log when categorization service is not available
                    logger.info(`Email indexed without categorization - Subject: "${email.subject}"`);
                    console.log(`📧 New Email Indexed (No Categorization):
  Subject: ${email.subject}
  From: ${email.from}
  ⏰ Indexed at: ${new Date().toISOString()}`);
                }

                // Index the email with category in Elasticsearch
                await this.elasticsearchService.indexEmail(emailWithCategory);
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

    public async getEmailByMessageId(messageId: string): Promise<any> {
        try {
            return await this.elasticsearchService.getEmailByMessageId(messageId);
        } catch (error) {
            logger.error('Failed to get email by messageId:', error);
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
