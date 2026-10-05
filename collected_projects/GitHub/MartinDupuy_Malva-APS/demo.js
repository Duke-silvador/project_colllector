const Money = require('./services/payments/domain/Money');
const PaymentRequest = require('./services/payments/domain/PaymentRequest');
const StripePaymentGateway = require('./services/payments/adapters/StripePaymentGateway');
const MercadoPagoPaymentGateway = require('./services/payments/adapters/MercadoPagoPaymentGateway');
const ResilientPaymentGateway = require('./services/payments/adapters/ResilientPaymentGateway');
const RetryPolicy = require('./services/payments/domain/RetryPolicy');

async function runDemo() {
    console.log("==========================================");
    console.log("✈️  Malva-APS: Demo de Servicios de Pago");
    console.log("==========================================\n");

    // 1. Setup Payment Gateways
    console.log("[Setup] Configurando pasarelas de pago...");
    const stripe = new StripePaymentGateway();
    const mercadoPago = new MercadoPagoPaymentGateway();

    // 2. Setup Resilient Gateway (Stripe as primary, MP as fallback)
    const retryPolicy = new RetryPolicy(3, 100); // 3 retries, 100ms backoff for demo
    const paymentService = new ResilientPaymentGateway(stripe, mercadoPago, retryPolicy);

    // 3. Create a payment request
    const amount = new Money(50000, 'ARS'); // $50,000 ARS for a flight
    const request = new PaymentRequest('BOOKING-123', amount, 'credit_card', 'tok_visa');
    
    console.log(`\n[Venta] Intentando cobrar ${amount.amount} ${amount.currency} para la reserva ${request.bookingId}...`);

    try {
        console.log("\n--- Escenario 1: Pago Exitoso con Stripe ---");
        // Mock Stripe to succeed
        stripe.processPayment = async () => ({ success: true, transactionId: 'txn_stripe_123', gateway: 'Stripe' });
        
        let result = await paymentService.processPayment(request);
        console.log(`✅ Resultado: Pago procesado correctamente vía ${result.gateway}. Transacción: ${result.transactionId}`);
        
        console.log("\n--- Escenario 2: Falla Stripe, Fallback a MercadoPago ---");
        // Mock Stripe to fail continuously
        stripe.processPayment = async () => { throw new Error("Stripe API Timeout"); };
        // Mock MercadoPago to succeed
        mercadoPago.processPayment = async () => ({ success: true, transactionId: 'txn_mp_456', gateway: 'MercadoPago' });

        result = await paymentService.processPayment(request);
        console.log(`✅ Resultado: Pago procesado correctamente vía fallback (${result.gateway}). Transacción: ${result.transactionId}`);

        console.log("\n--- Escenario 3: Ambos gateways fallan ---");
        // Mock both to fail
        mercadoPago.processPayment = async () => { throw new Error("MercadoPago API Unavailable"); };
        
        await paymentService.processPayment(request);
    } catch (error) {
        console.log(`❌ Resultado Esperado: Fallaron todas las pasarelas. Error final: ${error.message}`);
    }

    console.log("\n==========================================");
    console.log("Demo finalizada exitosamente.");
    console.log("==========================================");
}

runDemo();
