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

    private async classifyEmail(email: EmailMessage): Promise<CategoryLabel> {
        try {
            // Prepare email content for classification
            const content = `
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body?.substring(0, 1000)}  // Limit content length
            `;

            // Prompt for email classification
            const prompt = `Analyze this email and classify it into one of these categories:
- INTERESTED: Shows genuine interest in product/service
- MEETING_BOOKED: Confirms a meeting or appointment
- NOT_INTERESTED: Clearly expresses lack of interest
- SPAM: Unsolicited or spam content
- OUT_OF_OFFICE: Auto-reply or out of office message

Email Content:
${content}

Return only one of these exact category labels: INTERESTED, MEETING_BOOKED, NOT_INTERESTED, SPAM, OUT_OF_OFFICE`;

            const response = await this.model.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt
            });
            const text = response.text.trim();

            // Validate the response is a valid category
            if (this.isValidCategory(text)) {
                return text as CategoryLabel;
            } else {
                logger.warn(`Invalid category returned by Gemini: ${text}, defaulting to SPAM`);
                return 'SPAM';
            }
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
                return 'OUT_OF_OFFICE';
            } else if (subject.includes('meeting confirmed')) {
                return 'MEETING_BOOKED';
            } else if (subject.includes('make money fast')) {
                return 'SPAM';
            }
            
            throw new Error('Unable to classify email and no fallback rule matched');
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
            const category = await this.classifyEmail(email);
            const timestamp = new Date();

            return {
                messageId: email.messageId,
                category,
                confidence: 1.0,
                categorizedAt: timestamp
            };
        } catch (error) {
            logger.error('Failed to categorize email:', {
                error,
                subject: email.subject,
                messageId: email.messageId
            });
            
            throw error; // Re-throw to let caller handle the error
        }
    }
}
