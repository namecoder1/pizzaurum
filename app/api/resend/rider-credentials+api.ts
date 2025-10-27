export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return Response.json(
        { error: 'Email, name and password are required' },
        { status: 400 }
      )
    }

    const response = await fetch('https://email.pizzaurum.store/api/send/rider-invite', {
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
      const error = await response.json();
      console.error('Error sending rider invite email:', error);
      return Response.json(
        { error: 'Error sending rider invite email' },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      message: 'Rider invite email sent successfully'
    })

  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}