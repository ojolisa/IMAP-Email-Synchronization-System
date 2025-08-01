import { useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Card } from '@mui/material';
import { useQuery } from 'react-query';
import { emailApi } from './services/api';
import { EmailListItem } from './components/EmailListItem';
import { EmailDetailView } from './components/EmailDetailView';
import { SearchBar } from './components/SearchBar';
import type { Email, EmailSearchParams, EmailCategory } from './types/email';

function App() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchParams, setSearchParams] = useState<EmailSearchParams>({
    query: '',
    folder: undefined,
    account: undefined,
    categories: []
  });

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
    () => emailApi.search(searchParams),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchIntervalInBackground: false, // Only refetch when tab is active
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    }
  );

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const { isError: accountsError } = useQuery('accounts', emailApi.getAccounts);
  const { isError: categoriesError } = useQuery('categories', emailApi.getCategories);
  const { isError: emailsError } = useQuery(['emails', searchParams], () => emailApi.search(searchParams));

  const hasError = accountsError || categoriesError || emailsError;
  
  if (hasError) {
    return (
      <Box sx={{ maxWidth: '100%', margin: '0 auto', mt: 4, px: 3 }}>
        <Alert key="error-alert" severity="error" sx={{ mb: 2 }}>
          Error connecting to the backend server. Please make sure the API server is running at http://localhost:3000
        </Alert>
      </Box>
    );
  }

  if (accountsLoading || categoriesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100vw',
      bgcolor: '#f8fafc',
      py: 4,
      px: 3,
      margin: 0,
      boxSizing: 'border-box'
    }}>
      <Box sx={{ width: '100%', margin: '0 auto' }}>
        <Paper elevation={0} sx={{ 
          p: 4, 
          mb: 3, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          width: '100%'
        }}>
          <Typography variant="h3" component="h1" fontWeight="600" gutterBottom>
            OneBox
          </Typography>
          <Typography variant="h6" component="p" sx={{ opacity: 0.9 }}>
            Your unified email experience with AI-powered insights
          </Typography>
        </Paper>
        
        <Card elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, width: '100%' }}>
          <SearchBar
            accounts={accounts || []}
            categories={categories || [] as EmailCategory[]}
            searchParams={searchParams}
            onSearchChange={setSearchParams}
          />
        </Card>

        <Card elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', width: '100%' }}>
          {selectedEmail ? (
            <EmailDetailView 
              email={selectedEmail} 
              onBack={handleBackToList}
            />
          ) : (
            <Box sx={{ minHeight: '60vh', width: '100%' }}>
              {emailsLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 8 }}>
                  <CircularProgress size={48} />
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  {emails && emails.length > 0 ? (
                    emails.map((email) => (
                      <EmailListItem
                        key={email.messageId || email.uid}
                        email={email}
                        onClick={handleEmailClick}
                      />
                    ))
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      py: 8,
                      color: 'text.secondary'
                    }}>
                      <Typography variant="h6" gutterBottom>
                        No emails found
                      </Typography>
                      <Typography variant="body2">
                        Try adjusting your search criteria
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
}

export default App;
