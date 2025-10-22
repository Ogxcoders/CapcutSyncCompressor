# Deployment Guide - Server B on Your Own Server

This guide will help you deploy the Video Compression Service to your own VPS/server (DigitalOcean, Linode, AWS EC2, etc.).

## Prerequisites

- Ubuntu/Debian server (20.04 or newer recommended)
- Root or sudo access
- Domain name pointed to your server (optional but recommended)
- Minimum specs: 2 CPU cores, 4GB RAM, 50GB storage

---

## Step 1: Connect to Your Server

```bash
ssh root@your-server-ip
# Or with a user account:
ssh username@your-server-ip
```

---

## Step 2: Install Required Software

### Install Node.js 20

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Install FFmpeg

```bash
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Install Git

```bash
sudo apt install -y git
```

---

## Step 3: Set Up Application Directory

```bash
# Create application directory
sudo mkdir -p /var/www/video-compression
cd /var/www/video-compression

# Set permissions (replace 'username' with your actual user)
sudo chown -R $USER:$USER /var/www/video-compression
```

---

## Step 4: Download Your Code

### Option A: From Replit (Download as ZIP)

1. In Replit, click the three dots menu
2. Select "Download as ZIP"
3. Upload to your server:

```bash
# On your local computer, upload to server:
scp video-compression.zip username@your-server-ip:/var/www/
```

4. On server, extract:

```bash
cd /var/www
unzip video-compression.zip -d video-compression
cd video-compression
```

### Option B: From Git Repository

If you pushed code to GitHub/GitLab:

```bash
cd /var/www/video-compression
git clone https://github.com/yourusername/video-compression.git .
```

---

## Step 5: Install Node.js Dependencies

```bash
cd /var/www/video-compression
npm install
```

---

## Step 6: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

Update these values in `.env`:

```env
# Appwrite Connection
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id-here
APPWRITE_API_KEY=your-api-key-here
DATABASE_ID=video_compression
COLLECTION_ID=posts

# Server Settings
PORT=5000
NODE_ENV=production
PUBLIC_URL=https://your-domain.com  # Or http://your-server-ip:5000

# Storage Paths (use absolute paths for production)
STORAGE_PATH=/var/www/video-compression/storage
TEMP_PATH=/var/www/video-compression/storage/temp
HLS_PATH=/var/www/video-compression/storage/hls

# Worker Settings
WORKER_INTERVAL=120000
MAX_CONCURRENT_JOBS=1

# FFmpeg Settings
FFMPEG_PATH=/usr/bin/ffmpeg
SEGMENT_DURATION=10
HIGH_QUALITY_CRF=23
MEDIUM_QUALITY_CRF=28
LOW_QUALITY_CRF=32

# Video Quality Settings
HIGH_RESOLUTION=1080
MEDIUM_RESOLUTION=480
LOW_RESOLUTION=360
HIGH_BITRATE=5000k
MEDIUM_BITRATE=2500k
LOW_BITRATE=1000k
AUDIO_BITRATE=128k

# Cleanup Settings
AUTO_CLEANUP_ENABLED=true
CLEANUP_TEMP_AFTER=3600000

# API Security (CHANGE THIS!)
API_KEY=your-secret-api-key-here
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_LOGGING=true
LOG_LEVEL=info

# Admin Dashboard
ADMIN_ENABLED=true
ADMIN_PATH=/admin
```

Save and exit (Ctrl+X, then Y, then Enter).

---

## Step 7: Create Required Directories

```bash
cd /var/www/video-compression
mkdir -p storage/temp storage/hls logs

# Set proper permissions
chmod -R 755 storage
chmod -R 755 logs
```

---

## Step 8: Test the Application

```bash
# Test run (should not show errors)
node server.js
```

You should see:
```
[INFO]: Starting Video Compression Service...
[INFO]: Appwrite client initialized
[INFO]: Appwrite connection verified successfully
[INFO]: Server running on port 5000
[INFO]: Starting worker with 120000ms interval
```

Press `Ctrl+C` to stop.

---

## Step 9: Start with PM2 (Production)

```bash
# Start the application
pm2 start server.js --name video-compressor

# View logs
pm2 logs video-compressor

# Check status
pm2 status

# Enable auto-restart on server reboot
pm2 startup
# Copy and run the command it outputs

# Save current PM2 configuration
pm2 save
```

### Useful PM2 Commands

```bash
# Stop application
pm2 stop video-compressor

# Restart application
pm2 restart video-compressor

# View real-time logs
pm2 logs video-compressor

# Monitor CPU/memory usage
pm2 monit

# Remove from PM2
pm2 delete video-compressor
```

---

## Step 10: Configure Firewall

```bash
# Allow port 5000 (if using direct access)
sudo ufw allow 5000/tcp

# Or allow Nginx (recommended, see Step 11)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## Step 11: Set Up Nginx (Optional but Recommended)

### Install Nginx

