# IMAP Email Synchronization Service

A TypeScript Node.js application for real-time IMAP email synchronization supporting multiple email accounts simultaneously.

## Features

- **Multi-Account Support**: Connect to unlimited IMAP accounts simultaneously
- **Real-time Synchronization**: Uses persistent IMAP connections with IDLE mode
- **Historical Email Sync**: Fetches emails from the last 30 days on startup
- **Robust Error Handling**: Comprehensive logging and error recovery
- **Type Safety**: Full TypeScript implementation
- **Flexible Configuration**: Environment-based configuration for easy deployment

## Configuration

### Multiple IMAP Accounts

The service automatically discovers and connects to any number of IMAP accounts configured in your `.env` file. Simply add accounts using the pattern `IMAP{NUMBER}_*`:

```env
# IMAP Account 1 Configuration
IMAP1_HOST=imap.gmail.com
IMAP1_PORT=993
IMAP1_USER=your-email1@gmail.com
IMAP1_PASSWORD=your-app-password1
IMAP1_TLS=true
IMAP1_NAME=Gmail Account 1

# IMAP Account 2 Configuration
IMAP2_HOST=outlook.office365.com
IMAP2_PORT=993
IMAP2_USER=your-email2@outlook.com
IMAP2_PASSWORD=your-app-password2
IMAP2_TLS=true
IMAP2_NAME=Outlook Account 2

# IMAP Account 3 Configuration
IMAP3_HOST=imap.mail.yahoo.com
IMAP3_PORT=993
IMAP3_USER=your-email3@yahoo.com
IMAP3_PASSWORD=your-app-password3
IMAP3_TLS=true
IMAP3_NAME=Yahoo Account 3

# Add as many accounts as needed...
# IMAP4_HOST=...
# IMAP5_HOST=...
```

### Required Environment Variables per Account

For each IMAP account (replace `{N}` with the account number):

- `IMAP{N}_HOST` - IMAP server hostname (required)
- `IMAP{N}_PORT` - IMAP server port (optional, defaults to 993)
- `IMAP{N}_USER` - Email username/address (required)
- `IMAP{N}_PASSWORD` - Email password or app-specific password (required)
- `IMAP{N}_TLS` - Enable TLS encryption (optional, defaults to true)
- `IMAP{N}_NAME` - Friendly name for the account (optional, defaults to Account{N})

### Account Discovery

The service automatically:
1. Scans all environment variables for the `IMAP{NUMBER}_` pattern
2. Discovers available account configurations
3. Validates that required fields (HOST, USER, PASSWORD) are present
4. Connects to all valid accounts simultaneously

### Adding New Accounts

To add a new IMAP account:
1. Add the configuration variables to your `.env` file with the next available number
2. Restart the service
3. The new account will be automatically discovered and connected

### Disabling Accounts

To temporarily disable an account:
- Comment out or remove the `IMAP{N}_HOST` variable
- Or comment out all variables for that account number

## Usage

### Start the Service

```bash
npm run dev
```

### Build and Run

```bash
npm run build
npm start
```

## Logging

The service provides detailed logging including:
- Account discovery and configuration
- Connection status for each account
- Email synchronization progress
- Error handling and recovery
- Periodic status updates

Log files are stored in the `logs/` directory:
- `combined.log` - All log messages
- `error.log` - Error messages only

## Architecture

### Key Components

- **IMAPSyncManager**: Main service managing multiple IMAP connections
- **Account Discovery**: Dynamic detection of configured IMAP accounts
- **Real-time Sync**: IDLE mode for instant email notifications
- **Email Processing**: Parsing and processing pipeline for incoming emails

### Account Management

Each IMAP account maintains:
- Independent connection state
- Separate error handling
- Individual synchronization processes
- Isolated logging context

## Email Providers

Tested with popular email providers:

### Gmail
```env
IMAP1_HOST=imap.gmail.com
IMAP1_PORT=993
IMAP1_TLS=true
```

### Outlook/Office 365
```env
IMAP2_HOST=outlook.office365.com
IMAP2_PORT=993
IMAP2_TLS=true
```

### Yahoo Mail
```env
IMAP3_HOST=imap.mail.yahoo.com
IMAP3_PORT=993
IMAP3_TLS=true
```

### Custom Domains
```env
IMAP4_HOST=imap.yourdomain.com
IMAP4_PORT=993
IMAP4_TLS=true
```

## Security

- Use app-specific passwords for Gmail and other providers that support them
- Store credentials securely in environment variables
- Never commit `.env` files to version control
- Consider using encrypted credential storage for production deployments

## Development

### Project Structure
```
src/
├── index.ts                 # Application entry point
├── services/
│   └── IMAPSyncManager.ts   # Main IMAP service
├── types/
│   └── index.ts            # TypeScript type definitions
└── utils/
    └── logger.ts           # Logging configuration
```

### Extending Functionality

The email processing pipeline can be extended for:
- Database storage
- Elasticsearch indexing
- AI-based categorization
- Webhook notifications
- Custom filtering and routing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
