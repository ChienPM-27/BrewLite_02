import 'dotenv/config';
import { PrismaClient, ProductSize } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Không chạy seed ở production');
  }

  console.log('🌱 Bắt đầu nạp dữ liệu mẫu (Seeding BrewLite DB)...');

  // 1. Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.orderItemTopping.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productSizePrice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.topping.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.user.deleteMany();

  // 2. Tạo User Demo
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@brewlite.test',
      passwordHash,
      fullName: 'Khách hàng Demo',
      loyaltyPoints: 120, // Có sẵn 120 điểm loyalty
    },
  });
  console.log(`Đã tạo user demo: ${demoUser.email} / Mật khẩu: Demo@12345`);

  // 3. Tạo Categories
  const catCoffee = await prisma.category.create({
    data: {
      name: 'Cà phê',
      slug: 'ca-phe',
      displayOrder: 1,
    },
  });

  const catTea = await prisma.category.create({
    data: {
      name: 'Trà & Trái cây',
      slug: 'tra-trai-cay',
      displayOrder: 2,
    },
  });
  console.log('Đã tạo 2 danh mục: Cà phê, Trà & Trái cây');

  const toppingsData = [
    { name: 'Trân châu trắng', price: 5000, stock: 200 },
    { name: 'Kem Cheese', price: 10000, stock: 150 },
    { name: 'Đào miếng', price: 8000, stock: 100 },
  ];

  for (const topping of toppingsData) {
    await prisma.topping.create({
      data: {
        ...topping,
        isAvailable: true,
      },
    });
  }

  console.log('Đã tạo 3 topping.');

  const productsData = [
    // Có hình ảnh cho từng sản phẩm và ít nhất một sản phẩm tồn kho thấp.
    {
      categoryId: catCoffee.id,
      name: 'Cà phê sữa đá',
      basePrice: 35000,
      imageUrl:
        'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
      stock: 100,
    },
    {
      categoryId: catCoffee.id,
      name: 'Americano',
      basePrice: 40000,
      imageUrl:
        'https://images.unsplash.com/photo-1531835207745-506a1bc035d8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
      stock: 80,
    },
    {
      categoryId: catCoffee.id,
      name: 'Cappuccino',
      basePrice: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
      stock: 60,
    },
    {
      categoryId: catCoffee.id,
      name: 'Latte',
      basePrice: 45000,
      imageUrl:
        'https://plus.unsplash.com/premium_photo-1674327105074-46dd8319164b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
      stock: 50,
    },
    {
      categoryId: catCoffee.id,
      name: 'Espresso',
      basePrice: 30000,
      imageUrl:
        'https://plus.unsplash.com/premium_photo-1675435644687-562e8042b9db?q=80&w=749&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
      stock: 40,
    },
    {
      categoryId: catCoffee.id,
      name: 'Bạc xỉu',
      basePrice: 35000,
      imageUrl:
        'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=687&auto=format&fit=crop',
      stock: 5, // Sản phẩm tồn kho thấp.
    },
    {
      categoryId: catTea.id,
      name: 'Trà đào cam sả',
      basePrice: 39000,
      imageUrl:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=764&auto=format&fit=crop',
      stock: 75,
    },
    {
      categoryId: catTea.id,
      name: 'Trà chanh',
      basePrice: 30000,
      imageUrl:
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=687&auto=format&fit=crop',
      stock: 70,
    },
    {
      categoryId: catTea.id,
      name: 'Trà vải',
      basePrice: 39000,
      imageUrl:
        'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?q=80&w=687&auto=format&fit=crop',
      stock: 45,
    },
    {
      categoryId: catTea.id,
      name: 'Trà dâu',
      basePrice: 40000,
      imageUrl:
        'https://images.unsplash.com/photo-1558857563-b371033873b8?q=80&w=687&auto=format&fit=crop',
      stock: 35,
    },
  ];

  const sizePrices = [
    { size: ProductSize.S, priceAdjustment: 0 },
    { size: ProductSize.M, priceAdjustment: 5000 },
    { size: ProductSize.L, priceAdjustment: 10000 },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        ...item,
        isAvailable: true,
      },
    });

    for (const sizePrice of sizePrices) {
      await prisma.productSizePrice.create({
        data: {
          productId: product.id,
          size: sizePrice.size,
          priceAdjustment: sizePrice.priceAdjustment,
        },
      });
    }

    console.log(`Đã tạo ${product.name} - Tồn kho: ${item.stock}`);
  }

  // 6. Tạo Promotions (Vouchers)
  await prisma.promotion.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: 'Giảm 10% tối đa 20.000đ cho đơn từ 40.000đ',
        discountPercent: 10,
        maxDiscount: 20000,
        minOrderAmount: 40000,
        isActive: true,
      },
      {
        code: 'GIAM15K',
        description: 'Giảm thẳng 15.000đ cho đơn từ 60.000đ',
        discountAmount: 15000,
        minOrderAmount: 60000,
        isActive: true,
      },
    ],
  });
  console.log('Đã tạo 2 voucher khuyến mãi: WELCOME10, GIAM15K');

  console.log('🎉 Hoàn tất nạp dữ liệu mẫu cho BrewLite!');
}
main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
