const express = require('express');
const cors = require('cors');
const Money = require('./services/payments/domain/Money');
const PaymentRequest = require('./services/payments/domain/PaymentRequest');
const MercadoPagoPaymentGateway = require('./services/payments/adapters/MercadoPagoPaymentGateway');
const PayPalPaymentGateway = require('./services/payments/adapters/PayPalPaymentGateway');
const ResilientPaymentGateway = require('./services/payments/adapters/ResilientPaymentGateway');
const RetryPolicy = require('./services/payments/domain/RetryPolicy');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/pay', async (req, res) => {
    const { primaryFail, secondaryFail } = req.body;
    
    const mp = new MercadoPagoPaymentGateway();
    const paypal = new PayPalPaymentGateway();
    
    // Configurar simulacion
    mp.processPayment = async () => {
        if (primaryFail) throw new Error("MercadoPago API Unavailable (Simulated)");
        return { success: true, transactionId: 'mp_' + Math.floor(Math.random()*10000), gateway: 'MercadoPago' };
    };
    
    paypal.processPayment = async () => {
        if (secondaryFail) throw new Error("PayPal API Timeout (Simulated)");
        return { success: true, transactionId: 'pp_' + Math.floor(Math.random()*10000), gateway: 'PayPal' };
    };

    const retryPolicy = new RetryPolicy(2, 50); // Fast retry for demo
    const paymentService = new ResilientPaymentGateway(mp, paypal, retryPolicy);
    
    const amount = new Money(50000, 'ARS');
    const request = new PaymentRequest('BOOKING-123', amount, 'credit_card', 'tok_demo');
    
    try {
        const result = await paymentService.processPayment(request);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend de demostración corriendo en http://localhost:${PORT}`);
});
