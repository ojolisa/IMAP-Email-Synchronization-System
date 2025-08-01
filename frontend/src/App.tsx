import { useState } from 'react';
import { Box, Container, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from 'react-query';
import { emailApi } from './services/api';
import { FolderList } from './components/FolderList';
import { EmailListItem } from './components/EmailListItem';
import { EmailDetailView } from './components/EmailDetailView';
import { SearchBar } from './components/SearchBar';
import type { Email, EmailSearchParams, EmailCategory } from './types/email';

function App() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
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
    setSelectedEmail(email);
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const { isError: foldersError } = useQuery(['folders', searchParams.account], () => emailApi.getFolders(searchParams.account));
  const { isError: accountsError } = useQuery('accounts', emailApi.getAccounts);
  const { isError: categoriesError } = useQuery('categories', emailApi.getCategories);
  const { isError: emailsError } = useQuery(['emails', searchParams], () => emailApi.search(searchParams));

  const hasError = foldersError || accountsError || categoriesError || emailsError;
  
  if (hasError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert key="error-alert" severity="error" sx={{ mb: 2 }}>
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
        categories={categories || [] as EmailCategory[]}
        searchParams={searchParams}
        onSearchChange={setSearchParams}
      />

      <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)' }}>
        <Box sx={{ width: '25%' }}>
          <FolderList
            folders={folders || []}
            selectedFolder={selectedFolder}
            onFolderSelect={(folder) => {
              setSelectedFolder(folder);
              setSearchParams(prev => ({ ...prev, folder }));
              setSelectedEmail(null); // Clear selected email when changing folders
            }}
          />
        </Box>
        <Box sx={{ width: '75%', height: '100%' }}>
          {selectedEmail ? (
            <EmailDetailView 
              email={selectedEmail} 
              onBack={handleBackToList}
            />
          ) : (
            <>
              {emailsLoading ? (
                <CircularProgress />
              ) : (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                  {emails && emails.length > 0 ? (
                    emails.map((email) => (
                      <EmailListItem
                        key={email.messageId || email.uid}
                        email={email}
                        onClick={handleEmailClick}
                      />
                    ))
                  ) : (
                    <Typography key="no-emails-message">No emails found</Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default App;
