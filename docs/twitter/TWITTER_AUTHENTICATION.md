# Twitter Authentication Guide for GitSplits

This guide explains how to set up Twitter authentication for the GitSplits worker agent.

## Authentication Methods

There are three main methods for Twitter authentication:

1. **Username/Password Authentication**: Basic method but often fails with Error 399, especially in cloud environments.
2. **2FA Authentication**: Using a 2FA secret from your Twitter account. Works better but can still fail in some environments.
3. **Cookie-based Authentication**: Using browser cookies from an authenticated Twitter session. Most reliable method.

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

## Setting Up 2FA Authentication (Alternative)

If cookie-based authentication doesn't work, you can try 2FA authentication:

1. Go to Twitter settings > Security and account access > Security > Two-factor authentication
2. Enable Authentication App
3. When Twitter shows the QR code, look for a link that says "Can't scan the QR code?"
4. Click that link to reveal the 2FA secret code
5. Add that code to your .env file as TWITTER_2FA_SECRET

## Troubleshooting

### Error 399: "Incorrect. Please try again."

This error occurs when Twitter detects unusual login patterns. Try the following:

1. Use cookie-based authentication instead of username/password
2. Set up 2FA on your Twitter account and use the 2FA secret
3. Log in to Twitter manually and accept any security alerts

### Error 37: "Your credentials do not allow access to this resource"

This error occurs when your Twitter account doesn't have API access. Try the following:

1. Use cookie-based authentication with fresh cookies
2. Make sure you're using the correct Twitter account
3. Try running in mock mode for testing

### Using Mock Mode for Testing

If you're having trouble with Twitter authentication, you can use mock mode for testing:

1. Set `USE_MOCK_TWITTER=true` in your `.env` file
2. Run the worker agent with the mock script:

```bash
./run-mock-worker.sh
```

This will use mock Twitter data instead of real API calls, allowing you to test the rest of the application.

## ElizaOS Compatibility

If you're using ElizaOS, you can use the alternative cookie format:

```
TWITTER_COOKIES='[{"key":"auth_token","value":"your_auth_token_value","domain":".twitter.com"},{"key":"ct0","value":"your_ct0_value","domain":".twitter.com"},{"key":"guest_id","value":"your_guest_id_value","domain":".twitter.com"}]'
```

Add this to your `.env` file instead of the individual cookie variables.