```bash
sudo apt install -y nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/video-compression
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or server IP

    # Max upload size (for large videos if needed later)
    client_max_body_size 2G;

    # API endpoints
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long video processing
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static HLS files - serve directly with Nginx (faster)
    location /storage/hls/ {
        alias /var/www/video-compression/storage/hls/;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS' always;
        
        # Cache headers for playlists
        location ~* \.m3u8$ {
            add_header Cache-Control "max-age=3600";
            add_header Content-Type application/vnd.apple.mpegurl;
            add_header Access-Control-Allow-Origin * always;
        }
        
        # Cache headers for video segments
        location ~* \.ts$ {
            add_header Cache-Control "max-age=31536000, immutable";
            add_header Content-Type video/mp2t;
            add_header Access-Control-Allow-Origin * always;
        }
        
        # Cache headers for images
        location ~* \.(jpg|jpeg|png)$ {
            add_header Cache-Control "max-age=31536000";
            add_header Access-Control-Allow-Origin * always;
        }
    }

    # Block access to temp folder
    location /storage/temp/ {
        deny all;
        return 403;
    }
}
```

Save and exit.

### Enable the site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/video-compression /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 12: Set Up SSL Certificate (Recommended)

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate

```bash
# Make sure your domain points to your server first!
sudo certbot --nginx -d your-domain.com

# Follow the prompts
# Choose option 2 to redirect HTTP to HTTPS
```

Certbot will automatically:
- Get the certificate
- Configure Nginx
- Set up auto-renewal

### Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 13: Verify Everything Works

### Test Endpoints

```bash
# Health check
curl http://your-domain.com/health

# Or with IP:
curl http://your-server-ip/health
```

### Access from Browser

- **Main API**: http://your-domain.com/
- **Health Check**: http://your-domain.com/health
- **Admin Dashboard**: http://your-domain.com/admin

---

## Step 14: Update WordPress Plugin

Update your WordPress plugin's Server B URL to point to your new server:

```php
// In your WordPress plugin settings or code:
define('SERVER_B_URL', 'https://your-domain.com');
```

Also update the `PUBLIC_URL` in Appwrite if you're storing it there.

---

## Monitoring and Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs video-compressor

# Application logs
tail -f /var/www/video-compression/logs/worker.log
tail -f /var/www/video-compression/logs/error.log
tail -f /var/www/video-compression/logs/compression.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Disk Space

```bash
df -h
du -sh /var/www/video-compression/storage/hls/
```

### Update Application

```bash
cd /var/www/video-compression

# Download new code (if using git)
git pull

# Or upload new files via SCP

# Install new dependencies
npm install

# Restart application
pm2 restart video-compressor
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Restart your app
pm2 restart video-compressor
```

### FFmpeg Not Found

```bash
# Verify FFmpeg is installed
which ffmpeg

# If not found, reinstall
sudo apt install -y ffmpeg
```

### Appwrite Connection Failed

- Check credentials in `.env`
- Verify API key has database permissions
- Test connection: `curl http://localhost:5000/health`

### Videos Not Processing

- Check worker logs: `tail -f logs/worker.log`
- Verify FFmpeg works: `ffmpeg -version`
- Check disk space: `df -h`
- Ensure video URL is accessible

### Permission Errors

```bash
# Fix storage permissions
sudo chown -R $USER:$USER /var/www/video-compression/storage
chmod -R 755 /var/www/video-compression/storage
```

---

## Security Best Practices

1. **Change API Key**: Use a strong random key in `.env`
2. **Use HTTPS**: Always use SSL certificates in production
3. **Keep Updated**: Regularly update Node.js, npm, and dependencies
4. **Firewall**: Only open necessary ports (80, 443, 22)
5. **Backups**: Regularly backup your compressed videos
6. **Monitor**: Set up monitoring for disk space and CPU usage

---

## Backup Strategy

### Backup Compressed Videos

```bash
# Create backup directory
mkdir -p /backups/video-compression

# Backup HLS files
tar -czf /backups/video-compression/hls-$(date +%Y%m%d).tar.gz \
  /var/www/video-compression/storage/hls/

# Upload to cloud storage (optional)
# rclone copy /backups/video-compression/ remote:backups/
```

### Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * tar -czf /backups/video-compression/hls-$(date +\%Y\%m\%d).tar.gz /var/www/video-compression/storage/hls/
```

---

## Performance Optimization

### For High Traffic

1. **Use CDN**: Serve HLS files through CloudFlare or AWS CloudFront
2. **Scale Horizontally**: Run multiple compression workers on different servers
3. **Object Storage**: Store videos in S3 or Backblaze B2 instead of local disk
4. **Load Balancer**: Use Nginx load balancer for multiple servers

---

## Your Server is Now Live! 🎉

Your video compression service is running at:
- **URL**: http://your-domain.com (or https:// if using SSL)
- **Health**: http://your-domain.com/health
- **Admin**: http://your-domain.com/admin

The service will automatically:
- Start on server reboot (via PM2)
- Process videos from Appwrite queue
- Clean up temporary files
- Log all activities
- Renew SSL certificates automatically

For support or issues, check the logs and troubleshooting section above.
