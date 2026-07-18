import type { InstituteSetting } from '@prisma/client'
import { db } from './db'

const DEFAULT_SETTINGS: InstituteSetting = {
  id: 'singleton',
  instituteName: 'Naya Wallah Kanoon',
  tagline: 'New Law, New Way',
  logo: null,
  favicon: null,
  primaryEmail: null,
  primaryPhone: null,
  address: null,
  mapsEmbedUrl: null,
  heroTitle: 'Naya Wallah Kanoon — New Law, New Way',
  heroSubtitle: 'Industry-leading courses, expert faculty, and a learning experience designed for your success.',
  heroImage: null,
  aboutMission: null,
  aboutVision: null,
  aboutText: null,
  statStudents: 0,
  statCourses: 0,
  statPassRate: 0,
  statExperience: 0,
  socialFacebook: null,
  socialTwitter: null,
  socialLinkedin: null,
  socialYoutube: null,
  socialInstagram: null,
  socialWhatsApp: null,
  videoCompletionThreshold: 90,
  defaultMaxAttempts: 2,
  maxUploadMb: 20,
  maintenanceMode: false,
  revenueEnabled: false,
  certificatesEnabled: false,
  updatedBy: null,
  updatedAt: new Date(0),
}

export async function getSettings(): Promise<InstituteSetting> {
  return (await db.instituteSetting.findUnique({ where: { id: 'singleton' } })) ?? DEFAULT_SETTINGS
}

export async function getPublicSettings() {
  const s = await getSettings()
  return {
    instituteName: s.instituteName,
    tagline: s.tagline,
    logo: s.logo,
    favicon: s.favicon,
    primaryEmail: s.primaryEmail,
    primaryPhone: s.primaryPhone,
    address: s.address,
    mapsEmbedUrl: s.mapsEmbedUrl,
    heroTitle: s.heroTitle,
    heroSubtitle: s.heroSubtitle,
    heroImage: s.heroImage,
    aboutMission: s.aboutMission,
    aboutVision: s.aboutVision,
    aboutText: s.aboutText,
    statStudents: s.statStudents,
    statCourses: s.statCourses,
    statPassRate: s.statPassRate,
    statExperience: s.statExperience,
    socialFacebook: s.socialFacebook,
    socialTwitter: s.socialTwitter,
    socialLinkedin: s.socialLinkedin,
    socialYoutube: s.socialYoutube,
    socialInstagram: s.socialInstagram,
    socialWhatsApp: s.socialWhatsApp,
    videoCompletionThreshold: s.videoCompletionThreshold,
    defaultMaxAttempts: s.defaultMaxAttempts,
    maintenanceMode: s.maintenanceMode,
    revenueEnabled: s.revenueEnabled,
    certificatesEnabled: s.certificatesEnabled,
  }
}
