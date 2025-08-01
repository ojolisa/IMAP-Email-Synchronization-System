import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';

export interface ReplyTemplate {
    id: string;
    context: string;
    template: string;
    category: string;
    embedding?: number[];
    metadata?: Record<string, any>;
}

export interface SimilarityResult {
    template: ReplyTemplate;
    similarity: number;
}

export class ReplyVectorStore {
    private genAI: GoogleGenAI;
    private templates: ReplyTemplate[] = [];
    private isInitialized: boolean = false;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenAI({ apiKey });
    }

    /**
     * Initialize the vector store with default templates
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        logger.info('Initializing Reply Vector Store...');

        // Default reply templates for job applications
        const defaultTemplates: Omit<ReplyTemplate, 'id' | 'embedding'>[] = [
            {
                context: "I am applying for a job position. If the lead is interested, share the meeting booking link",
                template: "Thank you for shortlisting my profile! I'm available for a technical interview. You can book a slot here: https://cal.com/example",
                category: "interview_invitation",
                metadata: { type: "interview_scheduling" }
            },
            {
                context: "Someone is interested in my profile and wants to schedule a call",
                template: "Thank you for your interest! I'd be happy to discuss this opportunity further. Please feel free to book a convenient time slot: https://cal.com/example",
                category: "general_interest",
                metadata: { type: "general_scheduling" }
            },
            {
                context: "Follow up after submitting application",
                template: "Thank you for considering my application. I'm very excited about this opportunity and would love to discuss how my skills align with your needs. Please let me know if you need any additional information.",
                category: "follow_up",
                metadata: { type: "application_follow_up" }
            },
            {
                context: "Responding to salary or compensation inquiry",
                template: "Thank you for your interest in my profile. I'm open to discussing compensation based on the role requirements and responsibilities. I'd prefer to have a conversation about the position details first.",
                category: "compensation",
                metadata: { type: "salary_discussion" }
            },
            {
                context: "Declining an opportunity politely",
                template: "Thank you for reaching out with this opportunity. After careful consideration, I don't think this role aligns with my current career goals. I appreciate your time and wish you the best in finding the right candidate.",
                category: "decline",
                metadata: { type: "polite_decline" }
            },
            {
                context: "Expressing interest in learning more about the role",
                template: "Thank you for contacting me about this opportunity. I'm very interested in learning more about the role and how I can contribute to your team. Could we schedule a brief call to discuss the details?",
                category: "show_interest",
                metadata: { type: "express_interest" }
            }
        ];

        // Generate embeddings for default templates
        for (const template of defaultTemplates) {
            await this.addTemplate(template);
        }

        this.isInitialized = true;
        logger.info(`Reply Vector Store initialized with ${this.templates.length} templates`);
    }

    /**
     * Generate embedding for a given text using Gemini API
     */
    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.genAI.models.embedContent({
                model: 'text-embedding-004',
                contents: [text]
            });

            if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
                throw new Error('No embedding values in response');
            }

            return response.embeddings[0].values;
        } catch (error) {
            // If embedding model fails, fall back to a simple approach
            logger.warn('Embedding generation failed, using fallback:', error);
            return this.generateSimpleEmbedding(text);
        }
    }

    /**
     * Fallback method to generate simple embeddings based on text features
     */
    private generateSimpleEmbedding(text: string): number[] {
        // Simple embedding based on text characteristics
        const words = text.toLowerCase().split(/\s+/);
        const embedding = new Array(384).fill(0); // Standard embedding size
        
        // Basic features
        embedding[0] = words.length / 100; // text length feature
        embedding[1] = (text.match(/\?/g) || []).length / 10; // question marks
        embedding[2] = (text.match(/!/g) || []).length / 10; // exclamation marks
        
        // Keyword features
        const keywords = ['interview', 'meeting', 'schedule', 'call', 'discuss', 'opportunity', 'position', 'job', 'role'];
        keywords.forEach((keyword, idx) => {
            if (idx < 380) {
                embedding[idx + 4] = words.includes(keyword) ? 1 : 0;
            }
        });
        
        // Add some randomness for diversity
        for (let i = 50; i < 384; i++) {
            embedding[i] = Math.random() * 0.1;
        }
        
        return embedding;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Add a new reply template to the vector store
     */
    async addTemplate(template: Omit<ReplyTemplate, 'id' | 'embedding'>): Promise<string> {
        try {
            const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const embedding = await this.generateEmbedding(template.context);

            const newTemplate: ReplyTemplate = {
                ...template,
                id,
                embedding
            };

            this.templates.push(newTemplate);
            logger.info(`Added new reply template: ${id}`);
            
            return id;
        } catch (error) {
            logger.error('Error adding template:', error);
            throw error;
        }
    }

    /**
     * Find similar reply templates based on input email content
     */
    async findSimilarTemplates(emailContent: string, topK: number = 3): Promise<SimilarityResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Generate embedding for the input email
            const queryEmbedding = await this.generateEmbedding(emailContent);

            // Calculate similarities with all templates
            const similarities: SimilarityResult[] = [];

            for (const template of this.templates) {
                if (!template.embedding) {
                    logger.warn(`Template ${template.id} has no embedding, skipping`);
                    continue;
                }

                const similarity = this.cosineSimilarity(queryEmbedding, template.embedding);
                similarities.push({
                    template,
                    similarity
                });
            }

            // Sort by similarity (highest first) and return top K
            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK);

        } catch (error) {
            logger.error('Error finding similar templates:', error);
            throw error;
        }
    }

    /**
     * Get all templates in the store
     */
    getAllTemplates(): ReplyTemplate[] {
        return this.templates.map(template => ({
            ...template,
            embedding: undefined // Don't expose embeddings
        }));
    }

    /**
     * Remove a template by ID
     */
    removeTemplate(id: string): boolean {
        const index = this.templates.findIndex(template => template.id === id);
        if (index !== -1) {
            this.templates.splice(index, 1);
            logger.info(`Removed template: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Update a template
     */
    async updateTemplate(id: string, updates: Partial<Omit<ReplyTemplate, 'id' | 'embedding'>>): Promise<boolean> {
        const templateIndex = this.templates.findIndex(template => template.id === id);
        if (templateIndex === -1) {
            return false;
        }

        const template = this.templates[templateIndex];
        
        // If context is updated, regenerate embedding
        if (updates.context && updates.context !== template.context) {
            updates.context = updates.context;
            const embedding = await this.generateEmbedding(updates.context);
            this.templates[templateIndex] = {
                ...template,
                ...updates,
                embedding
            };
        } else {
            this.templates[templateIndex] = {
                ...template,
                ...updates
            };
        }

        logger.info(`Updated template: ${id}`);
        return true;
    }

    /**
     * Clear all templates (useful for testing)
     */
    clearAllTemplates(): void {
        this.templates = [];
        this.isInitialized = false;
        logger.info('Cleared all templates from vector store');
    }
}
