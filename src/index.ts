import dotenv from 'dotenv';
import { IMAPSyncManager } from './services/IMAPSyncManager';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

async function main() {
    try {
        logger.info('Starting IMAP Synchronization Service...');
        
        // Initialize IMAP sync manager
        const syncManager = new IMAPSyncManager();
        
        // Start synchronization for all configured accounts
        await syncManager.start();
        
        logger.info('IMAP Synchronization Service started successfully');
        
        // Keep the process running
        process.on('SIGINT', async () => {
            logger.info('Shutting down IMAP Synchronization Service...');
            await syncManager.stop();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('Failed to start IMAP Synchronization Service:', error);
        process.exit(1);
    }
}

// Start the application
main().catch((error) => {
    logger.error('Unhandled error in main:', error);
    process.exit(1);
});
