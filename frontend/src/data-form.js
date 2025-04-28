import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Paper,
    Typography,
    Divider,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Avatar,
    Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import axios from 'axios';

const endpointMapping = {
    'Notion': 'notion',
    'Airtable': 'airtable',
    'Hubspot': 'hubspot',
};

export const DataForm = ({ integrationType, credentials }) => {
    const [loadedData, setLoadedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const endpoint = endpointMapping[integrationType];

    const handleLoad = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            
            // For HubSpot, ensure item_type is properly set
            if (integrationType === 'Hubspot') {
                // Get the item type from credentials
                const itemType = credentials.item_type || 'contact';
                
                // Add item_type as a direct parameter
                formData.append('item_type', itemType);
                
                console.log(`Loading ${itemType} data from HubSpot`);
                console.log('Credentials:', credentials);
                
                // Add credentials to the request
                formData.append('credentials', JSON.stringify(credentials));
            } else {
                // For other integrations, just pass credentials as is
                formData.append('credentials', JSON.stringify(credentials));
            }
            
            console.log('Request payload:', {
                endpoint: `http://localhost:8000/integrations/${endpoint}/load`,
                credentials: credentials,
                item_type: credentials.item_type
            });
            
            const response = await axios.post(`http://localhost:8000/integrations/${endpoint}/load`, formData);
            let data = response.data;
            
            console.log('Response data:', data);
            
            // For HubSpot company data, add some debug logging
            if (integrationType === 'Hubspot' && credentials.item_type === 'company') {
                console.log('Company data received:', data);
                if (data.items) {
                    console.log('Number of items:', data.items.length);
                    console.log('Item types:', data.items.map(item => item.type));
                }
            }
            
            setLoadedData(data);
            setLoading(false);
        } catch (e) {
            alert(e?.response?.data?.detail || "Error loading data");
            console.error("Data loading error:", e);
            setLoading(false);
        }
    }

    const renderItem = (item) => {
        if (item.type === 'contact') {
            return (
                <Card key={item.id} sx={{ mb: 2, width: '100%' }}>
                    <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                <PersonIcon />
                            </Avatar>
                            <Typography variant="h6">{item.name || 'Unnamed Contact'}</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <List dense>
                            {item.email && (
                                <ListItem>
                                    <ListItemIcon>
                                        <EmailIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText primary={item.email} secondary="Email" />
                                </ListItem>
                            )}
                            {item.phone && (
                                <ListItem>
                                    <ListItemIcon>
                                        <PhoneIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText primary={item.phone} secondary="Phone" />
                                </ListItem>
                            )}
                        </List>
                        <Chip 
                            label="Contact" 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            sx={{ mt: 1 }} 
                        />
                    </CardContent>
                </Card>
            );
        } else if (item.type === 'company') {
            return (
                <Card key={item.id} sx={{ mb: 2, width: '100%' }}>
                    <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                            <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                                <BusinessIcon />
                            </Avatar>
                            <Typography variant="h6">{item.name || 'Unnamed Company'}</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        {item.domain && (
                            <ListItem>
                                <ListItemIcon>
                                    <LanguageIcon color="secondary" />
                                </ListItemIcon>
                                <ListItemText primary={item.domain} secondary="Domain" />
                            </ListItem>
                        )}
                        <Chip 
                            label="Company" 
                            size="small" 
                            color="secondary" 
                            variant="outlined" 
                            sx={{ mt: 1 }} 
                        />
                    </CardContent>
                </Card>
            );
        } else {
            return (
                <Card key={item.id || Math.random()} sx={{ mb: 2, width: '100%' }}>
                    <CardContent>
                        <Typography variant="body1">
                            {JSON.stringify(item, null, 2)}
                        </Typography>
                    </CardContent>
                </Card>
            );
        }
    };

    return (
        <Box display='flex' justifyContent='center' alignItems='center' flexDirection='column' width='100%'>
            <Box display='flex' flexDirection='column' width='100%' alignItems='center'>
                <Box sx={{ width: '100%', maxWidth: 600, mt: 2 }}>
                    <Button
                        onClick={handleLoad}
                        sx={{ mb: 2 }}
                        variant='contained'
                        fullWidth
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Load Data'}
                    </Button>
                    
                    {loadedData && (
                        <>
                            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    {integrationType} Data
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                
                                {loadedData.error ? (
                                    <Typography color="error">
                                        Error: {loadedData.error}
                                    </Typography>
                                ) : loadedData.items && loadedData.items.length > 0 ? (
                                    <>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Found {loadedData.items.length} items
                                        </Typography>
                                        {loadedData.items.map(item => renderItem(item))}
                                    </>
                                ) : (
                                    <Typography>No data found</Typography>
                                )}
                            </Paper>
                            
                            <Button
                                onClick={() => setLoadedData(null)}
                                variant='outlined'
                                fullWidth
                            >
                                Clear Data
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
