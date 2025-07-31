<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# IMAP Email Synchronization Project

This is a TypeScript Node.js project for real-time IMAP email synchronization with the following features:

## Project Structure
- Real-time email synchronization using persistent IMAP connections with IDLE mode
- Support for multiple IMAP accounts simultaneously
- Fetches emails from the last 30 days on startup
- Uses TypeScript for type safety
- Winston for structured logging
- Mailparser for email parsing

## Key Components
- `IMAPSyncManager`: Main service for managing multiple IMAP connections
- Persistent IMAP connections with IDLE mode for real-time updates
- Email processing pipeline for storing and indexing emails
- Environment-based configuration for multiple accounts

## Development Guidelines
- Use TypeScript interfaces for type definitions
- Implement proper error handling and logging
- Follow async/await patterns for asynchronous operations
- Use environment variables for sensitive configuration
- Maintain persistent connections for real-time synchronization

## Future Extensions
- Elasticsearch integration for searchable storage
- AI-based email categorization
- Slack notifications and webhook integrations
- Frontend interface for email management
- RAG-based AI reply suggestions
