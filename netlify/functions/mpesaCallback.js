exports.handler = async (event) => {

  const body = JSON.parse(event.body)

  console.log("Full Callback:", body)

  const stkCallback = body.Body.stkCallback

  const resultCode = stkCallback.ResultCode
  const resultDesc = stkCallback.ResultDesc

  if (resultCode === 0) {

    const metadata = stkCallback.CallbackMetadata.Item

    const amount = metadata.find(i => i.Name === "Amount").Value
    const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber").Value
    const phone = metadata.find(i => i.Name === "PhoneNumber").Value

    console.log("PAYMENT SUCCESS")
    console.log("Amount:", amount)
    console.log("Receipt:", receipt)
    console.log("Phone:", phone)

  } else {

    console.log("PAYMENT FAILED:", resultDesc)

  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Callback received" })
  }
}
