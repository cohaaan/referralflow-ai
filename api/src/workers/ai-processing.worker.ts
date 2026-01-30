import { Worker } from 'bullmq';
import { redisConnection } from '../lib/queues';
import { admissionsAgent } from '../agents/admissions.agent';
import { reimbursementAgent } from '../agents/reimbursement.agent';
import { clinicalAgent } from '../agents/clinical.agent';
import { documentationAgent } from '../agents/documentation.agent';
import { prisma } from '../lib/prisma';

interface AIProcessingJobData {
  referralId: string;
  extractedData: any;
}

const aiProcessingWorker = new Worker(
  'ai-processing',
  async (job) => {
    const { referralId, extractedData } = job.data as AIProcessingJobData;
    const startTime = Date.now();
    
    console.log(`Starting AI processing for referral ${referralId}`);
    
    try {
      // Update referral status
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          aiProcessingStatus: 'processing',
          aiProcessingStartedAt: new Date()
        }
      });

      // Get referral details
      const referral = await prisma.referral.findUnique({
        where: { id: referralId },
        include: {
          documents: true
        }
      });

      if (!referral) {
        throw new Error(`Referral ${referralId} not found`);
      }

      // Run agents in parallel
      const [admissionsResult, reimbursementResult, clinicalResult] = await Promise.all([
        admissionsAgent({ extractedData, facilityId: referral.facilityId }),
        reimbursementAgent(extractedData),
        clinicalAgent(extractedData)
      ]);

      // Run documentation agent (depends on document types)
      const documentTypes = referral.documents
        .filter(d => d.documentType)
        .map(d => d.documentType!);
      
      const documentationResult = await documentationAgent(extractedData, documentTypes);

      // Calculate overall scores
      const overallScore = Math.round(
        (admissionsResult.fitScore * 0.4) +
        (reimbursementResult.financialScore * 0.3) +
        (clinicalResult.operationalScore * 0.3)
      );

      // Determine final recommendation
      const hasDealBreakers = admissionsResult.dealBreakers.length > 0;
      let recommendation: 'strong_accept' | 'accept' | 'accept_with_conditions' | 'review_required' | 'decline' | 'strong_decline';
      
      if (hasDealBreakers) {
        recommendation = 'decline';
      } else if (overallScore >= 85) {
        recommendation = 'strong_accept';
      } else if (overallScore >= 70) {
        recommendation = 'accept';
      } else if (overallScore >= 55) {
        recommendation = 'accept_with_conditions';
      } else if (overallScore >= 40) {
        recommendation = 'review_required';
      } else {
        recommendation = 'decline';
      }

      // Calculate confidence score
      const confidenceScore = Math.min(0.95, (overallScore / 100) * 0.9 + 0.1);

      // Generate summary
      const summary = generateSummary(
        admissionsResult,
        reimbursementResult,
        clinicalResult,
        documentationResult,
        recommendation
      );

      // Save AI recommendation
      await prisma.aIRecommendation.upsert({
        where: { referralId },
        update: {
          recommendation,
          confidenceScore,
          overallScore,
          clinicalFitScore: admissionsResult.fitScore,
          financialFitScore: reimbursementResult.financialScore,
          operationalFitScore: clinicalResult.operationalScore,
          pdpmComponents: reimbursementResult.pdpmComponents as any,
          estimatedDailyRate: reimbursementResult.estimatedDailyRate,
          estimatedLosDays: reimbursementResult.estimatedLosDays,
          estimatedTotalRevenue: reimbursementResult.estimatedTotalRevenue,
          positiveFactors: admissionsResult.positiveFactors,
          missingInfo: documentationResult.missingDocuments,
          reviewQuestions: clinicalResult.specialCareNeeds,
          summary: documentationResult.patientSummary,
          detailedRationale: summary,
          modelVersion: 'claude-3-5-sonnet-20241022',
          processingTimeMs: Date.now() - startTime,
          tokensUsed: 0 // Would need to track from API responses
        },
        create: {
          referralId,
          recommendation,
          confidenceScore,
          overallScore,
          clinicalFitScore: admissionsResult.fitScore,
          financialFitScore: reimbursementResult.financialScore,
          operationalFitScore: clinicalResult.operationalScore,
          pdpmComponents: reimbursementResult.pdpmComponents as any,
          estimatedDailyRate: reimbursementResult.estimatedDailyRate,
          estimatedLosDays: reimbursementResult.estimatedLosDays,
          estimatedTotalRevenue: reimbursementResult.estimatedTotalRevenue,
          positiveFactors: admissionsResult.positiveFactors,
          missingInfo: documentationResult.missingDocuments,
          reviewQuestions: clinicalResult.specialCareNeeds,
          summary: documentationResult.patientSummary,
          detailedRationale: summary,
          modelVersion: 'claude-3-5-sonnet-20241022',
          processingTimeMs: Date.now() - startTime,
          tokensUsed: 0
        }
      });

      // Create risk flags
      const allFlags = [
        ...admissionsResult.dealBreakers,
        ...admissionsResult.warnings,
        ...reimbursementResult.financialFlags,
        ...clinicalResult.comorbidityRisks
      ];

      for (const flag of allFlags) {
        await prisma.riskFlag.create({
          data: {
            referralId,
            category: flag.category,
            flagType: flag.flagType,
            severity: flag.severity,
            isDealBreaker: flag.isDealBreaker,
            title: flag.title,
            description: flag.description,
            recommendation: flag.recommendation,
            sourceAgent: 'ai-orchestrator'
          }
        });
      }

      // Log AI processing
      await (prisma as any).aIProcessingLog.create({
        data: {
          referralId,
          agentName: 'orchestrator',
          action: 'complete_analysis',
          inputSummary: `Processed ${referral.documents.length} documents`,
          outputSummary: `Recommendation: ${recommendation}, Score: ${overallScore}`,
          fullInput: { extractedData, documentTypes },
          fullOutput: {
            admissions: admissionsResult,
            reimbursement: reimbursementResult,
            clinical: clinicalResult,
            documentation: documentationResult
          },
          modelUsed: 'claude-3-5-sonnet-20241022',
          processingTimeMs: Date.now() - startTime,
          success: true
        }
      });

      // Update referral with recommendation
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          aiProcessingStatus: 'completed',
          aiProcessingCompletedAt: new Date(),
          aiRecommendation: recommendation,
          aiConfidenceScore: confidenceScore,
          status: 'ready_for_decision'
        }
      });

      console.log(`AI processing completed for referral ${referralId} - ${recommendation} (${overallScore})`);

      return {
        success: true,
        recommendation,
        overallScore,
        confidenceScore,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error(`AI processing failed for referral ${referralId}:`, error);
      
      // Update referral with error
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          aiProcessingStatus: 'failed',
          aiProcessingError: error instanceof Error ? error.message : 'Unknown error',
          status: 'pending_review'
        }
      });

      // Log failure
      await (prisma as any).aIProcessingLog.create({
        data: {
          referralId,
          agentName: 'orchestrator',
          action: 'complete_analysis',
          inputSummary: 'Processing failed',
          outputSummary: error instanceof Error ? error.message : 'Unknown error',
          modelUsed: 'claude-3-5-sonnet-20241022',
          processingTimeMs: Date.now() - startTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // AI processing is resource-intensive
  }
);

function generateSummary(
  admissions: any,
  reimbursement: any,
  clinical: any,
  documentation: any,
  recommendation: string
): string {
  const sections = [];

  sections.push(`## Recommendation: ${recommendation.toUpperCase()}`);
  sections.push('');
  
  sections.push('### Clinical Fit');
  sections.push(`Score: ${admissions.fitScore}/100`);
  if (admissions.positiveFactors.length > 0) {
    sections.push('Positive factors:');
    admissions.positiveFactors.forEach((f: string) => sections.push(`- ${f}`));
  }
  if (admissions.dealBreakers.length > 0) {
    sections.push('Deal breakers:');
    admissions.dealBreakers.forEach((f: any) => sections.push(`- ${f.title}: ${f.description}`));
  }
  
  sections.push('');
  sections.push('### Financial Analysis');
  sections.push(`Estimated daily rate: $${reimbursement.estimatedDailyRate}`);
  sections.push(`Estimated LOS: ${reimbursement.estimatedLosDays} days`);
  sections.push(`Estimated total revenue: $${reimbursement.estimatedTotalRevenue}`);
  sections.push(`Payer: ${reimbursement.payerAnalysis.payerType} (${reimbursement.payerAnalysis.riskLevel} risk)`);
  
  sections.push('');
  sections.push('### Clinical Complexity');
  sections.push(`Complexity score: ${clinical.clinicalComplexityScore}/10`);
  sections.push(`Estimated nursing hours/day: ${clinical.estimatedNursingHoursPerDay}`);
  if (clinical.specialCareNeeds.length > 0) {
    sections.push('Special care needs:');
    clinical.specialCareNeeds.forEach((n: string) => sections.push(`- ${n}`));
  }
  
  if (documentation.missingDocuments.length > 0) {
    sections.push('');
    sections.push('### Missing Documents');
    documentation.missingDocuments.forEach((d: string) => sections.push(`- ${d}`));
  }

  return sections.join('\n');
}

// Error handling
aiProcessingWorker.on('failed', (job, err) => {
  console.error(`AI processing job ${job?.id} failed:`, err);
});

aiProcessingWorker.on('completed', (job, result) => {
  console.log(`AI processing job ${job.id} completed:`, result);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await aiProcessingWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await aiProcessingWorker.close();
  process.exit(0);
});

export default aiProcessingWorker;
