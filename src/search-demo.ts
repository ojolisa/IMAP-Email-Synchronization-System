import * as readline from 'readline';
import { IMAPSyncManager } from './services/IMAPSyncManager';
import { EmailSearchAPI } from './services/EmailSearchAPI';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * CLI Demo for Email Search functionality
 */
class EmailSearchCLI {
    private syncManager: IMAPSyncManager;
    private searchAPI: EmailSearchAPI;
    private rl: readline.Interface;

    constructor() {
        this.syncManager = new IMAPSyncManager();
        this.searchAPI = new EmailSearchAPI(this.syncManager);
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async start(): Promise<void> {
        console.log('🚀 Starting IMAP Email Search Demo...\n');

        try {
            // Start the IMAP sync manager
            await this.syncManager.start();
            console.log('✅ IMAP synchronization started successfully!\n');

            // Wait a moment for initial sync
            console.log('⏳ Waiting for initial email synchronization...');
            await this.sleep(5000);

            this.showMenu();
        } catch (error) {
            console.error('❌ Failed to start IMAP sync:', error);
            process.exit(1);
        }
    }

    private showMenu(): void {
        console.log('\n📧 Email Search Menu:');
        console.log('1. Full-text search');
        console.log('2. Search by sender');
        console.log('3. Search by account and folder');
        console.log('4. Search by date range');
        console.log('5. View email statistics');
        console.log('6. Check system health');
        console.log('7. Exit');
        console.log('\nChoose an option (1-7): ');

        this.rl.question('', (answer) => {
            this.handleMenuChoice(answer.trim());
        });
    }

    private async handleMenuChoice(choice: string): Promise<void> {
        switch (choice) {
            case '1':
                await this.fullTextSearch();
                break;
            case '2':
                await this.searchBySender();
                break;
            case '3':
                await this.searchByAccountFolder();
                break;
            case '4':
                await this.searchByDateRange();
                break;
            case '5':
                await this.viewStats();
                break;
            case '6':
                await this.checkHealth();
                break;
            case '7':
                await this.exit();
                return;
            default:
                console.log('❌ Invalid option. Please choose 1-7.');
                this.showMenu();
                return;
        }

        // Return to menu after operation
        setTimeout(() => this.showMenu(), 2000);
    }

    private async fullTextSearch(): Promise<void> {
        this.rl.question('🔍 Enter search text: ', async (searchText) => {
            if (!searchText.trim()) {
                console.log('❌ Please enter a search term.');
                return;
            }

            console.log(`\n🔎 Searching for: "${searchText}"`);
            
            try {
                const results = await this.searchAPI.fullTextSearch(searchText, 1, 5);
                this.displaySearchResults(results);
            } catch (error) {
                console.error('❌ Search failed:', error);
            }
        });
    }

    private async searchBySender(): Promise<void> {
        this.rl.question('👤 Enter sender email or name: ', async (sender) => {
            if (!sender.trim()) {
                console.log('❌ Please enter a sender.');
                return;
            }

            console.log(`\n🔎 Searching emails from: "${sender}"`);
            
            try {
                const results = await this.searchAPI.searchBySender(sender, 1, 5);
                this.displaySearchResults(results);
            } catch (error) {
                console.error('❌ Search failed:', error);
            }
        });
    }

    private async searchByAccountFolder(): Promise<void> {
        this.rl.question('📁 Enter account name: ', (account) => {
            if (!account.trim()) {
                console.log('❌ Please enter an account name.');
                return;
            }

            this.rl.question('📂 Enter folder (or press Enter for all folders): ', async (folder) => {
                console.log(`\n🔎 Searching in account: "${account}"${folder ? `, folder: "${folder}"` : ' (all folders)'}`);
                
                try {
                    const results = await this.searchAPI.searchByAccountAndFolder(
                        account, 
                        folder || undefined, 
                        undefined, 
                        1, 
                        5
                    );
                    this.displaySearchResults(results);
                } catch (error) {
                    console.error('❌ Search failed:', error);
                }
            });
        });
    }

    private async searchByDateRange(): Promise<void> {
        this.rl.question('📅 Enter start date (YYYY-MM-DD): ', (startDate) => {
            if (!startDate.trim()) {
                console.log('❌ Please enter a start date.');
                return;
            }

            this.rl.question('📅 Enter end date (YYYY-MM-DD): ', async (endDate) => {
                if (!endDate.trim()) {
                    console.log('❌ Please enter an end date.');
                    return;
                }

                console.log(`\n🔎 Searching emails from ${startDate} to ${endDate}`);
                
                try {
                    const results = await this.searchAPI.searchByDateRange(startDate, endDate, undefined, 1, 5);
                    this.displaySearchResults(results);
                } catch (error) {
                    console.error('❌ Search failed:', error);
                }
            });
        });
    }

    private async viewStats(): Promise<void> {
        console.log('\n📊 Fetching email statistics...');
        
        try {
            const stats = await this.searchAPI.getStats();
            console.log('\n📈 Email Statistics:');
            console.log(`Total emails indexed: ${stats.emailStats?.totalEmails || 0}`);
            console.log(`Connected accounts: ${stats.connectedAccounts}/${stats.totalAccounts}`);
            
            console.log('\n📧 Account Status:');
            stats.accountStatus?.forEach((account: any) => {
                console.log(`  ${account.isConnected ? '✅' : '❌'} ${account.accountName} (${account.user}@${account.host})`);
            });

            if (stats.emailStats?.accountStats) {
                console.log('\n📁 Emails by Account:');
                stats.emailStats.accountStats.forEach((account: any) => {
                    console.log(`  📧 ${account.key}: ${account.doc_count} emails`);
                    if (account.by_folder?.buckets) {
                        account.by_folder.buckets.forEach((folder: any) => {
                            console.log(`    📂 ${folder.key}: ${folder.doc_count} emails`);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('❌ Failed to get statistics:', error);
        }
    }

    private async checkHealth(): Promise<void> {
        console.log('\n🏥 Checking system health...');
        
        try {
            const health = await this.searchAPI.getHealth();
            console.log('\n💚 System Health:');
            console.log(`Elasticsearch status: ${health.elasticsearch?.cluster?.status || 'Unknown'}`);
            console.log(`Index documents: ${health.elasticsearch?.index?.total?.docs?.count || 0}`);
            console.log(`Index size: ${health.elasticsearch?.index?.total?.store?.size_in_bytes || 0} bytes`);
            
            console.log('\n📧 Account Health:');
            health.accounts?.forEach((account: any) => {
                console.log(`  ${account.isConnected ? '✅' : '❌'} ${account.accountName}`);
            });
        } catch (error) {
            console.error('❌ Health check failed:', error);
        }
    }

    private displaySearchResults(results: any): void {
        if (!results.success) {
            console.log(`❌ Search failed: ${results.error}`);
            return;
        }

        const { pagination, results: emails } = results;
        
        console.log(`\n📧 Found ${pagination.total} emails (showing page ${pagination.page} of ${pagination.totalPages}):`);
        
        if (emails.length === 0) {
            console.log('  No emails found matching your search criteria.');
            return;
        }

        emails.forEach((email: any, index: number) => {
            console.log(`\n${index + 1}. ${email.subject || '(No Subject)'}`);
            console.log(`   From: ${email.from}`);
            console.log(`   To: ${email.to}`);
            console.log(`   Date: ${new Date(email.date).toLocaleString()}`);
            console.log(`   Account: ${email.accountName} | Folder: ${email.folder}`);
            if (email.body) {
                const preview = email.body.substring(0, 100).replace(/\n/g, ' ');
                console.log(`   Preview: ${preview}${email.body.length > 100 ? '...' : ''}`);
            }
        });
    }

    private async exit(): Promise<void> {
        console.log('\n👋 Stopping IMAP synchronization...');
        
        try {
            await this.syncManager.stop();
            console.log('✅ IMAP synchronization stopped successfully!');
        } catch (error) {
            console.error('❌ Error stopping sync:', error);
        }

        console.log('👋 Goodbye!');
        this.rl.close();
        process.exit(0);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the CLI demo
const cli = new EmailSearchCLI();
cli.start().catch(error => {
    console.error('❌ CLI startup failed:', error);
    process.exit(1);
});
