import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { analyzeReferral } from '../lib/anthropic.js';
import { v4 as uuid } from 'uuid';
import { uploadDocument, getDocumentDownloadUrl, getDocumentsForReferral, retryDocumentProcessing } from '../services/document.service.js';

export async function referralRoutes(fastify: FastifyInstance) {
  
  // Get all referrals with filters
  fastify.get('/', async (request, reply) => {
    const { status, facilityId, limit = 50, offset = 0 } = request.query as any;
    
    const where: any = {};
    if (status) where.status = status;
    if (facilityId) where.facilityId = facilityId;

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          patient: true,
          aiRecommendationData: true,
          riskFlags: { where: { isResolved: false } },
          documents: { select: { id: true, documentType: true, originalFilename: true } }
        },
        orderBy: { receivedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.referral.count({ where })
    ]);

    return { referrals, total, limit: Number(limit), offset: Number(offset) };
  });

  // Get single referral
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        patient: true,
        extractedData: true,
        aiRecommendationData: true,
        riskFlags: true,
        documents: true,
        activities: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!referral) {
      return reply.status(404).send({ error: 'Referral not found' });
    }

    return referral;
  });

  // Create referral
  fastify.post('/', async (request, reply) => {
    const body = request.body as any;
    
    const referral = await prisma.referral.create({
      data: {
        id: uuid(),
        facilityId: body.facilityId,
        referralSource: body.referralSource || 'manual',
        referringFacilityName: body.referringFacilityName,
        caseManagerName: body.caseManagerName,
        caseManagerPhone: body.caseManagerPhone,
        caseManagerEmail: body.caseManagerEmail,
        patientFirstName: body.patientFirstName,
        patientLastName: body.patientLastName,
        patientDob: body.patientDob ? new Date(body.patientDob) : null,
        patientGender: body.patientGender,
        priority: body.priority || 'normal',
        isUrgent: body.isUrgent || false,
        status: 'new',
        patient: body.patientFirstName ? {
          create: {
            id: uuid(),
            firstName: body.patientFirstName,
            lastName: body.patientLastName,
            dateOfBirth: body.patientDob ? new Date(body.patientDob) : null,
            gender: body.patientGender
          }
        } : undefined
      },
      include: { patient: true }
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: uuid(),
        referralId: referral.id,
        activityType: 'referral_created',
        description: 'Referral created',
        isSystemGenerated: true
      }
    });

    return referral;
  });

  // Update referral
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const referral = await prisma.referral.update({
      where: { id },
      data: {
        status: body.status,
        substatus: body.substatus,
        priority: body.priority,
        isUrgent: body.isUrgent,
        assignedToId: body.assignedToId,
        internalNotes: body.internalNotes,
        tags: body.tags
      }
    });

    if (body.status) {
      await prisma.activity.create({
        data: {
          id: uuid(),
          referralId: id,
          activityType: 'status_changed',
          description: `Status changed to ${body.status}`,
          metadata: { newStatus: body.status },
          isSystemGenerated: true
        }
      });
    }

    return referral;
  });

  // Record decision
  fastify.post('/:id/decision', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { decision, reason, declineCategory, notes } = request.body as any;

    const referral = await prisma.referral.findUnique({
      where: { id },
      include: { aiRecommendationData: true }
    });

    if (!referral) {
      return reply.status(404).send({ error: 'Referral not found' });
    }

    const followedAi = referral.aiRecommendation === decision;

    const updated = await prisma.referral.update({
      where: { id },
      data: {
        status: decision === 'accept' ? 'accepted' : decision === 'decline' ? 'declined' : 'pending_info',
        finalDecision: decision,
        decisionReason: notes,
        declineReasonCategory: declineCategory,
        decisionAt: new Date(),
        followedAiRecommendation: followedAi,
        overrideReason: !followedAi ? reason : null
      }
    });

    await prisma.activity.create({
      data: {
        id: uuid(),
        referralId: id,
        activityType: 'decision_made',
        description: `Decision: ${decision}${reason ? ` - ${reason}` : ''}`,
        metadata: { decision, followedAi },
        isSystemGenerated: true
      }
    });

    return updated;
  });

  // Trigger AI processing
  fastify.post('/:id/process', async (request, reply) => {
    const { id } = request.params as { id: string };

    const referral = await prisma.referral.findUnique({
      where: { id },
      include: { 
        extractedData: true,
        facility: true
      }
    });

    if (!referral) {
      return reply.status(404).send({ error: 'Referral not found' });
    }

    // Update status
    await prisma.referral.update({
      where: { id },
      data: {
        aiProcessingStatus: 'processing',
        aiProcessingStartedAt: new Date(),
        status: 'processing'
      }
    });

    try {
      // Run AI analysis
      const analysis = await analyzeReferral(
        referral.extractedData || { patientName: `${referral.patientFirstName} ${referral.patientLastName}` },
        referral.facility?.name || 'Unknown Facility'
      );

      // Save AI recommendation
      await prisma.aIRecommendation.upsert({
        where: { referralId: id },
        create: {
          id: uuid(),
          referralId: id,
          recommendation: analysis.recommendation === 'accept' ? 'accept' : 
                         analysis.recommendation === 'decline' ? 'decline' : 'review_required',
          confidenceScore: analysis.confidence,
          overallScore: Math.round((analysis.scores.clinical + analysis.scores.financial + analysis.scores.operational) / 3),
          clinicalFitScore: analysis.scores.clinical,
          financialFitScore: analysis.scores.financial,
          operationalFitScore: analysis.scores.operational,
          estimatedDailyRate: analysis.estimatedDailyRate,
          estimatedLosDays: analysis.estimatedLosDays,
          estimatedTotalRevenue: analysis.estimatedRevenue,
          positiveFactors: analysis.positiveFactors,
          missingInfo: analysis.missingInfo,
          summary: analysis.summary
        },
        update: {
          recommendation: analysis.recommendation === 'accept' ? 'accept' : 
                         analysis.recommendation === 'decline' ? 'decline' : 'review_required',
          confidenceScore: analysis.confidence,
          overallScore: Math.round((analysis.scores.clinical + analysis.scores.financial + analysis.scores.operational) / 3),
          clinicalFitScore: analysis.scores.clinical,
          financialFitScore: analysis.scores.financial,
          operationalFitScore: analysis.scores.operational,
          estimatedDailyRate: analysis.estimatedDailyRate,
          estimatedLosDays: analysis.estimatedLosDays,
          estimatedTotalRevenue: analysis.estimatedRevenue,
          positiveFactors: analysis.positiveFactors,
          missingInfo: analysis.missingInfo,
          summary: analysis.summary
        }
      });

      // Create risk flags
      for (const flag of analysis.flags || []) {
        await prisma.riskFlag.create({
          data: {
            id: uuid(),
            referralId: id,
            category: 'clinical',
            flagType: flag.severity,
            severity: flag.severity === 'hard_stop' ? 'critical' : flag.severity === 'warning' ? 'high' : 'medium',
            isDealBreaker: flag.severity === 'hard_stop',
            title: flag.text,
            sourceAgent: 'admissions_agent'
          }
        });
      }

      // Update referral with AI result
      await prisma.referral.update({
        where: { id },
        data: {
          aiProcessingStatus: 'completed',
          aiProcessingCompletedAt: new Date(),
          status: 'ready_for_decision',
          aiRecommendation: analysis.recommendation === 'accept' ? 'accept' : 
                           analysis.recommendation === 'decline' ? 'decline' : 'review_required',
          aiConfidenceScore: analysis.confidence
        }
      });

      await prisma.activity.create({
        data: {
          id: uuid(),
          referralId: id,
          activityType: 'ai_analysis_completed',
          description: `AI recommends: ${analysis.recommendation} (${Math.round(analysis.confidence * 100)}% confidence)`,
          isSystemGenerated: true
        }
      });

      return { success: true, analysis };
    } catch (error: any) {
      await prisma.referral.update({
        where: { id },
        data: {
          aiProcessingStatus: 'failed',
          aiProcessingError: error.message
        }
      });
      return reply.status(500).send({ error: 'AI processing failed', details: error.message });
    }
  });

  // Get timeline/activities
  fastify.get('/:id/timeline', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const activities = await prisma.activity.findMany({
      where: { referralId: id },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return activities;
  });

  // Add comment
  fastify.post('/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { text, userId } = request.body as any;

    const activity = await prisma.activity.create({
      data: {
        id: uuid(),
        referralId: id,
        userId,
        activityType: 'comment',
        description: text,
        isSystemGenerated: false
      }
    });

    return activity;
  });

  // Upload document
  fastify.post('/:id/documents', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Check referral exists
    const referral = await prisma.referral.findUnique({ where: { id } });
    if (!referral) {
      return reply.status(404).send({ error: 'Referral not found' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    
    try {
      const result = await uploadDocument({
        referralId: id,
        file: buffer,
        filename: data.filename,
        mimeType: data.mimetype
      });

      return { success: true, document: result };
    } catch (error: any) {
      return reply.status(500).send({ error: 'Upload failed', details: error.message });
    }
  });

  // Get documents for referral
  fastify.get('/:id/documents', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const documents = await getDocumentsForReferral(id);
    return { documents };
  });

  // Get document download URL
  fastify.get('/:id/documents/:docId/download', async (request, reply) => {
    const { docId } = request.params as { id: string; docId: string };
    
    try {
      const url = await getDocumentDownloadUrl(docId);
      return { url };
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  });

  // Retry document processing
  fastify.post('/:id/documents/:docId/retry', async (request, reply) => {
    const { docId } = request.params as { id: string; docId: string };
    
    try {
      const result = await retryDocumentProcessing(docId);
      return result;
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
