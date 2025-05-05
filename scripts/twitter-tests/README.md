# Twitter Test Scripts

This directory contains JavaScript test scripts for testing various aspects of the Twitter integration.

## Available Tests

- `test-account-info.js`: Tests getting account information from Twitter API
- `test-different-screen-name.js`: Tests using a different screen name with Twitter API
- `test-mentions-timeline.js`: Tests getting mentions timeline from Twitter API
- `test-post-tweet.js`: Tests posting a tweet using Twitter API
- `test-search-33bitsAnon.js`: Tests searching for tweets mentioning @33bitsAnon
- `test-search-tweets.js`: Tests searching for tweets using Twitter API
- `test-search-without-at.js`: Tests searching for tweets without @ symbol
- `test-twitter-login.js`: Tests Twitter login information
- `test-user-info.js`: Tests getting user information from Twitter API
- `test-user-timeline.js`: Tests getting user timeline from Twitter API

## Usage

To run a test script, use Node.js from the project root directory:

```bash
node scripts/twitter-tests/test-user-info.js
```

Make sure you have the necessary environment variables set up in your `.env` file before running the tests.

## Required Environment Variables

The test scripts require the following environment variables to be set:

```
# Twitter Configuration (Cookie Auth)
TWITTER_COOKIES_AUTH_TOKEN=your_auth_token
TWITTER_COOKIES_CT0=your_ct0_token
TWITTER_COOKIES_GUEST_ID=your_guest_id
TWITTER_SCREEN_NAME=your_twitter_screen_name
```

You can use the `get-twitter-cookies.sh` script to help extract these values from your browser.

## Notes

- These tests are designed to help diagnose issues with the Twitter API integration
- Some tests may fail due to limitations of the Twitter API when using cookie-based authentication
- For comprehensive testing, consider using the mock mode by setting `USE_MOCK_TWITTER=true` in your `.env` file
