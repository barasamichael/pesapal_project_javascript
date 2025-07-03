const express = require('express');
const router = express.Router();
const pesapal = require('../utils/pesapal');

// POST /api/make-payment - Initiate payment
router.post('/make-payment', async (req, res) => {
    try {
        const { movieId, customerName, phoneNumber, quantity } = req.body;
        
        console.log('💳 Payment initiation request:', {
            movieId, customerName, phoneNumber, quantity
        });
        
        // Validate input
        if (!movieId || !customerName || !phoneNumber || !quantity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Get movie details
        const [movies] = await req.app.locals.db.execute(
            'SELECT * FROM movie WHERE movieId = ?',
            [movieId]
        );
        
        if (movies.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }
        
        const movie = movies[0];
        const totalAmount = parseFloat(movie.price) * parseInt(quantity);
        
        console.log(`💰 Total amount calculated: KSh ${totalAmount}`);
        
        // Create ticket record with pending status
        const [ticketResult] = await req.app.locals.db.execute(
            `INSERT INTO ticket (movieId, customerName, phoneNumber, quantity, 
                                totalAmount, paymentStatus) 
             VALUES (?, ?, ?, ?, ?, 'Pending')`,
            [movieId, customerName, phoneNumber, quantity, totalAmount]
        );
        
        const ticketId = ticketResult.insertId;
        console.log(`🎫 Created ticket with ID: ${ticketId}`);
        
        // Get base URL for callbacks
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Get Pesapal access token
        const tokenResponse = await pesapal.getAccessToken();
        const accessToken = tokenResponse.token;
        
        if (!accessToken) {
            throw new Error('Failed to get access token');
        }
        
        // Register IPN URL
        const ipnUrl = `${baseUrl}/api/pesapal/ipn`;
        const notificationResponse = await pesapal.getNotificationId(accessToken, ipnUrl);
        const notificationId = notificationResponse.ipn_id;
        
        if (!notificationId) {
            throw new Error('Failed to register IPN');
        }
        
        // Create merchant reference
        const merchantReference = `TICKET_${ticketId}_${Date.now()}`;
        
        // Prepare order details
        const orderDetails = {
            amount: totalAmount,
            customerName: customerName,
            phoneNumber: phoneNumber,
            movieTitle: movie.title,
            description: `Movie ticket for ${movie.title}`,
            merchantReference: merchantReference,
            notification_id: notificationId
        };
        
        // Create Pesapal order
        const orderResponse = await pesapal.getMerchantOrderUrl(orderDetails, accessToken, baseUrl);
        
        if (!orderResponse.order_tracking_id) {
            throw new Error('Failed to create Pesapal order');
        }
        
        // Store interim payment record
        await req.app.locals.db.execute(
            `INSERT INTO pesapal_interim_payment 
                (ticketId, orderTrackingId, merchantReference, iframeSrc, status) 
             VALUES (?, ?, ?, ?, 'SAVED')`,
            [
                ticketId,
                orderResponse.order_tracking_id,
                orderResponse.merchant_reference,
                orderResponse.redirect_url
            ]
        );
        
        console.log('✅ Payment initiation successful');
        
        res.json({
            success: true,
            ticketId: ticketId,
            orderTrackingId: orderResponse.order_tracking_id,
            redirectUrl: orderResponse.redirect_url,
            message: 'Payment initiated successfully'
        });
        
    } catch (error) {
        console.error('❌ Payment initiation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to initiate payment'
        });
    }
});

