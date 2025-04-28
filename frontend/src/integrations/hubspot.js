import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import axios from 'axios';

export const HubspotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [itemType, setItemType] = useState('contact');

    // Function to open OAuth in a new window
    const handleConnectClick = async () => {
        try {
            setIsConnecting(true);
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            formData.append('item_type', itemType);
            
            console.log(`Connecting to HubSpot with item_type: ${itemType}`);
            
            const response = await axios.post(`http://localhost:8000/integrations/hubspot/authorize`, formData);
            console.log('Authorization response:', response.data);
            const authURL = response?.data?.authorization_url;

            // Add event listener for message from popup window
            const messageHandler = (event) => {
                // Check if the message is from our popup
                if (event.data && event.data.type === 'HUBSPOT_AUTH_SUCCESS') {
                    console.log('Received success message from popup window');
                    // Remove the event listener
                    window.removeEventListener('message', messageHandler);
                    // Handle the OAuth window closing
                    handleWindowClosed();
                }
            };
            
            // Add the event listener
            window.addEventListener('message', messageHandler);

            // Open the OAuth window with specific features
            const newWindow = window.open(
                authURL, 
                'HubSpot Authorization', 
                'width=600,height=700,left=200,top=100'
            );

            // Polling for the window to close
            const pollTimer = window.setInterval(() => {
                if (newWindow?.closed !== false) { 
                    window.clearInterval(pollTimer);
                    // Remove the event listener when the window is closed
                    window.removeEventListener('message', messageHandler);
                    handleWindowClosed();
                }
            }, 200);
        } catch (e) {
            setIsConnecting(false);
            console.error("HubSpot connection error:", e);
            alert(e?.response?.data?.detail || "Error connecting to HubSpot");
        }
    }

    // Function to handle logic when the OAuth window closes
    const handleWindowClosed = async () => {
        try {
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            formData.append('item_type', itemType);
            
            console.log(`Getting HubSpot credentials with item_type: ${itemType}`);
            
            const response = await axios.post(`http://localhost:8000/integrations/hubspot/credentials`, formData);
            console.log('Credentials response:', response.data);
            const credentials = response.data; 
            if (credentials) {
                setIsConnecting(false);
                setIsConnected(true);
                
                // Set integration parameters with explicit item_type
                const updatedParams = { 
                    ...integrationParams,
                    credentials: { 
                        user_id: user, 
                        org_id: org,
                        item_type: itemType
                    },
                    type: 'Hubspot',
                    itemType: itemType
                };
                
                console.log('Setting integration params:', updatedParams);
                setIntegrationParams(updatedParams);
            }
            setIsConnecting(false);
        } catch (e) {
            setIsConnecting(false);
            console.error("HubSpot credentials error:", e);
            alert(e?.response?.data?.detail || "Error getting HubSpot credentials");
        }
    }

    // Handle item type change
    const handleItemTypeChange = (event) => {
        const newItemType = event.target.value;
        setItemType(newItemType);
        console.log(`Item type changed to: ${newItemType}`);
        
        if (isConnected) {
            console.log(`Updating integration params with new item type: ${newItemType}`);
            setIntegrationParams(prev => {
                const updatedParams = {
                    ...prev,
                    itemType: newItemType,
                    credentials: {
                        ...prev.credentials,
                        item_type: newItemType
                    }
                };
                console.log('Updated integration params:', updatedParams);
                return updatedParams;
            });
        }
    };

    useEffect(() => {
        setIsConnected(integrationParams?.credentials ? true : false);
        if (integrationParams?.itemType) {
            setItemType(integrationParams.itemType);
        }
    }, [integrationParams]);

    return (
        <>
        <Box sx={{mt: 2, width: '100%'}}>
            <Typography variant="h6" gutterBottom>
                HubSpot Integration
            </Typography>
            
            <Box sx={{mt: 2, mb: 2}}>
                <FormControl fullWidth>
                    <InputLabel id="hubspot-item-type-label">Item Type</InputLabel>
                    <Select
                        labelId="hubspot-item-type-label"
                        id="hubspot-item-type"
                        value={itemType}
                        label="Item Type"
                        onChange={handleItemTypeChange}
                    >
                        <MenuItem value="contact">Contacts</MenuItem>
                        <MenuItem value="company">Companies</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            
            <Box display='flex' alignItems='center' justifyContent='center' sx={{mt: 2}}>
                <Button 
                    variant='contained' 
                    onClick={isConnected ? () => {} : handleConnectClick}
                    color={isConnected ? 'success' : 'primary'}
                    disabled={isConnecting}
                    style={{
                        pointerEvents: isConnected ? 'none' : 'auto',
                        cursor: isConnected ? 'default' : 'pointer',
                        opacity: isConnected ? 1 : undefined
                    }}
                >
                    {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
                </Button>
            </Box>
        </Box>
      </>
    );
} 