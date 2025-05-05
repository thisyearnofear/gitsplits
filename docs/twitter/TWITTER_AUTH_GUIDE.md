# Twitter Authentication Guide for GitSplits

This guide explains how to set up and troubleshoot Twitter authentication for the GitSplits worker agent.

## Authentication Methods

There are three main methods for Twitter authentication:

1. **Cookie-based Authentication** (Recommended): Using browser cookies from an authenticated Twitter session. Most reliable method.
2. **2FA Authentication**: Using a 2FA secret from your Twitter account. Works as a fallback but has limitations.
3. **Username/Password Authentication**: Basic method but often fails with Error 399, especially in cloud environments.

## Setting Up Cookie-based Authentication (Recommended)

### Step 1: Log in to Twitter in your browser

1. Open your browser and go to [Twitter](https://twitter.com)
2. Log in with your GitSplits account credentials

### Step 2: Extract the required cookies

1. Open developer tools (F12) and go to the Application tab
2. Under Storage > Cookies, find the following cookies:
   - `auth_token`
   - `ct0`
   - `guest_id` (optional)
3. Copy the values of these cookies

### Step 3: Update your .env file

Add the following lines to your `.env` file:

```
# Cookie-based authentication (from browser)
TWITTER_COOKIES_AUTH_TOKEN=your_auth_token_value
TWITTER_COOKIES_CT0=your_ct0_value
TWITTER_COOKIES_GUEST_ID=your_guest_id_value
```

### Step 4: Test the authentication

Run the test script to verify that the authentication works:

```bash
./test-twitter-auth.sh
```

## Using the Helper Scripts

We've created several helper scripts to make Twitter authentication easier:

1. **get-twitter-cookies.sh**: Helps you extract Twitter cookies from your browser and update your .env file
2. **test-twitter-endpoints.sh**: Tests different Twitter API endpoints to see which ones work with your credentials
3. **test-twitter-auth.sh**: Tests the Twitter authentication process
4. **fix-twitter-auth.sh**: Comprehensive script that guides you through fixing Twitter authentication issues

To use these scripts:

```bash
# Get fresh Twitter cookies
./get-twitter-cookies.sh

# Test Twitter API endpoints
./test-twitter-endpoints.sh

# Test Twitter authentication
./test-twitter-auth.sh

# Fix Twitter authentication issues
./fix-twitter-auth.sh
```

## Common Issues and Solutions

### Error 404: "Sorry, that page does not exist"

This error occurs when Twitter API endpoints have changed or are not accessible with your current authentication method.

**Solution:**
1. Try different API endpoints (the test-twitter-endpoints.sh script will help)
2. Get fresh cookie values from your browser
3. Use the fix-twitter-auth.sh script to update your configuration

### Error 37: "Your credentials do not allow access to this resource"

This error occurs when your Twitter account doesn't have API access to certain endpoints. This is common with free Twitter accounts.

**Solution:**
1. Use cookie-based authentication with fresh cookies
2. Accept that some endpoints (like mentions_timeline) may not be accessible
3. Use mock mode for testing those endpoints

### Error 399: "Client is not authorized to access this resource"

This error occurs when Twitter detects unusual login patterns or when your authentication method is not sufficient.

**Solution:**
1. Use cookie-based authentication instead of username/password
2. Get fresh cookie values from your browser
3. Try using a different browser to get the cookie values

## Using Mock Mode for Testing

If you're having trouble with Twitter authentication, you can use mock mode for testing:

1. Set `USE_MOCK_TWITTER=true` in your `.env` file
2. Run the worker agent with the mock script:

```bash
./run-mock-worker.sh
```

This will use mock Twitter data instead of real API calls, allowing you to test the rest of the application.

## Refreshing Cookies

Twitter cookies expire periodically. If authentication stops working, you'll need to refresh your cookies:

1. Log in to Twitter again in your browser
2. Extract the new cookie values
3. Update your .env file with the new values
4. Restart the worker agent

You can use the `get-twitter-cookies.sh` script to help with this process.

## Troubleshooting

If you're still having issues with Twitter authentication:

1. Check the worker agent logs: `docker logs gitsplits-worker`
2. Run the test scripts to identify which endpoints are working
3. Try using mock mode for testing
4. Make sure your Twitter account is not locked or restricted
5. Try logging in to Twitter manually and accepting any security alerts
