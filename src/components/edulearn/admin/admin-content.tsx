'use client'

import dynamic from 'next/dynamic'
import { useApp } from '@/stores/app-store'

function ViewLoading() {
  return <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
}

const AdminDashboard = dynamic(() => import('./pages/dashboard').then((module) => module.AdminDashboard), { loading: ViewLoading })
const AdminStudents = dynamic(() => import('./pages/students').then((module) => module.AdminStudents), { loading: ViewLoading })
const AdminStudentDetail = dynamic(() => import('./pages/student-detail').then((module) => module.AdminStudentDetail), { loading: ViewLoading })
const AdminBatches = dynamic(() => import('./pages/batches').then((module) => module.AdminBatches), { loading: ViewLoading })
const AdminBatchDetail = dynamic(() => import('./pages/batch-detail').then((module) => module.AdminBatchDetail), { loading: ViewLoading })
const AdminCourses = dynamic(() => import('./pages/courses').then((module) => module.AdminCourses), { loading: ViewLoading })
const AdminCourseDetail = dynamic(() => import('./pages/course-detail').then((module) => module.AdminCourseDetail), { loading: ViewLoading })
const AdminMaterials = dynamic(() => import('./pages/materials').then((module) => module.AdminMaterials), { loading: ViewLoading })
const AdminTests = dynamic(() => import('./pages/tests').then((module) => module.AdminTests), { loading: ViewLoading })
const AdminTestDetail = dynamic(() => import('./pages/test-detail').then((module) => module.AdminTestDetail), { loading: ViewLoading })
const AdminTestResults = dynamic(() => import('./pages/test-results').then((module) => module.AdminTestResults), { loading: ViewLoading })
const AdminAnalytics = dynamic(() => import('./pages/test-results').then((module) => module.AdminAnalytics), { loading: ViewLoading })
const AdminLeaderboard = dynamic(() => import('./pages/leaderboard').then((module) => module.AdminLeaderboard), { loading: ViewLoading })
const AdminAnnouncements = dynamic(() => import('./pages/announcements').then((module) => module.AdminAnnouncements), { loading: ViewLoading })
const AdminContact = dynamic(() => import('./pages/contact').then((module) => module.AdminContact), { loading: ViewLoading })
const AdminFeedback = dynamic(() => import('./pages/feedback').then((module) => module.AdminFeedback), { loading: ViewLoading })
const AdminReports = dynamic(() => import('./pages/reports').then((module) => module.AdminReports), { loading: ViewLoading })
const AdminAudit = dynamic(() => import('./pages/audit').then((module) => module.AdminAudit), { loading: ViewLoading })
const AdminSettings = dynamic(() => import('./pages/settings').then((module) => module.AdminSettings), { loading: ViewLoading })

export function AdminContent() {
  const { view } = useApp()

  switch (view.name) {
    case 'admin/dashboard': return <AdminDashboard />
    case 'admin/students': return <AdminStudents />
    case 'admin/students/detail': return <AdminStudentDetail id={view.id} />
    case 'admin/batches': return <AdminBatches />
    case 'admin/batches/detail': return <AdminBatchDetail id={view.id} />
    case 'admin/courses': return <AdminCourses />
    case 'admin/courses/detail': return <AdminCourseDetail id={view.id} />
    case 'admin/materials': return <AdminMaterials />
    case 'admin/tests': return <AdminTests />
    case 'admin/tests/detail': return <AdminTestDetail id={view.id} />
    case 'admin/tests/results': return <AdminTestResults />
    case 'admin/analytics': return <AdminAnalytics />
    case 'admin/leaderboard': return <AdminLeaderboard />
    case 'admin/announcements': return <AdminAnnouncements />
    case 'admin/contact': return <AdminContact />
    case 'admin/feedback': return <AdminFeedback />
    case 'admin/reports': return <AdminReports />
    case 'admin/audit': return <AdminAudit />
    case 'admin/settings': return <AdminSettings />
    default: return <AdminDashboard />
  }
}