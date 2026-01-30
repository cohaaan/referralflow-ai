import { v4 as uuidv4 } from 'uuid';
import { uploadToS3, getPresignedUrl } from '../lib/s3';
import { ocrQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'referralflow-documents';

export interface UploadDocumentInput {
  referralId: string;
  file: Buffer;
  filename: string;
  mimeType: string;
  uploadedById?: string;
}

export interface UploadDocumentResult {
  id: string;
  storagePath: string;
  success: boolean;
}

export const uploadDocument = async (input: UploadDocumentInput): Promise<UploadDocumentResult> => {
  const { referralId, file, filename, mimeType, uploadedById } = input;
  
  // Generate unique storage path
  const documentId = uuidv4();
  const extension = filename.split('.').pop() || 'pdf';
  const storagePath = `referrals/${referralId}/documents/${documentId}.${extension}`;
  
  try {
    // Upload to S3
    await uploadToS3(S3_BUCKET, storagePath, file, mimeType);
    
    // Create document record in database
    const document = await prisma.document.create({
      data: {
        id: documentId,
        referralId,
        originalFilename: filename,
        fileType: extension,
        fileSizeBytes: file.length,
        mimeType,
        storageBucket: S3_BUCKET,
        storagePath,
        ocrStatus: 'pending',
        uploadedById
      }
    });

    // Queue for OCR processing
    await ocrQueue.add('process-ocr', {
      documentId: document.id,
      referralId
    }, {
      priority: 1,
      delay: 500 // Small delay to ensure DB write completes
    });

    // Update referral status if this is the first document
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: { documents: true }
    });

    if (referral && referral.documents.length === 1) {
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          aiProcessingStatus: 'queued',
          status: 'processing'
        }
      });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        referralId,
        userId: uploadedById,
        activityType: 'document_uploaded',
        description: `Document uploaded: ${filename}`,
        metadata: {
          documentId: document.id,
          filename,
          fileSize: file.length
        },
        isSystemGenerated: false
      }
    });

    return {
      id: document.id,
      storagePath,
      success: true
    };

  } catch (error) {
    console.error('Document upload error:', error);
    throw error;
  }
};

export const getDocumentDownloadUrl = async (documentId: string): Promise<string> => {
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  const url = await getPresignedUrl(S3_BUCKET, document.storagePath, 3600);
  return url;
};

export const getDocumentsForReferral = async (referralId: string) => {
  const documents = await prisma.document.findMany({
    where: { referralId },
    orderBy: { createdAt: 'desc' }
  });

  return documents;
};

export const retryDocumentProcessing = async (documentId: string) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Reset OCR status
  await prisma.document.update({
    where: { id: documentId },
    data: {
      ocrStatus: 'pending',
      ocrText: null,
      ocrConfidence: null,
      ocrCompletedAt: null,
      documentType: null,
      documentTypeConfidence: null
    }
  });

  // Re-queue for OCR
  await ocrQueue.add('process-ocr', {
    documentId: document.id,
    referralId: document.referralId
  }, {
    priority: 2
  });

  return { success: true };
};

export default {
  uploadDocument,
  getDocumentDownloadUrl,
  getDocumentsForReferral,
  retryDocumentProcessing
};
