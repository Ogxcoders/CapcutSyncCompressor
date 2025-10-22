# Video Compression Service (Server B)

## Overview

A Node.js-based background worker service that monitors an Appwrite database for pending video compression jobs, downloads original videos, compresses them into HLS (HTTP Live Streaming) format with multiple quality variants, generates poster images, and serves the processed files. This service is designed to work in conjunction with a WordPress plugin that creates compression jobs in Appwrite.

The service operates as a polling worker that checks for new jobs every 2 minutes, processes videos sequentially using FFmpeg, and updates the Appwrite database with the URLs of compressed video variants. It also provides a REST API for manual job processing and queue monitoring, plus an admin dashboard for real-time visualization.

## Current Deployment Status

**Server Status**: ✅ Running and operational  
**URL**: https://api.trendss.net/  
**Appwrite Connection**: ✅ Connected and verified  
**Worker Status**: ✅ Polling every 2 minutes  
**Last Updated**: October 22, 2025

### Quick Links
- Health Check: https://api.trendss.net/health
- Admin Dashboard: https://api.trendss.net/admin
- API Documentation: See API_DOCUMENTATION.md

### Recent Changes (October 22, 2025)
- Initial Server B implementation completed
- All core components implemented and tested
- Appwrite integration configured and verified
- Environment validation added for fail-fast on misconfiguration
- Comprehensive documentation created

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**Background Worker Pattern**
- Implements a polling-based worker that checks Appwrite every 2 minutes for pending jobs
- Processes videos sequentially to avoid resource contention
- Updates job status through multiple processing stages (downloading → compressing → completed)
- Rationale: Polling is simpler than webhooks for cross-service communication and doesn't require exposing endpoints for callbacks

**Video Processing Pipeline**
- Downloads original video from URL to temporary storage
- Generates 3 HLS quality variants (high/medium/low) using FFmpeg
- Creates poster thumbnail from video frame
- Generates master HLS playlist for adaptive bitrate streaming
- Stores all outputs in organized directory structure
- Rationale: HLS provides adaptive streaming for better user experience across varying network conditions

**Express Web Server**
- Serves static HLS files (.m3u8 playlists and .ts video segments)
- Provides REST API endpoints for manual job triggering and queue inspection
- Hosts admin dashboard for real-time monitoring
- Implements CORS headers for cross-origin video playback
- Rationale: Single service handles both processing and file serving to simplify deployment

**File Storage Architecture**
- Temporary storage for downloaded originals (cleaned up after processing)
- Organized HLS output: `/storage/hls/{post_id}/{quality}/` structure
- Each quality variant gets its own directory with playlist and segments
- Rationale: Organized structure makes files easy to locate and clean up; separating temp and permanent storage prevents accidental deletion

**Authentication & Security**
- API key authentication for protected endpoints (header or query param)
- Rate limiting on API routes (configurable requests per window)
- Public access to HLS files (required for video playback)
- Rationale: Balance between security and functionality; videos must be publicly accessible for playback

**Logging System**
- Separate log files for different concerns (worker, compression, errors)
- Winston logger with file and console transports
- Structured logging with timestamps and error stacks
- Rationale: Separate logs make debugging easier; compression logs track long-running FFmpeg operations

### Data Flow

1. WordPress plugin creates Appwrite document with `compression_status: 'pending'`
2. Worker polls Appwrite, finds pending job
3. Updates status to 'processing' and downloads video to temp storage
4. FFmpeg compresses video into 3 quality variants in parallel
5. Generates poster image and master playlist
6. Updates Appwrite document with all output URLs
7. Cleans up temporary files
8. WordPress plugin retrieves URLs and displays video player

### Quality Settings

- **High**: 1080p, CRF 23, 5000k bitrate
- **Medium**: 480p, CRF 28, 2500k bitrate  
- **Low**: 360p, CRF 32, 1000k bitrate
- All variants: AAC audio at 128k, 10-second HLS segments
- Rationale: These presets balance quality and file size for typical web playback scenarios

### Error Handling

- Validates video URLs before downloading (checks format and accessibility)
- Marks jobs as 'failed' with error messages on any processing error
- Cleanup runs even if processing fails
- Automatic retry not implemented (WordPress plugin can re-trigger failed jobs)
- Rationale: Fail-fast approach with clear error messages helps debugging; automatic retries could waste resources on permanently broken URLs

## External Dependencies

### Appwrite (Primary Database)
- Cloud-hosted BaaS (Backend as a Service)
- Stores video compression job queue and results
- Collection schema includes: `wp_post_id`, `original_video_url`, `compression_status`, `processing_step`, quality variant URLs, poster URL, error messages
- Accessed via Node.js SDK with API key authentication
- Rationale: Shared database enables communication between WordPress plugin and compression service without direct API calls

### FFmpeg (Video Processing)
- System-level dependency (must be installed on host machine)
- Used via `fluent-ffmpeg` Node.js wrapper
- Handles video compression, HLS segmentation, poster generation
- Critical dependency: Service cannot function without it
- Rationale: Industry-standard tool for video processing; no viable alternatives for HLS generation

### Third-Party NPM Packages
- **express**: Web server framework
- **axios**: HTTP client for downloading videos
- **fluent-ffmpeg**: FFmpeg wrapper for Node.js
- **node-appwrite**: Official Appwrite SDK
- **winston**: Logging framework
- **cors**: CORS middleware
- **express-rate-limit**: API rate limiting
- **dotenv**: Environment variable management

### Deployment Requirements
- Node.js 18+ runtime
- FFmpeg installed and accessible in system PATH
- Sufficient disk storage for video processing (varies by video size)
- Persistent storage (temporary files can be deleted, but HLS output must persist)
- Internet access for downloading videos and connecting to Appwrite

### Optional Services
- **Nginx**: Recommended reverse proxy for production (handles SSL, static file serving)
- **PM2**: Process manager for keeping service running
- **Let's Encrypt**: SSL certificates for HTTPS
- Rationale: These tools provide production-grade reliability and security beyond what Node.js alone offers