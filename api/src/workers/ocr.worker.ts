import { Worker } from 'bullmq';
import { redisConnection, classificationQueue } from '../lib/queues';
import { analyzeDocument } from '../lib/textract';
import { getFromS3 } from '../lib/s3';
import { prisma } from '../lib/prisma';

const ocrWorker = new Worker(
  'ocr-processing',
  async (job) => {
    const { documentId, referralId } = job.data as { documentId: string; referralId: string };
    
    console.log(`Processing OCR for document ${documentId}`);
    
    try {
      // Update document status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: 'processing' }
      });

      // Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Download file from S3
      const fileBuffer = await getFromS3(document.storageBucket!, document.storagePath);
      
      // Convert stream to buffer if needed
      let buffer: Buffer;
      if (fileBuffer instanceof ReadableStream) {
        buffer = await new Response(fileBuffer).arrayBuffer().then(buf => Buffer.from(buf));
      } else {
        buffer = Buffer.from(fileBuffer as any);
      }

      // Run OCR with Textract
      const ocrResult = await analyzeDocument(buffer);

      // Update document with OCR results
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ocrStatus: 'completed',
          ocrText: ocrResult.text,
          ocrConfidence: ocrResult.confidence,
          ocrCompletedAt: new Date()
        }
      });

      // Queue for classification
      await classificationQueue.add('classify-document', {
        documentId,
        referralId,
        ocrText: ocrResult.text
      }, {
        delay: 1000 // Small delay to ensure DB is updated
      });

      console.log(`OCR completed for document ${documentId}`);
      
      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence
      };

    } catch (error) {
      console.error(`OCR processing failed for document ${documentId}:`, error);
      
      // Update document with error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ocrStatus: 'failed',
          ocrCompletedAt: new Date()
        }
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process 3 documents concurrently
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute per worker
    },
  }
);

// Error handling
ocrWorker.on('failed', (job, err) => {
  console.error(`OCR job ${job?.id} failed:`, err);
});

ocrWorker.on('completed', (job, result) => {
  console.log(`OCR job ${job?.id} completed:`, result);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await ocrWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await ocrWorker.close();
  process.exit(0);
});

export default ocrWorker;