// GET /api/pesapal/callback - Handle payment redirect
router.get('/pesapal/callback', async (req, res) => {
    try {
        const { OrderTrackingId } = req.query;
        console.log('🔄 Payment callback received for:', OrderTrackingId);
        
        if (!OrderTrackingId) {
            return res.redirect('/?error=missing_tracking_id');
        }
        
        // Get access token
        const tokenResponse = await pesapal.getAccessToken();
        const accessToken = tokenResponse.token;
        
        // Check transaction status
        const statusResponse = await pesapal.getTransactionStatus(OrderTrackingId, accessToken);
        const paymentStatus = statusResponse.payment_status_description;
        
        console.log(`💳 Payment status: ${paymentStatus}`);
        
        // Find the interim payment record
        const [interimPayments] = await req.app.locals.db.execute(
            'SELECT * FROM pesapal_interim_payment WHERE orderTrackingId = ?',
            [OrderTrackingId]
        );
        
        if (interimPayments.length === 0) {
            return res.redirect('/?error=payment_record_not_found');
        }
        
        const interimPayment = interimPayments[0];
        const ticketId = interimPayment.ticketId;
        
        if (paymentStatus === 'Completed') {
            // Update ticket status to completed
            await req.app.locals.db.execute(
                `UPDATE ticket SET 
                    paymentStatus = 'Completed',
                    receiptNumber = ?,
                    paymentMethod = ?,
                    transactionDate = NOW()
                 WHERE ticketId = ?`,
                [
                    statusResponse.confirmation_code,
                    `Pesapal - ${statusResponse.payment_method}`,
                    ticketId
                ]
            );
            
            // Update interim payment status
            await req.app.locals.db.execute(
                'UPDATE pesapal_interim_payment SET status = "COMPLETED" WHERE interimPaymentId = ?',
                [interimPayment.interimPaymentId]
            );
            
            console.log('✅ Payment completed successfully');
            res.redirect(`/ticket/${ticketId}?status=success`);
            
        } else if (paymentStatus === 'Failed') {
            // Update ticket status to failed
            await req.app.locals.db.execute(
                'UPDATE ticket SET paymentStatus = "Failed" WHERE ticketId = ?',
                [ticketId]
            );
            
            // Update interim payment status
            await req.app.locals.db.execute(
                'UPDATE pesapal_interim_payment SET status = "FAILED" WHERE interimPaymentId = ?',
                [interimPayment.interimPaymentId]
            );
            
            console.log('❌ Payment failed');
            res.redirect('/?error=payment_failed');
            
        } else {
            console.log('⏳ Payment still pending');
            res.redirect('/?status=pending');
        }
        
    } catch (error) {
        console.error('❌ Callback error:', error);
        res.redirect('/?error=callback_error');
    }
});

// GET /api/pesapal/ipn - Handle IPN notifications
router.get('/pesapal/ipn', async (req, res) => {
    try {
        const { OrderTrackingId } = req.query;
        console.log('📢 IPN notification received for:', OrderTrackingId);
        
        if (!OrderTrackingId) {
            return res.status(400).send('Missing OrderTrackingId');
        }
        
        // Get access token
        const tokenResponse = await pesapal.getAccessToken();
        const accessToken = tokenResponse.token;
        
        // Check transaction status
        const statusResponse = await pesapal.getTransactionStatus(OrderTrackingId, accessToken);
        const paymentStatus = statusResponse.payment_status_description;
        
        console.log(`📊 IPN - Payment status: ${paymentStatus}`);
        
        // Find the interim payment record
        const [interimPayments] = await req.app.locals.db.execute(
            'SELECT * FROM pesapal_interim_payment WHERE orderTrackingId = ?',
            [OrderTrackingId]
        );
        
        if (interimPayments.length === 0) {
            console.log('❌ IPN - Payment record not found');
            return res.status(404).send('Payment record not found');
        }
        
        const interimPayment = interimPayments[0];
        const ticketId = interimPayment.ticketId;
        
        if (paymentStatus === 'Completed') {
            // Update ticket status to completed
            await req.app.locals.db.execute(
                `UPDATE ticket SET 
                    paymentStatus = 'Completed',
                    receiptNumber = ?,
                    paymentMethod = ?,
                    transactionDate = NOW()
                 WHERE ticketId = ?`,
                [
                    statusResponse.confirmation_code,
                    `Pesapal - ${statusResponse.payment_method}`,
                    ticketId
                ]
            );
            
            // Update interim payment status
            await req.app.locals.db.execute(
                'UPDATE pesapal_interim_payment SET status = "COMPLETED" WHERE interimPaymentId = ?',
                [interimPayment.interimPaymentId]
            );
            
            console.log('✅ IPN - Payment completed successfully');
            
        } else if (paymentStatus === 'Failed') {
            // Update ticket status to failed
            await req.app.locals.db.execute(
                'UPDATE ticket SET paymentStatus = "Failed" WHERE ticketId = ?',
                [ticketId]
            );
            
            // Update interim payment status
            await req.app.locals.db.execute(
                'UPDATE pesapal_interim_payment SET status = "FAILED" WHERE interimPaymentId = ?',
                [interimPayment.interimPaymentId]
            );
            
            console.log('❌ IPN - Payment failed');
        }
        
        // Always respond with 200 to acknowledge receipt
        res.status(200).send('IPN received');
        
    } catch (error) {
        console.error('❌ IPN error:', error);
        res.status(500).send('IPN processing error');
    }
});

module.exports = router;
