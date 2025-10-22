const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { logger, compressionLogger } = require('../utils/logger');
const { buildHLSCommand, buildPosterCommand, generateMasterPlaylist } = require('../utils/ffmpeg-helper');
const { createVideoDirectory, buildPublicUrl } = require('./storage');

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

async function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

async function generatePoster(inputPath, outputPath, wpPostId) {
  compressionLogger.info(`Generating poster for video ${wpPostId}`);
  
  return new Promise((resolve, reject) => {
    const command = buildPosterCommand(ffmpeg(), inputPath, outputPath, '10%');
    
    command
      .on('end', () => {
        compressionLogger.info(`Poster generated: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        compressionLogger.error(`Poster generation failed: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

async function compressToHLS(inputPath, quality, outputDir, wpPostId, progressCallback) {
  compressionLogger.info(`Starting ${quality} quality compression for video ${wpPostId}`);
  
  return new Promise((resolve, reject) => {
    const command = buildHLSCommand(ffmpeg(), inputPath, outputDir, quality);
    
    command
      .on('progress', (progress) => {
        if (progressCallback && progress.percent) {
          progressCallback(Math.floor(progress.percent));
        }
      })
      .on('end', () => {
        compressionLogger.info(`${quality} quality compression completed for video ${wpPostId}`);
        resolve(path.join(outputDir, 'playlist.m3u8'));
      })
      .on('error', (err) => {
        compressionLogger.error(`${quality} quality compression failed: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

async function compressVideo(inputPath, wpPostId, updateCallback) {
  try {
    const videoDir = await createVideoDirectory(wpPostId);
    
    updateCallback({ step: 'creating_poster', progress: 5 });
    
    const posterPath = path.join(videoDir, 'poster.jpg');
    await generatePoster(inputPath, posterPath, wpPostId);
    
    const qualities = ['high', 'medium', 'low'];
    const results = {
      poster_url: buildPublicUrl(`${wpPostId}/poster.jpg`),
      quality_urls: {}
    };
    
    for (let i = 0; i < qualities.length; i++) {
      const quality = qualities[i];
      const baseProgress = 10 + (i * 30);
      
      updateCallback({ 
        step: `compressing_${quality}`, 
        progress: baseProgress 
      });
      
      const qualityDir = path.join(videoDir, quality);
      
      await compressToHLS(inputPath, quality, qualityDir, wpPostId, (percent) => {
        const adjustedProgress = baseProgress + Math.floor(percent * 0.3);
        updateCallback({ 
          step: `compressing_${quality}`, 
          progress: adjustedProgress 
        });
      });
      
      results.quality_urls[quality] = buildPublicUrl(`${wpPostId}/${quality}/playlist.m3u8`);
    }
    
    updateCallback({ step: 'finalizing', progress: 95 });
    
    const masterPlaylistContent = generateMasterPlaylist(qualities, videoDir);
    const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
    await fs.writeFile(masterPlaylistPath, masterPlaylistContent);
    
    results.master_playlist_url = buildPublicUrl(`${wpPostId}/master.m3u8`);
    
    logger.info(`Compression completed for video ${wpPostId}`);
    
    return results;
  } catch (error) {
    logger.error(`Compression failed for video ${wpPostId}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getVideoMetadata,
  generatePoster,
  compressToHLS,
  compressVideo
};
