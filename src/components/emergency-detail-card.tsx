"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AlertOctagon, AlertTriangle, X, Siren, Flame, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmergencyCall } from "@/types/emergency"
import { useToast } from "@/components/ui/use-toast"

interface EmergencyDetailCardProps {
  emergency: EmergencyCall
  onClose: () => void
}

export function EmergencyDetailCard({ emergency, onClose }: EmergencyDetailCardProps) {
  const [mounted, setMounted] = React.useState(false)
  const { toast } = useToast()
  const [isDispatching, setIsDispatching] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleDispatch = async (service: 'medical' | 'fire' | 'police') => {
    try {
      setIsDispatching(true)
      
      // Create dispatch data
      const dispatchData = {
        ...emergency.analysis,
        service_type: service,
        emergency_id: emergency.id,
        dispatch_time: new Date().toISOString()
      }

      // Connect to WebSocket
      const socket = new WebSocket('ws://localhost:8080/?type=dashboard')
      
      socket.onopen = () => {
        // Send dispatch report
        socket.send(JSON.stringify({
          type: "emergency-report",
          data: dispatchData,
        }))

        // Show success toast
        toast({
          title: "Service Dispatched",
          description: `${service.charAt(0).toUpperCase() + service.slice(1)} services have been dispatched to ${emergency.location}`,
          variant: "default",
        })

        // Close socket after sending
        socket.close()
      }

      socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        toast({
          title: 'Dispatch Failed',
          description: 'Failed to dispatch service due to a connection error.',
          variant: 'destructive',
        })
        setIsDispatching(false)
        try { socket.close() } catch (e) {}
      }

    } catch (error) {
      console.error('Dispatch error:', error)
      toast({
        title: "Dispatch Failed",
        description: "Failed to dispatch emergency services. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDispatching(false)
    }
  }

  if (!mounted) return null

  const handleClose = () => {
    onClose()
  }

  return createPortal(
    <div 
      className="fixed inset-0 flex items-start justify-end pointer-events-none"
      style={{ marginLeft: 'var(--sidebar-width)', zIndex: 2147483647 }}
    >
      <div className="flex items-end gap-4 p-6 h-full pointer-events-auto">
        {/* Emergency Details Card */}
        <div className="bg-white rounded-lg shadow-2xl border animate-in fade-in zoom-in-95 duration-200 w-[350px]">
          <div className="flex items-center justify-between gap-2 p-4 border-b">
            <div className="flex items-center gap-3 flex-1">
              {emergency.priority === 'CRITICAL' ? (
                <AlertOctagon className="h-5 w-5 text-red-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">{emergency.nature}</h3>
                <p className="text-sm text-muted-foreground truncate">{emergency.location}</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleClose()
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 -m-1 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all rounded-md cursor-pointer"
              type="button"
              aria-label="Close emergency detail"
              title="Close (ESC)"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="px-4 pb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className={`font-medium ${
                    emergency.priority === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'
                  }`}>{emergency.priority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time</p>
                  <p className="font-medium">{emergency.time}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Caller</p>
                  <p className="font-medium">{emergency.caller}</p>
                </div>
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm">Details</p>
                <p className="text-sm mt-1">{emergency.details}</p>
              </div>

              {/* Service Dispatch Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-1 h-auto py-2"
                  onClick={() => handleDispatch('medical')}
                  disabled={isDispatching}
                >
                  <UserCog className="h-5 w-5 text-blue-500" />
                  <span className="text-xs">Medical</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-1 h-auto py-2"
                  onClick={() => handleDispatch('fire')}
                  disabled={isDispatching}
                >
                  <Flame className="h-5 w-5 text-red-500" />
                  <span className="text-xs">Fire</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-1 h-auto py-2"
                  onClick={() => handleDispatch('police')}
                  disabled={isDispatching}
                >
                  <Siren className="h-5 w-5 text-blue-700" />
                  <span className="text-xs">Police</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transcript Card */}
        <div className="w-[400px] bg-white rounded-lg shadow-2xl border animate-in fade-in zoom-in-95 duration-200 flex flex-col h-5/6">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="space-y-1">
              <h3 className="font-semibold">Live Transcript</h3>
              <p className="text-sm text-muted-foreground">Emergency ID: {emergency.id}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {emergency.conversation.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.role === 'assistant' ? 'items-end' : 'items-start'
                }`}
              >
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'assistant' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {message.role === 'assistant' ? 'Operator' : 'Caller'}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 