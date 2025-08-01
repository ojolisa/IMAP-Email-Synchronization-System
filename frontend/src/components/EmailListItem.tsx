import { Card, CardContent, Typography, Chip, Stack, Box } from '@mui/material';
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
        (email.body.length > 100 ? email.body.substring(0, 100) + '...' : email.body) 
        : 'No message content';

    return (
        <Card 
            sx={{ 
                mb: 1, 
                cursor: 'pointer',
                '&:hover': {
                    backgroundColor: 'action.hover'
                }
            }}
            onClick={() => onClick(email)}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {email.subject}
                    </Typography>
                    {displayCategory && (
                        <Chip 
                            label={displayCategory} 
                            size="small" 
                            color={getCategoryColor(displayCategory)}
                            sx={{ ml: 1 }}
                        />
                    )}
                </Box>
                
                <Typography color="text.secondary" variant="body2">
                    From: {email.from}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                    {new Date(email.date).toLocaleString()}
                </Typography>
                
                <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                        mt: 1, 
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        '-webkit-line-clamp': 2,
                        '-webkit-box-orient': 'vertical'
                    }}
                >
                    {bodyPreview}
                </Typography>

                {email.flags && email.flags.length > 0 && (
                    <Stack direction="row" spacing={1} mt={1}>
                        {email.flags.slice(0, 3).map((flag, index) => (
                            <Chip key={index} label={flag} size="small" variant="outlined" />
                        ))}
                        {email.flags.length > 3 && (
                            <Chip label={`+${email.flags.length - 3} more`} size="small" variant="outlined" />
                        )}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};
