export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json()

    if (!email || !name || !password) {
      return Response.json(
        { error: 'Email, nome e password sono richiesti' },
        { status: 400 }
      )
    }

    // Invia l'email usando la tua API esterna
    const response = await fetch('https://email.pizzaurum.store/api/send/admin-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Errore nell\'invio email credenziali admin:', error)
      return Response.json(
        { error: 'Errore nell\'invio dell\'email' },
        { status: 500 }
      )
    }

    return Response.json({ 
      success: true, 
      message: 'Email con credenziali admin inviata con successo' 
    })

  } catch (error) {
    console.error('Errore interno:', error)
    return Response.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
