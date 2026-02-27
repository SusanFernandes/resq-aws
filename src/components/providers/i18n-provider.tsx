'use client'

import { ReactNode } from 'react'
import i18n from 'i18next'
import { InitReactI18next, I18nextProvider } from 'react-i18next'
import enTranslations from '@/i18n/locales/en.json'
import hiTranslations from '@/i18n/locales/hi.json'

// Initialize i18n only once
if (!i18n.isInitialized) {
  i18n.use(InitReactI18next).init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
    },
    lng: typeof window !== 'undefined' ? localStorage.getItem('i18nLng') || 'en' : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
