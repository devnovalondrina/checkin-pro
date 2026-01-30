import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfdwfhyzbtdktkxarbxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZHdmaHl6YnRka3RreGFyYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjEzMTUsImV4cCI6MjA4NTE5NzMxNX0.FuBhBiujj0v1zIQyrBj5ZNWZbL8dSfhlaOFO3hUzLRM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
  console.log('Creating admin user...')
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@checkin.com',
    password: 'admin123',
  })

  if (error) {
    console.error('Error creating admin:', error.message)
  } else {
    console.log('Admin user created successfully:')
    console.log('Email: admin@example.com')
    console.log('Password: admin123')
    console.log('User ID:', data.user?.id)
  }
}

createAdmin()
