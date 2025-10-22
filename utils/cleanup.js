const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.info(`Deleted file: ${filePath}`);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error(`Failed to delete file ${filePath}: ${error.message}`);
    }
    return false;
  }
}

async function deleteDirectory(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    logger.info(`Deleted directory: ${dirPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete directory ${dirPath}: ${error.message}`);
    return false;
  }
}

async function cleanupTempFiles(tempPath) {
  try {
    const files = await fs.readdir(tempPath);
    const now = Date.now();
    const maxAge = parseInt(process.env.CLEANUP_TEMP_AFTER || '3600000');
    
    for (const file of files) {
      if (file === '.gitkeep') continue;
      
      const filePath = path.join(tempPath, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await deleteFile(filePath);
      }
    }
  } catch (error) {
    logger.error(`Temp cleanup failed: ${error.message}`);
  }
}

async function cleanupOldVideos(hlsPath, maxAgeDays) {
  try {
    const folders = await fs.readdir(hlsPath);
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    
    for (const folder of folders) {
      if (folder === '.gitkeep') continue;
      
      const folderPath = path.join(hlsPath, folder);
      const stats = await fs.stat(folderPath);
      
      if (stats.isDirectory() && now - stats.mtimeMs > maxAge) {
        await deleteDirectory(folderPath);
      }
    }
  } catch (error) {
    logger.error(`Old videos cleanup failed: ${error.message}`);
  }
}

module.exports = {
  deleteFile,
  deleteDirectory,
  cleanupTempFiles,
  cleanupOldVideos
};
