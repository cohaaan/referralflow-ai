import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: uuid(),
      name: 'Beachwood Healthcare',
      slug: 'beachwood',
      settings: { theme: 'default' }
    }
  });
  console.log('✅ Created organization:', org.name);

  // Create facility
  const facility = await prisma.facility.create({
    data: {
      id: uuid(),
      organizationId: org.id,
      name: 'Beachwood Skilled Nursing',
      facilityType: 'SNF',
      npi: '1234567890',
      addressLine1: '123 Healthcare Way',
      city: 'Beachwood',
      state: 'OH',
      zipCode: '44122',
      phone: '(216) 555-0100',
      fax: '(216) 555-0101',
      totalBeds: 120,
      licensedBeds: 120,
      medicareCertified: true,
      medicaidCertified: true
    }
  });
  console.log('✅ Created facility:', facility.name);

  // Create user
  const user = await prisma.user.create({
    data: {
      id: uuid(),
      organizationId: org.id,
      email: 'admin@beachwood.com',
      passwordHash: 'hashed_password_here',
      firstName: 'Ronald',
      lastName: 'Admin',
      role: 'admissions_director'
    }
  });
  console.log('✅ Created user:', user.email);

  // Create user-facility access
  await prisma.userFacilityAccess.create({
    data: {
      id: uuid(),
      userId: user.id,
      facilityId: facility.id,
      accessLevel: 'full'
    }
  });

  // Create sample criteria
  const criteria = [
    {
      name: 'Ventilator Dependent',
      category: 'clinical',
      ruleType: 'hard_stop',
      isDealBreaker: true,
      ruleDefinition: {
        field: 'careRequirements.requiresVentilator',
        operator: 'equals',
        value: true,
        message: 'Patient requires ventilator - facility not equipped'
      }
    },
    {
      name: 'High Fall Risk',
      category: 'clinical',
      ruleType: 'soft_flag',
      isDealBreaker: false,
      ruleDefinition: {
        field: 'functionalStatus.fallRisk',
        operator: 'equals',
        value: 'High',
        message: 'High fall risk - may require additional monitoring'
      }
    },
    {
      name: 'Medicare A Preferred',
      category: 'financial',
      ruleType: 'scoring',
      isDealBreaker: false,
      ruleDefinition: {
        field: 'insuranceInfo.primaryPayer',
        operator: 'equals',
        value: 'Medicare A',
        scoreImpact: 20,
        message: 'Medicare A - optimal reimbursement'
      }
    },
    {
      name: 'Dialysis Required',
      category: 'operational',
      ruleType: 'soft_flag',
      isDealBreaker: false,
      ruleDefinition: {
        field: 'careRequirements.requiresDialysis',
        operator: 'equals',
        value: true,
        message: 'Dialysis required - verify transportation availability'
      }
    }
  ];

  for (const c of criteria) {
    await prisma.facilityCriteria.create({
      data: {
        id: uuid(),
        facilityId: facility.id,
        ...c,
        priority: 100,
        weight: 1,
        isActive: true
      }
    });
  }
  console.log('✅ Created', criteria.length, 'admission criteria');

  // Create beds
  const units = ['East Wing', 'West Wing', 'Memory Care'];
  let bedCount = 0;
  
  for (const unit of units) {
    for (let room = 100; room < 114; room++) {
      for (const letter of ['A', 'B']) {
        const isOccupied = Math.random() > 0.35;
        await prisma.bed.create({
          data: {
            id: uuid(),
            facilityId: facility.id,
            unitName: unit,
            roomNumber: String(room),
            bedIdentifier: letter,
            bedType: 'standard',
            isPrivateRoom: letter === 'A' && Math.random() > 0.7,
            status: isOccupied ? 'occupied' : 'available',
            capabilities: [],
            isActive: true
          }
        });
        bedCount++;
      }
    }
  }
  console.log('✅ Created', bedCount, 'beds');

  // Create sample referrals
  const referrals = [
    {
      patientFirstName: 'Ronald',
      patientLastName: 'Richards',
      patientDob: new Date('1946-08-16'),
      patientGender: 'male',
      referralSource: 'Mount Sinai Hospital',
      referringFacilityName: 'Mount Sinai Hospital',
      caseManagerName: 'Sarah Johnson',
      caseManagerPhone: '(216) 555-1234',
      status: 'ready_for_decision' as const,
      priority: 'high',
      isUrgent: false,
      aiProcessingStatus: 'completed',
      aiRecommendation: 'accept' as const,
      aiConfidenceScore: 0.92
    },
    {
      patientFirstName: 'Jerome',
      patientLastName: 'Bell',
      patientDob: new Date('1952-03-22'),
      patientGender: 'male',
      referralSource: 'Cleveland Clinic',
      referringFacilityName: 'Cleveland Clinic',
      caseManagerName: 'Mike Chen',
      caseManagerPhone: '(216) 555-5678',
      status: 'under_review' as const,
      priority: 'normal',
      isUrgent: false,
      aiProcessingStatus: 'completed',
      aiRecommendation: 'review_required' as const,
      aiConfidenceScore: 0.65
    },
    {
      patientFirstName: 'Darrell',
      patientLastName: 'Steward',
      patientDob: new Date('1948-11-05'),
      patientGender: 'male',
      referralSource: 'University Hospital',
      referringFacilityName: 'University Hospital',
      caseManagerName: 'Lisa Wong',
      caseManagerPhone: '(216) 555-9012',
      status: 'new' as const,
      priority: 'normal',
      isUrgent: false,
      aiProcessingStatus: 'pending',
      aiRecommendation: null,
      aiConfidenceScore: null
    },
    {
      patientFirstName: 'Dianne',
      patientLastName: 'Russell',
      patientDob: new Date('1944-07-19'),
      patientGender: 'female',
      referralSource: 'MetroHealth',
      referringFacilityName: 'MetroHealth System',
      caseManagerName: 'Tom Davis',
      caseManagerPhone: '(216) 555-3456',
      status: 'accepted' as const,
      priority: 'high',
      isUrgent: true,
      aiProcessingStatus: 'completed',
      aiRecommendation: 'accept' as const,
      aiConfidenceScore: 0.88
    },
    {
      patientFirstName: 'Cody',
      patientLastName: 'Fisher',
      patientDob: new Date('1950-09-30'),
      patientGender: 'male',
      referralSource: 'Fairview Hospital',
      referringFacilityName: 'Fairview Hospital',
      caseManagerName: 'Emily Brown',
      caseManagerPhone: '(216) 555-7890',
      status: 'pending_review' as const,
      priority: 'normal',
      isUrgent: false,
      aiProcessingStatus: 'processing',
      aiRecommendation: null,
      aiConfidenceScore: null
    }
  ];

  for (const ref of referrals) {
    const referral = await prisma.referral.create({
      data: {
        id: uuid(),
        facilityId: facility.id,
        ...ref,
        receivedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Create patient record
    await prisma.patient.create({
      data: {
        id: uuid(),
        referralId: referral.id,
        firstName: ref.patientFirstName,
        lastName: ref.patientLastName,
        dateOfBirth: ref.patientDob,
        gender: ref.patientGender,
        age: new Date().getFullYear() - ref.patientDob.getFullYear()
      }
    });

    // Create AI recommendation for completed ones
    if (ref.aiProcessingStatus === 'completed' && ref.aiRecommendation) {
      await prisma.aIRecommendation.create({
        data: {
          id: uuid(),
          referralId: referral.id,
          recommendation: ref.aiRecommendation,
          confidenceScore: ref.aiConfidenceScore,
          overallScore: Math.round(70 + Math.random() * 25),
          clinicalFitScore: Math.round(70 + Math.random() * 25),
          financialFitScore: Math.round(75 + Math.random() * 20),
          operationalFitScore: Math.round(80 + Math.random() * 15),
          estimatedDailyRate: 550 + Math.random() * 200,
          estimatedLosDays: 14 + Math.round(Math.random() * 14),
          estimatedTotalRevenue: 10000 + Math.random() * 10000,
          positiveFactors: ['High rehab potential', 'Insurance verified', 'Family support'],
          summary: 'Patient is a good fit for admission based on clinical and financial criteria.'
        }
      });

      // Create some risk flags
      if (Math.random() > 0.5) {
        await prisma.riskFlag.create({
          data: {
            id: uuid(),
            referralId: referral.id,
            category: 'clinical',
            flagType: 'warning',
            severity: 'medium',
            title: 'High Fall Risk',
            description: 'Patient has history of falls',
            sourceAgent: 'clinical_agent'
          }
        });
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        id: uuid(),
        referralId: referral.id,
        activityType: 'referral_received',
        description: `Referral received from ${ref.referringFacilityName}`,
        isSystemGenerated: true
      }
    });
  }
  console.log('✅ Created', referrals.length, 'sample referrals');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
