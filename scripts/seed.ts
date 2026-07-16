/**
 * Seed script for Naya Wallah Kanoon.
 * Usage: `ALLOW_DEMO_SEED=true SEED_MODE=dev npm run db:seed`
 *
 * Requires explicit SEED_MODE env var:
 *   - "dev"   → seeds development data with generated passwords
 *   - "test"  → seeds minimal test data
 *   - "demo"  → seeds full demo (requires SEED_MODE=demo explicitly)
 *
 * REJECTED in production mode (NODE_ENV=production).
 *
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const db = new PrismaClient()

const SEED_MODE = process.env.SEED_MODE || ''
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function generateRandomPassword(): string {
  return crypto.randomBytes(12).toString('base64url').slice(0, 16) + 'A1'
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production')
  if (process.env.ALLOW_DEMO_SEED !== 'true') throw new Error('Set ALLOW_DEMO_SEED=true to create local demo data')
  if (IS_PRODUCTION) {
    console.error('ERROR: Seed script is rejected in production mode.')
    console.error('Set NODE_ENV=development and SEED_MODE=dev to seed.')
    process.exit(1)
  }

  if (!SEED_MODE || !['dev', 'test', 'demo'].includes(SEED_MODE)) {
    console.error('ERROR: SEED_MODE environment variable is required.')
    console.error('Usage: ALLOW_DEMO_SEED=true SEED_MODE=dev npm run db:seed')
    console.error('Valid modes: dev, test, demo')
    process.exit(1)
  }

  console.log(`Seeding in "${SEED_MODE}" mode...`)

  // --- Institute settings ---
  await db.instituteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      instituteName: 'Naya Wallah Kanoon',
      tagline: 'Judicial Classes — New Law, New Way',
      primaryEmail: 'nayawallahkanoon@gmail.com',
      primaryPhone: '+91 9660315644',
      address: 'Jaipur, Rajasthan, India',
      mapsEmbedUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.847!2d75.7873!3d26.9124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDU0JzQ0LjYiTiA3NcKwNDcnMTQuMyJF!5e0!3m2!1sen!2sin!4v1700000000000',
      heroTitle: 'Naya Wallah Kanoon Judicial Classes',
      heroSubtitle:
        'Judicial services preparation, now at your doorstep. A dedicated coaching platform built to guide sincere aspirants toward a career in law. Beginning | Consistency | Result.',
      aboutMission:
        'To deliver sharp, reliable preparation to every sincere aspirant — treating each one not as a number, but as family.',
      aboutVision:
        'A platform built on you — our students. Naya Wallah Kanoon humse nahi, aapse… humare students se bana hai.',
      aboutText:
        'Naya Wallah Kanoon Judicial Classes is a dedicated coaching platform built to guide sincere aspirants toward a career in law. We are accessible anywhere — we now reach you right at your doorstep. Founded by Adv. Akash Faujdar, practising at the Rajasthan High Court since 2021, our vision is simple — deliver sharp, reliable preparation to every sincere aspirant, and treat each one not as a number, but as family. At Naya Wallah Kanoon, every student is family, and we mean it literally.',
      statStudents: 500,
      statCourses: 3,
      statPassRate: 92,
      statExperience: 4,
      socialFacebook: 'https://facebook.com/nayawallahkanoon',
      socialTwitter: '',
      socialLinkedin: 'https://linkedin.com/company/nayawallahkanoon',
      socialYoutube: '',
      socialInstagram: 'https://instagram.com/nayawallahkanoon',
      videoCompletionThreshold: 90,
      defaultMaxAttempts: 3,
      maxUploadMb: 20,
      maintenanceMode: false,
      revenueEnabled: false,
      certificatesEnabled: false,
    },
  })

  // --- Admin ---
  const adminPassword = generateRandomPassword()
  const adminPass = await bcrypt.hash(adminPassword, 12)
  const admin = await db.user.upsert({
    where: { email: 'admin@nayawallahkanoon.com' },
    update: {},
    create: {
      email: 'admin@nayawallahkanoon.com',
      name: 'Adv. Akash Faujdar',
      passwordHash: adminPass,
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+91 9660315644',
      termsAccepted: true,
    },
  })

  // --- Demo students ---
  const studentPassword = generateRandomPassword()
  const studentPass = await bcrypt.hash(studentPassword, 12)
  const studentDefs = [
    { name: 'Aarav Sharma', email: 'aarav@example.com', status: 'ACTIVE' },
    { name: 'Priya Patel', email: 'priya@example.com', status: 'ACTIVE' },
    { name: 'Rohan Mehta', email: 'rohan@example.com', status: 'APPROVED' },
    { name: 'Ananya Iyer', email: 'ananya@example.com', status: 'PENDING' },
    { name: 'Vikram Reddy', email: 'vikram@example.com', status: 'PENDING' },
    { name: 'Sneha Nair', email: 'sneha@example.com', status: 'BLOCKED' },
    { name: 'Karthik Rao', email: 'karthik@example.com', status: 'REJECTED' },
    { name: 'Divya Joshi', email: 'divya@example.com', status: 'ACTIVE' },
    { name: 'Arjun Gupta', email: 'arjun@example.com', status: 'ACTIVE' },
    { name: 'Meera Krishnan', email: 'meera@example.com', status: 'ACTIVE' },
  ]
  const students: any[] = []
  for (const s of studentDefs) {
    const u = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: s.name,
        passwordHash: studentPass,
        role: 'STUDENT',
        status: s.status as any,
        phone: '+91 90000 00000',
        termsAccepted: true,
        rejectionReason: s.status === 'REJECTED' ? 'Incomplete documentation' : null,
      },
    })
    students.push(u)
  }

  // --- Batches (3 tracks × 2 shifts = morning + evening) ---
  const batch = await db.batch.upsert({
    where: { slug: 'judiciary-morning-2025' },
    update: {},
    create: {
      name: 'Judiciary — Morning Batch',
      slug: 'judiciary-morning-2025',
      description:
        'Comprehensive Judiciary preparation covering all State Judiciary exams. Morning batch: 6:30 AM – 7:30 AM. Theory meets practice, daily question papers, live answer checking, and 100% study material provided.',
      thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2026-01-15'),
      status: 'ACTIVE',
      capacity: 50,
      createdBy: admin.id,
    },
  })

  const _batch2 = await db.batch.upsert({
    where: { slug: 'judiciary-evening-2025' },
    update: {},
    create: {
      name: 'Judiciary — Evening Batch',
      slug: 'judiciary-evening-2025',
      description:
        'Comprehensive Judiciary preparation covering all State Judiciary exams. Evening batch: 8:00 PM – 9:00 PM (major subject), 9:00 PM – 10:00 PM (minor subject). Theory meets practice, daily question papers, live answer checking.',
      thumbnail: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2026-01-15'),
      status: 'ACTIVE',
      capacity: 50,
      createdBy: admin.id,
    },
  })

  const _batch3 = await db.batch.upsert({
    where: { slug: 'adj-morning-2025' },
    update: {},
    create: {
      name: 'Additional District Judge (ADJ) — Morning Batch',
      slug: 'adj-morning-2025',
      description:
        'Specialised preparation for Additional District Judge examination. Morning batch: 6:30 AM – 7:30 AM. Includes theory + practical application, concept-made-easy videos, and answer writing from Day 1.',
      thumbnail: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-02-01'),
      status: 'ACTIVE',
      capacity: 40,
      createdBy: admin.id,
    },
  })

  const _batch4 = await db.batch.upsert({
    where: { slug: 'adj-evening-2025' },
    update: {},
    create: {
      name: 'Additional District Judge (ADJ) — Evening Batch',
      slug: 'adj-evening-2025',
      description:
        'Specialised preparation for Additional District Judge examination. Evening batch: 8:00 PM – 9:00 PM (major), 9:00 PM – 10:00 PM (minor). Includes theory + practical application, daily question papers.',
      thumbnail: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-02-01'),
      status: 'ACTIVE',
      capacity: 40,
      createdBy: admin.id,
    },
  })

  const _batch5 = await db.batch.upsert({
    where: { slug: 'apo-morning-2025' },
    update: {},
    create: {
      name: 'Assistant Prosecution Officer (APO) — Morning Batch',
      slug: 'apo-morning-2025',
      description:
        'Targeted preparation for Assistant Prosecution Officer examination. Morning batch: 6:30 AM – 7:30 AM. Includes all core subjects plus group discussion from 10:00 PM onwards. Subjects offered till examination.',
      thumbnail: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-02-01'),
      status: 'ACTIVE',
      capacity: 40,
      createdBy: admin.id,
    },
  })

  const _batch6 = await db.batch.upsert({
    where: { slug: 'apo-evening-2025' },
    update: {},
    create: {
      name: 'Assistant Prosecution Officer (APO) — Evening Batch',
      slug: 'apo-evening-2025',
      description:
        'Targeted preparation for Assistant Prosecution Officer examination. Evening batch: 8:00 PM – 9:00 PM (major), 9:00 PM – 10:00 PM (minor), 10:00 PM onwards: group discussion. Subjects offered till examination.',
      thumbnail: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-02-01'),
      status: 'ACTIVE',
      capacity: 40,
      createdBy: admin.id,
    },
  })

  // Enroll active/approved students into the active batch
  const activeStudents = students.filter(
    (s) => s.status === 'ACTIVE' || s.status === 'APPROVED'
  )
  for (const st of activeStudents) {
    await db.batchEnrollment.upsert({
      where: { batchId_userId: { batchId: batch.id, userId: st.id } },
      update: {},
      create: { batchId: batch.id, userId: st.id },
    })
  }

  // --- Course + chapters + topics + videos ---
  const course = await db.course.upsert({
    where: { slug: 'judiciary-comprehensive' },
    update: {},
    create: {
      title: 'Judiciary Comprehensive Preparation',
      slug: 'judiciary-comprehensive',
      description:
        'Complete preparation for Judiciary, ADJ, and APO examinations. Covers Constitutional Law, Criminal Procedure Code, Civil Procedure Code, Indian Penal Code, Evidence Act, and more. Theory meets practice with daily question papers and live answer checking.',
      thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
      category: 'Judicial Services',
      status: 'PUBLISHED',
      createdBy: admin.id,
    },
  })

  await db.batchCourse.upsert({
    where: { batchId_courseId: { batchId: batch.id, courseId: course.id } },
    update: {},
    create: { batchId: batch.id, courseId: course.id },
  })

  const chapterDefs = [
    { title: 'Constitutional Law', order: 1 },
    { title: 'Criminal Procedure Code (CrPC)', order: 2 },
    { title: 'Indian Penal Code (IPC)', order: 3 },
  ]
  const chapters: any[] = []
  for (const cd of chapterDefs) {
    let ch = await db.chapter.findFirst({ where: { courseId: course.id, title: cd.title } })
    if (!ch) ch = await db.chapter.create({ data: { courseId: course.id, title: cd.title, order: cd.order } })
    chapters.push(ch)
  }
  const [chapter1, chapter2, chapter3] = chapters

  const topicDefs = [
    { chapterId: chapter1.id, title: 'Fundamental Rights', order: 1 },
    { chapterId: chapter1.id, title: 'Directive Principles of State Policy', order: 2 },
    { chapterId: chapter2.id, title: 'Arrest and Detention', order: 1 },
    { chapterId: chapter3.id, title: 'Offences Against the Body', order: 1 },
    { chapterId: chapter3.id, title: 'Offences Against Property', order: 2 },
  ]
  const topics: any[] = []
  for (const td of topicDefs) {
    let tp = await db.topic.findFirst({ where: { chapterId: td.chapterId, title: td.title } })
    if (!tp) tp = await db.topic.create({ data: { chapterId: td.chapterId, title: td.title, order: td.order } })
    topics.push(tp)
  }
  const [topic1, topic2, topic3, topic4, topic5] = topics

  const videos = [
    { topicId: topic1.id, title: 'Fundamental Rights — Complete Overview', youtubeId: 'Q10s5gT3xdQ', order: 1 },
    { topicId: topic2.id, title: 'DPSP vs Fundamental Rights — Key Differences', youtubeId: 'fNcJuPIu9NI', order: 1 },
    { topicId: topic3.id, title: 'Arrest Under CrPC — Sections 41-60A', youtubeId: 'J5CZ-FkS9Eo', order: 1 },
    { topicId: topic4.id, title: 'IPC Offences Against the Body — Murder & Culpable Homicide', youtubeId: 'oNOW2ZJ7l3Q', order: 1 },
    { topicId: topic5.id, title: 'Theft, Robbery & Dacoity — IPC Explained', youtubeId: '3JkQTBI74bY', order: 1 },
  ]
  for (const v of videos) {
    await db.video.create({
      data: {
        topicId: v.topicId,
        title: v.title,
        youtubeId: v.youtubeId,
        order: v.order,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdBy: admin.id,
      },
    })
  }

  // --- Test with questions ---
  const test = await db.test.create({
    data: {
      title: 'Constitutional Law — Fundamentals Quiz',
      description: 'Test your understanding of Fundamental Rights, DPSP, and basic Constitutional Law concepts.',
      instructions:
        'This is a timed quiz. You have 15 minutes to answer 5 questions. You have a maximum of 3 attempts. The test auto-submits when time expires.',
      durationMins: 15,
      maxAttempts: 3,
      maxQuestions: 20,
      startAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      passingPct: 50,
      shuffleQuestions: false,
      shuffleOptions: false,
      showAnswerKey: true,
      showResultImmediately: true,
      publishedAt: new Date(),
      createdBy: admin.id,
    },
  })
  await db.testBatch.create({
    data: { testId: test.id, batchId: batch.id },
  })

  const questions = [
    {
      text: 'Which Article of the Indian Constitution guarantees the Right to Equality?',
      options: [
        { text: 'Article 14', isCorrect: true },
        { text: 'Article 19', isCorrect: false },
        { text: 'Article 21', isCorrect: false },
        { text: 'Article 32', isCorrect: false },
      ],
      explanation: 'Article 14 guarantees equality before law and equal protection of laws to all persons within the territory of India.',
    },
    {
      text: 'The Directive Principles of State Policy are contained in which Part of the Constitution?',
      options: [
        { text: 'Part III', isCorrect: false },
        { text: 'Part IV', isCorrect: true },
        { text: 'Part IVA', isCorrect: false },
        { text: 'Part V', isCorrect: false },
      ],
      explanation: 'Part IV (Articles 36-51) contains the Directive Principles of State Policy, inspired by the Irish Constitution.',
    },
    {
      text: 'Which of the following is NOT a Fundamental Right under the Indian Constitution?',
      options: [
        { text: 'Right to Freedom of Speech', isCorrect: false },
        { text: 'Right to Property', isCorrect: true },
        { text: 'Right to Life and Liberty', isCorrect: false },
        { text: 'Right to Constitutional Remedies', isCorrect: false },
      ],
      explanation: 'Right to Property was removed from the list of Fundamental Rights by the 44th Amendment Act, 1978. It is now a legal right under Article 300A.',
    },
    {
      text: 'Article 32 of the Constitution deals with which of the following?',
      options: [
        { text: 'Right to Freedom', isCorrect: false },
        { text: 'Right against Exploitation', isCorrect: false },
        { text: 'Right to Constitutional Remedies', isCorrect: true },
        { text: 'Right to Education', isCorrect: false },
      ],
      explanation: 'Article 32 empowers citizens to move the Supreme Court for enforcement of Fundamental Rights. Dr. Ambedkar called it the "heart and soul" of the Constitution.',
    },
    {
      text: 'Under IPC, the offence of murder is defined under which section?',
      options: [
        { text: 'Section 299', isCorrect: false },
        { text: 'Section 300', isCorrect: true },
        { text: 'Section 302', isCorrect: false },
        { text: 'Section 304', isCorrect: false },
      ],
      explanation: 'Section 300 of IPC defines murder. Section 302 prescribes the punishment for murder. Section 299 defines culpable homicide.',
    },
  ]
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    await db.question.create({
      data: {
        testId: test.id,
        text: q.text,
        explanation: q.explanation,
        marks: 1,
        order: i + 1,
        options: { create: q.options.map((o, idx) => ({ ...o, order: idx })) },
      },
    })
  }

  // Give the first ACTIVE student a completed attempt so the leaderboard has data
  const firstActive = students.find((s) => s.status === 'ACTIVE' && s.email === 'aarav@example.com')!
  const attempt = await db.testAttempt.create({
    data: {
      testId: test.id,
      userId: firstActive.id,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 60 * 60 * 1000 + 15 * 60 * 1000),
      submittedAt: new Date(Date.now() - 60 * 60 * 1000 + 8 * 60 * 1000),
      score: 4,
      totalMarks: 5,
      percentage: 80,
      timeTakenSecs: 8 * 60,
      submissionType: 'MANUAL',
      status: 'SUBMITTED',
    },
  })
  // Record answers
  const dbQuestions = await db.question.findMany({
    where: { testId: test.id },
    include: { options: true },
  })
  // Correct answers for Q1..Q4 selected, Q5 wrong
  const selections = [1, 2, 2, 2, 1] // index of selected option (0-based)
  for (let i = 0; i < dbQuestions.length; i++) {
    const q = dbQuestions[i]
    const selected = q.options[selections[i]]
    await db.attemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: q.id,
        selectedOptionId: selected.id,
        isCorrect: selected.isCorrect,
        marksAwarded: selected.isCorrect ? 1 : 0,
      },
    })
  }

  // --- Announcements ---
  await db.announcement.create({
    data: {
      title: 'Welcome to Naya Wallah Kanoon Judicial Classes!',
      message:
        'Aao humein join karo, milke kuch crazy karte hain law mein. Become a part of the Naya Wallah Kanoon family — judicial services preparation, now at your doorstep. New Law ~ New Way.',
      audience: 'PUBLIC',
      priority: 'HIGH',
      pinned: true,
      status: 'PUBLISHED',
      publishAt: new Date(),
      createdBy: admin.id,
    },
  })
  await db.announcement.create({
    data: {
      title: 'Join Soon Offer — Limited Time Launch Discount',
      message:
        'Enroll now at just ₹2,200/month (12% discount on regular ₹2,500/month). Offer ends soon! Morning and evening batches available for Judiciary, ADJ, and APO preparation.',
      audience: 'PUBLIC',
      priority: 'CRITICAL',
      pinned: false,
      status: 'PUBLISHED',
      publishAt: new Date(),
      createdBy: admin.id,
    },
  })
  await db.announcement.create({
    data: {
      title: 'New Constitutional Law Quiz Published',
      message:
        'A new Constitutional Law Fundamentals Quiz is now available. Test your knowledge of Fundamental Rights, DPSP, and IPC. You have 3 attempts. Best of luck!',
      audience: 'BATCH',
      priority: 'NORMAL',
      pinned: false,
      status: 'PUBLISHED',
      publishAt: new Date(),
      createdBy: admin.id,
      batches: { create: [{ batchId: batch.id }] },
    },
  })

  // --- Contact messages ---
  await db.contactMessage.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      phone: '+91 99887 76655',
      subject: 'Question about ADJ batch schedule',
      message:
        'Hi, I wanted to know when the next ADJ batch starts. I am interested in the evening batch. Could someone reach out?',
      status: 'NEW',
    },
  })
  await db.contactMessage.create({
    data: {
      name: 'Sara Thomas',
      email: 'sara.thomas@example.com',
      subject: 'Free counselling request',
      message:
        'I would like to get free counselling before joining. My subject is Criminal Law. Please contact me at your earliest convenience.',
      status: 'READ',
    },
  })

  // --- Feedback (from one active student) ---
  await db.feedback.create({
    data: {
      userId: firstActive.id,
      category: 'COURSE_CONTENT',
      subject: 'Loving the Constitutional Law chapter!',
      message:
        'The Fundamental Rights videos are fantastic. The concept-made-easy approach really helps me understand complex topics quickly. The daily question papers keep me on track.',
      rating: 5,
      status: 'NEW',
    },
  })

  // --- A few audit logs ---
  await db.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorRole: 'ADMIN',
        action: 'SYSTEM_SEEDED',
        entityType: 'SYSTEM',
        entityId: 'seed',
        ip: '127.0.0.1',
        userAgent: 'seed-script',
        timestamp: new Date(),
      },
    ],
  })

  console.log('✓ Seed complete')
  console.log(`  Admin login: admin@nayawallahkanoon.com / ${adminPassword}`)
  console.log(`  Student login (ACTIVE): aarav@example.com / ${studentPassword}`)
  console.log(`  Student login (PENDING): ananya@example.com / ${studentPassword}`)
  console.log(`  Student login (BLOCKED): sneha@example.com / ${studentPassword}`)
  console.log(`  Student login (REJECTED): karthik@example.com / ${studentPassword}`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
