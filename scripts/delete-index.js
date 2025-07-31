#!/usr/bin/env node

import { ElasticsearchService } from '../src/services/ElasticsearchService.js';
import { logger } from '../src/utils/logger.js';

/**
 * Utility script to delete Elasticsearch index
 * Usage: npm run delete-index
 */

async function deleteElasticsearchIndex() {
    try {
        // You'll need to adjust these config values to match your setup
        const elasticConfig = {
            node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
            index: process.env.ELASTICSEARCH_INDEX || 'emails'
        };

        const elasticService = new ElasticsearchService(elasticConfig);

        // Confirm before deletion
        const indexName = elasticConfig.index;
        console.log(`⚠️  WARNING: This will permanently delete the index '${indexName}'`);
        console.log('Are you sure you want to continue? (This action cannot be undone)');
        
        // In a real script, you might want to add readline for user confirmation
        // For now, commenting out the actual deletion call
        
        // Uncomment the line below to actually delete the index
        // await elasticService.deleteIndex();
        
        console.log('Script completed. Uncomment the deleteIndex call to actually delete the index.');

    } catch (error) {
        logger.error('Failed to delete Elasticsearch index:', error);
        process.exit(1);
    }
}

deleteElasticsearchIndex();
