## Features:

1. **Authentication via cookies** - Stores account ID, email, and API key in secure cookies
2. **Login form** - Clean interface to enter Cloudflare credentials
3. **Dashboard view** - Shows all namespaces and their objects in a tabular format
4. **Statistics overview** - Summary cards showing total namespaces, objects, and objects with data
5. **Detailed namespace information** - Shows ID, class, script, SQLite usage, and object count
6. **Object details** - Lists up to 100 objects per namespace with their IDs and data storage status
7. **Responsive design** - Clean, modern UI that works on different screen sizes

## Security Features:

- Cookies are set with `HttpOnly`, `Secure`, and `SameSite=Strict` flags
- Credentials are validated on login by making a test API call
- Session expires after 24 hours
- Logout functionality clears all cookies

## Usage:

1. Deploy this worker to Cloudflare
2. Visit the worker URL
3. Enter your Cloudflare account ID, email, and Global API Key
4. View all your Durable Objects namespaces and instances

The worker fetches up to 100 objects per namespace as requested and displays all the available details for each object (ID and whether it has stored data).
