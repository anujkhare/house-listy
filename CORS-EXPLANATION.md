# Understanding CORS and Our Solution

## What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a security feature built into web browsers that restricts web pages from making requests to a different domain than the one serving the page.

### Example

- Your app runs on: `http://localhost:3000`
- Zillow runs on: `https://www.zillow.com`
- These are **different origins** (different domains)

When your JavaScript tries to fetch data from Zillow, the browser blocks it for security reasons.

## Why Does CORS Exist?

CORS prevents malicious websites from:

- Stealing your data from other sites
- Making unauthorized requests on your behalf
- Reading sensitive information from other domains

### Example Attack CORS Prevents

1. You're logged into your bank at `bank.com`
2. You visit a malicious site `evil.com`
3. Without CORS, `evil.com` could make requests to `bank.com` using your session
4. CORS blocks this - the browser won't let `evil.com` read responses from `bank.com`

## The Problem with Zillow

When we try to fetch Zillow listing data directly from the browser:

```javascript
// ❌ This gets BLOCKED by CORS
fetch('https://www.zillow.com/homedetails/...')
```

**Why it's blocked:**

1. Zillow doesn't send CORS headers allowing other sites to read their data
2. The browser sees this as a security risk
3. Request is blocked before it even reaches Zillow

## Can We "Disable CORS"?

### Short Answer: No (for other websites)

You **cannot** disable CORS for websites you don't own:

- Only Zillow can allow CORS access to their site
- They would need to add special headers to their responses
- They deliberately don't do this to protect their data

### What About Browser Extensions?

You **can** install browser extensions that disable CORS:

- Extensions like "CORS Unblock" or "Allow CORS"
- They bypass browser security for ALL websites
- **⚠️ Security Risk**: Opens you to the attacks CORS prevents
- **Not Recommended**: Only use for development, never keep enabled

### Developer Mode Flags

You can start Chrome with CORS disabled:

```bash
# macOS/Linux
google-chrome --disable-web-security --user-data-dir=/tmp/chrome

# Windows
chrome.exe --disable-web-security --user-data-dir=C:\temp\chrome
```

**⚠️ Dangers:**

- Exposes you to security vulnerabilities
- Any malicious site can steal data
- Should NEVER be used for regular browsing
- Only for isolated testing

## Our Solution: Proxy Server

Instead of fighting CORS, we work around it using a **proxy server**.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Your Browser (localhost:3000)                          │
│  ✓ CORS restrictions apply here                        │
└──────────────┬──────────────────────────────────────────┘
               │
               │ 1. "Fetch zillow.com/..."
               ▼
┌─────────────────────────────────────────────────────────┐
│  Proxy Server (localhost:3001)                          │
│  ✓ No CORS - it's our server!                          │
│  ✓ Runs on same machine                                │
└──────────────┬──────────────────────────────────────────┘
               │
               │ 2. Fetch from Zillow
               │ (CORS doesn't apply to servers)
               ▼
┌─────────────────────────────────────────────────────────┐
│  Zillow.com                                             │
│  ✓ Responds with HTML                                   │
└──────────────┬──────────────────────────────────────────┘
               │
               │ 3. Extract data & send back
               ▼
┌─────────────────────────────────────────────────────────┐
│  Your Browser                                           │
│  ✓ Receives parsed data                                │
└─────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Browser → Proxy**: No CORS issue because:
   - Both on `localhost` (same origin)
   - Our proxy sends CORS headers allowing access

2. **Proxy → Zillow**: No CORS issue because:
   - CORS only applies to browsers
   - Servers can fetch from anywhere
   - Node.js doesn't enforce CORS

3. **Privacy**: Everything stays on your machine
   - No third-party services involved
   - Your data never leaves localhost

### Code Breakdown

**Server (server.js):**

```javascript
// Enable CORS for our frontend
app.use(cors({
  origin: 'http://localhost:3000'  // Allow our app
}));

// Proxy endpoint
app.get('/api/fetch-zillow', async (req, res) => {
  const { url } = req.query;

  // Fetch from Zillow (no CORS restrictions on server)
  const response = await fetch(url, {
    headers: { 'User-Agent': '...' }
  });

  const html = await response.text();
  const data = extractZillowData(html);

  // Send back to frontend
  res.json({ success: true, data });
});
```

**Frontend (zillowParser.js):**

```javascript
// Instead of fetching Zillow directly
const proxyUrl = `http://localhost:3001/api/fetch-zillow?url=${zillowUrl}`;

// Fetch from our proxy (no CORS issues)
const response = await fetch(proxyUrl);
const result = await response.json();
```

## Comparison of Approaches

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Disable CORS in Browser** | Quick, no code needed | ⚠️ Security risk, affects all sites | ❌ Don't use |
| **CORS Extension** | Easy to toggle | ⚠️ Security risk when enabled | ⚠️ Development only |
| **Public CORS Proxy** | No local server needed | Privacy concerns, rate limits, unreliable | ⚠️ Not ideal |
| **Local Proxy Server** | Secure, reliable, private | Need to run server | ✅ **Best choice** |
| **Browser Extension (custom)** | Can bypass CORS properly | Need to build & install extension | ⚠️ Advanced |

## Running the Proxy Server

### Start Everything

```bash
npm start
```

This runs both:

- Proxy server on port 3001
- React app on port 3000

### Check if Proxy is Running

Open browser to `http://localhost:3001/api/fetch-zillow?url=test`

You should see: `{"error":"Invalid Zillow URL"}`

If you see this, the proxy is working!

## Troubleshooting

### "Cannot connect to localhost:3001"

- Make sure you ran `npm start` (not just `npm run dev`)
- Check if proxy server is running in terminal
- Look for message: `🚀 Proxy server running on http://localhost:3001`

### "Port 3001 already in use"

Another app is using that port. Either:

1. Stop the other app, or
2. Change the port in `server.js` and `zillowParser.js`

### Auto-fill not working

- Zillow may have changed their HTML structure
- Check browser console for errors
- Try manually entering data as fallback

## Legal & Ethical Considerations

### Is This Legal?

- **Personal use**: Generally OK (like using a web browser)
- **Scraping for business**: May violate Terms of Service
- **This app**: Personal use only, saves time vs manual copying

### Respect Zillow

- Our proxy makes minimal requests (only when you click auto-fill)
- We don't hammer their servers with automated requests
- We're not republishing their data
- Just like copying data manually, but faster

## Summary

**CORS is good** - it protects your security online.

**We can't disable CORS** for Zillow's website (we don't control it).

**Our proxy server** works around CORS by:

- Running on your local machine (no CORS between browser and local server)
- Fetching Zillow data server-side (servers not subject to CORS)
- Securely passing data back to your browser

**Result**: You get auto-fill functionality while maintaining security! 🎉
