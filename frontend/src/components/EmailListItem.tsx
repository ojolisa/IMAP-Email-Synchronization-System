import { Card, CardContent, Typography, Chip, Stack, Box, Avatar } from '@mui/material';
import type { Email, EmailCategory } from '../types/email';

interface EmailListItemProps {
    email: Email;
    onClick: (email: Email) => void;
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

export const EmailListItem = ({ email, onClick }: EmailListItemProps) => {
    const displayCategory = email.category?.category || (email.categories && email.categories[0]);
    const bodyPreview = email.body ? 
        (email.body.length > 150 ? email.body.substring(0, 150) + '...' : email.body) 
        : 'No message content';

    // Extract first name/initials from sender
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const senderName = email.from.includes('<') ? 
        email.from.split('<')[0].trim() : 
        email.from.split('@')[0];

    return (
        <Card 
            sx={{ 
                mb: 0,
                width: '100%',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    backgroundColor: '#f8fafc',
                    borderColor: 'primary.light',
                    transform: 'translateY(-1px)',
                    boxShadow: 2
                },
                '&:first-of-type': {
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2
                },
                '&:last-of-type': {
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2
                }
            }}
            elevation={0}
            onClick={() => onClick(email)}
        >
            <CardContent sx={{ py: 2, px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar 
                        sx={{ 
                            width: 48, 
                            height: 48, 
                            bgcolor: 'primary.main',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        {getInitials(senderName)}
                    </Avatar>
                    
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start', 
                            mb: 0.5 
                        }}>
                            <Typography 
                                variant="subtitle1" 
                                component="div" 
                                sx={{ 
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flexGrow: 1,
                                    mr: 1
                                }}
                            >
                                {email.subject || '(No Subject)'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                {displayCategory && (
                                    <Chip 
                                        label={displayCategory.replace('_', ' ')} 
                                        size="small" 
                                        color={getCategoryColor(displayCategory)}
                                        sx={{ 
                                            height: 24,
                                            fontSize: '0.75rem',
                                            fontWeight: 500
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography 
                                color="text.primary" 
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                            >
                                {senderName}
                            </Typography>
                            <Typography color="text.secondary" variant="caption">
                                • {new Date(email.date).toLocaleDateString()} at {new Date(email.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Typography>
                        </Box>
                        
                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                '-webkit-line-clamp': 2,
                                '-webkit-box-orient': 'vertical',
                                lineHeight: 1.4
                            }}
                        >
                            {bodyPreview}
                        </Typography>

                        {email.flags && email.flags.length > 0 && (
                            <Stack direction="row" spacing={1} mt={1.5}>
                                {email.flags.slice(0, 3).map((flag, index) => (
                                    <Chip 
                                        key={index} 
                                        label={flag} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ 
                                            height: 20,
                                            fontSize: '0.7rem',
                                            '& .MuiChip-label': { px: 1 }
                                        }}
                                    />
                                ))}
                                {email.flags.length > 3 && (
                                    <Chip 
                                        label={`+${email.flags.length - 3} more`} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ 
                                            height: 20,
                                            fontSize: '0.7rem',
                                            '& .MuiChip-label': { px: 1 }
                                        }}
                                    />
                                )}
                            </Stack>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};
