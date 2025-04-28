# hubspot.py

import json
import os
import secrets
import urllib.parse
import logging

from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
import aiohttp

from redis_client import add_key_value_redis, get_value_redis, delete_key_redis


HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize'
HUBSPOT_TOKEN_URL = "https://api.hubspot.com/oauth/v1/token"
HUBSPOT_API_BASE = "https://api.hubspot.com/crm/v3"

HUBSPOT_CLIENT_ID = "57e7fd41-a327-4a38-b58b-fbdde7940c8b"
HUBSPOT_CLIENT_SECRET = "7057ecb5-228c-4304-b867-f3f5756f8179"

HUBSPOT_REDIRECT_URI = "http://localhost:8000/integrations/hubspot/oauth2callback"
HUBSPOT_SCOPES = "crm.objects.contacts.read crm.objects.companies.read"

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)



async def authorize_hubspot(user_id:str, org_id:str, item_type:str="contact"):
    """
    Generate authorization url
    """
    state = f"hubspot:{user_id}:{org_id}:{item_type}"
    state_key = f"hubspot_state:{org_id}:{user_id}"
    #store state in redis
    logger.debug(f"Storing state '{state}' with key '{state_key}' in Redis")
    await add_key_value_redis(state_key, state, expire=600)

    #build authorization url
    params = {
        "client_id": HUBSPOT_CLIENT_ID,
        "redirect_uri": HUBSPOT_REDIRECT_URI,
        "scope": HUBSPOT_SCOPES,
        "state": state,
    }
    auth_url = f"{HUBSPOT_AUTH_URL}?{urllib.parse.urlencode(params)}"
    logger.debug(f"Generated HubSpot authorization URL: {auth_url}")
    return {"authorization_url": auth_url}


async def oauth2callback_hubspot(request: Request):
    """
    Handle oauth2 callback
    """
    params = dict(request.query_params)
    state = params.get("state")
    code = params.get("code")
    print(f"CALLBACK: Received state '{state}'")  
    logger.debug(f"Received callback state '{state}' and code '{code}'")
    # extract user_id and org_id from state
    state_parts = state.split(":")
    if len(state_parts) < 3 or state_parts[0] != "hubspot":
        raise HTTPException(status_code=400, detail="Invalid state")
    
    user_id = state_parts[1]
    org_id = state_parts[2]
    # Extract item_type if available
    item_type = state_parts[3] if len(state_parts) > 3 else "contact"
    
    #verify state
    state_key = f"hubspot_state:{org_id}:{user_id}"
    saved_state = await get_value_redis(state_key)
    print(f"CALLBACK: Redis state value: {saved_state}")  # Add this line
    if not saved_state or saved_state.decode() != state:
        logger.error(f"State mismatch: expected {state}, got {saved_state}")
        raise HTTPException(status_code=400, detail="Invalid state")
    
    # Prepare token payload
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "redirect_uri": HUBSPOT_REDIRECT_URI,
        "code": code
    }

    #exchange code for access token
    async with aiohttp.ClientSession() as session:
        async with session.post(HUBSPOT_TOKEN_URL, data=token_payload) as response:
            if response.status != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange code for access token")
            data = await response.json()
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in")

            #store tokens in redis
            await add_key_value_redis(f"hubspot_access_token:{org_id}:{user_id}", access_token, expire=expires_in - 60)
            await add_key_value_redis(f"hubspot_refresh_token:{org_id}:{user_id}", refresh_token, expire=expires_in - 60)
            # Store item_type in redis
            await add_key_value_redis(f"hubspot_item_type:{org_id}:{user_id}", item_type, expire=expires_in - 60)

            # clean up state
            await delete_key_redis(state_key)
            await delete_key_redis(f"hubspot_code_verifier:{org_id}:{user_id}")
            
            # Return HTML that will close the window and notify the opener
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>HubSpot Integration Success</title>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(45deg, #f3f4f6 30%, #ffffff 90%);
                        color: #16A34A;
                    }
                    .success-message {
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="success-message">
                    <h1>Success!</h1>
                    <p>HubSpot integration was successful!</p>
                    <p>This window will close automatically...</p>
                </div>
                
                <script>
                    // Notify the opener window that the OAuth flow is complete
                    if (window.opener) {
                        try {
                            window.opener.postMessage({ type: 'HUBSPOT_AUTH_SUCCESS' }, '*');
                        } catch (e) {
                            console.error('Error posting message to opener:', e);
                        }
                    }
                    
                    // Close this window after a short delay
                    setTimeout(function() {
                        window.close();
                    }, 1500);
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content)
    

