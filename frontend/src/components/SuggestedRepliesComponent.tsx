import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Alert,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import type { SuggestedReply, ReplyGenerationOptions } from '../types/email';
import { emailApi } from '../services/api';

interface SuggestedRepliesProps {
    emailId: string;
    onReplySelect: (reply: SuggestedReply) => void;
}

export const SuggestedRepliesComponent: React.FC<SuggestedRepliesProps> = ({
    emailId,
    onReplySelect
}) => {
    const [suggestedReply, setSuggestedReply] = useState<SuggestedReply | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [options] = useState<ReplyGenerationOptions>({
        personalizeToSender: true,
        includeOriginalEmail: false
    });

    const generateReply = async () => {
        setLoading(true);
        setError(null);

        try {
            const replies = await emailApi.generateSuggestedReplies(emailId, options);
            if (replies && replies.length > 0) {
                setSuggestedReply(replies[0]);
            } else {
                setError('No reply could be generated');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const testWithSampleData = async () => {
        setLoading(true);
        setError(null);

        try {
            const replies = await emailApi.testSuggestedReplies();
            if (replies && replies.length > 0) {
                setSuggestedReply(replies[0]);
            } else {
                setError('No reply could be generated');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                🤖 AI-Powered Suggested Reply
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Generate an intelligent reply suggestion based on this email content using AI and your reply templates.
            </Typography>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                    variant="contained"
                    onClick={generateReply}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    {loading ? 'Generating...' : 'Generate Reply'}
                </Button>
                
                <Button
                    variant="outlined"
                    color="success"
                    onClick={testWithSampleData}
                    disabled={loading}
                >
                    Test with Sample
                </Button>
            </Box>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Suggested Reply */}
            {suggestedReply && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Generated Reply
                    </Typography>
                    
                    <Card
                        variant="outlined"
                        sx={{ 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                boxShadow: 3,
                                borderColor: 'primary.main'
                            }
                        }}
                        onClick={() => onReplySelect(suggestedReply)}
                    >
                        <CardContent>
                            <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                                Suggested Reply
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                <strong>Subject:</strong> {suggestedReply.subject}
                            </Typography>
                            
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    p: 2, 
                                    mb: 2,
                                    backgroundColor: 'grey.50',
                                    maxHeight: 200,
                                    overflow: 'auto'
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {suggestedReply.body}
                                </Typography>
                            </Paper>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Typography variant="caption" color="primary" sx={{ fontWeight: 'medium' }}>
                                    Click to use this reply
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* Empty State */}
            {!loading && !suggestedReply && !error && (
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 4, 
                        textAlign: 'center',
                        backgroundColor: 'grey.50'
                    }}
                >
                    <Typography color="text.secondary">
                        Click "Generate Reply" to get an AI-powered email reply suggestion
                    </Typography>
                </Paper>
            )}
        </Paper>
    );
};
