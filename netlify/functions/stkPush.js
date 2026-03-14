exports.handler = async (event) => {

const { phone, amount } = JSON.parse(event.body)

const consumerKey = process.env.MPESA_CONSUMER_KEY
const consumerSecret = process.env.MPESA_CONSUMER_SECRET
const shortcode = process.env.MPESA_SHORTCODE
const passkey = process.env.MPESA_PASSKEY

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

const tokenResponse = await fetch(
"https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
{
method: "GET",
headers: {
Authorization: `Basic ${auth}`
}
}
)

const tokenData = await tokenResponse.json()

const accessToken = tokenData.access_token

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
CallBackURL: "https://expertechcyberonline.netlify.app/.netlify/functions/callback",
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
