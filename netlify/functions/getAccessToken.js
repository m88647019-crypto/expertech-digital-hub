exports.handler = async () => {

const consumerKey = process.env.Iau90vz3dwhGpIxKSKPOR42bmqcG9JJr7IUtMLHU7PqvVAc6
const consumerSecret = process.env.bc8AFXpVqG2zBHRUZRdAGXvhXvpiNok9B0ZcveGo5xGd2NH2u6S2ZACn4G2iHSII

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

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

}
