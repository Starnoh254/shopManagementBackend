const AfricasTalking = require('africastalking');

// TODO: Initialize Africa's Talking
const africastalking = AfricasTalking({
    apiKey: 'atsk_5e5ecf61d71183b9254b0c24ab0b78b3663e043bda4844082bf14fbeb789a314edf5ce5b',
    username: 'starnoh'
});



module.exports = async function sendSMS() {

    // TODO: Send message
    try {
        console.log("Sending sms ....")
        const result = await africastalking.SMS.send({
            to: '+254796804384',
            message: 'Hey AT Ninja! Wassup...'
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (ex) {
        console.error(ex);
    }

};