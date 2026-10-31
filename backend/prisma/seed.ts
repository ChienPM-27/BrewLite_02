import 'dotenv/config';
import { PrismaClient, ProductSize, Role} from '@prisma/client';
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
  await prisma.orderIngredientUsage.deleteMany();
  await prisma.productRecipe.deleteMany();
  await prisma.toppingRecipe.deleteMany();
  await prisma.ingredient.deleteMany();

  // 2. Tạo User Demo
  // const passwordHash = await bcrypt.hash('Demo@12345', 10);
  // const demoUser = await prisma.user.create({
  //   data: {
  //     email: 'demo@brewlite.test',
  //     passwordHash,
  //     fullName: 'Khách hàng Demo',
  //     loyaltyPoints: 120, // Có sẵn 120 điểm loyalty
  //   },
  // });
  // console.log(`Đã tạo user demo: ${demoUser.email} / Mật khẩu: Demo@12345`);

  // 2. SEED ADMIN & USER DEMO
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@brewlite.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminFullName = process.env.ADMIN_FULL_NAME || 'BrewLite Admin';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      fullName: adminFullName,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Đã tạo tài khoản ADMIN: ${adminUser.email}`);

  // Seed Customer Demo
  const demoPasswordHash = await bcrypt.hash('Demo@12345', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@brewlite.test',
      passwordHash: demoPasswordHash,
      fullName: 'Khách hàng Demo',
      loyaltyPoints: 120,
      role: Role.CUSTOMER,
    },
  });
  console.log(`✅ Đã tạo user demo: ${demoUser.email}`);

  // SEED INGREDIENTS
  const ingredientsData = [
    { name: 'Nước lọc',unit: 'ml',stock: 20000,minThreshold: 2000,},
    { name: 'Hạt cà phê Robusta', unit: 'g', stock: 10000, minThreshold: 1000 },
    { name: 'Hạt cà phê Arabica', unit: 'g', stock: 5000, minThreshold: 500 },
    { name: 'Sữa đặc', unit: 'ml', stock: 8000, minThreshold: 1000 },
    { name: 'Sữa tươi', unit: 'ml', stock: 10000, minThreshold: 2000 },
    { name: 'Đường nước', unit: 'ml', stock: 5000, minThreshold: 500 },
    { name: 'Hồng trà', unit: 'g', stock: 3000, minThreshold: 300 },
    { name: 'Lục trà', unit: 'g', stock: 3000, minThreshold: 300 },
    { name: 'Siro Đào', unit: 'ml', stock: 2000, minThreshold: 200 },
    { name: 'Siro Nhãn', unit: 'ml', stock: 2000, minThreshold: 200 },
    { name: 'Siro Dâu', unit: 'ml', stock: 2000, minThreshold: 200 },
    { name: 'Siro Quýt', unit: 'ml', stock: 2000, minThreshold: 200 },
    { name: 'Mứt Đào', unit: 'g', stock: 2000, minThreshold: 200 },
    { name: 'Mứt Dâu', unit: 'g', stock: 2000, minThreshold: 200 },
    { name: 'Mứt Quýt', unit: 'g', stock: 2000, minThreshold: 200 },
    { name: 'Trân châu trắng', unit: 'g', stock: 5000, minThreshold: 500 },
    { name: 'Bột Creamer Cheese', unit: 'g', stock: 2000, minThreshold: 200 },
    // Nguyên liệu stock cực thấp để test hết hàng
    { name: 'Đào miếng hộp', unit: 'g', stock: 10, minThreshold: 200 },
  ];

  for (const ingredient of ingredientsData) {
  await prisma.ingredient.create({
    data: {
      ...ingredient,
      isAvailable: true,
    },
  })};

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
    },
     {
      categoryId: catCoffee.id,
      name: 'Bạc xỉu',
      basePrice: 35000,
      imageUrl:
        'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=687&auto=format&fit=crop',
    },
    {
      categoryId: catCoffee.id,
      name: 'Americano',
      basePrice: 40000,
      imageUrl:
        'https://images.unsplash.com/photo-1531835207745-506a1bc035d8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
    },
    {
      categoryId: catCoffee.id,
      name: 'Cappuccino',
      basePrice: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
    },
    {
      categoryId: catCoffee.id,
      name: 'Latte',
      basePrice: 45000,
      imageUrl:
        'https://plus.unsplash.com/premium_photo-1674327105074-46dd8319164b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
    },
    {
      categoryId: catCoffee.id,
      name: 'Espresso',
      basePrice: 30000,
      imageUrl:
        'https://plus.unsplash.com/premium_photo-1675435644687-562e8042b9db?q=80&w=749&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
    },
    {
      categoryId: catTea.id,
      name: 'Trà đào',
      basePrice: 30000,
      imageUrl:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNmLos33YzXpBtOEDQ95sne-4FQ_YTBqFqqSqNyJePfQ&s=10',
    },
    {
      categoryId: catTea.id,
      name: 'Trà nhãn',
      basePrice: 30000,
      imageUrl:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcdWloQy8_LDIfV0ct6XhVmd_qTEvTorZgLLlf6BxjdQ&s=10',
    },
    {
      categoryId: catTea.id,
      name: 'Trà quýt',
      basePrice: 30000,
      imageUrl:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShzDIxjAlMS0tjL1hutOob8JLVCLeE8C6zCg2OlGniKQ&s=10',
    },
    {
      categoryId: catTea.id,
      name: 'Trà dâu',
      basePrice: 40000,
      imageUrl:
        'https://images.unsplash.com/photo-1558857563-b371033873b8?q=80&w=687&auto=format&fit=crop',
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

    console.log(`Đã tạo ${product.name}`);
  }

  
  // SEED RECIPES
  const baseRecipes = [
    {
      productName: 'Cà phê sữa đá',
      ingredients: [
        { name: 'Hạt cà phê Robusta', quantity: 25 },
        { name: 'Sữa đặc', quantity: 30 },
      ]
    },
    {
      productName: 'Bạc xỉu',
      ingredients: [
        { name: 'Hạt cà phê Robusta', quantity: 25 },
        { name: 'Sữa đặc', quantity: 35 },
        { name: 'Sữa tươi', quantity: 60 },
      ]
    },
    {
      productName: 'Americano',
      ingredients: [
        { name: 'Hạt cà phê Arabica', quantity: 18 },
        { name: 'Nước lọc', quantity: 100 },
      ]
    },
    {
      productName: 'Cappuccino',
      ingredients: [
        { name: 'Hạt cà phê Arabica', quantity: 18 },
        { name: 'Sữa tươi', quantity: 110 },
      ]
    },
    {
      productName: 'Latte',
      ingredients: [
        { name: 'Hạt cà phê Arabica', quantity: 18 },
        { name: 'Sữa tươi', quantity: 140 },
      ]
    },
    {
      productName: 'Espresso',
      ingredients: [
        { name: 'Hạt cà phê Arabica', quantity: 18 },
      ]
    },
    { productName: 'Trà đào',
      ingredients: [
        { name: 'Hồng trà', quantity: 3 },
        { name: 'Siro Đào', quantity: 30 },
        {name: 'Mứt Đào', quantity: 20 },
        {name: 'Đường nước', quantity: 20 }
      ]},
      { productName: 'Trà nhãn',
      ingredients: [
        { name: 'Lục trà', quantity: 3 },
        { name: 'Siro Nhãn', quantity: 50 },
        {name: 'Đường nước', quantity: 40 }]},
      { productName: 'Trà quýt',
      ingredients: [
        { name: 'Lục trà', quantity: 3 },
        { name: 'Siro Quýt', quantity: 30 },
        {name: 'Mứt Quýt', quantity: 20 },
        {name: 'Đường nước', quantity: 30 }
      ]},
    { productName: 'Trà dâu',
      ingredients: [
        { name: 'Lục trà', quantity: 3 },
        { name: 'Siro Dâu', quantity: 30 },
        {name: 'Mứt Dâu', quantity: 20 },
        {name: 'Đường nước', quantity: 30 }]},
  ];

  const sizes = [
  { size: 'S', factor: 0.8 },
  { size: 'M', factor: 1 },
  { size: 'L', factor: 1.2 },
];

// Công thức định lượng cho từng sản phẩm
for (const recipe of baseRecipes) {
  const product = await prisma.product.findFirst({
    where: { name: recipe.productName },
  });

  if (!product) {
    throw new Error(`Không tìm thấy sản phẩm: ${recipe.productName}`);
  }

  for (const itemSize of sizes) {
    const size = itemSize.size;
    const factor = itemSize.factor;

    for (const item of recipe.ingredients) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { name: item.name },
      });

      if (!ingredient) {
        throw new Error(`Không tìm thấy nguyên liệu: ${item.name}`);
      }

      await prisma.productRecipe.create({
        data: {
          productId: product.id,
          size: size as ProductSize,
          ingredientId: ingredient.id,
          quantity: Math.round(item.quantity * factor),
        },
      });
    }
  }
}

  const toppingRecipes = [
    { topping: 'Trân châu trắng', ingredient:'Trân châu trắng', quantity: 30  },
    { topping: 'Kem Cheese', ingredient: 'Bột Creamer Cheese', quantity: 20 },
    { topping: 'Đào miếng', ingredient: 'Đào miếng hộp', quantity: 30 },
  ]

  for (const recipe of toppingRecipes) {
  const topping = await prisma.topping.findUnique({
    where: { name: recipe.topping },
  });

  const ingredient = await prisma.ingredient.findUnique({
    where: { name: recipe.ingredient },
  });

  if (!topping || !ingredient) {
    throw new Error(
      `Không tìm thấy topping hoặc nguyên liệu của ${recipe.topping}`,
    );
  }

  await prisma.toppingRecipe.create({
    data: {
      toppingId: topping.id,
      ingredientId: ingredient.id,
      quantity: recipe.quantity,
    },
  });
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

