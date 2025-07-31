import { TextField, Box, Autocomplete } from '@mui/material';
import type { EmailSearchParams, EmailAccount, EmailCategory } from '../types/email';

interface SearchBarProps {
    accounts: EmailAccount[];
    categories: EmailCategory[];
    searchParams: EmailSearchParams;
    onSearchChange: (params: EmailSearchParams) => void;
}

export const SearchBar = ({ accounts, categories, searchParams, onSearchChange }: SearchBarProps) => {
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
                fullWidth
                label="Search emails"
                value={searchParams.query}
                onChange={(e) => onSearchChange({ ...searchParams, query: e.target.value })}
            />
            <Autocomplete
                style={{ width: 200 }}
                options={accounts}
                getOptionLabel={(option) => option.email}
                value={accounts.find(acc => acc.id === searchParams.account) || null}
                onChange={(_, newValue) => 
                    onSearchChange({ ...searchParams, account: newValue?.id })
                }
                renderInput={(params) => <TextField {...params} label="Account" />}
            />
            <Autocomplete
                multiple
                style={{ width: 300 }}
                options={categories}
                value={searchParams.categories || []}
                onChange={(_, newValue) => 
                    onSearchChange({ ...searchParams, categories: newValue })
                }
                renderInput={(params) => <TextField {...params} label="Categories" />}
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
