const axios = require('axios');
const path = require('path');

const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];
const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/x-flv'
];

async function validateVideoUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5
    });
    
    const contentType = response.headers['content-type'];
    const contentLength = parseInt(response.headers['content-length'] || '0');
    
    const extension = path.extname(url.split('?')[0]).toLowerCase();
    
    const isValidFormat = SUPPORTED_VIDEO_FORMATS.includes(extension) || 
                         SUPPORTED_MIME_TYPES.some(type => contentType?.includes(type));
    
    if (!isValidFormat) {
      return {
        valid: false,
        error: `Unsupported video format. Supported: ${SUPPORTED_VIDEO_FORMATS.join(', ')}`
      };
    }
    
    return {
      valid: true,
      contentType,
      contentLength,
      extension
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate URL: ${error.message}`
    };
  }
}

function isVideoFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_VIDEO_FORMATS.includes(ext);
}

module.exports = {
  validateVideoUrl,
  isVideoFile,
  SUPPORTED_VIDEO_FORMATS
};
