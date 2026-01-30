import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { extractPatientData } from '../lib/anthropic.js';
import { v4 as uuid } from 'uuid';

export async function aiRoutes(fastify: FastifyInstance) {
  
  // Get extracted data for a referral
  fastify.get('/extraction/:referralId', async (request, reply) => {
    const { referralId } = request.params as { referralId: string };
    
    const data = await prisma.extractedPatientData.findUnique({
      where: { referralId }
    });

    if (!data) {
      return reply.status(404).send({ error: 'No extracted data found' });
    }

    return data;
  });

  // Get AI recommendation for a referral
  fastify.get('/recommendation/:referralId', async (request, reply) => {
    const { referralId } = request.params as { referralId: string };
    
    const recommendation = await prisma.aIRecommendation.findUnique({
      where: { referralId }
    });

    if (!recommendation) {
      return reply.status(404).send({ error: 'No recommendation found' });
    }

    return recommendation;
  });

  // Get risk flags for a referral
  fastify.get('/flags/:referralId', async (request, reply) => {
    const { referralId } = request.params as { referralId: string };
    const { resolved } = request.query as any;

    const where: any = { referralId };
    if (resolved !== undefined) {
      where.isResolved = resolved === 'true';
    }

    const flags = await prisma.riskFlag.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return flags;
  });

  // Resolve a risk flag
  fastify.patch('/flags/:flagId/resolve', async (request, reply) => {
    const { flagId } = request.params as { flagId: string };
    const { notes, userId } = request.body as any;

    const flag = await prisma.riskFlag.update({
      where: { id: flagId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: userId,
        resolutionNotes: notes
      }
    });

    return flag;
  });

  // Unresolve a risk flag
  fastify.patch('/flags/:flagId/unresolve', async (request, reply) => {
    const { flagId } = request.params as { flagId: string };

    const flag = await prisma.riskFlag.update({
      where: { id: flagId },
      data: {
        isResolved: false,
        resolvedAt: null,
        resolvedById: null,
        resolutionNotes: null
      }
    });

    return flag;
  });

  // Manual extraction from text
  fastify.post('/extract', async (request, reply) => {
    const { referralId, text } = request.body as any;

    if (!text) {
      return reply.status(400).send({ error: 'Text is required' });
    }

    try {
      const extracted = await extractPatientData(text);

      if (referralId) {
        // Save to database
        await prisma.extractedPatientData.upsert({
          where: { referralId },
          create: {
            id: uuid(),
            referralId,
            extractionVersion: '1.0',
            modelUsed: 'claude-3-5-sonnet',
            overallConfidence: 0.85,
            clinicalSummary: extracted.clinicalSummary,
            diagnoses: extracted.diagnoses,
            medications: extracted.medications,
            functionalStatus: extracted.functionalStatus,
            careRequirements: extracted.careRequirements,
            insuranceInfo: extracted.insuranceInfo,
            rawExtractionOutput: extracted
          },
          update: {
            extractionVersion: '1.0',
            modelUsed: 'claude-3-5-sonnet',
            extractedAt: new Date(),
            overallConfidence: 0.85,
            clinicalSummary: extracted.clinicalSummary,
            diagnoses: extracted.diagnoses,
            medications: extracted.medications,
            functionalStatus: extracted.functionalStatus,
            careRequirements: extracted.careRequirements,
            insuranceInfo: extracted.insuranceInfo,
            rawExtractionOutput: extracted
          }
        });

        // Update patient data if demographics extracted
        if (extracted.demographics) {
          await prisma.patient.upsert({
            where: { referralId },
            create: {
              id: uuid(),
              referralId,
              firstName: extracted.demographics.firstName,
              lastName: extracted.demographics.lastName,
              dateOfBirth: extracted.demographics.dob ? new Date(extracted.demographics.dob) : null,
              age: extracted.demographics.age,
              gender: extracted.demographics.gender
            },
            update: {
              firstName: extracted.demographics.firstName,
              lastName: extracted.demographics.lastName,
              dateOfBirth: extracted.demographics.dob ? new Date(extracted.demographics.dob) : null,
              age: extracted.demographics.age,
              gender: extracted.demographics.gender
            }
          });
        }

        await prisma.activity.create({
          data: {
            id: uuid(),
            referralId,
            activityType: 'data_extracted',
            description: 'Patient data extracted from documents',
            isSystemGenerated: true
          }
        });
      }

      return extracted;
    } catch (error: any) {
      return reply.status(500).send({ error: 'Extraction failed', details: error.message });
    }
  });
}
