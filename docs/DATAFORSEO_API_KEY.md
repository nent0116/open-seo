# DataForSEO API Key Setup

OpenSEO uses [DataForSEO](https://dataforseo.com/?aff=255379) to fetch SEO data. It's a pay-as-you-go third-party service unaffiliated with OpenSEO. You need an API key to connect OpenSEO to it.

New DataForSEO accounts include $1 of free credit to test with, and the minimum top-up is $50.

## Get your API key

1. Go to [DataForSEO API Access](https://app.dataforseo.com/api-access?aff=255379) (create an account if you don't have one).
2. Click "Send by email" to get your credentials.
3. Copy the longer credentials labelled "Base64" credentials. This is the base64 encoded value of your DataForSEO email and API password in the format `email:password`.

## Where to set it

Set the value as `DATAFORSEO_API_KEY`:

- **Docker self-hosting:** in `.env` (see [`SELF_HOSTING_DOCKER.md`](./SELF_HOSTING_DOCKER.md)).
- **Cloudflare self-hosting:** in `.env.selfhost` (see [`SELF_HOSTING_CLOUDFLARE.md`](./SELF_HOSTING_CLOUDFLARE.md)). Legacy button/Wrangler deployments: as a Worker secret in the dashboard under `Settings` -> `Variables & Secrets`.
- **Local development:** in `.env.local` (see [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md)).

## Add safety limits

OpenSEO can stop paid DataForSEO calls before dispatch when an estimated call
would exceed an operator-defined limit. Add either or both values next to the
API key:

```dotenv
# Maximum provider spend for the DataForSEO account's current day, in USD
DATAFORSEO_DAILY_SPEND_LIMIT_USD=5

# Maximum DataForSEO requests during the current minute
DATAFORSEO_REQUESTS_PER_MINUTE_LIMIT=60
```

Both values must be positive. The request limit must be a whole number. Restart
or redeploy OpenSEO after changing them. Self-hosted users can see the account
balance, current-day spend, current request count, and configured limits under
**Settings → DataForSEO usage**.

These OpenSEO limits are a secondary safety net. Usage is read from DataForSEO's
free account endpoint and cached for up to one minute; recent calls in the same
OpenSEO process are reserved immediately to cover reporting delay. Also set
spending limits in the DataForSEO dashboard when you need an authoritative hard
stop across OpenSEO, scripts, and any other client using the same credentials.
