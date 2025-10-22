const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    logger.error(`Failed to create directory ${dirPath}: ${error.message}`);
    return false;
  }
}

async function createVideoDirectory(wpPostId) {
  const basePath = process.env.HLS_PATH || './storage/hls';
  const videoPath = path.join(basePath, wpPostId.toString());
  
  await ensureDirectoryExists(videoPath);
  await ensureDirectoryExists(path.join(videoPath, 'high'));
  await ensureDirectoryExists(path.join(videoPath, 'medium'));
  await ensureDirectoryExists(path.join(videoPath, 'low'));
  
  return videoPath;
}

async function getTempFilePath(wpPostId, extension = 'mp4') {
  const tempPath = process.env.TEMP_PATH || './storage/temp';
  await ensureDirectoryExists(tempPath);
  return path.join(tempPath, `${wpPostId}_original.${extension}`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    logger.error(`Failed to get file size for ${filePath}: ${error.message}`);
    return 0;
  }
}

async function calculateTotalSize(dirPath) {
  try {
    let totalSize = 0;
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += await calculateTotalSize(filePath);
      } else {
        totalSize += await getFileSize(filePath);
      }
    }
    
    return totalSize;
  } catch (error) {
    logger.error(`Failed to calculate total size for ${dirPath}: ${error.message}`);
    return 0;
  }
}

function buildPublicUrl(relativePath) {
  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
  return `${publicUrl}/storage/hls/${relativePath}`;
}

module.exports = {
  ensureDirectoryExists,
  createVideoDirectory,
  getTempFilePath,
  fileExists,
  getFileSize,
  calculateTotalSize,
  buildPublicUrl
};
