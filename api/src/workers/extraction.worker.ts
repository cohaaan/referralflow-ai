import { Worker } from 'bullmq';
import { redisConnection, extractionQueue, aiProcessingQueue } from '../lib/queues';
import { extractPatientData } from '../services/extraction.service';
import { prisma } from '../lib/prisma';

const extractionWorker = new Worker(
  'data-extraction',
  async (job) => {
    const { referralId, documents } = job.data;
    
    console.log(`Extracting data for referral ${referralId}`);
    
    try {
      // Extract structured data from documents
      const extractedData = await extractPatientData(documents);
      
      // Save extracted data to database
      await prisma.extractedPatientData.upsert({
        where: { referralId },
        update: {
          clinicalSummary: extractedData.clinicalSummary as any,
          diagnoses: extractedData.diagnoses as any,
          medications: extractedData.medications as any,
          functionalStatus: extractedData.functionalStatus as any,
          careRequirements: extractedData.careRequirements as any,
          behavioralStatus: extractedData.behavioralStatus as any,
          labs: {}, // Will be populated later
          vitals: {}, // Will be populated later
          insuranceInfo: extractedData.insuranceInfo as any,
          dischargeInfo: {},
          rawExtractionOutput: extractedData as any,
          extractionVersion: '1.0',
          modelUsed: 'claude-3-5-sonnet-20241022',
          extractedAt: new Date(),
          overallConfidence: 0.85 // Default confidence
        },
        create: {
          referralId,
          clinicalSummary: extractedData.clinicalSummary as any,
          diagnoses: extractedData.diagnoses as any,
          medications: extractedData.medications as any,
          functionalStatus: extractedData.functionalStatus as any,
          careRequirements: extractedData.careRequirements as any,
          behavioralStatus: extractedData.behavioralStatus as any,
          labs: {},
          vitals: {},
          insuranceInfo: extractedData.insuranceInfo as any,
          dischargeInfo: {},
          rawExtractionOutput: extractedData as any,
          extractionVersion: '1.0',
          modelUsed: 'claude-3-5-sonnet-20241022',
          extractedAt: new Date(),
          overallConfidence: 0.85
        }
      });

      // Update or create patient record
      await prisma.patient.upsert({
        where: { referralId },
        update: {
          firstName: extractedData.demographics.firstName || undefined,
          lastName: extractedData.demographics.lastName || undefined,
          dateOfBirth: extractedData.demographics.dob ? new Date(extractedData.demographics.dob) : undefined,
          age: extractedData.demographics.age || undefined,
          gender: extractedData.demographics.gender || undefined,
          primaryLanguage: extractedData.demographics.primaryLanguage || 'English',
          interpreterNeeded: extractedData.demographics.interpreterNeeded
        },
        create: {
          referralId,
          firstName: extractedData.demographics.firstName || undefined,
          lastName: extractedData.demographics.lastName || undefined,
          dateOfBirth: extractedData.demographics.dob ? new Date(extractedData.demographics.dob) : undefined,
          age: extractedData.demographics.age || undefined,
          gender: extractedData.demographics.gender || undefined,
          primaryLanguage: extractedData.demographics.primaryLanguage || 'English',
          interpreterNeeded: extractedData.demographics.interpreterNeeded
        }
      });

      // Update referral with patient name
      if (extractedData.demographics.firstName && extractedData.demographics.lastName) {
        await prisma.referral.update({
          where: { id: referralId },
          data: {
            patientFirstName: extractedData.demographics.firstName,
            patientLastName: extractedData.demographics.lastName,
            patientDob: extractedData.demographics.dob ? new Date(extractedData.demographics.dob) : null,
            patientGender: extractedData.demographics.gender,
            aiProcessingStatus: 'extracted'
          }
        });
      }

      // Queue for AI processing (recommendations)
      await aiProcessingQueue.add('process-ai-recommendation', {
        referralId,
        extractedData
      }, {
        delay: 2000 // Allow time for DB updates
      });

      console.log(`Data extraction completed for referral ${referralId}`);
      
      return {
        success: true,
        extractedData
      };

    } catch (error) {
      console.error(`Data extraction failed for referral ${referralId}:`, error);
      
      // Update referral status
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          aiProcessingStatus: 'extraction_failed',
          aiProcessingError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Extraction is resource-intensive
  }
);

// Error handling
extractionWorker.on('failed', (job, err) => {
  console.error(`Extraction job ${job?.id} failed:`, err);
});

extractionWorker.on('completed', (job, result) => {
  console.log(`Extraction job ${job?.id} completed`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await extractionWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await extractionWorker.close();
  process.exit(0);
});

export default extractionWorker;
