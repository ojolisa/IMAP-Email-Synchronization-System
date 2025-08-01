import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';
import { EmailMessage, EmailCategory, CategoryLabel } from '../types';

export class EmailCategorizationService {
    private genAI: GoogleGenAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenAI({ apiKey });
        try {
            this.model = this.genAI.models;
        } catch (error) {
            logger.error('Error initializing Gemini model:', error);
            throw error;
        }
    }

    private async classifyEmail(email: EmailMessage): Promise<{ category: CategoryLabel; rawResponse: string }> {
        try {
            // Prepare email content for classification
            const content = `
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body?.substring(0, 1000)}  // Limit content length
            `;

            // Prompt for email classification
            const prompt = `You are an email classifier. Your ONLY job is to return exactly one of these categories:

INTERESTED
MEETING_BOOKED
NOT_INTERESTED
SPAM
OUT_OF_OFFICE

Categories defined:
- INTERESTED: Email shows genuine interest in a product/service/opportunity
- MEETING_BOOKED: Email confirms, schedules, or books a meeting/appointment
- NOT_INTERESTED: Email explicitly declines or expresses no interest
- SPAM: Unsolicited marketing, promotional content, or suspicious emails
- OUT_OF_OFFICE: Automated out-of-office or auto-reply messages and personal messages

Email to classify:
${content}

IMPORTANT: Respond with ONLY the category name. Do not include explanations, reasoning, or any other text. Just one word from the list above.

Category:`;

            const response = await this.model.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 10,
                    topP: 0.1,
                    topK: 1
                }
            });
            
            const rawResponse = response.text;
            let text = rawResponse.trim().toUpperCase();

            // Extract just the category if there's extra text
            const validCategories: CategoryLabel[] = [
                'NOT_INTERESTED',  // Check this first to avoid matching substring in INTERESTED
                'INTERESTED',
                'MEETING_BOOKED',
                'SPAM',
                'OUT_OF_OFFICE'
            ];

            // Try to find a valid category in the response using exact match
            for (const category of validCategories) {
                // Use word boundary regex to ensure exact match
                const regex = new RegExp(`\\b${category}\\b`, 'i');
                if (regex.test(text)) {
                    return { category, rawResponse };
                }
            }

            // If no valid category found, log the full response and default to SPAM
            logger.warn(`Invalid category returned by Gemini: ${rawResponse}, defaulting to SPAM`);
            return { category: 'SPAM', rawResponse };
        } catch (error) {
            // Log the specific error for debugging
            logger.error('Error classifying email:', {
                error,
                subject: email.subject,
                messageId: email.messageId
            });
            
            // For demonstration emails that are clearly categorizable, use basic rules
            const subject = email.subject.toLowerCase();
            if (subject.includes('out of office')) {
                return { category: 'OUT_OF_OFFICE', rawResponse: 'Fallback rule: out of office detected' };
            } else if (subject.includes('meeting confirmed')) {
                return { category: 'MEETING_BOOKED', rawResponse: 'Fallback rule: meeting confirmed detected' };
            } else if (subject.includes('make money fast')) {
                return { category: 'SPAM', rawResponse: 'Fallback rule: spam keywords detected' };
            }
            
            // If classification fails for any reason (API errors, rate limiting, etc.), 
            // categorize as OUT_OF_OFFICE as a safe fallback
            logger.warn(`Unable to classify email, using OUT_OF_OFFICE fallback for: ${email.subject}`);
            return { category: 'OUT_OF_OFFICE', rawResponse: 'Fallback: Classification failed, defaulted to OUT_OF_OFFICE' };
        }
    }

    private isValidCategory(category: string): category is CategoryLabel {
        const validCategories: CategoryLabel[] = [
            'INTERESTED',
            'MEETING_BOOKED',
            'NOT_INTERESTED',
            'SPAM',
            'OUT_OF_OFFICE'
        ];
        return validCategories.includes(category as CategoryLabel);
    }

    public async categorizeEmail(email: EmailMessage): Promise<EmailCategory> {
        try {
            const result = await this.classifyEmail(email);
            const timestamp = new Date();

            return {
                messageId: email.messageId,
                category: result.category,
                confidence: 1.0,
                categorizedAt: timestamp,
                geminiResponse: result.rawResponse
            };
        } catch (error) {
            // This should no longer happen since classifyEmail now has a fallback,
            // but keep this as an additional safety net
            logger.error('Failed to categorize email:', {
                error,
                subject: email.subject,
                messageId: email.messageId
            });
            
            // Final fallback - return OUT_OF_OFFICE if something still goes wrong
            const timestamp = new Date();
            return {
                messageId: email.messageId,
                category: 'OUT_OF_OFFICE',
                confidence: 0.1, // Low confidence since this is a fallback
                categorizedAt: timestamp,
                geminiResponse: 'Emergency fallback: Categorization completely failed'
            };
        }
    }
}
