export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle different routes
    if (path === "/login" && request.method === "POST") {
      return handleLogin(request);
    } else if (path === "/logout") {
      return handleLogout();
    } else if (path === "/api/namespaces") {
      return handleNamespaces(request);
    } else if (path === "/api/objects") {
      return handleObjects(request);
    } else {
      return handleIndex(request);
    }
  },
};

interface Env {}

async function handleLogin(request: Request): Promise<Response> {
  const formData = await request.formData();
  const accountId = formData.get("accountId") as string;
  const apiKey = formData.get("apiKey") as string;

  if (!accountId || !apiKey) {
    return new Response("Missing account ID or API key", { status: 400 });
  }

  // Test the credentials by making a simple API call
  try {
    const testResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!testResponse.ok) {
      return new Response("Invalid credentials", { status: 401 });
    }
  } catch (error) {
    return new Response("Error validating credentials", { status: 500 });
  }

  // Set cookies and redirect
  const response = new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });

  response.headers.append(
    "Set-Cookie",
    `accountId=${accountId}; Path=/; HttpOnly; SameSite=Strict`,
  );
  response.headers.append(
    "Set-Cookie",
    `apiKey=${apiKey}; Path=/; HttpOnly; SameSite=Strict`,
  );

  return response;
}

async function handleLogout(): Promise<Response> {
  const response = new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });

  response.headers.append(
    "Set-Cookie",
    "accountId=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
  );
  response.headers.append(
    "Set-Cookie",
    "apiKey=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
  );

  return response;
}

function getCookies(request: Request): { accountId?: string; apiKey?: string } {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return {};

  const cookies: { [key: string]: string } = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    cookies[name] = value;
  });

  return {
    accountId: cookies.accountId,
    apiKey: cookies.apiKey,
  };
}

