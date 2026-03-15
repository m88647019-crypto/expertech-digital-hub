exports.handler = async () => {

  const consumerKey = process.env.MPESA_CONSUMER_KEY
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

  try {

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    )

    const data = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    }

  } catch (error) {

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }

  }
}
