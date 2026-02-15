"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { WebSocketData } from "@/types/emergency"
import { MapView } from "@/components/map-view"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  const [wsData, setWsData] = useState<WebSocketData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()

  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      ws.current = new WebSocket(`ws://localhost:8080?type=dashboard`)

      ws.current.onopen = () => {
        console.log('WebSocket Connected')
        setIsConnected(true)
        // Clear any existing reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current)
          reconnectTimeout.current = undefined
        }
      }

      ws.current.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data)
          console.log('Raw WebSocket message:', response)
          
          if (response.type === "twilio-update") {
            console.log('Processing Twilio update:', response.data)
            setWsData({
              type: response.type,
              data: {
                id: `E-${Date.now()}`,
                timestamp: new Date().toISOString(),
                originalConversation: response.data.originalConversation || [],
                aiAnalysis: response.data.aiAnalysis
              }
            })
          }
        } catch (error) {
          console.error('Error parsing websocket data:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket Disconnected')
        setIsConnected(false)
        // Attempt to reconnect after 2 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connectWebSocket()
        }, 2000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error)
        ws.current?.close()
      }

    } catch (error) {
      console.error('WebSocket connection error:', error)
      // Attempt to reconnect after 2 seconds
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connectWebSocket()
      }, 2000)
    }
  }, [])

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket()

    // Cleanup function
    return () => {
      if (ws.current) {
        ws.current.close()
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
    }
  }, [connectWebSocket])

  // Keep connection alive with ping/pong
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send ping every 30 seconds

    return () => {
      clearInterval(pingInterval)
    }
  }, [])

  // Debug log for wsData
  useEffect(() => {
    console.log('Current wsData:', wsData)
  }, [wsData])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar wsData={wsData} />
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Inbox</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <MapView wsData={wsData} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

