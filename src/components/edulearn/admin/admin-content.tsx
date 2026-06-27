'use client'

import { useApp } from '@/stores/app-store'
import { AdminDashboard } from './pages/dashboard'
import { AdminStudents } from './pages/students'
import { AdminStudentDetail } from './pages/student-detail'
import { AdminBatches } from './pages/batches'
import { AdminBatchDetail } from './pages/batch-detail'
import { AdminCourses } from './pages/courses'
import { AdminCourseDetail } from './pages/course-detail'
import { AdminMaterials } from './pages/materials'
import { AdminTests } from './pages/tests'
import { AdminTestDetail } from './pages/test-detail'
import { AdminTestResults, AdminAnalytics } from './pages/test-results'
import { AdminLeaderboard } from './pages/leaderboard'
import { AdminAnnouncements } from './pages/announcements'
import { AdminContact } from './pages/contact'
import { AdminFeedback } from './pages/feedback'
import { AdminReports } from './pages/reports'
import { AdminAudit } from './pages/audit'
import { AdminSettings } from './pages/settings'

export function AdminContent() {
  const { view } = useApp()

  switch (view.name) {
    case 'admin/dashboard': return <AdminDashboard />
    case 'admin/students': return <AdminStudents />
    case 'admin/students/detail': return <AdminStudentDetail id={(view as any).id} />
    case 'admin/batches': return <AdminBatches />
    case 'admin/batches/detail': return <AdminBatchDetail id={(view as any).id} />
    case 'admin/courses': return <AdminCourses />
    case 'admin/courses/detail': return <AdminCourseDetail id={(view as any).id} />
    case 'admin/materials': return <AdminMaterials />
    case 'admin/tests': return <AdminTests />
    case 'admin/tests/detail': return <AdminTestDetail id={(view as any).id} />
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
