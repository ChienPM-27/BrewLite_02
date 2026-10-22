// File: backend/test/helpers/load-test-orders.js
// Chạy bằng lệnh: node backend/test/helpers/load-test-orders.js

const API_URL = 'http://localhost:4000/api/v1/orders';
const CHECK_STOCK_URL = 'http://localhost:4000/api/v1/products/nhập product id vào đây'; 

// nhớ nhập token 
const TOKEN = 'Bearer token'; 
const NUM_REQUESTS = 50; 

const orderPayload = {
  items: [
    {
      productId: "....",
      quantity: 1, 
      size: "M",
      toppingIds: []
    }
  ]
};

async function testOrderRaceCondition() {
  console.log(` Bắt đầu ${NUM_REQUESTS} requests POST /orders...`);
  
  const requests = [];
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const req = fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
      body: JSON.stringify(orderPayload)
    }).then(res => res.status).catch(() => 500); 
    
    requests.push(req);
  }

  const results = await Promise.all(requests);

  const successCount = results.filter(status => status === 201).length;
  const failCount = results.filter(status => status >= 400).length;

  let currentStock = "N/A";
  try {
    const stockRes = await fetch(CHECK_STOCK_URL);
    if (stockRes.ok) {
        const productData = await stockRes.json();
        currentStock = productData.stock;
    }
  } catch (err) {
    console.log(" khong lay duoc ton kho.");
  }

  console.log('\n====================================');
  console.log(' KẾT QUẢ LOAD TEST API');
  console.log(` Đơn đặt thành công: ${successCount}`);
  console.log(` Đơn thất bại (Bị chặn/Hết hàng): ${failCount}`);
  console.log(` Tồn kho cuối cùng: ${currentStock}`);
  console.log('====================================');
  
  if (successCount === NUM_REQUESTS) {
    console.log(' code lỗi');
  } else {
    console.log(' Code tốt.');
  }
}

async function runAllTests() {
    await testOrderRaceCondition();
}

runAllTests();