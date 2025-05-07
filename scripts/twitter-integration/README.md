# Twitter Integration

This directory contains the core Twitter integration modules for GitSplits.

## Files

- `masa-api.js`: Masa API client for Twitter scraping

## Usage

The Masa API client is used by the test scripts in the `scripts/twitter-tests/` directory. It provides methods for searching tweets mentioning GitSplits.

```javascript
const MasaAPI = require("./scripts/twitter-integration/masa-api");

// Create a Masa API client
const masaClient = new MasaAPI({
  debug: true,
});

// Search for tweets mentioning GitSplits
const tweets = await masaClient.searchMentions("GitSplits", { limit: 10 });
```

## Environment Variables

The Masa API client requires the following environment variables:

```
MASA_API_KEY=your-masa-api-key
```

## Testing

To test the Masa API integration, run:

```bash
npm run twitter:test-masa
```

This will run the test script in `scripts/twitter-tests/test-masa-api.js`.

For more information on setting up the Twitter integration, see the [TWITTER_INTEGRATION.md](../../docs/twitter/TWITTER_INTEGRATION.md) file.
