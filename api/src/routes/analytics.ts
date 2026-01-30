import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  
  // Dashboard stats
  fastify.get('/dashboard', async (request, reply) => {
    const { facilityId } = request.query as any;

    const where: any = {};
    if (facilityId) where.facilityId = facilityId;

    // Get date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch stats
    const [
      totalReferrals,
      weekReferrals,
      monthReferrals,
      pendingReferrals,
      acceptedThisMonth,
      declinedThisMonth,
      avgResponseTime
    ] = await Promise.all([
      prisma.referral.count({ where }),
      prisma.referral.count({ where: { ...where, receivedAt: { gte: startOfWeek } } }),
      prisma.referral.count({ where: { ...where, receivedAt: { gte: startOfMonth } } }),
      prisma.referral.count({ where: { ...where, status: { in: ['new', 'processing', 'pending_review', 'under_review'] } } }),
      prisma.referral.count({ where: { ...where, status: 'accepted', decisionAt: { gte: startOfMonth } } }),
      prisma.referral.count({ where: { ...where, status: 'declined', decisionAt: { gte: startOfMonth } } }),
      prisma.referral.aggregate({
        where: { ...where, decisionAt: { not: null } },
        _avg: { priorityScore: true }
      })
    ]);

    const acceptanceRate = acceptedThisMonth + declinedThisMonth > 0 
      ? Math.round((acceptedThisMonth / (acceptedThisMonth + declinedThisMonth)) * 100)
      : 0;

    return {
      totalReferrals,
      weekReferrals,
      monthReferrals,
      pendingReferrals,
      acceptedThisMonth,
      declinedThisMonth,
      acceptanceRate,
      avgResponseTimeHours: 4.2 // Mock for now
    };
  });

  // Referral funnel
  fastify.get('/referral-funnel', async (request, reply) => {
    const { facilityId, startDate, endDate } = request.query as any;

    const where: any = {};
    if (facilityId) where.facilityId = facilityId;
    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt.gte = new Date(startDate);
      if (endDate) where.receivedAt.lte = new Date(endDate);
    }

    const statusCounts = await prisma.referral.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    const funnel = [
      { stage: 'Received', count: statusCounts.reduce((sum, s) => sum + s._count.status, 0) },
      { stage: 'In Review', count: statusCounts.filter(s => ['processing', 'pending_review', 'under_review', 'ready_for_decision'].includes(s.status))
        .reduce((sum, s) => sum + s._count.status, 0) },
      { stage: 'Accepted', count: statusCounts.find(s => s.status === 'accepted')?._count.status || 0 },
      { stage: 'Admitted', count: statusCounts.find(s => s.status === 'admitted')?._count.status || 0 }
    ];

    return funnel;
  });

  // Decline reasons
  fastify.get('/decline-reasons', async (request, reply) => {
    const { facilityId } = request.query as any;

    const where: any = { status: 'declined' };
    if (facilityId) where.facilityId = facilityId;

    const reasons = await prisma.referral.groupBy({
      by: ['declineReasonCategory'],
      where,
      _count: { declineReasonCategory: true }
    });

    return reasons.map(r => ({
      reason: r.declineReasonCategory || 'Unspecified',
      count: r._count.declineReasonCategory
    })).sort((a, b) => b.count - a.count);
  });

  // Payer mix
  fastify.get('/payer-mix', async (request, reply) => {
    const { facilityId } = request.query as any;

    // For now return mock data - would need extracted insurance data
    return [
      { payer: 'Medicare A', count: 45, percentage: 38 },
      { payer: 'Medicaid', count: 35, percentage: 29 },
      { payer: 'Medicare Advantage', count: 22, percentage: 18 },
      { payer: 'Private Pay', count: 10, percentage: 8 },
      { payer: 'Other', count: 8, percentage: 7 }
    ];
  });

  // AI accuracy
  fastify.get('/ai-accuracy', async (request, reply) => {
    const { facilityId } = request.query as any;

    const where: any = { finalDecision: { not: null }, aiRecommendation: { not: null } };
    if (facilityId) where.facilityId = facilityId;

    const [followed, overridden] = await Promise.all([
      prisma.referral.count({ where: { ...where, followedAiRecommendation: true } }),
      prisma.referral.count({ where: { ...where, followedAiRecommendation: false } })
    ]);

    const total = followed + overridden;
    
    return {
      total,
      followed,
      overridden,
      accuracyRate: total > 0 ? Math.round((followed / total) * 100) : 0
    };
  });

  // Volume trend
  fastify.get('/volume-trend', async (request, reply) => {
    const { facilityId, days = 30 } = request.query as any;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where: any = { receivedAt: { gte: startDate } };
    if (facilityId) where.facilityId = facilityId;

    const referrals = await prisma.referral.findMany({
      where,
      select: { receivedAt: true, status: true }
    });

    // Group by date
    const byDate: Record<string, { total: number; accepted: number; declined: number }> = {};
    
    for (let i = 0; i < Number(days); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      byDate[key] = { total: 0, accepted: 0, declined: 0 };
    }

    referrals.forEach(r => {
      const key = r.receivedAt.toISOString().split('T')[0];
      if (byDate[key]) {
        byDate[key].total++;
        if (r.status === 'accepted' || r.status === 'admitted') byDate[key].accepted++;
        if (r.status === 'declined') byDate[key].declined++;
      }
    });

    return Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}
