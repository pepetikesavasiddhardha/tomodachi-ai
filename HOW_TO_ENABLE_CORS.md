# How to Enable CORS in Elastic Cloud

Because this is a frontend-only web application, your web browser blocks direct requests to the Elasticsearch database for security reasons. This is called a CORS (Cross-Origin Resource Sharing) error, which shows up as `Failed to fetch` in the app.

To fix this, you must tell your Elastic database to accept requests from your browser.

### Step-by-Step Instructions:

1. **Log in to Elastic Cloud:** Go to [https://cloud.elastic.co/](https://cloud.elastic.co/) and log in.
2. **Select your Deployment:** On the main dashboard, click on the name of your deployment (e.g., `tomodachi-cluster`).
3. **Go to Edit Mode:** On the left-hand navigation menu, click on **Edit** (it is located under your deployment name).
4. **Find Elasticsearch Settings:** Scroll down the page until you see the **Elasticsearch** section.
5. **Open User Settings:** Look for a link or button that says **"Edit user settings"** (it might also be labeled `elasticsearch.yml`). Click it.
6. **Paste the Configuration:** A code editor box will appear. Paste the following 4 lines exactly as they are into that box. *(Note: We use `/.*/` instead of `*` as it is more reliable in newer Elastic versions)*:

```yaml
http.cors.enabled: true
http.cors.allow-origin: "/.*/"
http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT, DELETE
http.cors.allow-headers: X-Requested-With, X-Auth-Token, Content-Type, Content-Length, Authorization, Access-Control-Allow-Headers, Accept
```

7. **Save Changes:** Scroll to the very bottom of the page and click the blue **Save** or **Apply changes** button.
8. **Wait for Restart:** Elastic will now restart your database nodes to apply the new settings. This usually takes **3 to 5 minutes**. You will see a progress indicator on the Elastic dashboard.
9. **Try Again:** Once the deployment status goes back to "Healthy" or "Ready" in the Elastic console, go back to the Tomodachi AI app and click **"Save & Resume Search"** (or "Generate Data"). It will now connect successfully!

---

## 🚨 STILL GETTING "Failed to fetch"? Check these 4 things:

If you applied the settings above and waited 5 minutes but are *still* getting the error, one of these is the culprit:

### 1. Adblockers or Privacy Browsers (Very Common)
Extensions like **uBlock Origin**, **Privacy Badger**, or browsers like **Brave** (Brave Shields) will automatically block background requests to unknown URLs like `*.es.io`. 
* **Fix:** Turn off your adblocker or Brave Shields for this specific web page and try again.

### 2. You copied the Kibana URL instead of Elasticsearch
The app cannot talk to Kibana. It must talk to Elasticsearch.
* **Fix:** Go to your Elastic Cloud dashboard. Under "Applications" or "Endpoints", make sure you copy the URL next to **Elasticsearch**. It should look like `https://your-cluster.es.us-central1.gcp.cloud.es.io`.

### 3. YAML Formatting Error
YAML is extremely sensitive to spaces. If you accidentally added spaces at the beginning of the lines you pasted, Elastic will ignore them.
* **Fix:** Go back to the `elasticsearch.yml` editor and make sure `http.cors.enabled: true` is pushed all the way to the left margin (no spaces before it).

### 4. Invalid API Key
Sometimes a `401 Unauthorized` error is hidden by the browser and shows up as a generic `Failed to fetch` CORS error.
* **Fix:** Generate a brand new API Key in Kibana (Stack Management -> API Keys), make sure you copy the **Encoded** version, and paste it into the app.
