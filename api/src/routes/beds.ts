import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { v4 as uuid } from 'uuid';

export async function bedRoutes(fastify: FastifyInstance) {
  
  // Get all beds for a facility
  fastify.get('/facility/:facilityId', async (request, reply) => {
    const { facilityId } = request.params as { facilityId: string };
    const { unit, status } = request.query as any;

    const where: any = { facilityId, isActive: true };
    if (unit) where.unitName = unit;
    if (status) where.status = status;

    const beds = await prisma.bed.findMany({
      where,
      orderBy: [{ unitName: 'asc' }, { roomNumber: 'asc' }, { bedIdentifier: 'asc' }]
    });

    // Calculate stats
    const stats = {
      total: beds.length,
      available: beds.filter(b => b.status === 'available').length,
      occupied: beds.filter(b => b.status === 'occupied').length,
      reserved: beds.filter(b => b.status === 'reserved').length,
      blocked: beds.filter(b => b.status === 'cleaning' || b.status === 'maintenance').length
    };

    return { beds, stats };
  });

  // Update bed status
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, currentPatientId, reservedForReferralId, reservedUntil } = request.body as any;

    const bed = await prisma.bed.update({
      where: { id },
      data: {
        status,
        currentPatientId,
        reservedForReferralId,
        reservedUntil: reservedUntil ? new Date(reservedUntil) : null
      }
    });

    return bed;
  });

  // Reserve bed for referral
  fastify.post('/:id/reserve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { referralId, reserveUntil } = request.body as any;

    const bed = await prisma.bed.update({
      where: { id },
      data: {
        status: 'reserved',
        reservedForReferralId: referralId,
        reservedUntil: reserveUntil ? new Date(reserveUntil) : null
      }
    });

    return bed;
  });

  // Release bed reservation
  fastify.post('/:id/release', async (request, reply) => {
    const { id } = request.params as { id: string };

    const bed = await prisma.bed.update({
      where: { id },
      data: {
        status: 'available',
        reservedForReferralId: null,
        reservedUntil: null
      }
    });

    return bed;
  });

  // Get bed census summary
  fastify.get('/census/:facilityId', async (request, reply) => {
    const { facilityId } = request.params as { facilityId: string };

    const beds = await prisma.bed.findMany({
      where: { facilityId, isActive: true }
    });

    const units = [...new Set(beds.map(b => b.unitName).filter(Boolean))];
    
    const censusByUnit = units.map(unit => {
      const unitBeds = beds.filter(b => b.unitName === unit);
      return {
        unit,
        total: unitBeds.length,
        occupied: unitBeds.filter(b => b.status === 'occupied').length,
        available: unitBeds.filter(b => b.status === 'available').length,
        occupancyRate: Math.round((unitBeds.filter(b => b.status === 'occupied').length / unitBeds.length) * 100)
      };
    });

    const totalOccupied = beds.filter(b => b.status === 'occupied').length;
    const totalAvailable = beds.filter(b => b.status === 'available').length;

    return {
      facilityId,
      totalBeds: beds.length,
      totalOccupied,
      totalAvailable,
      occupancyRate: Math.round((totalOccupied / beds.length) * 100),
      censusByUnit
    };
  });
}
