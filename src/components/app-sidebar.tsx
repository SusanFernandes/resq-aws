"use client"

import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"
import { 
  ArchiveX, 
  Inbox, 
  File,
  Send, 
  Trash2, 
  Command, 
  AlertTriangle, 
  AlertOctagon,
  type LucideIcon
} from 'lucide-react'

import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { EmergencyDetailCard } from "@/components/emergency-detail-card"
import { WebSocketData } from "@/types/emergency"
import { useEmergencyStore } from '@/lib/store/emergency'
import mapboxgl from 'mapbox-gl'

interface EmergencyCall {
  id: string
  location: string
  nature: string
  priority: "CRITICAL" | "MODERATE"
  caller: string
  time: string
  details: string
  coordinates: [number, number]
  imageUrl: string | null
  conversation: any[]
  analysis: any
}

// Updated sample data
const data = {
  user: {
    name: "Operator 42",
    email: "operator42@911.gov",
    avatar: "/avatars/operator.jpg",
  },
  navMain: [
    {
      title: "Active Calls",
      url: "#",
      icon: Inbox,
      isActive: true,
    },
    {
      title: "Pending",
      url: "#",
      icon: File,
      isActive: false,
    },
    {
      title: "Dispatched",
      url: "#",
      icon: Send,
      isActive: false,
    },
    {
      title: "Archived",
      url: "#",
      icon: ArchiveX,
      isActive: false,
    },
    {
      title: "Closed",
      url: "#",
      icon: Trash2,
      isActive: false,
    },
  ] as const,
  emergencyCalls: [] as EmergencyCall[], // Initialize with empty array
} as const

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  wsData: WebSocketData | null
}

// Add type for navigation items
interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive: boolean
}

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hhcmlhbiIsImEiOiJjbDg0aGQxNG8wZnhnM25sa3VlYzk1NzVtIn0.BxFbcyCbxdoSXAmSgcS5og'

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
    // Default to Mumbai coordinates
    return {
      coordinates: [72.8777, 19.0760],
      placeName: location,
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.8777,19.0760)/72.8777,19.0760,14/800x400?access_token=${MAPBOX_TOKEN}`
    }
  }
}

export function AppSidebar({ wsData, ...props }: AppSidebarProps) {
  const [activeItem, setActiveItem] = React.useState<NavItem>(() => data.navMain[0])
  const { setOpen } = useSidebar()
  
  const staticEmergencies = useEmergencyStore((state) => state.staticEmergencies)
  const dynamicEmergency = useEmergencyStore((state) => state.dynamicEmergency)
  const setDynamicEmergency = useEmergencyStore((state) => state.setDynamicEmergency)
  const selectedEmergency = useEmergencyStore((state) => state.selectedEmergency)
  const setSelectedEmergency = useEmergencyStore((state) => state.setSelectedEmergency)

  // Set initial selected emergency if none is selected
  React.useEffect(() => {
    if (!selectedEmergency && staticEmergencies.length > 0) {
      const firstEmergency = staticEmergencies[0];
      if (firstEmergency) {
        setSelectedEmergency(firstEmergency);
      }
    }
  }, [selectedEmergency, staticEmergencies, setSelectedEmergency]);

  // Handle new emergency data
  React.useEffect(() => {
    const processEmergency = async () => {
      if (!wsData?.data?.aiAnalysis) return;

      try {
        const locationDetails = await getLocationDetails(wsData.data.aiAnalysis.location);
        
        const coordinates: [number, number] = Array.isArray(locationDetails.coordinates) 
          ? [locationDetails.coordinates[0], locationDetails.coordinates[1]]
          : [72.8777, 19.0760];
        
        const emergencyData: EmergencyCall = {
          id: 'LIVE-EMERGENCY',
          location: locationDetails.placeName,
          nature: wsData.data.aiAnalysis.title,
          priority: wsData.data.aiAnalysis.type.toUpperCase() === "HIGH" ? "CRITICAL" : "MODERATE",
          caller: wsData.data.aiAnalysis.name,
          time: "Live",
          details: wsData.data.aiAnalysis.summary,
          coordinates,
          imageUrl: locationDetails.imageUrl,
          conversation: wsData.data.originalConversation || [],
          analysis: wsData.data.aiAnalysis
        };

        setDynamicEmergency(emergencyData);
      } catch (error) {
        console.error('Error processing emergency:', error);
      }
    };

    processEmergency();
  }, [wsData, setDynamicEmergency]);

  // Combine static and dynamic emergencies for display
  const allEmergencies = React.useMemo(() => {
    const emergencies = [...staticEmergencies];
    if (dynamicEmergency) {
      emergencies.unshift(dynamicEmergency);
    }
    return emergencies;
  }, [dynamicEmergency, staticEmergencies]);

  // Debug logs
  React.useEffect(() => {
    console.log('Static Emergencies:', staticEmergencies);
    console.log('Dynamic Emergency:', dynamicEmergency);
    console.log('All Emergencies:', allEmergencies);
  }, [staticEmergencies, dynamicEmergency, allEmergencies]);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item)
                        setOpen(true)
                      }}
                      isActive={activeItem.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-base font-medium text-foreground">
              {activeItem.title}
            </div>
          </div>
          <SidebarInput placeholder="Type to search..." />
          <div className="grid grid-cols-3 gap-2 px-4 py-3 border-t">
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-xl font-bold">{allEmergencies.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-red-600">Critical</span>
              <span className="text-xl font-bold text-red-600">
                {allEmergencies.filter(e => e.priority === "CRITICAL").length}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-yellow-600">Moderate</span>
              <span className="text-xl font-bold text-yellow-600">
                {allEmergencies.filter(e => e.priority === "MODERATE").length}
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent className="gap-2 p-2 flex flex-col">
              {allEmergencies.map((call) => (
                <a
                  href="#"
                  key={call.id}
                  onClick={(e) => {
                    e.preventDefault()
                    setSelectedEmergency(call)
                  }}
                  className={`flex items-center justify-between border-l-4 ${
                    call.id === 'LIVE-EMERGENCY' ? 'animate-pulse' : ''
                  } ${
                    call.priority === 'CRITICAL' 
                      ? 'border-l-red-500 border-red-500 border bg-red-50/50' 
                      : 'border-l-yellow-500 border-yellow-500 border bg-yellow-50/50'
                  } p-4 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`}
                >
                  <div className="flex items-center gap-2">
                    {call.priority === 'CRITICAL' ? (
                      <AlertOctagon className="h-5 w-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{call.nature}</span>
                      <span className={`text-xs font-bold ${
                        call.priority === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {call.priority}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold">{call.time}</span>
                </a>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {selectedEmergency && (
        <EmergencyDetailCard 
          emergency={selectedEmergency}
          onClose={() => setSelectedEmergency(null)}
        />
      )}
    </Sidebar>
  )
}
