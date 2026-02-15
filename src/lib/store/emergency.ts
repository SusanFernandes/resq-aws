import { create } from 'zustand'
import { EmergencyCall, EmergencyResource } from '@/types/emergency'

interface EmergencyState {
  staticEmergencies: EmergencyCall[]
  dynamicEmergency: EmergencyCall | null
  emergencyHistory: EmergencyCall[]
  selectedEmergency: EmergencyCall | null
  resources: EmergencyResource[]
  activeConversations: Record<string, any[]>
  
  // Actions
  setSelectedEmergency: (emergency: EmergencyCall | null) => void
  setDynamicEmergency: (emergency: EmergencyCall) => void
  addToHistory: (emergency: EmergencyCall) => void
  clearDynamicEmergency: () => void
  updateResourceStatus: (resourceId: string, status: 'available' | 'dispatched' | 'on-scene') => void
  addConversationMessage: (emergencyId: string, message: { role: string; content: string }) => void
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  staticEmergencies: [
    {
      id: 'E-001',
      location: 'Andheri East, Mumbai, Maharashtra',
      nature: 'Building Fire',
      priority: 'CRITICAL',
      caller: 'Raj Malhotra',
      time: '10 mins ago',
      details: 'Fire reported on the 3rd floor of residential building. Smoke visible from street.',
      coordinates: [72.8691, 19.1136],
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.8691,19.1136)/72.8691,19.1136,14/800x400?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      conversation: [
        { role: 'user', content: 'There\'s a fire in my apartment building! Third floor!' },
        { role: 'assistant', content: 'I understand there\'s a fire. What\'s your exact location?' }
      ],
      analysis: {
        location: 'Andheri East, Mumbai, Maharashtra',
        name: 'Raj Malhotra',
        age: '35',
        summary: 'Fire reported on the 3rd floor of residential building. Smoke visible from street.',
        type: 'HIGH',
        title: 'Building Fire'
      }
    },
    {
      id: 'E-002',
      location: 'Bandra West, Mumbai, Maharashtra',
      nature: 'Road Accident',
      priority: 'HIGH',
      caller: 'Anjali Sharma',
      time: '5 mins ago',
      details: 'Multi-vehicle collision at Hill Road junction. One person unconscious.',
      coordinates: [72.8295, 19.0606],
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.8295,19.0606)/72.8295,19.0606,14/800x400?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      conversation: [
        { role: 'user', content: 'There’s been a bad crash! At least 3 cars involved!' },
        { role: 'assistant', content: 'Are there any injured individuals? Please share your location.' }
      ],
      analysis: {
        location: 'Bandra West, Mumbai, Maharashtra',
        name: 'Anjali Sharma',
        age: '28',
        summary: 'Multi-vehicle collision at Hill Road junction. One person unconscious.',
        type: 'MEDIUM',
        title: 'Road Accident'
      }
    },
    {
      id: 'E-003',
      location: 'Kurla, Mumbai, Maharashtra',
      nature: 'Gas Leak',
      priority: 'CRITICAL',
      caller: 'Imran Sheikh',
      time: '2 mins ago',
      details: 'Strong gas smell in the area. Nearby residents reporting dizziness.',
      coordinates: [72.8856, 19.0712],
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.8856,19.0712)/72.8856,19.0712,14/800x400?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      conversation: [
        { role: 'user', content: 'There’s a weird smell, like gas. I think it’s a leak!' },
        { role: 'assistant', content: 'Thank you for reporting. Stay outside and avoid using any electronics.' }
      ],
      analysis: {
        location: 'Kurla, Mumbai, Maharashtra',
        name: 'Imran Sheikh',
        age: '42',
        summary: 'Strong gas smell in the area. Nearby residents reporting dizziness.',
        type: 'HIGH',
        title: 'Gas Leak'
      }
    },
    {
      id: 'E-004',
      location: 'Colaba, Mumbai, Maharashtra',
      nature: 'Medical Emergency',
      priority: 'MEDIUM',
      caller: 'Sunita Rao',
      time: '12 mins ago',
      details: 'Elderly man collapsed in Gateway of India area. No response.',
      coordinates: [72.8328, 18.9218],
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.8328,18.9218)/72.8328,18.9218,14/800x400?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      conversation: [
        { role: 'user', content: 'Someone just collapsed in front of me, I think he’s not breathing!' },
        { role: 'assistant', content: 'Is he responsive? Please check if he’s breathing and performing any movement.' }
      ],
      analysis: {
        location: 'Colaba, Mumbai, Maharashtra',
        name: 'Sunita Rao',
        age: '30',
        summary: 'Elderly man collapsed in Gateway of India area. No response.',
        type: 'MEDIUM',
        title: 'Medical Emergency'
      }
    },
    {
      id: 'E-005',
      location: 'Thane West, Maharashtra',
      nature: 'Flooding',
      priority: 'HIGH',
      caller: 'Vikram Desai',
      time: '20 mins ago',
      details: 'Water level rising in basement of residential complex. Power supply cut.',
      coordinates: [72.9781, 19.2183],
      imageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(72.9781,19.2183)/72.9781,19.2183,14/800x400?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      conversation: [
        { role: 'user', content: 'Our basement is flooding rapidly! The lights went out too!' },
        { role: 'assistant', content: 'Please move to higher ground. Is everyone safe at the moment?' }
      ],
      analysis: {
        location: 'Thane West, Maharashtra',
        name: 'Vikram Desai',
        age: '39',
        summary: 'Water level rising in basement of residential complex. Power supply cut.',
        type: 'HIGH',
        title: 'Flooding'
      }
    }
  ],

  dynamicEmergency: null,
  emergencyHistory: [],
  selectedEmergency: null,
  resources: [
    {
      id: 'AMB-001',
      type: 'ambulance',
      status: 'available',
      location: [72.8777, 19.0760],
      assignedTo: null
    },
    {
      id: 'FR-001',
      type: 'fire-truck',
      status: 'available',
      location: [72.8777, 19.0760],
      assignedTo: null
    },
    {
      id: 'POL-001',
      type: 'police',
      status: 'available',
      location: [72.8777, 19.0760],
      assignedTo: null
    }
  ],
  activeConversations: {},
  
  setSelectedEmergency: (emergency) => set({ selectedEmergency: emergency }),
  
  setDynamicEmergency: (emergency) => set((state) => {
    // Update conversation history
    const updatedConversations = {
      ...state.activeConversations,
      [emergency.id]: emergency.conversation
    }
    
    if (state.dynamicEmergency?.id === emergency.id) {
      return { 
        dynamicEmergency: emergency,
        activeConversations: updatedConversations
      }
    }
    
    if (state.dynamicEmergency) {
      return {
        dynamicEmergency: emergency,
        emergencyHistory: [state.dynamicEmergency, ...state.emergencyHistory],
        activeConversations: updatedConversations
      }
    }
    
    return { 
      dynamicEmergency: emergency,
      activeConversations: updatedConversations
    }
  }),
  
  addToHistory: (emergency) => set((state) => ({
    emergencyHistory: [emergency, ...state.emergencyHistory]
  })),
  
  clearDynamicEmergency: () => set((state) => {
    if (state.dynamicEmergency) {
      return {
        dynamicEmergency: null,
        emergencyHistory: [state.dynamicEmergency, ...state.emergencyHistory]
      }
    }
    return { dynamicEmergency: null }
  }),
  
  updateResourceStatus: (resourceId, status) => set((state) => ({
    resources: state.resources.map(resource => 
      resource.id === resourceId ? { ...resource, status } : resource
    )
  })),
  
  addConversationMessage: (emergencyId, message) => set((state) => {
    const currentConversation = state.activeConversations[emergencyId] || []
    return {
      activeConversations: {
        ...state.activeConversations,
        [emergencyId]: [...currentConversation, message]
      }
    }
  })
}))