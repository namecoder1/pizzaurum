export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return Response.json(
        { error: 'Email e nome sono richiesti' },
        { status: 400 }
      )
    }

    // Invia l'email usando la tua API esterna con header admin
    const response = await fetch('https://email.pizzaurum.store/api/send/welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json(
        { error: 'Errore nell\'invio dell\'email' },
        { status: 500 }
      )
    }

    return Response.json({ 
      success: true, 
      message: 'Email di benvenuto inviata con successo' 
    })

  } catch (error) {
    return Response.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