async def get_hubspot_credentials(user_id, org_id, item_type="contact"):
    """
    Retrieve HubSpot credentials for a user
    """
    credentials_key = f"hubspot_credentials:{user_id}:{org_id}"
    credentials_data = await get_value_redis(credentials_key)
    
    if not credentials_data:
        # Create a credentials object with the item_type
        credentials = {
            "user_id": user_id,
            "org_id": org_id,
            "item_type": item_type
        }
        return credentials
    
    # Parse the credentials and ensure item_type is set
    try:
        credentials = json.loads(credentials_data.decode())
        credentials["item_type"] = item_type
        return credentials
    except:
        # If parsing fails, create a new credentials object
        credentials = {
            "user_id": user_id,
            "org_id": org_id,
            "item_type": item_type
        }
        return credentials

async def create_integration_item_metadata_object(item_type, data):
    """
    Create an integration item from HubSpot data
    """
    if item_type == "contact":
        return {
            "id": data.get("id"),
            "name": f"{data.get('properties', {}).get('firstname', '')} {data.get('properties', {}).get('lastname', '')}".strip(),
            "email": data.get("properties", {}).get("email", ""),
            "phone": data.get("properties", {}).get("phone", ""),
            "type": "contact"
        }
    elif item_type == "company":
        return {
            "id": data.get("id"),
            "name": data.get("properties", {}).get("name", ""),
            "domain": data.get("properties", {}).get("domain", ""),
            "type": "company"
        }
    return None

async def get_items_hubspot(credentials: str, item_type: str = None):
    """
    Fetch items from HubSpot API using credentials string
    
    Args:
        credentials: A string containing user_id, org_id, and itemType
        item_type: Optional item type parameter that overrides the one in credentials
    
    Returns:
        List of items from HubSpot
    """
    try:
        # Parse credentials 
        cred_data = json.loads(credentials)
        user_id = cred_data.get('user_id')
        org_id = cred_data.get('org_id')
        
        # Use the item_type parameter if provided, otherwise use the one from credentials
        if item_type is None or item_type == "":
            item_type = cred_data.get('item_type') or cred_data.get('itemType', 'contact')
        
        print(f"Getting {item_type} data from HubSpot for user {user_id} in org {org_id}")

        if not user_id or not org_id:
            return {"error": "Invalid credentials format"}

        # Get access token
        access_token_key = f"hubspot_access_token:{org_id}:{user_id}"
        access_token_data = await get_value_redis(access_token_key)
        
        if not access_token_data:
            return {"error": "No HubSpot access token found"}
        
        access_token = access_token_data.decode()
        
        # Determine endpoint based on item type
        if item_type == "contact":
            endpoint = f"{HUBSPOT_API_BASE}/objects/contacts"
        elif item_type == "company":
            endpoint = f"{HUBSPOT_API_BASE}/objects/companies"
        else:
            return {"error": f"Unsupported item type: {item_type}"}
        
        print(f"Using HubSpot API endpoint: {endpoint}")
        
        # Make API request
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=headers) as response:
                if response.status != 200:
                    logger.error(f"HubSpot API error: {await response.text()}")
                    return {"error": f"Failed to fetch {item_type}s from HubSpot"}
                
                data = await response.json()
                results = []
                
                # Process results
                for item in data.get("results", []):
                    metadata = await create_integration_item_metadata_object(item_type, item)
                    if metadata:
                        results.append(metadata)
                
                return {"items": results}
    
    except json.JSONDecodeError:
        return {"error": "Invalid credentials format"}
    except Exception as e:
        logger.error(f"Error in get_items_hubspot: {str(e)}")
        return {"error": str(e)}