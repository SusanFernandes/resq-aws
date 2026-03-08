"use client"

import * as React from "react"
import {
  ArchiveX,
  Inbox,
  Send,
  Command,
  AlertTriangle,
  AlertOctagon,
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Search,
  Zap,
  AlertCircle,
  Activity,
  FileSearch,
  Locate,
  MessageSquare,
  Bot,
  Brain,
  Cpu,
  Layers,
  PieChart,
  Terminal,
  Type,
  Lightbulb,
  Settings,
  ChevronRight,
  BarChart,
  type LucideIcon,
  X,
  Clock
} from 'lucide-react'

import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { EmergencyDetailCard } from "@/components/emergency-detail-card"
import { WebSocketData, EmergencyCall } from "@/types/emergency"
import { useEmergencyStore } from '@/lib/store/emergency'
import { cn } from "@/lib/utils"

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hhcmlhbiIsImEiOiJjbDg0aGQxNG8wZnhnM25sa3VlYzk1NzVtIn0.BxFbcyCbxdoSXAmSgcS5og'

const navData = {
  user: {
    name: "Operator 42",
    email: "operator42@911.gov",
    avatar: "/avatars/operator.jpg",
  },
  calls: [
    { title: "Active Calls", icon: Inbox, id: "active" },
    { title: "Dispatched", icon: Send, id: "dispatched" },
    { title: "Archived", icon: ArchiveX, id: "archived" },
  ],
  operations: [
    {
      title: "Core Operations",
      items: [
        { title: "Emergency Analysis", icon: Activity, id: "analysis" },
        { title: "Intake Form", icon: ClipboardList, id: "intake" },
        { title: "Protocol Reference", icon: BookOpen, id: "protocol" },
        { title: "Hospital Search", icon: Search, id: "hospital" },
      ]
    },
    {
      title: "Dispatch & Escalation",
      items: [
        { title: "Auto Dispatch", icon: Zap, id: "dispatch" },
        { title: "Escalation Manager", icon: AlertCircle, id: "escalation" },
      ]
    },
    {
      title: "Operator Tools",
      items: [
        { title: "Live Analysis", icon: Activity, id: "live-analysis" },
        { title: "Similar Cases", icon: FileSearch, id: "similar-cases" },
        { title: "Location Verify", icon: Locate, id: "location-verify" },
        { title: "Contextual Qs", icon: MessageSquare, id: "questions" },
      ]
    },
    {
      title: "AI & Autonomous",
      items: [
        { title: "Autonomous Control", icon: Bot, id: "autonomous-control" },
        { title: "Sentiment Analysis", icon: Brain, id: "sentiment" },
        { title: "Monitoring", icon: Activity, id: "monitoring" },
        { title: "Complexity", icon: BarChart, id: "complexity" },
        { title: "Resource Opt", icon: PieChart, id: "resources" },
        { title: "NLP Console", icon: Terminal, id: "nlp" },
        { title: "Transcription", icon: Type, id: "transcription" },
        { title: "Thinking Process", icon: Lightbulb, id: "thinking" },
      ]
    }
  ]
}

