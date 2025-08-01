# IMAP Email Synchronization System

A sophisticated real-time IMAP email synchronization system with AI-powered features, built with TypeScript, Express.js, React, and Elasticsearch.

## 🚀 Features

### Core Features
- **Real-time IMAP Synchronization**: Persistent connections with IDLE mode for instant email updates
- **Multi-account Support**: Configure and manage multiple IMAP accounts simultaneously
- **Email Search**: Powerful Elasticsearch-powered email search with advanced queries
- **Email Categorization**: AI-powered automatic email categorization using Google Gemini
- **Suggested Replies**: AI-generated contextual email replies with template matching
- **Modern Web Interface**: React-based frontend with Material-UI components
- **Real-time Updates**: WebSocket connections for live email notifications

### Technical Features
- **Elasticsearch Integration**: Full-text search and email indexing
- **Vector Similarity Search**: Smart reply template matching using vector embeddings
- **Notification System**: Configurable webhooks for external integrations
- **Persistent State**: Tracks processed emails to prevent duplicates
- **Error Handling**: Comprehensive logging and error recovery
- **Docker Support**: Containerized Elasticsearch and Kibana setup

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **IMAP Email Account(s)** with app passwords enabled
- **Google Gemini API Key** (for AI features)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd IMAP
npm install
cd frontend && npm install && cd ..
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# IMAP Account 1 (Primary Account)
IMAP1_HOST=imap.gmail.com
IMAP1_PORT=993
IMAP1_USER=your-email@gmail.com
IMAP1_PASSWORD=your-app-password
IMAP1_TLS=true
IMAP1_NAME=Gmail Account

# IMAP Account 2 (Work Account) - Optional
IMAP2_HOST=outlook.office365.com
IMAP2_PORT=993
IMAP2_USER=your-work-email@company.com
IMAP2_PASSWORD=your-password
IMAP2_TLS=true
IMAP2_NAME=Work Account

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=imap-emails

# Google Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key

# Webhook Configuration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook-url
EXTERNAL_WEBHOOK_URL=https://webhook.site/your-webhook-url

# API Configuration
API_PORT=3000

# Logging
LOG_LEVEL=info
```

### 3. Start the Application

The easiest way to run the complete system:

```bash
npm run dev:all
```

This command will:
- Start Elasticsearch and Kibana containers
- Launch the API server
- Start the React frontend development server

### Individual Component Startup

If you prefer to start components individually:

```bash
# Start Docker services (Elasticsearch & Kibana)
npm run docker:up

# Start API server
npm run api:dev

# Start frontend (in another terminal)
npm run frontend:dev
```

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   Express API   │    │ IMAP Email Sync │
│                 │    │                 │    │                 │
│ • Email List    │◄──►│ • REST Endpoints│◄──►│ • Multi-account │
│ • Search UI     │    │ • WebSocket     │    │ • Real-time     │
│ • Reply Mgmt    │    │ • Email Search  │    │ • Persistent    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │ Elasticsearch   │    │  Email Services │
         │              │                 │    │                 │
         └─────────────►│ • Email Index   │    │ • Categorization│
                        │ • Full-text     │    │ • AI Replies    │
                        │ • Search        │    │ • Notifications │
                        └─────────────────┘    └─────────────────┘
```

### Core Components

#### 1. IMAP Synchronization Service (`src/services/IMAPSyncManager.ts`)
- **Multi-account Management**: Dynamically loads IMAP accounts from environment variables
- **Real-time Sync**: Uses IMAP IDLE mode for instant email notifications
- **Smart Processing**: Tracks last processed UIDs to avoid duplicates
- **Connection Management**: Handles reconnections and connection pooling

#### 2. Email Search API (`src/services/EmailSearchAPI.ts`)
- **Elasticsearch Integration**: Full-text search across all emails
- **Advanced Queries**: Support for complex search filters
- **Pagination**: Efficient result pagination
- **Real-time Results**: Live search as you type

