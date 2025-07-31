import dotenv from 'dotenv';
import { ElasticsearchService } from '../src/services/ElasticsearchService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function deleteElasticsearchIndex() {
    try {
        logger.info('Starting Elasticsearch index deletion...');
        
        // Initialize Elasticsearch service with same config as main app
        const elasticsearchConfig = {
            node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
            index: process.env.ELASTICSEARCH_INDEX || 'imap-emails'
        };
        
        const elasticsearchService = new ElasticsearchService(elasticsearchConfig);
        
        logger.info(`Attempting to delete index: ${elasticsearchConfig.index}`);
        logger.warn('WARNING: This will permanently delete all indexed emails!');
        
        // Delete the index
        await elasticsearchService.deleteIndex();
        
        logger.info('Index deletion completed successfully');
        
    } catch (error) {
        logger.error('Failed to delete Elasticsearch index:', error);
        process.exit(1);
    }
}

// Run the deletion
deleteElasticsearchIndex().catch((error) => {
    logger.error('Unhandled error during index deletion:', error);
    process.exit(1);
});
