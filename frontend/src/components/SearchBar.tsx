import { TextField, Box, Autocomplete, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import type { EmailSearchParams, EmailAccount, EmailCategory } from '../types/email';

interface SearchBarProps {
    accounts: EmailAccount[];
    categories: EmailCategory[];
    searchParams: EmailSearchParams;
    onSearchChange: (params: EmailSearchParams) => void;
}

export const SearchBar = ({ accounts, categories, searchParams, onSearchChange }: SearchBarProps) => {
    return (
        <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'stretch'
        }}>
            <TextField
                fullWidth
                placeholder="Search your emails..."
                value={searchParams.query}
                onChange={(e) => onSearchChange({ ...searchParams, query: e.target.value })}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" />
                        </InputAdornment>
                    ),
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'background.paper'
                    }
                }}
            />
            <Autocomplete
                sx={{ 
                    minWidth: { xs: '100%', md: 220 },
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'background.paper'
                    }
                }}
                options={accounts}
                getOptionLabel={(option) => option.email}
                value={accounts.find(acc => acc.id === searchParams.account) || null}
                onChange={(_, newValue) => 
                    onSearchChange({ ...searchParams, account: newValue?.id })
                }
                renderInput={(params) => <TextField {...params} placeholder="Select account" />}
            />
            <Autocomplete
                multiple
                sx={{ 
                    minWidth: { xs: '100%', md: 300 },
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'background.paper'
                    }
                }}
                options={categories}
                value={searchParams.categories || []}
                onChange={(_, newValue) => 
                    onSearchChange({ ...searchParams, categories: newValue })
                }
                renderInput={(params) => <TextField {...params} placeholder="Filter by categories" />}
                renderOption={(props, option) => (
                    <li {...props} key={option}>
                        {option.split('_').map(word => 
                            word.charAt(0) + word.slice(1).toLowerCase()
                        ).join(' ')}
                    </li>
                )}
            />
        </Box>
    );
};
