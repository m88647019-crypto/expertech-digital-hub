exports.handler = async (event) => {

  try {

    const body = JSON.parse(event.body)

    console.log("M-Pesa Callback:", JSON.stringify(body))

    const stkCallback = body.Body.stkCallback
    const resultCode = stkCallback.ResultCode
    const resultDesc = stkCallback.ResultDesc

    if (resultCode === 0) {

      const metadata = stkCallback.CallbackMetadata.Item

      const amount = metadata.find(i => i.Name === "Amount").Value
      const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber").Value
      const phone = metadata.find(i => i.Name === "PhoneNumber").Value

      console.log("Payment Successful")
      console.log("Amount:", amount)
      console.log("Receipt:", receipt)
      console.log("Phone:", phone)

    } else {

      console.log("Payment Failed:", resultDesc)

    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Callback received" })
    }

  } catch (error) {

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }

  }

}