#### 3. AI Services
- **Email Categorization** (`src/services/EmailCategorizationService.ts`): Automatically categorizes emails using AI
- **Suggested Replies** (`src/services/AISuggestedRepliesService.ts`): Generates contextual email replies
- **Vector Store** (`src/services/ReplyVectorStore.ts`): Smart template matching using embeddings

#### 4. Web Interface (`frontend/`)
- **React + TypeScript**: Modern component-based architecture
- **Material-UI**: Professional, responsive design
- **Real-time Updates**: WebSocket integration for live notifications
- **Search Interface**: Advanced email search with filters

### Data Flow

1. **Email Ingestion**:
   ```
   IMAP Server → IMAPSyncManager → EmailCategorizationService → Elasticsearch
   ```

2. **Search & Retrieval**:
   ```
   Frontend → API Server → EmailSearchAPI → Elasticsearch → Results
   ```

3. **AI Reply Generation**:
   ```
   Email Content → ReplyVectorStore → Google Gemini → Suggested Replies
   ```

## 📁 Project Structure

```
IMAP/
├── src/                          # Backend source code
│   ├── api-server.ts            # Express API server
│   ├── index.ts                 # IMAP sync service entry
│   ├── services/                # Core business logic
│   │   ├── IMAPSyncManager.ts   # IMAP synchronization
│   │   ├── EmailSearchAPI.ts    # Search functionality
│   │   ├── AISuggestedRepliesService.ts # AI reply generation
│   │   ├── EmailCategorizationService.ts # Email categorization
│   │   ├── ElasticsearchService.ts # Elasticsearch operations
│   │   ├── ReplyVectorStore.ts  # Vector similarity search
│   │   └── NotificationService.ts # Webhook notifications
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   └── utils/                   # Utility functions
│       └── logger.ts            # Winston logger
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── EmailListItem.tsx
│   │   │   ├── EmailDetailView.tsx
│   │   │   ├── FolderList.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SuggestedRepliesComponent.tsx
│   │   │   └── ReplyTemplateManager.tsx
│   │   ├── services/
│   │   │   └── api.ts           # API client
│   │   └── types/
│   │       └── email.ts         # Frontend types
├── scripts/                     # Utility scripts
│   └── delete-index.ts         # Elasticsearch index management
├── logs/                        # Application logs
├── docker-compose.yml           # Docker services configuration
├── package.json                 # Project dependencies
└── .env                        # Environment configuration
```

## 🔧 Configuration

### IMAP Accounts

The system supports multiple IMAP accounts. Configure them using environment variables with the pattern `IMAP[N]_*`:

```env
# Account 1
IMAP1_HOST=imap.gmail.com
IMAP1_PORT=993
IMAP1_USER=user1@gmail.com
IMAP1_PASSWORD=app-password-1
IMAP1_TLS=true
IMAP1_NAME=Personal Gmail

# Account 2
IMAP2_HOST=outlook.office365.com
IMAP2_PORT=993
IMAP2_USER=user2@company.com
IMAP2_PASSWORD=app-password-2
IMAP2_TLS=true
IMAP2_NAME=Work Outlook
```

### Elasticsearch Configuration

```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=imap-emails
```

### AI Configuration

For AI-powered features, configure Google Gemini:

```env
GEMINI_API_KEY=your-google-gemini-api-key
```

## 📡 API Endpoints

### Email Operations
- `GET /api/emails` - Search emails with pagination
- `GET /api/emails/:messageId` - Get specific email
- `GET /api/folders` - List email folders
- `GET /api/accounts` - List configured accounts

### Search & Statistics
- `POST /api/search` - Advanced email search
- `GET /api/stats` - Email statistics
- `GET /api/health` - System health check

### AI Features
- `POST /api/suggest-replies/:messageId` - Generate reply suggestions
- `GET /api/reply-templates` - Manage reply templates
- `POST /api/reply-templates` - Create new template

### System Management
- `GET /api/accounts/status` - Account connection status
- `GET /api/elasticsearch/health` - Elasticsearch health

