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
    const { email, name } = await request.json()

    if (!email || !name) {
      return Response.json(
        { error: 'Email e nome sono richiesti' },
        { status: 400 }
      )
    }

    // Genera una password temporanea sicura (usata sia per nuovo che per update response)
    const tempPassword = name.charAt(0).toUpperCase() + name.slice(1) + '123!'

    // Verifica se esiste già un account auth con questa email
    const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers()
    
    const existingAuthUser = authUser.users.find(user => user.email === email)
    if (existingAuthUser) {
      // Se esiste già un account auth, aggiorna il ruolo invece di crearlo
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: existingAuthUser.id,
          email,
          name,
          role: 'admin',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (updateError) {
        console.error('Error updating existing user:', updateError)
        return Response.json(
          { error: `Errore nell'aggiornamento dell'utente esistente: ${updateError.message}` },
          { status: 400 }
        )
      }

      return Response.json({
      success: true,
      message: `Admin ${name} aggiornato con successo`,
      user: {
        id: existingAuthUser.id,
        email,
        name
      },
      tempPassword: tempPassword
    })
    }

    // Crea l'utente con l'API admin
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'admin'
      }
    })

    if (createError) {
      console.error('Error creating admin user:', createError)
      return Response.json(
        { error: `Errore nella creazione dell'admin: ${createError.message}` },
        { status: 400 }
      )
    }

    // Inserisci nella tabella users usando upsert per gestire duplicati
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userData.user.id,
        email,
        name,
        role: 'admin',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (insertError) {
      console.error('Error inserting into users table:', insertError)
      // Se fallisce l'inserimento nella tabella users, elimina l'utente creato
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      return Response.json(
        { error: `Errore nell'inserimento nel database: ${insertError.message}` },
        { status: 400 }
      )
    }

    // Invia email di invito
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role: 'admin'
      }
    })

    if (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Non blocchiamo il processo se l'email fallisce, ma logghiamo l'errore
    }

    return Response.json({
      success: true,
      message: `Admin ${name} creato con successo`,
      user: {
        id: userData.user.id,
        email,
        name
      },
      tempPassword: tempPassword
    })

  } catch (error) {
    console.error('Unexpected error creating admin:', error)
    return Response.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
