/**
 * Public Help Home Page
 * Welcome page with feature overview and quick access
 */

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Heart, MapPin, Phone, BookOpen, ArrowRight } from 'lucide-react'

export default function HelpPage() {
  const features = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Symptom Checker',
      description: 'Get instant guidance on whether you need emergency care',
      href: '/help/symptom-checker',
      color: 'text-blue-600',
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Emergency Checklist',
      description: 'Quick reference to determine if someone needs 112',
      href: '/help/emergency-checklist',
      color: 'text-red-600',
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Location Finder',
      description: 'Find nearby hospitals and emergency services',
      href: '#locations',
      color: 'text-green-600',
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Emergency Contacts',
      description: 'Save and manage your personal emergency contacts',
      href: '/dashboard',
      color: 'text-yellow-600',
    },
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            24/7 Emergency Guidance
          </Badge>
        </div>
        <h1 className="text-4xl font-bold text-slate-900">
          Fast Emergency Assessment
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          When every second counts, ResQ provides instant guidance on whether you need emergency
          medical care. Know when to call 112, when to see a doctor, or when self-care is enough.
        </p>
      </section>

      {/* CTA Buttons */}
      <section className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        <Link href="/help/symptom-checker">
          <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700">
            <Heart className="w-4 h-4 mr-2" />
            Check Your Symptoms
          </Button>
        </Link>
        <Link href="/help/emergency-checklist">
          <Button variant="outline" className="w-full h-12">
            <BookOpen className="w-4 h-4 mr-2" />
            Emergency Checklist
          </Button>
        </Link>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, idx) => (
          <Link key={idx} href={feature.href}>
            <Card className="h-full hover:shadow-lg hover:border-slate-300 transition cursor-pointer">
              <CardHeader>
                <div className={`${feature.color} mb-2`}>{feature.icon}</div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 p-8 rounded-lg border">
        <h2 className="text-2xl font-bold mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'Describe Symptoms', icon: '🏥' },
            { step: 2, title: 'Answer Questions', icon: '❓' },
            { step: 3, title: 'Get Assessment', icon: '📋' },
            { step: 4, title: 'Take Action', icon: '✅' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-lg font-semibold text-slate-600">{item.step}</div>
              <p className="text-sm text-muted-foreground mt-1">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Important Info */}
      <section className="bg-red-50 border-2 border-red-200 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-red-700 mb-3">⚠️ Important</h3>
        <ul className="space-y-2 text-sm text-red-700">
          <li>✓ This tool provides guidance only, not medical diagnosis</li>
          <li>✓ Always call <strong>112</strong> if you're unsure or in life-threatening danger</li>
          <li>✓ Trust your instincts - if something feels wrong, seek help</li>
          <li>✓ In case of extreme emergencies, call 112 before using this tool</li>
        </ul>
      </section>

      {/* FAQ Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            {
              q: 'When should I use this tool?',
              a: 'Use this tool when you or someone else has symptoms and you need quick guidance on the urgency level. Do NOT delay necessary emergency services.',
            },
            {
              q: 'Is this a medical diagnosis?',
              a: 'No. This tool provides educational guidance based on reported symptoms. Always consult a qualified healthcare provider for actual diagnosis and treatment.',
            },
            {
              q: 'What if I think I need emergency care?',
              a: 'Stop using this tool immediately and call 112. Emergency services operators are trained to help with life-threatening situations.',
            },
            {
              q: 'Can I save my assessment?',
              a: 'Yes! Create a free account on ResQ Dashboard to save your health history and emergency contacts for future reference.',
            },
          ].map((item, idx) => (
            <details key={idx} className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
              <summary className="font-semibold text-slate-900">{item.q}</summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="bg-slate-900 text-white p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Quick Emergency Contacts</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Emergency', number: '112', color: 'bg-red-600' },
            { label: 'Police', number: '100', color: 'bg-blue-600' },
            { label: 'Ambulance', number: '108', color: 'bg-green-600' },
            { label: 'Fire', number: '101', color: 'bg-orange-600' },
          ].map((item) => (
            <div key={item.label} className={`${item.color} p-4 rounded text-center`}>
              <div className="text-2xl font-bold">{item.number}</div>
              <div className="text-xs mt-1 opacity-90">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Go to Dashboard CTA */}
      <section className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Ready to Get Help?</h2>
        <Link href="/help/symptom-checker">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Start Symptom Checker
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </section>
    </div>
  )
}
