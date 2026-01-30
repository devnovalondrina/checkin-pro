import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// ============================================================================
// MOCK CLIENT (Fallback se não houver conexão)
// ============================================================================
const createMockClient = () => {
  console.warn('Supabase not configured. Using mock client.')
  
  const mockAttendees: any[] = [
    { id: '1', created_at: new Date().toISOString(), full_name: 'João Silva', cpf: '123.456.789-00', phone: '(11) 99999-9999' },
    { id: '2', created_at: new Date().toISOString(), full_name: 'Maria Oliveira', cpf: '987.654.321-00', phone: '(21) 88888-8888' },
  ]

  const mockEvents: any[] = [
    { id: '1', title: 'Workshop React', date: new Date().toISOString(), location: 'Auditório 1', description: 'Aprenda React do zero', is_open: true },
    { id: '2', title: 'Palestra AI', date: new Date(Date.now() + 86400000).toISOString(), location: 'Auditório 2', description: 'Futuro da IA', is_open: false },
  ]

  const mockRegistrations: any[] = [
    { id: '1', attendee_id: '1', event_id: '1', checked_in: true, checkin_time: new Date().toISOString() },
    { id: '2', attendee_id: '2', event_id: '1', checked_in: false, checkin_time: null },
  ]

  return {
    from: (table: string) => ({
      select: (columns: string = '*') => {
        let currentData: any[] = []
        if (table === 'attendees') currentData = [...mockAttendees]
        if (table === 'events') currentData = [...mockEvents]
        if (table === 'registrations') {
          if (columns.includes('attendee:attendees')) {
             currentData = mockRegistrations.map(reg => ({
               ...reg,
               attendee: mockAttendees.find(a => a.id === reg.attendee_id)
             }))
          } else {
            currentData = [...mockRegistrations]
          }
        }

        const queryBuilder = {
          data: currentData,
          eq: function(field: string, value: any) {
            this.data = this.data.filter((item: any) => item[field] == value)
            return this
          },
          order: function(field: string, { ascending = true }: any = {}) {
            this.data.sort((a: any, b: any) => {
              if (a[field] < b[field]) return ascending ? -1 : 1
              if (a[field] > b[field]) return ascending ? 1 : -1
              return 0
            })
            return Promise.resolve({ data: this.data, error: null })
          },
          single: function() {
            return Promise.resolve({ 
              data: this.data[0] || null, 
              error: this.data.length > 0 ? null : { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } 
            })
          },
          then: function(resolve: (value: any) => void) {
            resolve({ data: this.data, error: null })
          }
        }

        return queryBuilder
      },
      insert: (data: any) => {
        console.log(`Mock Insert into ${table}:`, data)
        let insertedData: any[] = []
        let error = null

        if (table === 'attendees') {
           const newId = Math.random().toString()
           const newItem = { created_at: new Date().toISOString(), ...data[0], id: newId }
           mockAttendees.push(newItem)
           insertedData = [newItem]
        } else if (table === 'events') {
           const newItem = { ...data[0], id: Math.random().toString() }
           mockEvents.push(newItem)
           insertedData = [newItem]
        } else if (table === 'registrations') {
           const items = Array.isArray(data) ? data : [data]
           const newItems = items.map(item => ({ ...item, id: Math.random().toString() }))
           newItems.forEach(item => mockRegistrations.push(item))
           insertedData = newItems
        }

        const response = {
          data: insertedData,
          error,
          then: (resolve: (value: any) => void) => resolve({ data: insertedData, error }),
          select: () => ({
            single: () => Promise.resolve({ data: insertedData[0], error }),
            then: (resolve: (value: any) => void) => resolve({ data: insertedData, error })
          })
        }
        
        return response as any
      },
      update: (data: any) => ({
        eq: (field: string, value: any) => {
          console.log(`Mock Update ${table}:`, field, value, data)
          if (table === 'registrations' && field === 'id') {
             const idx = mockRegistrations.findIndex(r => r.id === value)
             if (idx !== -1) mockRegistrations[idx] = { ...mockRegistrations[idx], ...data }
          }
          if (table === 'events' && field === 'id') {
             const idx = mockEvents.findIndex(e => e.id === value)
             if (idx !== -1) mockEvents[idx] = { ...mockEvents[idx], ...data }
          }
          return Promise.resolve({ error: null })
        }
      }),
      delete: () => ({
        eq: (field: string, value: any) => {
           console.log(`Mock Delete ${table}:`, field, value)
           return Promise.resolve({ error: null })
        }
      })
    })
  } as unknown as SupabaseClient
}

const isConfigured = supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient()
