import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { v4 as uuid } from 'uuid';

export async function facilityRoutes(fastify: FastifyInstance) {
  
  // Get all facilities
  fastify.get('/', async (request, reply) => {
    const facilities = await prisma.facility.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            referrals: true,
            beds: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return facilities;
  });

  // Get single facility
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        criteria: { where: { isActive: true } },
        beds: true,
        _count: { select: { referrals: true } }
      }
    });

    if (!facility) {
      return reply.status(404).send({ error: 'Facility not found' });
    }

    return facility;
  });

  // Get facility criteria
  fastify.get('/:id/criteria', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const criteria = await prisma.facilityCriteria.findMany({
      where: { facilityId: id },
      orderBy: [{ category: 'asc' }, { priority: 'asc' }]
    });

    return criteria;
  });

  // Create criterion
  fastify.post('/:id/criteria', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const criterion = await prisma.facilityCriteria.create({
      data: {
        id: uuid(),
        facilityId: id,
        name: body.name,
        description: body.description,
        category: body.category,
        ruleType: body.ruleType,
        ruleDefinition: body.ruleDefinition,
        priority: body.priority || 100,
        weight: body.weight || 1,
        isDealBreaker: body.isDealBreaker || false,
        isActive: true
      }
    });

    return criterion;
  });

  // Update criterion
  fastify.patch('/:id/criteria/:criteriaId', async (request, reply) => {
    const { criteriaId } = request.params as { id: string; criteriaId: string };
    const body = request.body as any;

    const criterion = await prisma.facilityCriteria.update({
      where: { id: criteriaId },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        ruleType: body.ruleType,
        ruleDefinition: body.ruleDefinition,
        priority: body.priority,
        weight: body.weight,
        isDealBreaker: body.isDealBreaker,
        isActive: body.isActive
      }
    });

    return criterion;
  });

  // Delete criterion
  fastify.delete('/:id/criteria/:criteriaId', async (request, reply) => {
    const { criteriaId } = request.params as { id: string; criteriaId: string };

    await prisma.facilityCriteria.delete({
      where: { id: criteriaId }
    });

    return { success: true };
  });
}
