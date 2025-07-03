const axios = require('axios');

// Pesapal configuration
const PESAPAL_CONFIG = {
    CONSUMER_KEY: 'qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW',
    CONSUMER_SECRET: 'osGQ364R49cXKeOYSpaOnT++rHs=',
    BASE_URL: 'https://cybqa.pesapal.com/pesapalv3', // Sandbox URL
    // For production use: 'https://pay.pesapal.com/v3'
};

function splitFullName(fullName) {
    const nameParts = fullName.split(' ');
    
    if (nameParts.length === 2) {
        return {
            first_name: nameParts[0],
            middle_name: '',
            last_name: nameParts[1]
        };
    } else if (nameParts.length > 2) {
        return {
            first_name: nameParts[0],
            middle_name: nameParts.slice(1, -1).join(' '),
            last_name: nameParts[nameParts.length - 1]
        };
    } else {
        return {
            first_name: fullName,
            middle_name: '',
            last_name: ''
        };
    }
}

async function getAccessToken() {
    try {
        console.log('🔑 Requesting Pesapal access token...');
        
        const response = await axios.post(
            `${PESAPAL_CONFIG.BASE_URL}/api/Auth/RequestToken`,
            {
                consumer_key: PESAPAL_CONFIG.CONSUMER_KEY,
                consumer_secret: PESAPAL_CONFIG.CONSUMER_SECRET
            },
            {
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Access token received:', response.data.token ? 'Success' : 'Failed');
        return response.data;
    } catch (error) {
        console.error('❌ Error getting access token:', error.response?.data || error.message);
        throw error;
    }
}

async function getNotificationId(accessToken, callbackUrl) {
    try {
        console.log('📞 Registering IPN URL:', callbackUrl);
        
        const response = await axios.post(
            `${PESAPAL_CONFIG.BASE_URL}/api/URLSetup/RegisterIPN`,
            {
                ipn_notification_type: 'GET',
                url: callbackUrl
            },
            {
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        console.log('✅ IPN registered, notification ID:', response.data.ipn_id);
        return response.data;
    } catch (error) {
        console.error('❌ Error registering IPN:', error.response?.data || error.message);
        throw error;
    }
}

async function getMerchantOrderUrl(details, accessToken, baseUrl) {
    try {
        console.log('🛒 Creating Pesapal order for amount:', details.amount);
        
        const names = splitFullName(details.customerName);
        
        const orderData = {
            language: 'EN',
            currency: 'KES',
            amount: parseFloat(details.amount),
            id: details.merchantReference,
            description: details.description || `Movie ticket for ${details.movieTitle}`,
            billing_address: {
                country_code: 'KE',
                phone_number: details.phoneNumber,
                email_address: details.email || 'customer@movieticket.com',
                first_name: names.first_name,
                middle_name: names.middle_name,
                last_name: names.last_name,
                line_1: 'Nairobi',
                line_2: '',
                city: 'Nairobi',
                state: 'Nairobi',
                postal_code: '00100',
                zip_code: '00100'
            },
            callback_url: `${baseUrl}/api/pesapal/callback`,
            notification_id: details.notification_id
        };
        
        console.log('📤 Sending order to Pesapal:', JSON.stringify(orderData, null, 2));
        
        const response = await axios.post(
            `${PESAPAL_CONFIG.BASE_URL}/api/Transactions/SubmitOrderRequest`,
            orderData,
            {
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        console.log('✅ Pesapal order response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ Error creating Pesapal order:', error.response?.data || error.message);
        throw error;
    }
}

async function getTransactionStatus(orderTrackingId, accessToken) {
    try {
        console.log('🔍 Checking transaction status for:', orderTrackingId);
        
        const response = await axios.get(
            `${PESAPAL_CONFIG.BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
            {
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        console.log('📊 Transaction status response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ Error getting transaction status:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    getAccessToken,
    getNotificationId,
    getMerchantOrderUrl,
    getTransactionStatus,
    splitFullName
};
