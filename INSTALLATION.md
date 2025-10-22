# Installation and Deployment Guide

## Quick Start (Replit)

Your Server B is already configured and running! Here's what's set up:

✅ Node.js server running on port 5000  
✅ Appwrite connection verified and working  
✅ Background worker polling for jobs every 2 minutes  
✅ All API endpoints functional  
✅ Admin dashboard ready at `/admin`  

### Access Your Service

- **Service URL**: https://api.trendss.net/
- **Health Check**: https://api.trendss.net/health
- **Admin Dashboard**: https://api.trendss.net/admin
- **API Endpoints**: https://api.trendss.net/api/*
- **HLS Files**: https://api.trendss.net/storage/hls/*

### Important Notes

⚠️ **FFmpeg Requirement**: This Replit environment may not have FFmpeg installed. The worker will run but compression will fail without FFmpeg. To install FFmpeg in this environment:

```bash
# Install FFmpeg (run in Replit shell)
apt-get update && apt-get install -y ffmpeg
```

However, **Replit may not persist FFmpeg installations** across reboots. For production use, consider deploying to:
- VPS (DigitalOcean, Linode, AWS EC2)
- Dedicated server with FFmpeg pre-installed
- Cloud platform with persistent storage

## How It Works

1. **Your WordPress plugin** creates a document in Appwrite with `compression_status = 'pending'`
2. **Server B worker** polls Appwrite every 2 minutes and finds the pending job
3. **Downloads** the original video from the URL in the document
4. **Compresses** the video into 3 HLS quality variants (high/medium/low)
5. **Generates** a poster image and master playlist
6. **Updates** the Appwrite document with all the output URLs
7. **WordPress plugin** retrieves these URLs and displays the video

## Testing the Compression Pipeline

### Method 1: Via WordPress Plugin

1. Create a new CapCut Template post in WordPress
2. Add a video URL in the custom fields
3. Publish the post
4. The plugin will create an Appwrite document
5. Monitor the admin dashboard to see the job being processed

### Method 2: Manual Appwrite Document

1. Go to your Appwrite console
2. Create a new document in your collection with:
   ```json
   {
     "wp_post_id": 123,
     "title": "Test Video",
     "original_video_url": "https://example.com/video.mp4",
     "compression_status": "pending"
   }
   ```
3. The worker will pick it up within 2 minutes
4. Watch the progress in the admin dashboard

## Admin Dashboard

Access at: https://api.trendss.net/admin

When you first open it, you'll be prompted to enter:
- Appwrite Endpoint
- Project ID
- Database ID
- Collection ID

Use the same credentials you configured in the secrets.

The dashboard shows:
- Real-time queue statistics
- All jobs with their status
- Progress bars for processing jobs
- Error messages for failed jobs
- Links to view completed HLS streams

## API Endpoints

### 1. Health Check (Public)
```bash
curl https://api.trendss.net/health
```

### 2. Queue Status (Requires API Key)
```bash
curl -H "X-API-Key: your-api-key" https://api.trendss.net/api/queue
```

### 3. Statistics (Requires API Key)
```bash
curl -H "X-API-Key: your-api-key" https://api.trendss.net/api/stats
```

### 4. Manual Job Processing (Requires API Key)
```bash
curl -X POST -H "X-API-Key: your-api-key" \
  https://api.trendss.net/api/process/{documentId}
```

### 5. Access HLS Files (Public)
```
https://api.trendss.net/storage/hls/{wp_post_id}/master.m3u8
https://api.trendss.net/storage/hls/{wp_post_id}/poster.jpg
```

## Configuration

All configuration is done via environment secrets. Current settings:

- **APPWRITE_ENDPOINT**: Your Appwrite server URL
- **APPWRITE_PROJECT_ID**: Your project ID
- **APPWRITE_API_KEY**: API key with database permissions
- **DATABASE_ID**: Database containing video collection
- **COLLECTION_ID**: Collection with video documents
- **PUBLIC_URL**: https://api.trendss.net/
- **WORKER_INTERVAL**: 120000ms (2 minutes)
- **API_KEY**: Set in secrets for API authentication

## Monitoring Logs

View real-time logs:
```
logs/worker.log      - Worker activity and job processing
logs/compression.log - FFmpeg compression details
logs/error.log       - Error messages only
logs/access.log      - API request logs
```

## Storage

Compressed videos are stored in:
```
storage/hls/{wp_post_id}/
├── poster.jpg
├── master.m3u8
├── high/
│   ├── playlist.m3u8
│   └── segment*.ts
├── medium/
│   └── ...
└── low/
    └── ...
```

## Troubleshooting

### "No pending jobs found"
✅ This is normal when queue is empty. Create a test document in Appwrite.

### "FFmpeg not found" or compression fails
⚠️ FFmpeg needs to be installed. Run `apt-get install ffmpeg` in the shell.

### Appwrite connection errors
- Verify credentials in Replit Secrets
- Check API key has database read/write permissions
- Ensure database and collection IDs are correct

### Videos not downloading
- Check the original_video_url is publicly accessible
- Verify the URL returns a valid video file
- Check logs for detailed error messages

### Worker not picking up jobs
- Worker polls every 2 minutes by default
- Check logs/worker.log for activity
- Verify Appwrite document has `compression_status = 'pending'`

## Production Deployment

For production use on a VPS/dedicated server:

1. **Install FFmpeg**:
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```

2. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd video-compression-service
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name video-compressor
   pm2 startup
   pm2 save
   ```

4. **Configure Nginx** (optional, for SSL/domain):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
       }
       
       location /storage/hls/ {
           alias /path/to/storage/hls/;
           add_header Access-Control-Allow-Origin *;
       }
   }
   ```

## Next Steps

1. ✅ Service is running and connected to Appwrite
2. 📝 Install FFmpeg for video compression to work
3. 🎬 Test with a sample video from WordPress
4. 📊 Monitor progress in the admin dashboard
5. 🎯 Integrate the HLS URLs into your WordPress theme

Need help? Check the logs or visit the health endpoint for system status.
