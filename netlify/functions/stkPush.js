exports.handler = async (event) => {

const { phone, amount } = JSON.parse(event.body)

const tokenResponse = await fetch(
"https://expertechcyberonline.netlify.app/.netlify/functions/getAccessToken"
)

const tokenData = await tokenResponse.json()

const accessToken = tokenData.access_token

const shortcode = process.env.MPESA_SHORTCODE
const passkey = process.env.MPESA_PASSKEY

const timestamp = new Date()
.toISOString()
.replace(/[-:.TZ]/g,"")
.slice(0,14)

const password = Buffer.from(
shortcode + passkey + timestamp
).toString("base64")

const stkResponse = await fetch(
"https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
{
method: "POST",
headers: {
Authorization: `Bearer ${accessToken}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
BusinessShortCode: shortcode,
Password: password,
Timestamp: timestamp,
TransactionType: "CustomerPayBillOnline",
Amount: amount,
PartyA: phone,
PartyB: shortcode,
PhoneNumber: phone,
CallBackURL: "https://expertechcyberonline/mpesa-callback",
AccountReference: "ExpertechPrint",
TransactionDesc: "Print Order"
})
}
)

const result = await stkResponse.json()

return {
statusCode: 200,
body: JSON.stringify(result)
}

}
