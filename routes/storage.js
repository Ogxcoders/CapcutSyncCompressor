const express = require('express');
const path = require('path');
const router = express.Router();

const hlsPath = process.env.HLS_PATH || './storage/hls';

router.use(express.static(path.resolve(hlsPath), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'max-age=3600');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'max-age=31536000, immutable');
    } else if (filePath.match(/\.(jpg|jpeg|png)$/)) {
      res.setHeader('Cache-Control', 'max-age=31536000');
    }
  }
}));

module.exports = router;
