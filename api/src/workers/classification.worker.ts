import { Worker } from 'bullmq';
import { redisConnection, classificationQueue, extractionQueue } from '../lib/queues';
import { classifyDocument } from '../services/classification.service';
import { prisma } from '../lib/prisma';

const classificationWorker = new Worker(
  'document-classification',
  async (job) => {
    const { documentId, referralId, ocrText } = job.data;
    
    console.log(`Classifying document ${documentId}`);
    
    try {
      // Classify the document
      const classification = await classifyDocument(ocrText);
      
      // Update document with classification results
      await prisma.document.update({
        where: { id: documentId },
        data: {
          documentType: classification.type,
          documentTypeConfidence: classification.confidence
        }
      });

      // Check if all documents for this referral are classified
      const documents = await prisma.document.findMany({
        where: { 
          referralId,
          ocrStatus: 'completed'
        }
      });

      const allClassified = documents.every(doc => doc.documentType !== null);
      
      // If all documents are classified, queue for extraction
      if (allClassified && documents.length > 0) {
        const documentsForExtraction = documents.map(doc => ({
          id: doc.id,
          type: doc.documentType!,
          text: doc.ocrText || ''
        }));

        await extractionQueue.add('extract-data', {
          referralId,
          documents: documentsForExtraction
        }, {
          delay: 1000
        });
      }

      console.log(`Document ${documentId} classified as ${classification.type} with confidence ${classification.confidence}`);
      
      return {
        success: true,
        classification
      };

    } catch (error) {
      console.error(`Classification failed for document ${documentId}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Can classify multiple documents concurrently
  }
);

// Error handling
classificationWorker.on('failed', (job, err) => {
  console.error(`Classification job ${job?.id} failed:`, err);
});

classificationWorker.on('completed', (job, result) => {
  console.log(`Classification job ${job?.id} completed:`, result);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await classificationWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await classificationWorker.close();
  process.exit(0);
});

export default classificationWorker;
