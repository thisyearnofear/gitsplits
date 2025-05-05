# Twitter Integration Documentation

This directory contains documentation for the Twitter integration in the GitSplits project.

## Available Documentation

- `TWITTER_AUTHENTICATION.md`: Detailed guide on Twitter authentication methods and troubleshooting
- `TWITTER_AUTH_GUIDE.md`: Comprehensive guide for setting up and maintaining Twitter authentication

## Authentication Methods

The GitSplits project supports three main methods for Twitter authentication:

1. **Cookie-based Authentication** (Recommended): Using browser cookies from an authenticated Twitter session
2. **2FA Authentication**: Using a 2FA secret from your Twitter account
3. **Username/Password Authentication**: Basic method (least reliable)

## Helper Scripts

Several helper scripts are available to assist with Twitter authentication:

- `scripts/get-twitter-cookies.sh`: Helps extract Twitter cookies from your browser
- `scripts/fix-twitter-auth.sh`: Comprehensive script to fix Twitter authentication issues
- `scripts/test-twitter-auth.sh`: Script to test Twitter authentication
- `scripts/test-twitter-endpoints.sh`: Script to test different Twitter API endpoints

## Test Scripts

JavaScript test scripts are available in the `scripts/twitter-tests` directory to help diagnose issues with the Twitter API integration.

## Mock Mode

For development and testing, you can use mock mode by setting `USE_MOCK_TWITTER=true` in your `.env` file. This will use mock Twitter data instead of making real API calls.