async function handleNamespaces(request: Request): Promise<Response> {
  const { accountId, apiKey } = getCookies(request);

  if (!accountId || !apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const namespaces = await fetchAllNamespaces(accountId, apiKey);
    return new Response(JSON.stringify(namespaces), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return new Response(`Error fetching namespaces: ${error}`, { status: 500 });
  }
}

async function fetchAllNamespaces(
  accountId: string,
  apiKey: string,
): Promise<any[]> {
  const allNamespaces: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces?page=${page}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch namespaces: ${response.statusText}`);
    }

    const data = await response.json();
    allNamespaces.push(...data.result);

    // Check if there are more pages
    hasMore =
      data.result_info && data.result_info.page < data.result_info.total_pages;
    page++;
  }

  return allNamespaces;
}

async function handleObjects(request: Request): Promise<Response> {
  const { accountId, apiKey } = getCookies(request);
  const url = new URL(request.url);
  const namespaceId = url.searchParams.get("namespaceId");

  if (!accountId || !apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!namespaceId) {
    return new Response("Missing namespace ID", { status: 400 });
  }

  try {
    const objects = await fetchObjects(accountId, apiKey, namespaceId);
    return new Response(JSON.stringify(objects), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return new Response(`Error fetching objects: ${error}`, { status: 500 });
  }
}

async function fetchObjects(
  accountId: string,
  apiKey: string,
  namespaceId: string,
): Promise<any[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces/${namespaceId}/objects?limit=10000`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch objects: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result || [];
}

async function handleIndex(request: Request): Promise<Response> {
  const { accountId, apiKey } = getCookies(request);

  if (!accountId || !apiKey) {
    return new Response(getLoginPage(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(getDashboardPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function getLoginPage(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Durable Objects Viewer - Login</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 500px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        button:hover {
            background-color: #0052a3;
        }
        .info {
            background-color: #e7f3ff;
            border: 1px solid #b3d7ff;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .info a {
            color: #0066cc;
            text-decoration: none;
        }
        .info a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Durable Objects Viewer</h1>
        <div class="info">
            <strong>Note:</strong> You need a Cloudflare API token with Workers Scripts Read permissions. 
            Learn more at <a href="https://github.com/janwilmake/do-instance-viewer" target="_blank">GitHub</a>.
        </div>
        <form method="POST" action="/login">
            <div class="form-group">
                <label for="accountId">Account ID:</label>
                <input type="text" id="accountId" name="accountId" required 
                       placeholder="e.g., 023e105f4ecef8ad9ca31a8372d0c353">
            </div>
            <div class="form-group">
                <label for="apiKey">API Token:</label>
                <input type="password" id="apiKey" name="apiKey" required 
                       placeholder="Your API token">
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>
  `;
}

function getDashboardPage(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Durable Objects Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #555;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        .clickable {
            cursor: pointer;
            color: #0066cc;
        }
        .clickable:hover {
            text-decoration: underline;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .error {
            background-color: #ffe6e6;
            border: 1px solid #ffcccc;
            color: #cc0000;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }
        .back-btn {
            background-color: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 15px;
        }
        .back-btn:hover {
            background-color: #5a6268;
        }
        .logout-btn {
            background-color: #dc3545;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
        }
        .logout-btn:hover {
            background-color: #c82333;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Durable Objects Viewer</h1>
        <a href="/logout" class="logout-btn">Logout</a>
    </div>
    <div class="content">
        <div id="content">
            <div class="loading">Loading namespaces...</div>
        </div>
    </div>

    <script>
        let currentView = 'namespaces';
        let currentNamespace = null;

        async function loadNamespaces() {
            currentView = 'namespaces';
            document.getElementById('content').innerHTML = '<div class="loading">Loading namespaces...</div>';
            
            try {
                const response = await fetch('/api/namespaces');
                if (!response.ok) throw new Error('Failed to fetch namespaces');
                
                const namespaces = await response.json();
                displayNamespaces(namespaces);
            } catch (error) {
                document.getElementById('content').innerHTML = 
                    '<div class="error">Error loading namespaces: ' + error.message + '</div>';
            }
        }

        function displayNamespaces(namespaces) {
            let html = '<h2>Durable Object Namespaces</h2>';
            
            if (namespaces.length === 0) {
                html += '<p>No namespaces found.</p>';
            } else {
                html += '<table><thead><tr><th>Name</th><th>ID</th><th>Class</th><th>Script</th><th>SQLite</th></tr></thead><tbody>';
                
                namespaces.forEach(ns => {
                    html += \`<tr onclick="loadObjects('\${ns.id}', '\${ns.name}')" class="clickable">
                        <td>\${ns.name || 'N/A'}</td>
                        <td>\${ns.id}</td>
                        <td>\${ns.class || 'N/A'}</td>
                        <td>\${ns.script || 'N/A'}</td>
                        <td>\${ns.use_sqlite ? 'Yes' : 'No'}</td>
                    </tr>\`;
                });
                
                html += '</tbody></table>';
            }
            
            document.getElementById('content').innerHTML = html;
        }

        async function loadObjects(namespaceId, namespaceName) {
            currentView = 'objects';
            currentNamespace = { id: namespaceId, name: namespaceName };
            document.getElementById('content').innerHTML = '<div class="loading">Loading objects...</div>';
            
            try {
                const response = await fetch(\`/api/objects?namespaceId=\${namespaceId}\`);
                if (!response.ok) throw new Error('Failed to fetch objects');
                
                const objects = await response.json();
                displayObjects(objects, namespaceName);
            } catch (error) {
                document.getElementById('content').innerHTML = 
                    '<div class="error">Error loading objects: ' + error.message + '</div>';
            }
        }

        function displayObjects(objects, namespaceName) {
            let html = \`<button class="back-btn" onclick="loadNamespaces()">← Back to Namespaces</button>\`;
            html += \`<h2>Objects in Namespace: \${namespaceName}</h2>\`;
            
            if (objects.length === 0) {
                html += '<p>No objects found in this namespace.</p>';
            } else {
                html += '<table><thead><tr><th>Object ID</th><th>Has Stored Data</th></tr></thead><tbody>';
                
                objects.forEach(obj => {
                    html += \`<tr>
                        <td>\${obj.id}</td>
                        <td>\${obj.hasStoredData ? 'Yes' : 'No'}</td>
                    </tr>\`;
                });
                
                html += '</tbody></table>';
            }
            
            document.getElementById('content').innerHTML = html;
        }

        // Load initial data
        loadNamespaces();
    </script>
</body>
</html>
  `;
}
