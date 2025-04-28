import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { IntegrationForm } from './integration-form';
import { HubspotSuccess } from './integrations/hubspot-success';

// Success page wrapper that can navigate
const SuccessPageWrapper = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/');
  };
  
  return <HubspotSuccess onClose={handleClose} />;
};

function App() {
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    // Check if this is a success callback from HubSpot OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('hubspot_success');
    
    if (isSuccess === 'true') {
      setShowSuccess(true);
      
      // Clear the URL parameter after 5 seconds
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowSuccess(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    
    // Check if we're on the success page path
    if (window.location.pathname === '/hubspot-success') {
      setShowSuccess(true);
    }
  }, []);
  
  return (
    <Router>
      <Routes>
        <Route path="/hubspot-success" element={<SuccessPageWrapper />} />
        <Route path="/" element={
          showSuccess ? (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
              <HubspotSuccess onClose={() => setShowSuccess(false)} />
            </div>
          ) : (
            <IntegrationForm />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
