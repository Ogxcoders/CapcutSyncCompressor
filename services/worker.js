const { logger } = require('../utils/logger');
const { validateVideoUrl } = require('../utils/file-validator');
const { downloadVideo } = require('./downloader');
const { compressVideo } = require('./compressor');
const { 
  getPendingJobs, 
  markAsProcessing, 
  updateProgress, 
  markAsCompleted, 
  markAsFailed 
} = require('./appwrite-sync');
const { deleteFile } = require('../utils/cleanup');

let isProcessing = false;
let workerInterval = null;

async function processJob(job) {
  const documentId = job.$id;
  const wpPostId = job.wp_post_id;
  const originalVideoUrl = job.original_video_url;
  let tempFilePath = null;
  
  logger.info(`Processing job ${documentId} for post ${wpPostId}`);
  
  try {
    await markAsProcessing(documentId);
    
    logger.info(`Validating video URL: ${originalVideoUrl}`);
    const validation = await validateVideoUrl(originalVideoUrl);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    await updateProgress(documentId, 'downloading', 5);
    
    tempFilePath = await downloadVideo(originalVideoUrl, wpPostId, async (percent) => {
      if (percent % 10 === 0) {
        await updateProgress(documentId, 'downloading', Math.min(percent, 100));
      }
    });
    
    await updateProgress(documentId, 'compressing', 10);
    
    const results = await compressVideo(tempFilePath, wpPostId, async (update) => {
      await updateProgress(documentId, update.step, update.progress);
    });
    
    await markAsCompleted(documentId, results);
    
    logger.info(`Job ${documentId} completed successfully`);
    
  } catch (error) {
    logger.error(`Job ${documentId} failed: ${error.message}`);
    await markAsFailed(documentId, error.message, 'compression');
  } finally {
    if (tempFilePath) {
      await deleteFile(tempFilePath);
    }
  }
}

async function workerLoop() {
  if (isProcessing) {
    logger.debug('Worker is busy, skipping this cycle');
    return;
  }
  
  try {
    isProcessing = true;
    
    const pendingJobs = await getPendingJobs(1);
    
    if (pendingJobs.length === 0) {
      logger.debug('No pending jobs found');
      return;
    }
    
    const job = pendingJobs[0];
    await processJob(job);
    
  } catch (error) {
    logger.error(`Worker loop error: ${error.message}`);
  } finally {
    isProcessing = false;
  }
}

function startWorker() {
  const interval = parseInt(process.env.WORKER_INTERVAL || '120000');
  
  logger.info(`Starting worker with ${interval}ms interval`);
  
  workerLoop();
  
  workerInterval = setInterval(workerLoop, interval);
  
  return workerInterval;
}

function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('Worker stopped');
  }
}

module.exports = {
  startWorker,
  stopWorker,
  processJob
};
