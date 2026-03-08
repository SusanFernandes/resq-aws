/**
 * Emergency Contact Service (U11)
 * Manages emergency contacts and SOS functionality
 */

export interface EmergencyContact {
  contactId: string
  name: string
  phone: string
  relationship: 'Family' | 'Friend' | 'Doctor' | 'Neighbor' | 'Other'
  priority: 1 | 2 | 3
  notificationMethod: 'SMS' | 'CALL'
}

export interface SOSEvent {
  sosId: string
  timestamp: string
  latitude: number
  longitude: number
  address: string
  emergencyContacts: EmergencyContact[]
  callStatus: 'INITIATED' | 'DIALING' | 'CONNECTED' | 'FAILED'
  smsStatus: { contactId: string; status: 'SENT' | 'FAILED' }[]
  locationShared: boolean
  eta?: number // Estimated time to ambulance arrival in minutes
}

class EmergencyContactService {
  private contacts: Map<string, EmergencyContact> = new Map()
  private sosEvents: Map<string, SOSEvent> = new Map()
  private maxContacts = 5

  /**
   * Add emergency contact
   */
  addContact(name: string, phone: string, relationship: EmergencyContact['relationship']): EmergencyContact {
    // Validate phone number (basic)
    if (!phone || phone.length < 10) {
      throw new Error('Invalid phone number format')
    }

    const contact: EmergencyContact = {
      contactId: `CONTACT-${Date.now()}`,
      name,
      phone,
      relationship,
      priority: 3,
      notificationMethod: 'SMS',
    }

    if (this.contacts.size >= this.maxContacts) {
      throw new Error(`Cannot add more than ${this.maxContacts} emergency contacts`)
    }

    this.contacts.set(contact.contactId, contact)
    console.log(`[EmergencyContactService] Added contact: ${name}`)

    return contact
  }

  /**
   * Update contact priority
   */
  updateContactPriority(contactId: string, priority: 1 | 2 | 3): EmergencyContact {
    const contact = this.contacts.get(contactId)
    if (!contact) {
      throw new Error(`Contact ${contactId} not found`)
    }

    contact.priority = priority
    return contact
  }

  /**
   * Delete contact
   */
  deleteContact(contactId: string): void {
    this.contacts.delete(contactId)
    console.log(`[EmergencyContactService] Deleted contact ${contactId}`)
  }

  /**
   * Get all contacts sorted by priority
   */
  getAllContacts(): EmergencyContact[] {
    return Array.from(this.contacts.values()).sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get contact by ID
   */
  getContact(contactId: string): EmergencyContact | undefined {
    return this.contacts.get(contactId)
  }

  /**
   * Initiate SOS call
   */
  initiateSOS(latitude: number, longitude: number, address: string): SOSEvent {
    const sosId = `SOS-${Date.now()}`

    const sosEvent: SOSEvent = {
      sosId,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      address,
      emergencyContacts: this.getAllContacts(),
      callStatus: 'INITIATED',
      smsStatus: [],
      locationShared: true,
      eta: undefined,
    }

    this.sosEvents.set(sosId, sosEvent)

    console.log(
      `[EmergencyContactService] SOS initiated: ${sosId} at ${address} (${latitude}, ${longitude})`
    )

    // Simulate call and message sending
    this.sendSOSNotifications(sosEvent)

    return sosEvent
  }

  /**
   * Send SOS notifications (simulate SMS/call)
   */
  private sendSOSNotifications(sosEvent: SOSEvent): void {
    // Simulate sending SMS to each contact
    sosEvent.emergencyContacts.forEach((contact) => {
      const smsText = `🚨 EMERGENCY SOS 🚨\n\n${sosEvent.address}\n\nLocation: https://maps.google.com/?q=${sosEvent.latitude},${sosEvent.longitude}\n\nTime: ${sosEvent.timestamp}\n\nEmergency services contacted.`

      // Log instead of actually sending (in production, use Twilio)
      console.log(`[EmergencyContactService] SMS to ${contact.phone}: ${smsText}`)

      sosEvent.smsStatus.push({
        contactId: contact.contactId,
        status: Math.random() > 0.1 ? 'SENT' : 'FAILED',
      })
    })

    // Simulate calling 112
    console.log('[EmergencyContactService] Calling 112 with location...')
  }

  /**
   * Update SOS call status
   */
  updateSOSStatus(sosId: string, status: SOSEvent['callStatus']): SOSEvent {
    const sosEvent = this.sosEvents.get(sosId)
    if (!sosEvent) {
      throw new Error(`SOS ${sosId} not found`)
    }

    sosEvent.callStatus = status

    if (status === 'CONNECTED') {
      sosEvent.eta = Math.floor(Math.random() * 10) + 2 // 2-12 minutes
    }

    return sosEvent
  }

  /**
   * Complete SOS event
   */
  completeSOSEvent(sosId: string): SOSEvent {
    const sosEvent = this.sosEvents.get(sosId)
    if (!sosEvent) {
      throw new Error(`SOS ${sosId} not found`)
    }

    console.log(`[EmergencyContactService] SOS completed: ${sosId}`)
    return sosEvent
  }

  /**
   * Get SOS event details
   */
  getSOSEvent(sosId: string): SOSEvent | undefined {
    return this.sosEvents.get(sosId)
  }

  /**
   * Get recent SOS events
   */
  getRecentSOSEvents(limit: number = 10): SOSEvent[] {
    return Array.from(this.sosEvents.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Check if user has emergency contacts set up
   */
  hasEmergencyContacts(): boolean {
    return this.contacts.size > 0
  }

  /**
   * Get emergency contact count
   */
  getContactCount(): number {
    return this.contacts.size
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    // Keep last 4 digits visible, mask the rest
    if (phone.length >= 4) {
      return '*'.repeat(phone.length - 4) + phone.slice(-4)
    }
    return phone
  }

  /**
   * Import contacts from JSON
   */
  importContacts(
    contactsData: Array<{
      name: string
      phone: string
      relationship: EmergencyContact['relationship']
    }>
  ): EmergencyContact[] {
    const imported: EmergencyContact[] = []

    contactsData.forEach((data, index) => {
      try {
        const contact = this.addContact(data.name, data.phone, data.relationship)
        contact.priority = (Math.min(index + 1, 3) as 1 | 2 | 3)
        imported.push(contact)
      } catch (error) {
        console.error(`[EmergencyContactService] Failed to import contact ${data.name}:`, error)
      }
    })

    return imported
  }

  /**
   * Export contacts to JSON
   */
  exportContacts(): string {
    const contacts = this.getAllContacts().map((c) => ({
      name: c.name,
      phone: c.phone,
      relationship: c.relationship,
      priority: c.priority,
    }))

    return JSON.stringify(contacts, null, 2)
  }

  /**
   * Clear all contacts (with confirmation in UI)
   */
  clearAllContacts(): void {
    this.contacts.clear()
    console.log('[EmergencyContactService] All contacts cleared')
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalContacts: number
    totalSOS: number
    successfulSOSCalls: number
  } {
    return {
      totalContacts: this.contacts.size,
      totalSOS: this.sosEvents.size,
      successfulSOSCalls: Array.from(this.sosEvents.values()).filter(
        (s) => s.callStatus === 'CONNECTED'
      ).length,
    }
  }
}

export const emergencyContactService = new EmergencyContactService()
