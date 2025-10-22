# API Documentation

Complete API reference for the Video Compression Service (Server B).

## Base URL

```
https://api.trendss.net/
```

## Authentication

Most API endpoints require authentication via API key. Include the key in either:

**Header (recommended):**
```
X-API-Key: your-api-key
```

**Query parameter:**
```
?api_key=your-api-key
```

---

## Endpoints

### 1. Service Information

Get basic service information.

**Endpoint:** `GET /`

**Authentication:** None

**Response:**
```json
{
  "name": "Video Compression Service (Server B)",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "admin": "/admin",
    "api": "/api",
    "storage": "/storage/hls"
  }
}
```

---

### 2. Health Check

Check service health and connectivity.

**Endpoint:** `GET /health`

**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T02:30:57.586Z",
  "uptime": 21.209,
  "services": {
    "appwrite": "connected",
    "worker": "running"
  },
  "environment": {
    "node_version": "v20.19.3",
    "platform": "linux",
    "memory": {
      "used": 11,
      "total": 12
    }
  }
}
```

**Status values:**
- `healthy` - All services operational
- `degraded` - Some services have issues
- `unhealthy` - Critical failures

---

### 3. Get Queue

Retrieve pending compression jobs.

**Endpoint:** `GET /api/queue`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional) - Number of jobs to return (default: 10, max: 100)

**Example:**
```bash
curl -H "X-API-Key: your-api-key" \
  "https://api.trendss.net/api/queue?limit=20"
```

**Response:**
```json
{
  "count": 2,
  "jobs": [
    {
      "id": "doc123abc",
      "wp_post_id": 456,
      "title": "Sample Video",
      "status": "pending",
      "step": null,
      "created_at": "2025-10-22T01:00:00.000Z"
    },
    {
      "id": "doc789xyz",
      "wp_post_id": 789,
      "title": "Another Video",
      "status": "processing",
      "step": "compressing_high",
      "created_at": "2025-10-22T00:30:00.000Z"
    }
  ]
}
```

---

### 4. Get Statistics

Get queue statistics across all statuses.

**Endpoint:** `GET /api/stats`

**Authentication:** Required

**Example:**
```bash
curl -H "X-API-Key: your-api-key" \
  https://api.trendss.net/api/stats
```

**Response:**
```json
{
  "stats": {
    "pending": 5,
    "processing": 1,
    "completed": 127,
    "failed": 3
  }
}
```

---

### 5. Process Job Manually

Manually trigger processing of a specific job (bypasses queue).

**Endpoint:** `POST /api/process/:documentId`

**Authentication:** Required

**Parameters:**
- `documentId` - The Appwrite document ID to process

**Example:**
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  https://api.trendss.net/api/process/doc123abc
```

**Response:**
```json
{
  "message": "Job processing started",
  "document_id": "doc123abc"
}
```

**Note:** Processing happens asynchronously. Use the queue endpoint or admin dashboard to monitor progress.

---

### 6. Access HLS Files

Serve compressed video files, playlists, and posters.

**Endpoint:** `GET /storage/hls/{wp_post_id}/*`

**Authentication:** None (public access)

**Available paths:**

**Master Playlist:**
```
GET /storage/hls/{wp_post_id}/master.m3u8
```

**Poster Image:**
```
GET /storage/hls/{wp_post_id}/poster.jpg
```

**Quality Playlists:**
```
GET /storage/hls/{wp_post_id}/high/playlist.m3u8
GET /storage/hls/{wp_post_id}/medium/playlist.m3u8
GET /storage/hls/{wp_post_id}/low/playlist.m3u8
```

**Video Segments:**
```
GET /storage/hls/{wp_post_id}/high/segment000.ts
GET /storage/hls/{wp_post_id}/high/segment001.ts
...
```

**Headers:**
- `.m3u8` files: `Content-Type: application/vnd.apple.mpegurl`
- `.ts` files: `Content-Type: video/mp2t`
- CORS enabled: `Access-Control-Allow-Origin: *`

**Example:**
```html
<video controls>
  <source src="https://api.trendss.net/storage/hls/123/master.m3u8" type="application/x-mpegURL">
</video>
```

---

### 7. Admin Dashboard

Web-based dashboard for monitoring the queue.

**Endpoint:** `GET /admin`

**Authentication:** Prompted in browser (Appwrite credentials)

**Features:**
- Real-time queue statistics
- Job list with filtering
- Progress tracking
- Error messages
- Auto-refresh every 10 seconds

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP status codes:**

- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing API key)
- `403` - Forbidden (invalid API key)
- `404` - Not found (invalid endpoint or resource)
- `429` - Too many requests (rate limit exceeded)
- `500` - Internal server error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Window:** 15 minutes
- **Max requests:** 100 per window per IP

When rate limited, you'll receive:
```json
{
  "error": "Too many requests, please try again later"
}
```

**Headers:**
- `RateLimit-Limit` - Total requests allowed
- `RateLimit-Remaining` - Requests remaining
- `RateLimit-Reset` - Time when limit resets

---

## Webhooks (Future)

Currently not implemented. Planned features:

- Webhook notifications on job completion
- Webhook notifications on job failure
- Custom callback URLs per job

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'https://api.trendss.net';
const API_KEY = 'your-api-key';

// Get queue status
async function getQueue() {
  const response = await axios.get(`${API_URL}/api/queue`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data;
}

// Process a job
async function processJob(documentId) {
  const response = await axios.post(
    `${API_URL}/api/process/${documentId}`,
    {},
    { headers: { 'X-API-Key': API_KEY } }
  );
  return response.data;
}
```

### PHP

```php
<?php
$apiUrl = 'https://api.trendss.net';
$apiKey = 'your-api-key';

// Get queue status
function getQueue($apiUrl, $apiKey) {
    $ch = curl_init("$apiUrl/api/queue");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-API-Key: $apiKey"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response);
}

$queue = getQueue($apiUrl, $apiKey);
print_r($queue);
?>
```

### Python

```python
import requests

API_URL = 'https://api.trendss.net'
API_KEY = 'your-api-key'

# Get queue status
def get_queue():
    response = requests.get(
        f'{API_URL}/api/queue',
        headers={'X-API-Key': API_KEY}
    )
    return response.json()

# Process a job
def process_job(document_id):
    response = requests.post(
        f'{API_URL}/api/process/{document_id}',
        headers={'X-API-Key': API_KEY}
    )
    return response.json()

queue = get_queue()
print(queue)
```

---

## HLS Player Integration

### Using HLS.js

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<video id="video" controls width="640"></video>

<script>
  var video = document.getElementById('video');
  var videoSrc = 'https://api.trendss.net/storage/hls/123/master.m3u8';
  
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
  }
</script>
```

### Using Video.js

```html
<link href="https://vjs.zencdn.net/7.20.3/video-js.css" rel="stylesheet" />
<script src="https://vjs.zencdn.net/7.20.3/video.min.js"></script>

<video id="my-video" class="video-js" controls preload="auto" width="640">
  <source src="https://api.trendss.net/storage/hls/123/master.m3u8" type="application/x-mpegURL">
</video>

<script>
  var player = videojs('my-video');
</script>
```

---

## Support

For issues and questions:
- Check logs: `logs/worker.log`, `logs/error.log`
- Health endpoint: `/health`
- Admin dashboard: `/admin`
