import Redis from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';

// Redis connection for queues
export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue definitions
export const ocrQueue = new Queue('ocr-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const classificationQueue = new Queue('document-classification', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const extractionQueue = new Queue('data-extraction', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const aiProcessingQueue = new Queue('ai-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Queue events for monitoring
export const ocrQueueEvents = new QueueEvents('ocr-processing', { connection: redisConnection });
export const classificationQueueEvents = new QueueEvents('document-classification', { connection: redisConnection });
export const extractionQueueEvents = new QueueEvents('data-extraction', { connection: redisConnection });
export const aiProcessingQueueEvents = new QueueEvents('ai-processing', { connection: redisConnection });

// Job types
export interface OCRJobData {
  documentId: string;
  referralId: string;
}

export interface ClassificationJobData {
  documentId: string;
  referralId: string;
  ocrText: string;
}

export interface ExtractionJobData {
  referralId: string;
  documents: Array<{
    id: string;
    type: string;
    text: string;
  }>;
}

export interface AIProcessingJobData {
  referralId: string;
  extractedData: any;
}

// Close all connections gracefully
export const closeQueues = async () => {
  await Promise.all([
    ocrQueue.close(),
    classificationQueue.close(),
    extractionQueue.close(),
    aiProcessingQueue.close(),
    ocrQueueEvents.close(),
    classificationQueueEvents.close(),
    extractionQueueEvents.close(),
    aiProcessingQueueEvents.close(),
    redisConnection.quit(),
  ]);
};

export default {
  redisConnection,
  ocrQueue,
  classificationQueue,
  extractionQueue,
  aiProcessingQueue,
  ocrQueueEvents,
  classificationQueueEvents,
  extractionQueueEvents,
  aiProcessingQueueEvents,
};
