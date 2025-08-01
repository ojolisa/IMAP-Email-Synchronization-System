import { 
    Box, 
    Typography, 
    Paper, 
    Chip, 
    Stack, 
    Divider, 
    IconButton,
    Alert,
    Tabs,
    Tab
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useState } from 'react';
import type { Email, EmailCategory, SuggestedReply } from '../types/email';
import { SuggestedRepliesComponent } from './SuggestedRepliesComponent';

interface EmailDetailViewProps {
    email: Email;
    onBack: () => void;
}

const getCategoryColor = (category: EmailCategory): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (category) {
        case 'INTERESTED':
            return 'success';
        case 'MEETING_BOOKED':
            return 'primary';
        case 'NOT_INTERESTED':
            return 'warning';
        case 'SPAM':
            return 'error';
        case 'OUT_OF_OFFICE':
            return 'info';
        default:
            return 'default';
    }
};

const getCategoryDescription = (category: EmailCategory): string => {
    switch (category) {
        case 'INTERESTED':
            return 'This email shows interest or positive engagement';
        case 'MEETING_BOOKED':
            return 'A meeting has been scheduled or confirmed';
        case 'NOT_INTERESTED':
            return 'The sender is not interested or declined';
        case 'SPAM':
            return 'This email appears to be spam or unwanted';
        case 'OUT_OF_OFFICE':
            return 'This is an out-of-office or automatic reply';
        default:
            return 'Unknown category';
    }
};

export const EmailDetailView = ({ email, onBack }: EmailDetailViewProps) => {
    const displayCategory = email.category?.category || (email.categories && email.categories[0]);
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleReplySelect = (reply: SuggestedReply) => {
        // In a real application, this would open a compose window or copy to clipboard
        console.log('Selected reply:', reply);
        navigator.clipboard.writeText(`Subject: ${reply.subject}\n\nBody:\n${reply.body}`);
        alert('Reply copied to clipboard!');
    };

    return (
        <Box sx={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column',
            p: 3
        }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={onBack} sx={{ mr: 1 }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Email Details
                </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="📧 Email Content" />
                    <Tab label="🤖 AI Suggested Replies" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            {tabValue === 0 && (
                <Paper sx={{ p: 3, flexGrow: 1, overflow: 'auto', width: '100%' }}>
                    {/* Email Content - existing content */}
                {/* Subject */}
                <Typography variant="h5" component="h1" gutterBottom>
                    {email.subject}
                </Typography>

                {/* From/To Info */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        <strong>From:</strong> {email.from}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>To:</strong> {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Date:</strong> {new Date(email.date).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Folder:</strong> {email.folder}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Account:</strong> {email.accountName || email.account}
                    </Typography>
                </Box>

                {/* Categorization */}
                {displayCategory && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Email Classification
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                            <Chip 
                                label={displayCategory} 
                                color={getCategoryColor(displayCategory)}
                                variant="filled"
                            />
                            {email.category?.confidence && (
                                <Typography variant="body2" color="text.secondary">
                                    Confidence: {Math.round(email.category.confidence * 100)}%
                                </Typography>
                            )}
                        </Stack>
                        <Alert severity="info" sx={{ mt: 1 }}>
                            {getCategoryDescription(displayCategory)}
                        </Alert>
                        {email.category?.categorizedAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Categorized on: {new Date(email.category.categorizedAt).toLocaleString()}
                            </Typography>
                        )}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Email Body */}
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Message
                    </Typography>
                    <Paper 
                        variant="outlined" 
                        sx={{ 
                            p: 2, 
                            backgroundColor: 'grey.50',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace'
                        }}
                    >
                        <Typography component="div">
                            {email.body || 'No message content available'}
                        </Typography>
                    </Paper>
                </Box>

                {/* Flags */}
                {email.flags && email.flags.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Flags
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            {email.flags.map((flag, index) => (
                                <Chip key={index} label={flag} size="small" variant="outlined" />
                            ))}
                        </Stack>
                    </Box>
                )}
                </Paper>
            )}

            {/* AI Suggested Replies Tab */}
            {tabValue === 1 && (
                <Box sx={{ flexGrow: 1, overflow: 'auto', width: '100%' }}>
                    <SuggestedRepliesComponent
                        emailId={email.messageId}
                        onReplySelect={handleReplySelect}
                    />
                </Box>
            )}
        </Box>
    );
};
