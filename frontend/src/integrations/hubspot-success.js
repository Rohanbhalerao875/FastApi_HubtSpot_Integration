// hubspot-success.js

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { styled } from '@mui/material/styles';

// Styled components for a more attractive UI
const SuccessContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(45deg, #f3f4f6 30%, #ffffff 90%)',
}));

const SuccessCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 500,
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-5px)',
    },
}));

const SuccessIcon = styled(CheckCircleOutlineIcon)(({ theme }) => ({
    fontSize: 100,
    color: '#16A34A', // Bright green color
    marginBottom: theme.spacing(2),
}));

export const HubspotSuccess = ({ onClose }) => {
    const [message] = useState('HubSpot integration successful!');
    const [countdown, setCountdown] = useState(5);
    const [loading, setLoading] = useState(false);
    
    // Determine if we're in a popup window
    const isPopup = useEffect(() => {
        // Log to confirm this component is being rendered
        console.log('HubspotSuccess component mounted');
        
        // Check if this is a popup window
        const isPopup = window.opener && window.opener !== window;
        console.log('Is popup window:', isPopup);
        
        // Auto-close the window after 5 seconds
        const autoCloseTimer = setTimeout(() => {
            console.log('Auto-closing window now');
            if (isPopup) {
                // If we're in a popup, close this window
                window.close();
            } else if (typeof onClose === 'function') {
                // If we're in the main app, call the onClose function
                onClose();
            }
        }, 5000);
        
        // If this is a popup window, try to notify the opener that we're done
        if (isPopup && window.opener) {
            try {
                // Try to notify the opener window that the OAuth flow is complete
                window.opener.postMessage({ type: 'HUBSPOT_AUTH_SUCCESS' }, '*');
            } catch (error) {
                console.error('Error posting message to opener:', error);
            }
        }
        
        return () => clearTimeout(autoCloseTimer);
    }, [onClose]);
    
    // Auto-close window countdown
    useEffect(() => {
        if (countdown > 0) {
            console.log(`Countdown: ${countdown}`);
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            console.log('Countdown reached zero, closing window');
            const isPopup = window.opener && window.opener !== window;
            if (isPopup) {
                window.close();
            } else if (typeof onClose === 'function') {
                onClose();
            }
        }
    }, [countdown, onClose]);
    
    // Handle manual close
    const handleClose = () => {
        console.log('Manual close button clicked');
        const isPopup = window.opener && window.opener !== window;
        if (isPopup) {
            window.close();
        } else if (typeof onClose === 'function') {
            onClose();
        }
    };
    
    return (
        <SuccessContainer>
            <SuccessCard>
                {loading ? (
                    <CircularProgress size={60} sx={{ mb: 2 }} />
                ) : (
                    <>
                        <SuccessIcon />
                        <Typography 
                            variant="h4" 
                            component="h1" 
                            gutterBottom
                            sx={{ 
                                fontWeight: 'bold',
                                background: 'linear-gradient(45deg, #16A34A 30%, #22C55E 90%)',
                                backgroundClip: 'text',
                                textFillColor: 'transparent',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Success!
                        </Typography>
                        <Typography 
                            variant="body1" 
                            align="center"
                            sx={{ fontSize: '1.1rem', mb: 3 }}
                        >
                            {message}
                        </Typography>
                        <Typography 
                            variant="body2" 
                            align="center" 
                            sx={{ 
                                mt: 2,
                                color: 'text.secondary',
                                fontWeight: 'medium',
                            }}
                        >
                            This window will automatically close in {countdown} seconds.
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="success" 
                            onClick={handleClose}
                            sx={{ 
                                mt: 3,
                                borderRadius: 28,
                                px: 4,
                                py: 1,
                                fontWeight: 'bold',
                                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)',
                                '&:hover': {
                                    boxShadow: '0 6px 14px rgba(22, 163, 74, 0.4)',
                                }
                            }}
                        >
                            Close Now
                        </Button>
                    </>
                )}
            </SuccessCard>
        </SuccessContainer>
    );
};

export default HubspotSuccess; 