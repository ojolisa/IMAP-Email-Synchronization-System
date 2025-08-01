import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';
import { EmailMessage } from '../types';
import { ReplyVectorStore, ReplyTemplate, SimilarityResult } from './ReplyVectorStore';

export interface SuggestedReply {
    id: string;
    subject: string;
    body: string;
}

export interface ReplyGenerationOptions {
    personalizeToSender?: boolean;
    includeOriginalEmail?: boolean;
}

export class AISuggestedRepliesService {
    private genAI: GoogleGenAI;
    private vectorStore: ReplyVectorStore;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenAI({ apiKey });
        this.model = this.genAI.models;
        this.vectorStore = new ReplyVectorStore();
    }

    /**
     * Initialize the service
     */
    async initialize(): Promise<void> {
        await this.vectorStore.initialize();
        logger.info('AI Suggested Replies Service initialized');
    }

    /**
     * Generate suggested replies for an incoming email
     */
    async generateSuggestedReplies(
        email: EmailMessage,
        options: ReplyGenerationOptions = {}
    ): Promise<SuggestedReply[]> {
        const {
            personalizeToSender = true,
            includeOriginalEmail = false
        } = options;

        try {
            logger.info(`Generating suggested reply for email: ${email.subject}`);

            // Prepare email content for analysis
            const emailContent = this.prepareEmailContent(email);

            // Find the best matching template using vector search
            const similarTemplates = await this.vectorStore.findSimilarTemplates(emailContent, 1);

            if (similarTemplates.length > 0) {
                // Generate personalized reply based on the best template
                const reply = await this.generatePersonalizedReply(email, similarTemplates[0], personalizeToSender);
                
                if (reply) {
                    return [reply];
                }
            }

            // If no good template found, generate a generic reply
            logger.warn('No suitable templates found, generating generic reply');
            return await this.generateGenericReply(email);

        } catch (error) {
            logger.error('Error generating suggested replies:', error);
            throw error;
        }
    }

    /**
     * Prepare email content for analysis
     */
    private prepareEmailContent(email: EmailMessage): string {
        return `
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body?.substring(0, 1500) || 'No body content'}
        `.trim();
    }

    /**
     * Generate a personalized reply based on template and email context
     */
    private async generatePersonalizedReply(
        email: EmailMessage,
        templateResult: SimilarityResult,
        personalize: boolean
    ): Promise<SuggestedReply | null> {
        try {
            const { template } = templateResult;

            // Generate subject line
            const subjectPrompt = `Generate a professional email subject line for replying to: "${email.subject}"
            
            Keep it concise and relevant. Don't include "Re:" prefix.
            
            Subject:`;

            const subjectResponse = await this.model.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: subjectPrompt,
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 50,
                    topP: 0.8,
                    topK: 40
                }
            });

            const subject = subjectResponse.text.trim().replace(/^(Re:|RE:)\s*/i, '');

            // Generate personalized reply body
            const bodyPrompt = `Based on the following email and reply template, generate a professional and personalized reply:

Original Email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body?.substring(0, 1000)}

Template Context: ${template.context}
Template Reply: ${template.template}

Instructions:
1. Use the template as inspiration but make it natural and personalized
2. ${personalize ? `Address the sender appropriately` : 'Keep it general'}
3. Maintain a professional tone
4. Include relevant details from the original email
5. Make it sound authentic, not templated
6. Keep it concise (2-3 paragraphs max)
7. Replace any placeholder URLs with the actual booking link if relevant

Reply:`;

            const bodyResponse = await this.model.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: bodyPrompt,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 300,
                    topP: 0.9,
                    topK: 40
                }
            });

            const body = bodyResponse.text.trim();

            return {
                id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                subject,
                body
            };

        } catch (error) {
            logger.error('Error generating personalized reply:', error);
            return null;
        }
    }

    /**
     * Generate a generic reply when no suitable templates are found
     */
    private async generateGenericReply(email: EmailMessage): Promise<SuggestedReply[]> {
        try {
            const prompt = `Generate a professional reply to the following email:

Original Email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body?.substring(0, 800)}

Generate a professional reply that:
1. Thanks the sender
2. Shows engagement and interest
3. Suggests next steps or asks relevant questions
4. Maintains a professional tone
5. Keep it concise (2-3 paragraphs max)

Reply:`;
            
            const response = await this.model.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 250,
                    topP: 0.9,
                    topK: 40
                }
            });

            return [{
                id: `generic_reply_${Date.now()}`,
                subject: `Re: ${email.subject}`,
                body: response.text.trim()
            }];

        } catch (error) {
            logger.error('Error generating generic reply:', error);
            throw error;
        }
    }

    /**
     * Add a new reply template to the vector store
     */
    async addReplyTemplate(template: Omit<ReplyTemplate, 'id' | 'embedding'>): Promise<string> {
        return await this.vectorStore.addTemplate(template);
    }

    /**
     * Get all available reply templates
     */
    getReplyTemplates(): ReplyTemplate[] {
        return this.vectorStore.getAllTemplates();
    }

    /**
     * Update an existing reply template
     */
    async updateReplyTemplate(id: string, updates: Partial<Omit<ReplyTemplate, 'id' | 'embedding'>>): Promise<boolean> {
        return await this.vectorStore.updateTemplate(id, updates);
    }

    /**
     * Remove a reply template
     */
    removeReplyTemplate(id: string): boolean {
        return this.vectorStore.removeTemplate(id);
    }

    /**
     * Test the service with sample data
     */
    async testWithSampleEmail(): Promise<SuggestedReply[]> {
        const sampleEmail: EmailMessage = {
            uid: 123,
            messageId: 'test-message-id',
            subject: 'Your resume has been shortlisted',
            from: 'recruiter@company.com',
            to: 'candidate@email.com',
            date: new Date(),
            body: 'Hi, Your resume has been shortlisted. When will be a good time for you to attend the technical interview?',
            folder: 'INBOX',
            accountName: 'test-account',
            flags: []
        };

        return await this.generateSuggestedReplies(sampleEmail);
    }
}
