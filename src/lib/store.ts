import { create } from 'zustand'

type Emergency = {
  id: string
  location: string
  nature: string
  priority: string
  caller: string
  time: string
  details: string
}

interface EmergencyStore {
  selectedEmergency: Emergency | null
  setSelectedEmergency: (emergency: Emergency | null) => void
}

export const useEmergencyStore = create<EmergencyStore>((set) => ({
  selectedEmergency: null,
  setSelectedEmergency: (emergency) => set({ selectedEmergency: emergency }),
})) 