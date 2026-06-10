# How to Run Massive Data Seeds using GCP Cloud Run Jobs

If you want to insert 10,000, 100,000, or 1,000,000 records into your Elasticsearch database, doing it from a web browser will crash the browser. 

The professional way to handle massive data insertion is using a **Google Cloud Run Job**. This allows you to run scripts on Google's powerful servers in the background.

We have provided two different scripts in the `scripts/` folder depending on what data you want to generate:

1. **JOB A (Python):** Generates **Login Users** (Emails & Passwords).
2. **JOB B (Node.js):** Generates **Companions & Events** (Raw data insertion).

---

## Prerequisites
1. You must have a Google Cloud Platform (GCP) account with billing enabled.
2. You must have the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed on your computer.
3. Open your terminal and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```

---

## 🚀 JOB A: Seed Login Users (Python)
*Use this if you want to generate thousands of users that can log into the app (e.g., `user1@example.com`).*

**1. Build the Python Container:**
```bash
cd scripts
# Ensure the Python Dockerfile is the active one
cp Dockerfile Dockerfile.active 
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tomodachi-seed-users .
```

**2. Create the Cloud Run Job:**
```bash
gcloud run jobs create tomodachi-seed-users \
  --image gcr.io/YOUR_PROJECT_ID/tomodachi-seed-users \
  --set-env-vars ELASTIC_URL="https://YOUR_CLUSTER.es.us-central1.gcp.cloud.es.io" \
  --set-env-vars ELASTIC_API_KEY="your_base64_encoded_api_key" \
  --set-env-vars USER_COUNT="10000" \
  --region us-central1
```

**3. Execute the Job:**
```bash
gcloud run jobs execute tomodachi-seed-users --region us-central1
```

---

## 🚀 JOB B: Seed Companions & Events (Node.js)
*Use this if you want to generate the dummy data used for the AI Similarity Matching. This script inserts raw data into Elasticsearch.*

**1. Build the Node.js Container:**
*(Note: If you get a "COPY failed" error, it means you are running this command in an empty folder. Make sure you are inside the `scripts` folder and that `seedMassiveData.js` is actually in there!)*

```bash
cd scripts

# gcloud requires the file to be named exactly 'Dockerfile'
# We copy the Node.js specific dockerfile to 'Dockerfile' before submitting
cp Dockerfile.node Dockerfile

# Submit the build (the '.' at the end means "upload all files in this current directory")
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tomodachi-seed-data .
```

**2. Create the Cloud Run Job:**
```bash
gcloud run jobs create tomodachi-seed-data \
  --image gcr.io/YOUR_PROJECT_ID/tomodachi-seed-data \
  --set-env-vars ELASTIC_URL="https://YOUR_CLUSTER.es.us-central1.gcp.cloud.es.io" \
  --set-env-vars ELASTIC_API_KEY="your_base64_encoded_api_key" \
  --set-env-vars COMPANION_COUNT="10000" \
  --set-env-vars EVENT_COUNT="5000" \
  --region us-central1
```

**3. Execute the Job:**
```bash
gcloud run jobs execute tomodachi-seed-data --region us-central1
```

---

## 🚨 TROUBLESHOOTING

### Error: `Job already exists`
If you run `gcloud run jobs create ...` and get an error saying the job already exists, it means you have already created it in the past! You do not need to create it again. 

**How to fix it:**
Instead of `create`, use the `update` command to apply any new environment variables or image changes:

```bash
gcloud run jobs update tomodachi-seed-data \
  --image gcr.io/YOUR_PROJECT_ID/tomodachi-seed-data \
  --update-env-vars ELASTIC_URL="https://YOUR_CLUSTER.es.us-central1.gcp.cloud.es.io" \
  --update-env-vars ELASTIC_API_KEY="your_base64_encoded_api_key" \
  --update-env-vars COMPANION_COUNT="10000" \
  --update-env-vars EVENT_COUNT="5000" \
  --region us-central1
```
Then, execute it normally:
```bash
gcloud run jobs execute tomodachi-seed-data --region us-central1
```

### Error: `{"statusCode":404,"error":"Not Found","message":"Not Found"}`
If you see this exact error in your Cloud Run logs, **you accidentally provided the Kibana URL instead of the Elasticsearch URL.**
Kibana is a Node.js application (which is why it returns that specific JSON error format), but the script needs to talk directly to the database.

**How to fix it:**
1. Go to your Elastic Cloud dashboard.
2. Under "Endpoints", copy the URL next to **Elasticsearch** (it usually has `.es.` in the URL, not `.kb.`).
3. Update your Cloud Run job with the correct URL by running this command:

```bash
gcloud run jobs update tomodachi-seed-data \
  --update-env-vars ELASTIC_URL="https://YOUR_CORRECT_ELASTICSEARCH_URL" \
  --region us-central1
```
4. Execute the job again:
```bash
gcloud run jobs execute tomodachi-seed-data --region us-central1
```
