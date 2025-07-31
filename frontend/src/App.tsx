import { useState } from 'react';
import { Box, Container, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from 'react-query';
import { emailApi } from './services/api';
import { FolderList } from './components/FolderList';
import { EmailListItem } from './components/EmailListItem';
import { SearchBar } from './components/SearchBar';
import type { Email, EmailSearchParams } from './types/email';

function App() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<EmailSearchParams>({
    query: '',
    folder: undefined,
    account: undefined,
    categories: []
  });

  const { data: folders, isLoading: foldersLoading } = useQuery(
    ['folders', searchParams.account],
    () => emailApi.getFolders(searchParams.account)
  );

  const { data: accounts, isLoading: accountsLoading } = useQuery(
    'accounts',
    emailApi.getAccounts
  );

  const { data: categories, isLoading: categoriesLoading } = useQuery(
    'categories',
    emailApi.getCategories
  );

  const { data: emails, isLoading: emailsLoading } = useQuery(
    ['emails', searchParams],
    () => emailApi.search(searchParams)
  );

  const handleEmailClick = (email: Email) => {
    // TODO: Implement email detail view
    console.log('Email clicked:', email);
  };

  const { isError: foldersError } = useQuery(['folders', searchParams.account], () => emailApi.getFolders(searchParams.account));
  const { isError: accountsError } = useQuery('accounts', emailApi.getAccounts);
  const { isError: categoriesError } = useQuery('categories', emailApi.getCategories);
  const { isError: emailsError } = useQuery(['emails', searchParams], () => emailApi.search(searchParams));

  const hasError = foldersError || accountsError || categoriesError || emailsError;
  
  if (hasError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error connecting to the backend server. Please make sure the API server is running at http://localhost:3000
        </Alert>
      </Container>
    );
  }

  if (foldersLoading || accountsLoading || categoriesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Email Client
      </Typography>
      
      <SearchBar
        accounts={accounts || []}
        categories={categories || []}
        searchParams={searchParams}
        onSearchChange={setSearchParams}
      />

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ width: '25%' }}>
          <FolderList
            folders={folders || []}
            selectedFolder={selectedFolder}
            onFolderSelect={(folder) => {
              setSelectedFolder(folder);
              setSearchParams(prev => ({ ...prev, folder }));
            }}
          />
        </Box>
        <Box sx={{ width: '75%' }}>
          {emailsLoading ? (
            <CircularProgress />
          ) : (
            <Box>
              {emails?.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  onClick={handleEmailClick}
                />
              ))}
              {emails?.length === 0 && (
                <Typography>No emails found</Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default App;
