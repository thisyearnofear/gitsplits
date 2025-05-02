# Twitter Cookie Auth Guide

This guide explains how to set up Twitter Cookie Auth for the GitSplits X Agent.

## Overview

Since we're using a free Twitter account without API access, we'll use the "Cookie Auth" method. This involves copying authentication tokens from your browser after logging in to Twitter.

## Prerequisites

1. A Twitter account for your bot (e.g., `@gitsplits`)
2. Access to your Twitter account through a web browser (Chrome or Firefox recommended)

## Steps to Obtain Twitter Cookie Auth Credentials

### 1. Create a Twitter Account

If you don't already have a Twitter account for your bot, create one at [twitter.com](https://twitter.com).

### 2. Log in to Twitter

1. Open your web browser (Chrome or Firefox recommended)
2. Go to [twitter.com](https://twitter.com)
3. Log in with your bot account credentials

### 3. Access Browser Developer Tools

#### In Chrome:
- Right-click anywhere on the page and select "Inspect"
- Or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

#### In Firefox:
- Right-click anywhere on the page and select "Inspect Element"
- Or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

### 4. Access Cookies

#### In Chrome:
1. In the Developer Tools panel, click on the "Application" tab
2. In the left sidebar, expand "Cookies" and click on "https://twitter.com"

#### In Firefox:
1. In the Developer Tools panel, click on the "Storage" tab
2. In the left sidebar, expand "Cookies" and click on "https://twitter.com"

### 5. Find the Required Cookies

Look for the following cookies:
- `auth_token`
- `ct0`

### 6. Copy Cookie Values

Copy the values of these cookies. You'll need them for your environment variables.

### 7. Set Environment Variables

Add the cookie values to your `.env` file:

```
TWITTER_AUTH_TOKEN=your-auth-token-value
TWITTER_CT0=your-ct0-value
TWITTER_SCREEN_NAME=your-twitter-handle
```

## Important Notes

1. **Security**: These cookie values provide full access to your Twitter account. Keep them secure and never commit them to version control.

2. **Expiration**: Twitter cookies expire periodically. If your bot stops working, you may need to repeat this process to get new cookie values.

3. **Rate Limits**: Twitter may rate limit your account if you make too many requests. The worker agent includes built-in rate limiting, but be aware that excessive usage may still trigger restrictions.

4. **Account Age**: New Twitter accounts may have more restrictions. If possible, use an account that has been active for some time.

## Troubleshooting

If you encounter issues with the Twitter integration:

1. **Check Cookie Validity**: Cookies may have expired. Repeat the process to get new values.

2. **Check Rate Limits**: If you're getting rate limit errors, reduce the frequency of mention checks.

3. **Account Restrictions**: New accounts may have restrictions. Try using an older account or wait for the account to age.

4. **Browser Issues**: If you can't find the cookies, try using a different browser or clearing your cache and cookies before logging in again.
