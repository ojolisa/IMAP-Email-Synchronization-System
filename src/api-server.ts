import express from 'express';
import cors from 'cors';
import { IMAPSyncManager } from './services/IMAPSyncManager';
import { EmailSearchAPI } from './services/EmailSearchAPI';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Global variables for services
let syncManager: IMAPSyncManager;
let searchAPI: EmailSearchAPI;

// Initialize services function (similar to index.ts)
async function initializeServices() {
    try {
        logger.info('Initializing IMAP services...');
        
        // Initialize IMAP sync manager
        syncManager = new IMAPSyncManager();
        
        // Start synchronization for all configured accounts
        await syncManager.start();
        
        // Initialize search API with the sync manager
        searchAPI = new EmailSearchAPI(syncManager);
        
        logger.info('IMAP services initialized successfully');
        
    } catch (error) {
        logger.error('Failed to initialize IMAP services:', error);
        throw error;
    }
}

// API Routes
app.get('/api/emails/search', async (req, res) => {
    try {
        const searchParams = req.query;
        const results = await searchAPI.searchEmails(searchParams);
        res.json(results);
    } catch (error) {
        logger.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/folders', async (req, res) => {
    try {
        const accountId = req.query.accountId as string | undefined;
        const folders = await syncManager.getFolders(accountId);
        res.json(folders);
    } catch (error) {
        logger.error('Get folders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await syncManager.getAccounts();
        res.json(accounts);
    } catch (error) {
        logger.error('Get accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        // Return the actual categories used by the EmailCategorizationService
        res.json([
            'INTERESTED',
            'MEETING_BOOKED',
            'NOT_INTERESTED',
            'SPAM',
            'OUT_OF_OFFICE'
        ]);
    } catch (error) {
        logger.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // For now just return healthy status
        res.json({ 
            status: 'healthy',
            service: 'IMAP Search API'
        });
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start the API server with proper initialization
async function startAPIServer() {
    try {
        // First initialize all services (like index.ts does)
        await initializeServices();
        
        // Start the Express server
        app.listen(port, () => {
            logger.info(`API Server is running on port ${port}`);
            logger.info('API Server started successfully with initialized IMAP services');
        });
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down API Server...');
            if (syncManager) {
                await syncManager.stop();
            }
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('Failed to start API Server:', error);
        process.exit(1);
    }
}

// Start the application
startAPIServer().catch((error) => {
    logger.error('Unhandled error in API server startup:', error);
    process.exit(1);
});