const getLocationDetails = async (location: string) => {
  try {
    const query = encodeURIComponent(location)
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=IN`
    )
    const data = await response.json()
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      const [lng, lat] = feature.center
      return {
        coordinates: feature.center as [number, number],
        placeName: feature.place_name,
        imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},14/800x400?access_token=${MAPBOX_TOKEN}`
      }
    }
    throw new Error('No location found')
  } catch (error) {
    console.error('Geocoding error:', error)
    return {
      coordinates: [72.8777, 19.0760],
      placeName: location,
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.8777,19.0760)/72.8777,19.0760,14/800x400?access_token=${MAPBOX_TOKEN}`
    }
  }
}

// Sidebar 1: Core Features
export function CoreFeaturesSidebar({
  activeTab,
  onTabChange,
  open,
  onOpenChange
}: {
  activeTab: string,
  onTabChange: (tab: string) => void,
  open: boolean,
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "z-20 border-r transition-all duration-300 ease-in-out bg-slate-900 text-slate-300",
        open ? "w-[260px]" : "w-0 opacity-0 overflow-hidden"
      )}
    >
      <SidebarHeader className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Command className="size-4" />
          </div>
          <span className="font-bold text-white tracking-tight">System Tools</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 gap-4">
        {navData.operations.map((group) => (
          <SidebarGroup key={group.title} className="px-0">
            <SidebarGroupLabel className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 mb-2 flex items-center justify-between">
              {group.title}
              <Badge variant="outline" className="text-[8px] h-3 px-1 border-slate-800 text-slate-500">{group.items.length}</Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={activeTab === item.id}
                      className={cn(
                        "transition-all duration-200 hover:bg-slate-800 hover:text-white px-2",
                        activeTab === item.id ? "bg-blue-600 text-white" : ""
                      )}
                    >
                      <item.icon className="size-4 mr-2" />
                      <span className="text-sm">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-800 p-2">
        <div className="px-2 py-2 mb-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
            <span>System Status</span>
            <span className="text-green-500">Online</span>
          </div>
        </div>
        <NavUser user={navData.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

// Sidebar 2: Emergency List
export function EmergencyListSidebar({
  wsData,
  open,
  onOpenChange
}: {
  wsData: WebSocketData | null,
  open: boolean,
  onOpenChange: (open: boolean) => void
}) {
  const [activeCategory, setActiveCategory] = React.useState("active")

  const staticEmergencies = useEmergencyStore((state) => state.staticEmergencies)
  const dynamicEmergency = useEmergencyStore((state) => state.dynamicEmergency)
  const setDynamicEmergency = useEmergencyStore((state) => state.setDynamicEmergency)
  const selectedEmergency = useEmergencyStore((state) => state.selectedEmergency)
  const setSelectedEmergency = useEmergencyStore((state) => state.setSelectedEmergency)

  React.useEffect(() => {
    if (!selectedEmergency && staticEmergencies.length > 0) {
      const first = staticEmergencies[0];
      if (first) setSelectedEmergency(first);
    }
  }, []);

  React.useEffect(() => {
    const processEmergency = async () => {
      if (!wsData?.data?.aiAnalysis) return;
      const locationDetails = await getLocationDetails(wsData.data.aiAnalysis.location);
      const emergencyData: EmergencyCall = {
        id: 'LIVE-EMERGENCY',
        location: locationDetails.placeName,
        nature: wsData.data.aiAnalysis.title,
        priority: wsData.data.aiAnalysis.type.toUpperCase() === "HIGH" ? "CRITICAL" : "MODERATE",
        caller: wsData.data.aiAnalysis.name,
        time: "Live",
        details: wsData.data.aiAnalysis.summary,
        coordinates: (locationDetails.coordinates as [number, number]) || [72.8777, 19.0760],
        imageUrl: locationDetails.imageUrl,
        conversation: wsData.data.originalConversation || [],
        analysis: wsData.data.aiAnalysis
      };
      setDynamicEmergency(emergencyData);
    };
    processEmergency();
  }, [wsData]);

  const allEmergencies = React.useMemo(() => {
    const emergencies = [...staticEmergencies];
    if (dynamicEmergency) emergencies.unshift(dynamicEmergency);
    return emergencies;
  }, [dynamicEmergency, staticEmergencies]);

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "z-10 border-r transition-all duration-300 ease-in-out bg-white",
        open ? "w-[300px]" : "w-0 opacity-0 overflow-hidden"
      )}
    >
      <SidebarHeader className="p-4 border-b bg-slate-50/50 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-blue-600" />
            <span className="font-bold text-slate-900 tracking-tight">Emergency Queue</span>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">LIVE</Badge>
        </div>
        <SidebarInput placeholder="Search records..." className="bg-white h-9 text-xs" />
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex flex-col items-center">
            <span className="text-[10px] font-bold text-red-600 uppercase">Critical</span>
            <span className="text-lg font-black text-red-700">{allEmergencies.filter(e => e.priority === "CRITICAL").length}</span>
          </div>
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg flex flex-col items-center">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Active</span>
            <span className="text-lg font-black text-blue-700">{allEmergencies.length}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 scrollbar-thin overflow-y-auto">
        <div className="flex flex-col gap-2">
          {allEmergencies.map((call) => (
            <button
              key={call.id}
              onClick={() => setSelectedEmergency(call)}
              className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 text-left",
                call.id === 'LIVE-EMERGENCY' ? "border-blue-400 bg-blue-50/30" : "border-slate-100 bg-white hover:border-slate-300",
                selectedEmergency?.id === call.id ? "ring-2 ring-blue-500 border-blue-200 bg-blue-50/10" : ""
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center",
                    call.priority === 'CRITICAL' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {call.priority === 'CRITICAL' ? <AlertOctagon className="size-4" /> : <Activity className="size-4" />}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[140px]">{call.nature || "Emergency Event"}</span>
                    <span className="text-[10px] font-bold text-slate-500">{call.time || "Recent"}</span>
                  </div>
                </div>
                <Badge className={call.priority === 'CRITICAL' ? "bg-red-600" : "bg-blue-600"}>{call.priority || "MODERATE"}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium truncate">
                <Locate className="size-3 text-slate-400" />
                {call.location || "Location pending..."}
              </div>
            </button>
          ))}
        </div>
      </SidebarContent>
      {selectedEmergency && (
        <EmergencyDetailCard
          emergency={selectedEmergency}
          onClose={() => setSelectedEmergency(null)}
        />
      )}
    </Sidebar>
  )
}
