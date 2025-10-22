const { getAppwriteClient, Query } = require('../config/appwrite');
const { logger } = require('../utils/logger');

async function getPendingJobs(limit = 1) {
  try {
    const { databases } = getAppwriteClient();
    
    const response = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      [
        Query.equal('compression_status', 'pending'),
        Query.orderAsc('$createdAt'),
        Query.limit(limit)
      ]
    );
    
    return response.documents;
  } catch (error) {
    logger.error(`Failed to get pending jobs: ${error.message}`);
    throw error;
  }
}

async function updateJobStatus(documentId, updates) {
  try {
    const { databases } = getAppwriteClient();
    
    const response = await databases.updateDocument(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      documentId,
      updates
    );
    
    logger.info(`Updated document ${documentId} with status: ${updates.compression_status || 'N/A'}`);
    return response;
  } catch (error) {
    logger.error(`Failed to update document ${documentId}: ${error.message}`);
    throw error;
  }
}

async function markAsProcessing(documentId) {
  return updateJobStatus(documentId, {
    compression_status: 'processing',
    processing_step: 'initializing',
    error_message: null
  });
}

async function updateProgress(documentId, step, progress) {
  return updateJobStatus(documentId, {
    processing_step: step,
    progress: progress
  });
}

async function markAsCompleted(documentId, results) {
  return updateJobStatus(documentId, {
    compression_status: 'completed',
    processing_step: 'completed',
    progress: 100,
    poster_url: results.poster_url,
    master_playlist_url: results.master_playlist_url,
    high_quality_url: results.quality_urls.high,
    medium_quality_url: results.quality_urls.medium,
    low_quality_url: results.quality_urls.low,
    error_message: null
  });
}

async function markAsFailed(documentId, errorMessage, failedStep) {
  return updateJobStatus(documentId, {
    compression_status: 'failed',
    processing_step: failedStep || 'unknown',
    error_message: errorMessage.substring(0, 500)
  });
}

module.exports = {
  getPendingJobs,
  updateJobStatus,
  markAsProcessing,
  updateProgress,
  markAsCompleted,
  markAsFailed
};
