# Video Compression Service (Server B)

A Node.js background worker service that monitors Appwrite for pending video compression jobs, downloads original videos, compresses them into HLS format with multiple quality levels, and serves the compressed files.

## Features

- **Appwrite Integration**: Monitors Appwrite database for pending compression jobs
- **HLS Streaming**: Creates adaptive bitrate streaming with high/medium/low quality variants
- **Poster Generation**: Automatically generates thumbnail images from videos
- **Background Worker**: Processes videos sequentially with configurable polling interval
- **REST API**: Manual job processing and queue monitoring endpoints
- **Admin Dashboard**: Real-time queue monitoring with Appwrite SDK
- **Static File Server**: Serves HLS playlists and video segments with proper CORS headers
- **Comprehensive Logging**: Separate logs for worker, compression, errors, and API access

## Prerequisites

- Node.js 18+ 
- FFmpeg installed on the system
- Appwrite account with configured database and collection
- Sufficient disk storage for video processing

## Installation

1. **Install FFmpeg** (if not already installed):
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Appwrite credentials and settings
   ```

4. **Create required directories**:
   ```bash
   mkdir -p storage/temp storage/hls logs
   ```

## Configuration

Edit `.env` file with your settings:

```env
# Appwrite Connection
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
DATABASE_ID=video_compression
COLLECTION_ID=posts

# Server Settings
PORT=5000
PUBLIC_URL=https://your-server-url.com

# Worker Settings
WORKER_INTERVAL=120000  # Poll every 2 minutes
```

## Usage

**Start the server**:
```bash
npm start
```

**Access the admin dashboard**:
Open `http://localhost:5000/admin` in your browser and enter your Appwrite credentials.

**Check service health**:
```bash
curl http://localhost:5000/health
```

## API Endpoints

### Health Check
```
GET /health
```

### Queue Status (requires API key)
```
GET /api/queue?limit=10
Headers: X-API-Key: your-api-key
```

### Statistics (requires API key)
```
GET /api/stats
Headers: X-API-Key: your-api-key
```

### Manual Job Processing (requires API key)
```
POST /api/process/:documentId
Headers: X-API-Key: your-api-key
```

### HLS Files
```
GET /storage/hls/{wp_post_id}/master.m3u8
GET /storage/hls/{wp_post_id}/poster.jpg
GET /storage/hls/{wp_post_id}/{quality}/playlist.m3u8
```

## How It Works

1. **Worker polls Appwrite** every 2 minutes for documents with `compression_status = 'pending'`
2. **Downloads original video** from the URL specified in the document
3. **Generates poster image** from a video frame
4. **Compresses video** into 3 HLS quality variants (high: 1080p, medium: 480p, low: 360p)
5. **Creates master playlist** for adaptive bitrate streaming
6. **Updates Appwrite document** with URLs to all generated files
7. **Cleans up temporary files** automatically

## Directory Structure

```
storage/
├── temp/              # Temporary downloads (auto-cleaned)
└── hls/               # HLS output files
    └── {wp_post_id}/  # One folder per video
        ├── poster.jpg
        ├── master.m3u8
        ├── high/
        ├── medium/
        └── low/
```

## Appwrite Collection Schema

Your Appwrite collection should have these attributes:

- `wp_post_id` (integer) - WordPress post ID
- `title` (string) - Post title
- `original_video_url` (string) - Source video URL
- `compression_status` (string) - pending/processing/completed/failed
- `processing_step` (string) - Current processing step
- `progress` (integer) - Completion percentage
- `poster_url` (string) - Generated poster image URL
- `master_playlist_url` (string) - Master HLS playlist URL
- `high_quality_url` (string) - High quality playlist URL
- `medium_quality_url` (string) - Medium quality playlist URL
- `low_quality_url` (string) - Low quality playlist URL
- `error_message` (string) - Error details if failed

## Troubleshooting

**FFmpeg not found**:
- Make sure FFmpeg is installed and in your PATH
- Or set `FFMPEG_PATH` in `.env` to the full path

**Appwrite connection failed**:
- Verify your credentials in `.env`
- Check that the API key has proper database permissions
- Test connection at `/health` endpoint

**Videos not processing**:
- Check worker logs in `logs/worker.log`
- Verify the original video URL is accessible
- Check disk space is sufficient

## License

ISC
