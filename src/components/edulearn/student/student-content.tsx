'use client'

import { useApp } from '@/stores/app-store'
import { StudentDashboard } from './pages/dashboard'
import { StudentBatches } from './pages/batches'
import { StudentBatchDetail } from './pages/batch-detail'
import { StudentCourses } from './pages/courses'
import { StudentCourseDetail } from './pages/course-detail'
import { StudentVideoPlayer } from './pages/video-player'
import { StudentMaterials } from './pages/materials'
import { StudentTests } from './pages/tests'
import { StudentTakeTest } from './pages/take-test'
import { StudentResults } from './pages/results'
import { StudentResultDetail } from './pages/result-detail'
import { StudentLeaderboard } from './pages/leaderboard'
import { StudentAnnouncements } from './pages/announcements'
import { StudentFeedback } from './pages/feedback'
import { StudentProfile } from './pages/profile'

export function StudentContent() {
  const { view } = useApp()
  switch (view.name) {
    case 'student/dashboard': return <StudentDashboard />
    case 'student/batches': return <StudentBatches />
    case 'student/batches/detail': return <StudentBatchDetail id={(view as any).id} />
    case 'student/courses': return <StudentCourses />
    case 'student/courses/detail': return <StudentCourseDetail id={(view as any).id} />
    case 'student/videos': return <StudentVideoPlayer id={(view as any).id} />
    case 'student/materials': return <StudentMaterials />
    case 'student/tests': return <StudentTests />
    case 'student/tests/take': return <StudentTakeTest id={(view as any).id} />
    case 'student/results': return <StudentResults />
    case 'student/results/detail': return <StudentResultDetail id={(view as any).id} />
    case 'student/leaderboard': return <StudentLeaderboard />
    case 'student/announcements': return <StudentAnnouncements />
    case 'student/feedback': return <StudentFeedback />
    case 'student/profile': return <StudentProfile />
    default: return <StudentDashboard />
  }
}
