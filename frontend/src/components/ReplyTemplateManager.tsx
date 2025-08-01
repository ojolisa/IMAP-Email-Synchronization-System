import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Alert,
    Card,
    CardContent,
    CardActions,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import type { ReplyTemplate } from '../types/email';
import { emailApi } from '../services/api';

export const ReplyTemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);

    const [formData, setFormData] = useState({
        context: '',
        template: '',
        category: '',
        metadata: {}
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const templatesData = await emailApi.getReplyTemplates();
            setTemplates(templatesData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const saveTemplate = async () => {
        setLoading(true);
        try {
            if (editingTemplate) {
                await emailApi.updateReplyTemplate(editingTemplate.id, formData);
            } else {
                await emailApi.addReplyTemplate(formData);
            }

            await loadTemplates();
            closeDialog();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const deleteTemplate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        setLoading(true);
        try {
            await emailApi.deleteReplyTemplate(id);
            await loadTemplates();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (template: ReplyTemplate) => {
        setEditingTemplate(template);
        setFormData({
            context: template.context,
            template: template.template,
            category: template.category,
            metadata: template.metadata || {}
        });
        setShowAddDialog(true);
    };

    const closeDialog = () => {
        setEditingTemplate(null);
        setShowAddDialog(false);
        setFormData({
            context: '',
            template: '',
            category: '',
            metadata: {}
        });
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                    Reply Template Manager
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => setShowAddDialog(true)}
                >
                    Add New Template
                </Button>
            </Box>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Templates List */}
            {loading && templates.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ display: 'grid', gap: 2 }}>
                    {templates.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No templates found. Add your first template to get started.
                            </Typography>
                        </Paper>
                    ) : (
                        templates.map((template) => (
                            <Card key={template.id} variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {template.category}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        <strong>Context:</strong> {template.context}
                                    </Typography>
                                    <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2, 
                                            backgroundColor: 'grey.50',
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {template.template}
                                        </Typography>
                                    </Paper>
                                    {template.metadata && Object.keys(template.metadata).length > 0 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            <strong>Metadata:</strong> {JSON.stringify(template.metadata)}
                                        </Typography>
                                    )}
                                </CardContent>
                                <CardActions>
                                    <Button size="small" onClick={() => startEdit(template)}>
                                        Edit
                                    </Button>
                                    <Button 
                                        size="small" 
                                        color="error"
                                        onClick={() => deleteTemplate(template.id)}
                                    >
                                        Delete
                                    </Button>
                                </CardActions>
                            </Card>
                        ))
                    )}
                </Box>
            )}

            {/* Add/Edit Dialog */}
            <Dialog 
                open={showAddDialog} 
                onClose={closeDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {editingTemplate ? 'Edit Template' : 'Add New Template'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="e.g., interview_invitation, general_interest"
                            fullWidth
                        />

                        <TextField
                            label="Context"
                            value={formData.context}
                            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                            placeholder="Describe when this template should be used..."
                            multiline
                            rows={3}
                            fullWidth
                        />

                        <TextField
                            label="Template"
                            value={formData.template}
                            onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                            placeholder="Enter the reply template text..."
                            multiline
                            rows={4}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={saveTemplate}
                        variant="contained"
                        disabled={loading || !formData.context || !formData.template || !formData.category}
                    >
                        {loading ? 'Saving...' : (editingTemplate ? 'Update' : 'Add')} Template
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
