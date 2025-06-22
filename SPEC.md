https://oapis.org/openapi/cloudflare/durable-objects-namespace-list-objects
https://oapis.org/openapi/cloudflare/durable-objects-namespace-list-namespaces (please assume the OpenAPI is incomplete and we can curse over the namespaces using ?page)

Make me a Cloudflare worker that I can pass an account-id and api key (email not needed) and it would store that in a cookie and enable the worker if the cookies are found.

The worker lists all namespaces (ensure to fully curse over all namespaces to have them all) neatly in a table.

When clicking a namespace, it fetches up to 10000 instances (can be fetched in 1 page). It renders these neatly in a table (for each instance also I need to know the details)

Give me this typescript Cloudflare worker. for cookies ensure to use headers.append and don't and ensure they also work on localhost (don't use secure). in the login ensure to link to https://github.com/janwilmake/do-instance-viewer. for all outputs ensure content type is suffixed with charset=utf8
