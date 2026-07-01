/**
 * Seed script for EDULEARN PRO.
 * Usage: `bun run db:seed`
 *
 * Seeds:
 *  - Default admin (admin@edulearn.pro / Admin@12345)
 *  - Institute settings singleton
 *  - A handful of demo students (PENDING/APPROVED/ACTIVE/BLOCKED)
 *  - One ACTIVE batch + one course with chapters/topics/videos
 *  - One PUBLISHED timed MCQ test with 5 sample questions
 *  - A few announcements + contact messages
 *
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('Seeding EDULEARN PRO...')

  // --- Institute settings ---
  await db.instituteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      instituteName: 'EDULEARN PRO',
      tagline: 'Advanced Learning Management System',
      primaryEmail: 'contact@edulearn.pro',
      primaryPhone: '+91 98765 43210',
      address: '123 Knowledge Avenue, Bengaluru, Karnataka 560001, India',
      mapsEmbedUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.644!2d77.5946!3d12.9716!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzE3LjgiTiA3N8KwMzUnNDAuNiJF!5e0!3m2!1sen!2sin!4v1700000000000',
      heroTitle: 'Unlock Your Potential with EDULEARN PRO',
      heroSubtitle:
        'Industry-leading courses, expert faculty, and a learning experience designed for your success. Join thousands of learners advancing their careers.',
      aboutMission:
        'To democratize quality education through technology, making expert-led learning accessible to every motivated student.',
      aboutVision:
        'A world where any learner, anywhere, can master the skills they need to build a meaningful career.',
      aboutText:
        'EDULEARN PRO is a next-generation learning platform built by educators and engineers. We combine structured courses, live and recorded video lectures, timed assessments, and detailed analytics to deliver a complete learning experience. Our faculty brings decades of combined industry experience, and our platform is engineered for reliability, security, and scale.',
      statStudents: 5280,
      statCourses: 42,
      statPassRate: 94,
      statExperience: 12,
      socialFacebook: 'https://facebook.com/edulearnpro',
      socialTwitter: 'https://twitter.com/edulearnpro',
      socialLinkedin: 'https://linkedin.com/company/edulearnpro',
      socialYoutube: 'https://youtube.com/@edulearnpro',
      socialInstagram: 'https://instagram.com/edulearnpro',
      videoCompletionThreshold: 90,
      defaultMaxAttempts: 2,
      maxUploadMb: 20,
      maintenanceMode: false,
      revenueEnabled: false,
      certificatesEnabled: false,
    },
  })

  // --- Admin ---
  const adminPass = await bcrypt.hash('Admin@12345', 12)
  const admin = await db.user.upsert({
    where: { email: 'admin@edulearn.pro' },
    update: {},
    create: {
      email: 'admin@edulearn.pro',
      name: 'System Administrator',
      passwordHash: adminPass,
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+91 98765 43210',
      termsAccepted: true,
    },
  })

  // --- Demo students ---
  const studentPass = await bcrypt.hash('Student@12345', 12)
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

  // --- Batch ---
  const batch = await db.batch.upsert({
    where: { slug: 'web-dev-foundation-2025' },
    update: {},
    create: {
      name: 'Web Development Foundation 2025',
      slug: 'web-dev-foundation-2025',
      description:
        'A complete foundation batch covering HTML, CSS, JavaScript, React, and Node.js fundamentals. Ideal for beginners aiming to become job-ready frontend developers.',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-06-30'),
      status: 'ACTIVE',
      capacity: 60,
      createdBy: admin.id,
    },
  })

  const batch2 = await db.batch.upsert({
    where: { slug: 'data-science-essentials' },
    update: {},
    create: {
      name: 'Data Science Essentials',
      slug: 'data-science-essentials',
      description:
        'Python, statistics, data visualization, and an introduction to machine learning. Perfect for analysts and aspiring data scientists.',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-08-31'),
      status: 'UPCOMING',
      capacity: 50,
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
    where: { slug: 'modern-web-development' },
    update: {},
    create: {
      title: 'Modern Web Development',
      slug: 'modern-web-development',
      description:
        'Learn modern web development from the ground up. HTML, CSS, JavaScript, React, and deployment best practices.',
      thumbnail: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800',
      category: 'Web Development',
      status: 'PUBLISHED',
      createdBy: admin.id,
    },
  })

  await db.batchCourse.upsert({
    where: { batchId_courseId: { batchId: batch.id, courseId: course.id } },
    update: {},
    create: { batchId: batch.id, courseId: course.id },
  })

  const chapter1 = await db.chapter.create({
    data: { courseId: course.id, title: 'Getting Started with HTML', order: 1 },
  })
  const chapter2 = await db.chapter.create({
    data: { courseId: course.id, title: 'CSS Fundamentals', order: 2 },
  })
  const chapter3 = await db.chapter.create({
    data: { courseId: course.id, title: 'JavaScript Essentials', order: 3 },
  })

  const topic1 = await db.topic.create({
    data: { chapterId: chapter1.id, title: 'Introduction to HTML', order: 1 },
  })
  const topic2 = await db.topic.create({
    data: { chapterId: chapter1.id, title: 'Forms and Inputs', order: 2 },
  })
  const topic3 = await db.topic.create({
    data: { chapterId: chapter2.id, title: 'Selectors and the Box Model', order: 1 },
  })
  const topic4 = await db.topic.create({
    data: { chapterId: chapter3.id, title: 'Variables and Types', order: 1 },
  })
  const topic5 = await db.topic.create({
    data: { chapterId: chapter3.id, title: 'Functions and Scope', order: 2 },
  })

  const videos = [
    { topicId: topic1.id, title: 'HTML in 10 Minutes', youtubeId: 'Q10s5gT3xdQ', order: 1 },
    { topicId: topic2.id, title: 'HTML Forms Deep Dive', youtubeId: 'fNcJuPIu9NI', order: 1 },
    { topicId: topic3.id, title: 'CSS Selectors Explained', youtubeId: 'J5CZ-FkS9Eo', order: 1 },
    { topicId: topic4.id, title: 'JavaScript Variables', youtubeId: 'oNOW2ZJ7l3Q', order: 1 },
    { topicId: topic5.id, title: 'Functions in JavaScript', youtubeId: '3JkQTBI74bY', order: 1 },
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
      title: 'JavaScript Fundamentals Quiz',
      description: 'Test your understanding of JavaScript variables, functions, and types.',
      instructions:
        'This is a timed quiz. You have 15 minutes to answer 5 questions. You have a maximum of 2 attempts. The test auto-submits when time expires.',
      durationMins: 15,
      maxAttempts: 2,
      maxQuestions: 20,
      startAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      text: 'Which keyword declares a block-scoped variable in JavaScript?',
      options: [
        { text: 'var', isCorrect: false },
        { text: 'let', isCorrect: true },
        { text: 'function', isCorrect: false },
        { text: 'static', isCorrect: false },
      ],
      explanation: '`let` declares a block-scoped variable, while `var` is function-scoped.',
    },
    {
      text: 'What is the output of `typeof null` in JavaScript?',
      options: [
        { text: '"null"', isCorrect: false },
        { text: '"undefined"', isCorrect: false },
        { text: '"object"', isCorrect: true },
        { text: '"number"', isCorrect: false },
      ],
      explanation: 'A long-standing JavaScript quirk: `typeof null` returns "object".',
    },
    {
      text: 'Which of these is NOT a JavaScript primitive type?',
      options: [
        { text: 'string', isCorrect: false },
        { text: 'boolean', isCorrect: false },
        { text: 'array', isCorrect: true },
        { text: 'number', isCorrect: false },
      ],
      explanation: 'Arrays are objects, not primitives.',
    },
    {
      text: 'What does `===` check in JavaScript?',
      options: [
        { text: 'Value only', isCorrect: false },
        { text: 'Type only', isCorrect: false },
        { text: 'Value and type without coercion', isCorrect: true },
        { text: 'Memory reference only', isCorrect: false },
      ],
      explanation: '`===` is strict equality — no type coercion is performed.',
    },
    {
      text: 'Which method adds an item to the END of an array?',
      options: [
        { text: 'push()', isCorrect: true },
        { text: 'pop()', isCorrect: false },
        { text: 'shift()', isCorrect: false },
        { text: 'unshift()', isCorrect: false },
      ],
      explanation: '`push()` appends to the end; `unshift()` prepends to the start.',
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
      title: 'Welcome to EDULEARN PRO!',
      message:
        'Welcome to the new EDULEARN PRO learning platform. Browse the public courses, register for a batch, and start your learning journey today.',
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
      title: 'New JavaScript Quiz Published',
      message:
        'A new JavaScript Fundamentals Quiz is now available for the Web Development Foundation batch. You have 2 attempts. Best of luck!',
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
      subject: 'Question about batch schedule',
      message:
        'Hi, I wanted to know when the next Data Science batch starts. Could someone reach out?',
      status: 'NEW',
    },
  })
  await db.contactMessage.create({
    data: {
      name: 'Sara Thomas',
      email: 'sara.thomas@example.com',
      subject: 'Bulk enrollment for my team',
      message:
        'We are a team of 8 engineers interested in the Web Development Foundation batch. Do you offer corporate pricing?',
      status: 'READ',
    },
  })

  // --- Feedback (from one active student) ---
  await db.feedback.create({
    data: {
      userId: firstActive.id,
      category: 'COURSE_CONTENT',
      subject: 'Loving the JavaScript chapter!',
      message:
        'The JavaScript essentials chapter is fantastic. The video explanations are clear and the examples are practical.',
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
  console.log('  Admin login: admin@edulearn.pro / Admin@12345')
  console.log('  Student login (ACTIVE): aarav@example.com / Student@12345')
  console.log('  Student login (PENDING): ananya@example.com / Student@12345')
  console.log('  Student login (BLOCKED): sneha@example.com / Student@12345')
  console.log('  Student login (REJECTED): karthik@example.com / Student@12345')
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
