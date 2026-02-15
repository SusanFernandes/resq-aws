import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, Phone, Map, Brain, Zap, Shield, Users, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 shadow-lg">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">ResQ AI</span>
            </div>
            <div className="hidden gap-8 md:flex">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
              >
                How it works
              </a>
              <a href="#impact" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
                Impact
              </a>
            </div>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-200 text-white transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-red-100/60 to-transparent blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-100/60 to-transparent blur-3xl"></div>
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-red-100 to-red-50 border border-red-200">
                  <span className="h-2 w-2 rounded-full bg-red-600"></span>
                  <p className="text-sm font-semibold text-red-700">🚨 Emergency Response Reimagined</p>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance leading-tight">
                  AI-Powered Emergency Response That Saves Lives
                </h1>
              </div>
              <p className="text-lg text-slate-600 text-balance leading-relaxed">
                ResQ AI transforms emergency management with intelligent voice processing, real-time AI analysis, and
                coordinated dispatch. Faster response. Better outcomes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-200 text-white transition-all"
                  >
                    Schedule Demo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-300 text-slate-900 hover:bg-slate-100 bg-transparent"
                >
                  View Documentation
                </Button>
              </div>
            </div>
            <div className="relative h-96 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-8 overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 to-blue-50/40"></div>
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-semibold text-slate-900">🎙️ Emergency Call Processing</span>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 space-y-3 border border-slate-200">
                  <p className="text-sm text-slate-600 font-medium">✅ AI Analysis Complete</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium">📍 Location Extracted</span>
                        <span className="text-red-600 font-bold">92%</span>
                      </div>
                      <div className="h-2 bg-slate-300 rounded-full overflow-hidden">
                        <div className="h-full w-[92%] bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-600">🏥 Emergency Type</span>
                      <span className="text-sm font-bold text-slate-900">Medical</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-600">⚠️ Priority Level</span>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-red-600">
                        <span className="h-2 w-2 rounded-full bg-red-600"></span>Critical
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="border-y border-slate-200/50 bg-gradient-to-r from-slate-100/50 to-blue-100/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* <div className="grid gap-8 md:grid-cols-4">
            {[
              { stat: "24/7", label: "⏰ Always Active Response" },
              { stat: "<2s", label: "⚡ AI Analysis Speed" },
              { stat: "99.9%", label: "🛡️ System Uptime" },
              { stat: "100+", label: "🤝 Agencies Connected" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent">
                  {item.stat}
                </div>
                <p className="mt-2 text-slate-600 font-medium">{item.label}</p>
              </div>
            ))}
          </div> */}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-red-100 to-red-50 border border-red-200 mb-3">
              <span className="h-2 w-2 rounded-full bg-red-600"></span>
              <p className="text-sm font-semibold text-red-700">🤖 Powered by Advanced AI</p>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4 text-balance">
              Everything needed for emergency response
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto text-balance">
              Intelligent features built specifically for emergency management and rapid response coordination
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Phone,
                emoji: "🎙️",
                title: "Voice Intelligence",
                description:
                  "Conversational AI that understands emergency calls, extracts critical information in natural dialogue.",
              },
              {
                icon: Map,
                emoji: "🗺️",
                title: "Geospatial Analysis",
                description:
                  "Real-time location tracking and mapping for optimal resource allocation and emergency response.",
              },
              {
                icon: Brain,
                emoji: "🧠",
                title: "Smart Classification",
                description: "Automatic emergency categorization and priority assessment using advanced AI and NLP.",
              },
              {
                icon: Zap,
                emoji: "⚡",
                title: "Real-time Dashboard",
                description:
                  "Live incident tracking, call transcripts, AI insights, and one-click dispatch across services.",
              },
              {
                icon: Shield,
                emoji: "🔒",
                title: "Secure Integration",
                description: "Enterprise-grade security with encrypted communication and full compliance standards.",
              },
              {
                icon: Users,
                emoji: "👥",
                title: "Multi-Agency Coordination",
                description:
                  "Seamless dispatch coordination between medical, fire, and police with shared incident data.",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="border border-slate-200 bg-white/70 backdrop-blur p-6 hover:border-red-300 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-red-50 group-hover:from-red-200 group-hover:to-red-100 transition-all text-xl">
                    {feature.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section
        id="how-it-works"
        className="border-t border-slate-200/50 bg-gradient-to-b from-slate-50/50 to-white px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4 text-balance">How ResQ AI Works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto text-balance">
              A seamless flow from emergency call to coordinated response
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { step: 1, emoji: "☎️", title: "Incoming Call", description: "Citizen contacts 112 emergency number" },
              {
                step: 2,
                emoji: "🤖",
                title: "AI Greeting",
                description: "Conversational AI responds and gathers initial information",
              },
              {
                step: 3,
                emoji: "🧠",
                title: "Smart Analysis",
                description: "Real-time extraction of location, emergency type, priority",
              },
              {
                step: 4,
                emoji: "📊",
                title: "Dashboard Alert",
                description: "Operators receive live incident data and insights",
              },
              {
                step: 5,
                emoji: "🚑",
                title: "Dispatch Decision",
                description: "One-click coordination of medical, fire, and police services",
              },
              {
                step: 6,
                emoji: "🚨",
                title: "Response Coordination",
                description: "Multi-agency teams dispatch and update in real-time",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 group">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all text-lg">
                  {item.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 mt-1 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold tracking-tight text-balance">
                Transforming emergency response across India
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                ResQ AI powers India's emergency management infrastructure with intelligent technology that saves lives
                through faster response times, better information, and coordinated dispatch.
              </p>
              <div className="space-y-4">
                {[
                  {
                    emoji: "⏱️",
                    title: "Reduced Response Time",
                    desc: "AI analysis cuts emergency identification time by 70%",
                  },
                  {
                    emoji: "🎯",
                    title: "Improved Accuracy",
                    desc: "Automatic information extraction ensures no critical details missed",
                  },
                  {
                    emoji: "🤝",
                    title: "Better Coordination",
                    desc: "Real-time multi-agency collaboration saves critical minutes",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-2xl mt-1">{item.emoji}</span>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <Card className="border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
                <p className="text-sm text-slate-600 font-medium">⚡ Average Response Improvement</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-5xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                    50%
                  </span>
                  <span className="text-slate-600">faster response</span>
                </div>
              </Card>
              <Card className="border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
                <p className="text-sm text-slate-600 font-medium">📞 Call Handling Efficiency</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-5xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                    3x
                  </span>
                  <span className="text-slate-600">more calls processed</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-200/50 bg-gradient-to-r from-red-600 to-red-700 px-4 py-24 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 0%, transparent 50%)" }}
          ></div>
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4 text-balance text-white">
            🚀 Ready to transform emergency response?
          </h2>
          <p className="text-lg text-red-100 mb-8 text-balance">
            Join emergency management agencies across India using ResQ AI for smarter, faster, more coordinated
            response.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-red-600 hover:bg-red-50 font-semibold">
                Schedule a Demo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-red-700/50 bg-transparent">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-white">ResQ AI</span>
              </div>
              <p className="text-sm text-slate-400">Emergency response powered by intelligent AI</p>
            </div>
            {["Product", "Company", "Legal"].map((section, i) => {
              const items = {
                Product: ["Features", "Pricing", "Documentation"],
                Company: ["About", "Blog", "Contact"],
                Legal: ["Privacy", "Terms", "Security"],
              }
              return (
                <div key={i}>
                  <h4 className="font-semibold mb-4 text-white">{section}</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    {items[section as keyof typeof items].map((item, j) => (
                      <li key={j}>
                        <a href="#" className="hover:text-white transition-colors">
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-slate-400">© 2025 ResQ AI. All rights reserved.</p>
            <p className="text-sm text-slate-400 mt-4 sm:mt-0">Made for India's emergency response ecosystem</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