## 🤖 AI Features Implementation

### Email Categorization

The system automatically categorizes emails into predefined categories:
- `INTERESTED` - Potentially interested prospects
- `MEETING_BOOKED` - Meeting requests/confirmations
- `NOT_INTERESTED` - Declined prospects
- `SPAM` - Spam/unwanted emails
- `OUT_OF_OFFICE` - Auto-reply messages

### Suggested Replies

AI-powered reply suggestions using:
1. **Vector Similarity Search**: Finds similar email patterns
2. **Template Matching**: Matches against predefined reply templates
3. **Context Personalization**: Customizes replies based on sender and content
4. **Google Gemini Integration**: Generates natural language responses

## 🔍 Usage Examples

### Searching Emails

```bash
# Search for emails containing "meeting"
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting", "from": 0, "size": 10}'

# Search with filters
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "project update",
    "accountName": "Work Account",
    "folder": "INBOX",
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  }'
```

### Getting Reply Suggestions

```bash
# Get AI-generated reply suggestions
curl -X POST http://localhost:3000/api/suggest-replies/message-id-123 \
  -H "Content-Type: application/json" \
  -d '{
    "personalizeToSender": true,
    "includeOriginalEmail": false
  }'
```

## 🐳 Docker Services

The application uses Docker Compose for Elasticsearch and Kibana:

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    ports:
      - "9200:9200"
      - "9300:9300"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  kibana:
    image: docker.elastic.co/kibana/kibana:8.15.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

### Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Check Elasticsearch health
npm run elastic:health
```

## 📊 Monitoring & Logging

### Application Logs
- **Location**: `logs/combined.log` and `logs/error.log`
- **Format**: JSON structured logging with timestamps
- **Levels**: error, warn, info, debug

### Kibana Dashboard
Access Kibana at `http://localhost:5601` for:
- Email analytics and visualization
- Search performance monitoring
- System health dashboards

### Health Endpoints
- API Health: `GET /api/health`
- Elasticsearch: `GET /api/elasticsearch/health`
- Account Status: `GET /api/accounts/status`

## 🔧 Development

### Building the Project

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Development Workflow

```bash
# Start development with hot reload
npm run dev:all

# Run individual services
npm run api:dev     # API server only
npm run frontend:dev # Frontend only
```

### Debugging

1. **API Server**: Logs are written to console and log files
2. **Frontend**: Use browser dev tools and React DevTools
3. **Elasticsearch**: Monitor via Kibana or direct API calls

## 🚀 Deployment

### Production Build

```bash
# Build all components
npm run build
cd frontend && npm run build

# Start production services
npm run docker:up
npm start
```

### Environment Variables for Production

Ensure all required environment variables are set:
- IMAP account credentials
- Elasticsearch connection
- Google Gemini API key
- Webhook URLs (if using notifications)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **IMAP Connection Failed**
   - Verify email credentials and app passwords
   - Check firewall and network connectivity
   - Ensure IMAP is enabled on email provider

2. **Elasticsearch Connection Error**
   - Ensure Docker services are running: `npm run docker:up`
   - Check Elasticsearch health: `npm run elastic:health`
   - Verify port 9200 is not blocked

3. **AI Features Not Working**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API quota and billing status
   - Review error logs for specific AI service errors

4. **Frontend Not Loading**
   - Ensure API server is running on port 3000
   - Check browser console for errors
   - Verify CORS configuration

### Getting Help

- Check the logs in `logs/` directory
- Review Docker container logs: `npm run docker:logs`
- Monitor Elasticsearch via Kibana at `http://localhost:5601`
- Use the health endpoints to diagnose issues

## 🔮 Future Enhancements

- **Advanced Filters**: Date range, sender filters, attachment support
- **Email Composition**: Built-in email composer with AI assistance
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Email pattern analysis and insights
- **Plugin System**: Extensible architecture for custom integrations
- **Multi-language Support**: Internationalization for global use
