import { db } from './db'

export async function getSettings() {
  return db.instituteSetting.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } })
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
