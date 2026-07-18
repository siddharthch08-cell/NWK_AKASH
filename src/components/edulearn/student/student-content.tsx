'use client'

import dynamic from 'next/dynamic'
import { useApp } from '@/stores/app-store'

function ViewLoading() {
  return <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
}

const StudentDashboard = dynamic(() => import('./pages/dashboard').then((module) => module.StudentDashboard), { loading: ViewLoading })
const StudentBatches = dynamic(() => import('./pages/batches').then((module) => module.StudentBatches), { loading: ViewLoading })
const StudentBatchDetail = dynamic(() => import('./pages/batch-detail').then((module) => module.StudentBatchDetail), { loading: ViewLoading })
const StudentCourses = dynamic(() => import('./pages/courses').then((module) => module.StudentCourses), { loading: ViewLoading })
const StudentCourseDetail = dynamic(() => import('./pages/course-detail').then((module) => module.StudentCourseDetail), { loading: ViewLoading })
const StudentVideoPlayer = dynamic(() => import('./pages/video-player').then((module) => module.StudentVideoPlayer), { loading: ViewLoading })
const StudentMaterials = dynamic(() => import('./pages/materials').then((module) => module.StudentMaterials), { loading: ViewLoading })
const StudentTests = dynamic(() => import('./pages/tests').then((module) => module.StudentTests), { loading: ViewLoading })
const StudentTakeTest = dynamic(() => import('./pages/take-test').then((module) => module.StudentTakeTest), { loading: ViewLoading })
const StudentResults = dynamic(() => import('./pages/results').then((module) => module.StudentResults), { loading: ViewLoading })
const StudentResultDetail = dynamic(() => import('./pages/result-detail').then((module) => module.StudentResultDetail), { loading: ViewLoading })
const StudentLeaderboard = dynamic(() => import('./pages/leaderboard').then((module) => module.StudentLeaderboard), { loading: ViewLoading })
const StudentAnnouncements = dynamic(() => import('./pages/announcements').then((module) => module.StudentAnnouncements), { loading: ViewLoading })
const StudentFeedback = dynamic(() => import('./pages/feedback').then((module) => module.StudentFeedback), { loading: ViewLoading })
const StudentProfile = dynamic(() => import('./pages/profile').then((module) => module.StudentProfile), { loading: ViewLoading })

export function StudentContent() {
  const { view } = useApp()
  switch (view.name) {
    case 'student/dashboard': return <StudentDashboard />
    case 'student/batches': return <StudentBatches />
    case 'student/batches/detail': return <StudentBatchDetail id={view.id} />
    case 'student/courses': return <StudentCourses />
    case 'student/courses/detail': return <StudentCourseDetail id={view.id} />
    case 'student/videos': return <StudentVideoPlayer id={view.id} />
    case 'student/materials': return <StudentMaterials />
    case 'student/tests': return <StudentTests />
    case 'student/tests/take': return <StudentTakeTest id={view.id} />
    case 'student/results': return <StudentResults />
    case 'student/results/detail': return <StudentResultDetail id={view.id} />
    case 'student/leaderboard': return <StudentLeaderboard />
    case 'student/announcements': return <StudentAnnouncements />
    case 'student/feedback': return <StudentFeedback />
    case 'student/profile': return <StudentProfile />
    default: return <StudentDashboard />
  }
}