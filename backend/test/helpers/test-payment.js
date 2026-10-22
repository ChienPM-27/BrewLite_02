const PAYMENT_URL = 'http://localhost:4000/api/v1/payments';


const TOKEN = 'Bearer thay_token';

async function testPaymentIdempotency() {
    console.log('\n====================================');
    console.log(' TEST PAYMENT');
    console.log('====================================');

    const orderId = "...."; 
    
    const idempotencyKey = `pay-${Date.now()}`; 
    
    const paymentBody = {
        orderId: orderId,
        method: "BANK_CARD"
    };

    console.log(`bam thanh toan lan 1 key: ${idempotencyKey}`);
    const res1 = await fetch(PAYMENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': TOKEN,
            'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(paymentBody)
    });
    console.log(`-> ket qua: ma ${res1.status}`);
    const text1 = await res1.text();
    console.log(`-> chi tiet loi tu sever:`, text1);

    console.log(`\nbam thanh toan lan 2`);
    const res2 = await fetch(PAYMENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': TOKEN,
            'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(paymentBody)
    });
    console.log(`->ket qua: ma ${res2.status}`);
    const text2 = await res2.text();
    console.log(`-> chi tiet loi tu server (lan 2):`, text2);

    console.log(`\nmua don khac nhung dung key cu`);
    const res3 = await fetch(PAYMENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': TOKEN,
            'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ orderId: "....", method: "BANK_CARD" })
    });
    console.log(`-> ket qua: ma ${res3.status}`);
    const text3 = await res3.text();
    console.log(`->chi tiet loi tu server (lan 3):`, text3);
}

testPaymentIdempotency();