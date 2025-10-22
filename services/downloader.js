const axios = require('axios');
const fs = require('fs');
const { logger } = require('../utils/logger');
const { getTempFilePath } = require('./storage');

async function downloadVideo(url, wpPostId, progressCallback) {
  const tempFilePath = await getTempFilePath(wpPostId);
  
  logger.info(`Starting download: ${url}`);
  
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 300000,
      maxRedirects: 5
    });
    
    const totalSize = parseInt(response.headers['content-length'] || '0');
    let downloadedSize = 0;
    
    const writer = fs.createWriteStream(tempFilePath);
    
    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      if (totalSize > 0 && progressCallback) {
        const percentage = Math.floor((downloadedSize / totalSize) * 100);
        progressCallback(percentage);
      }
    });
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info(`Download completed: ${tempFilePath}`);
        resolve(tempFilePath);
      });
      
      writer.on('error', (error) => {
        logger.error(`Download failed: ${error.message}`);
        reject(error);
      });
      
      response.data.on('error', (error) => {
        logger.error(`Stream error: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    logger.error(`Download error for ${url}: ${error.message}`);
    throw new Error(`Download failed: ${error.message}`);
  }
}

module.exports = {
  downloadVideo
};
