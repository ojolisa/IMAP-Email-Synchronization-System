import express from 'express';
import cors from 'cors';
import { IMAPSyncManager } from './services/IMAPSyncManager';
import { EmailSearchAPI } from './services/EmailSearchAPI';
import { AISuggestedRepliesService } from './services/AISuggestedRepliesService';
import { logger } from './utils/logger';
import { EmailMessage, ReplyTemplate, SuggestedReply, ReplyGenerationOptions } from './types';
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
let repliesService: AISuggestedRepliesService;

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
        
        // Initialize AI suggested replies service
        repliesService = new AISuggestedRepliesService();
        await repliesService.initialize();
        
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

// AI Suggested Replies endpoints
app.post('/api/emails/:messageId/suggested-replies', async (req, res) => {
    try {
        const { messageId } = req.params;
        const options: ReplyGenerationOptions = req.body || {};

        // Validate messageId
        if (!messageId) {
            return res.status(400).json({ error: 'Message ID is required' });
        }

        // Get the email by messageId using the specific method
        const emailResult = await searchAPI.getEmailByMessageId(messageId);
        
        // Check if the result is valid
        if (!emailResult || !emailResult.success) {
            logger.warn(`Email not found for messageId: ${messageId}`);
            return res.status(404).json({ error: 'Email not found' });
        }

        const email = emailResult.email;

        if (!email) {
            logger.warn(`Email data is null for messageId: ${messageId}`);
            return res.status(404).json({ error: 'Email not found' });
        }

        // Convert to EmailMessage format
        const emailMessage: EmailMessage = {
            uid: email.uid,
            messageId: email.messageId,
            subject: email.subject,
            from: email.from,
            to: email.to,
            date: email.date,
            body: email.body,
            folder: email.folder,
            accountName: email.accountName,
            flags: email.flags
        };

        const suggestedReplies = await repliesService.generateSuggestedReplies(emailMessage, options);
        res.json(suggestedReplies);

    } catch (error) {
        logger.error('Generate suggested replies error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all reply templates
app.get('/api/reply-templates', async (req, res) => {
    try {
        const templates = repliesService.getReplyTemplates();
        res.json(templates);
    } catch (error) {
        logger.error('Get reply templates error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new reply template
app.post('/api/reply-templates', async (req, res) => {
    try {
        const template: Omit<ReplyTemplate, 'id' | 'embedding'> = req.body;
        
        if (!template.context || !template.template || !template.category) {
            return res.status(400).json({ error: 'Missing required fields: context, template, category' });
        }

        const templateId = await repliesService.addReplyTemplate(template);
        res.json({ id: templateId, message: 'Template added successfully' });

    } catch (error) {
        logger.error('Add reply template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update reply template
app.put('/api/reply-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates: Partial<Omit<ReplyTemplate, 'id' | 'embedding'>> = req.body;

        const success = await repliesService.updateReplyTemplate(id, updates);
        
        if (!success) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ message: 'Template updated successfully' });

    } catch (error) {
        logger.error('Update reply template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete reply template
app.delete('/api/reply-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const success = repliesService.removeReplyTemplate(id);
        
        if (!success) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ message: 'Template deleted successfully' });

    } catch (error) {
        logger.error('Delete reply template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test suggested replies with sample data
app.post('/api/suggested-replies/test', async (req, res) => {
    try {
        const suggestedReplies = await repliesService.testWithSampleEmail();
        res.json(suggestedReplies);
    } catch (error) {
        logger.error('Test suggested replies error:', error);
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
