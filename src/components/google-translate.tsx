'use client'

import { useEffect, useState } from 'react'
import { Languages, ChevronDown } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिंदी)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'bn', name: 'Bengali (বাংলা)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
]

declare global {
    interface Window {
        googleTranslateElementInit: () => void;
        google: any;
    }
}

export function GoogleTranslate() {
    const [currentLang, setCurrentLang] = useState('en')

    useEffect(() => {
        // Add Google Translate script
        const addScript = () => {
            if (document.getElementById('google-translate-script')) return
            const script = document.createElement('script')
            script.id = 'google-translate-script'
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
            script.async = true
            document.body.appendChild(script)
        }

        window.googleTranslateElementInit = () => {
            if (!document.getElementById('google_translate_element')) return
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,mr,gu,bn,ta,te',
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false,
                    multilanguagePage: true,
                },
                'google_translate_element'
            )
        }

        if (!window.google) {
            addScript()
        }

        // Hide Google Translate banner and style
        const style = document.createElement('style')
        style.innerHTML = `
      .goog-te-banner-frame.skiptranslate, .goog-te-gadget-icon { display: none !important; }
      body { top: 0px !important; }
      .goog-te-menu-value { display: none !important; }
      .goog-te-gadget-simple {
        background-color: transparent !important;
        border: none !important;
        padding: 0 !important;
        font-size: 0 !important;
      }
      .goog-te-gadget-img { display: none !important; }
      #google_translate_element {
        display: none !important;
      }
      .goog-text-highlight {
        background-color: transparent !important;
        box-shadow: none !important;
      }
      /* Hide the "Powered by Google" text if possible */
      .goog-te-gadget {
        color: transparent !important;
        font-size: 0 !important;
      }
      .goog-te-gadget span {
        display: none !important;
      }
      /* Fix for the iframe that Google sometimes injects */
      iframe.goog-te-banner-frame {
        display: none !important;
      }
      body {
        top: 0px !important;
      }
      .goog-tooltip {
        display: none !important;
      }
      .goog-tooltip:hover {
        display: none !important;
      }
      .goog-text-highlight {
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
    `
        document.head.appendChild(style)
    }, [])

    const changeLanguage = (langCode: string) => {
        // Set the cookie that Google Translate looks for
        // Format: /target_lang_code/language_code
        // e.g., /en/hi
        document.cookie = `googtrans=/en/${langCode}; path=/;`
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname};`

        // Also update state
        setCurrentLang(langCode)

        // Find the Google Translate combo box
        const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement
        if (selectEl) {
            selectEl.value = langCode
            selectEl.dispatchEvent(new Event('change'))

            // If it's English (reset), a reload is often cleaner to remove all Google artifacts
            if (langCode === 'en') {
                setTimeout(() => window.location.reload(), 100)
            }
        } else {
            // If combo not found, reload is necessary to apply the cookie
            window.location.reload()
        }
    }

    // Load initial language from cookie if exists
    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`
            const parts = value.split(`; ${name}=`)
            if (parts.length === 2) return parts.pop()?.split(';').shift()
            return null
        }

        const langCookie = getCookie('googtrans')
        if (langCookie) {
            const lang = langCookie.split('/').pop()
            if (lang && languages.some(l => l.code === lang)) {
                setCurrentLang(lang)
            }
        }
    }, [])

    return (
        <div className="flex items-center gap-2">
            <div id="google_translate_element"></div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-2 bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 shadow-sm px-4 rounded-full group"
                    >
                        <div className="bg-blue-100 p-1 rounded-full group-hover:bg-blue-200 transition-colors">
                            <Languages className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="hidden sm:inline font-semibold text-slate-700 text-xs">
                            {languages.find(l => l.code === currentLang)?.name || 'Language'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl shadow-xl border-slate-100 bg-white/95 backdrop-blur-md">
                    <div className="px-2 py-1.5 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Language</p>
                    </div>
                    {languages.map((lang) => (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`cursor-pointer flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${currentLang === lang.code
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <span className="text-sm">{lang.name}</span>
                            {currentLang === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
