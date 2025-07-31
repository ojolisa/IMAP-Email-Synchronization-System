import { Box, List, ListItemButton, ListItemText } from '@mui/material';
import type { EmailFolder } from '../types/email';

interface FolderListProps {
    folders: EmailFolder[];
    selectedFolder: string | null;
    onFolderSelect: (folder: string) => void;
}

export const FolderList = ({ folders, selectedFolder, onFolderSelect }: FolderListProps) => {
    return (
        <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
            <List component="nav">
                {folders.map((folder) => (
                    <ListItemButton
                        key={folder.name}
                        selected={selectedFolder === folder.name}
                        onClick={() => onFolderSelect(folder.name)}
                    >
                        <ListItemText 
                            primary={folder.name}
                            secondary={`${folder.count} emails`}
                        />
                    </ListItemButton>
                ))}
            </List>
        </Box>
    );
};
