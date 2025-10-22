const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/auth');
const { getPendingJobs } = require('../services/appwrite-sync');
const { processJob } = require('../services/worker');
const { logger } = require('../utils/logger');

router.get('/queue', authenticateApiKey, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10');
    const jobs = await getPendingJobs(Math.min(limit, 100));
    
    res.json({
      count: jobs.length,
      jobs: jobs.map(job => ({
        id: job.$id,
        wp_post_id: job.wp_post_id,
        title: job.title,
        status: job.compression_status,
        step: job.processing_step,
        created_at: job.$createdAt
      }))
    });
  } catch (error) {
    logger.error(`Queue fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.post('/process/:documentId', authenticateApiKey, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const { databases } = require('../config/appwrite').getAppwriteClient();
    const job = await databases.getDocument(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      documentId
    );
    
    processJob(job).catch(err => {
      logger.error(`Manual job processing failed: ${err.message}`);
    });
    
    res.json({ 
      message: 'Job processing started',
      document_id: documentId 
    });
  } catch (error) {
    logger.error(`Manual process error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authenticateApiKey, async (req, res) => {
  try {
    const { databases, Query } = require('../config/appwrite');
    const { getAppwriteClient } = require('../config/appwrite');
    const client = getAppwriteClient();
    
    const pending = await client.databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      [Query.equal('compression_status', 'pending'), Query.limit(1)]
    );
    
    const processing = await client.databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      [Query.equal('compression_status', 'processing'), Query.limit(1)]
    );
    
    const completed = await client.databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      [Query.equal('compression_status', 'completed'), Query.limit(1)]
    );
    
    const failed = await client.databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      [Query.equal('compression_status', 'failed'), Query.limit(1)]
    );
    
    res.json({
      stats: {
        pending: pending.total,
        processing: processing.total,
        completed: completed.total,
        failed: failed.total
      }
    });
  } catch (error) {
    logger.error(`Stats fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
