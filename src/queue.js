require('dotenv').config();

const { Queue, Worker } = require('bullmq');
const { scrape } = require('./scraper');
const { setCache } = require('./cache');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const queueName = 'extract';
const queue = new Queue(queueName, { connection });

async function workerProcessor(job) {
  const result = await scrape(job.data.url);
  await setCache(job.data.url, result);
  return result;
}

const shouldRunWorker = require.main === module;

if (shouldRunWorker) {
  const worker = new Worker(queueName, workerProcessor, {
    connection,
    concurrency: 5
  });

  worker.on('completed', job => {
    console.log('Job completed:', job.id);
  });

  worker.on('failed', (job, err) => {
    console.error('Job failed:', job?.id, err?.message);
  });

  console.log('Worker listening on queue:', queueName);
}

async function addJob(data) {
  return queue.add('extract', data, {
    timeout: 15000,
    removeOnComplete: 100,
    removeOnFail: 50
  });
}

async function getJob(id) {
  const job = await queue.getJob(id);
  if (!job) return null;

  const state = await job.getState();

  return {
    job_id: job.id,
    status: state,
    result: state === 'completed' ? job.returnvalue : null,
    error: state === 'failed' ? job.failedReason : null
  };
}

module.exports = { addJob, getJob };
