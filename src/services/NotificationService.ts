import axios from 'axios';
import { logger } from '../utils/logger';
import { IndexedEmailWithCategory } from '../types';

export class NotificationService {
    private slackWebhookUrl: string;
    private externalWebhookUrl: string;

    constructor() {
        this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';
        this.externalWebhookUrl = process.env.EXTERNAL_WEBHOOK_URL || '';

        if (!this.slackWebhookUrl) {
            logger.warn('SLACK_WEBHOOK_URL not configured. Slack notifications will be disabled.');
        }

        if (!this.externalWebhookUrl) {
            logger.warn('EXTERNAL_WEBHOOK_URL not configured. External webhook notifications will be disabled.');
        }
    }

    async sendSlackNotification(email: IndexedEmailWithCategory): Promise<void> {
        if (!this.slackWebhookUrl) return;

        try {
            const message = {
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🎯 New Interested Email Received!",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        fields: [
                            {
                                type: "mrkdwn",
                                text: `*From:*\n${email.from}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*Subject:*\n${email.subject}`
                            }
                        ]
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Preview:*\n${email.body.substring(0, 200)}...`
                        }
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `📅 Received: ${email.date.toLocaleString()}`
                            }
                        ]
                    }
                ]
            };

            await axios.post(this.slackWebhookUrl, message);
            logger.info(`Slack notification sent for email: ${email.messageId}`);
        } catch (error) {
            logger.error('Failed to send Slack notification:', error);
        }
    }

    async triggerWebhook(email: IndexedEmailWithCategory): Promise<void> {
        if (!this.externalWebhookUrl) return;

        try {
            const payload = {
                messageId: email.messageId,
                from: email.from,
                subject: email.subject,
                date: email.date,
                category: email.category,
                accountName: email.accountName,
                body: email.body.substring(0, 500) // Truncate body to avoid excessive payload
            };

            await axios.post(this.externalWebhookUrl, payload);
            logger.info(`Webhook triggered for email: ${email.messageId}`);
        } catch (error) {
            logger.error('Failed to trigger webhook:', error);
        }
    }

    async notifyInterestedEmail(email: IndexedEmailWithCategory): Promise<void> {
        await Promise.all([
            this.sendSlackNotification(email),
            this.triggerWebhook(email)
        ]);
    }
}
