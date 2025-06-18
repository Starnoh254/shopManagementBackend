// Example: sendWhatsApp.js
const twilio = require('twilio');
const client = twilio('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');

client.messages.create({
  from: 'whatsapp:+254714296170', // Twilio sandbox or your approved number
  to: 'whatsapp:+254796804384',   // Recipient's WhatsApp number
  body: 'Hello from WhatsApp via Twilio!'
}).then(message => console.log(message.sid));