import { Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import type { Email } from '../types/email';

interface EmailListItemProps {
    email: Email;
    onClick: (email: Email) => void;
}

export const EmailListItem = ({ email, onClick }: EmailListItemProps) => {
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
                <Typography variant="h6" component="div">
                    {email.subject}
                </Typography>
                <Typography color="text.secondary">
                    From: {email.from}
                </Typography>
                <Typography color="text.secondary">
                    {new Date(email.date).toLocaleString()}
                </Typography>
                <Stack direction="row" spacing={1} mt={1}>
                    {email.categories?.map((category) => (
                        <Chip key={category} label={category} size="small" />
                    )) || []}
                </Stack>
            </CardContent>
        </Card>
    );
};
