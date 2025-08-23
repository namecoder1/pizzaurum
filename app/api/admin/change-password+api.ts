import { createClient } from '@supabase/supabase-js'


const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: Request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json()

    if (!userId || !currentPassword || !newPassword) {
      return Response.json(
        { error: 'Tutti i campi sono richiesti' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: 'La password deve essere di almeno 8 caratteri' },
        { status: 400 }
      )
    }

    // Check for weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'user', 'test']
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      return Response.json(
        { error: 'La password scelta è troppo comune. Scegli una password più sicura.' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError || !user.user) {
      return Response.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (updateError) {
      return Response.json(
        { error: `Errore durante il cambio password: ${updateError.message}` },
        { status: 400 }
      )
    }

    return Response.json({
      success: true,
      message: 'Password cambiata con successo'
    })

  } catch (error) {
    console.error('Unexpected error changing password:', error)
    return Response.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
