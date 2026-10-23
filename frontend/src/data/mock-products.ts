import { ProductDetail, ProductItem, ProductSize } from '@/types/product';

export const MOCK_TOPPINGS = [
  { id: 'top-1', name: 'Trân châu trắng', price: 5000, isAvailable: true, description: 'Giòn dai sần sật' },
  { id: 'top-2', name: 'Kem Cheese béo', price: 10000, isAvailable: true, description: 'Đậm đà ngậy thơm' },
  { id: 'top-3', name: 'Đào miếng giòn', price: 8000, isAvailable: true, description: '2 miếng đào ngâm giòn' },
];

export const MOCK_PRODUCTS: (ProductItem & {
  stock?: number;
  description?: string;
  rating?: number;
  ratingCount?: number;
  prepTime?: string;
  roastProfile?: string;
  flavorNotes?: string;
  origin?: string;
  calories?: string;
  badge?: string;
  galleryImages?: string[];
})[] = [
  {
    id: 'prod-caphesuada',
    name: 'Cà phê sữa đá',
    categoryName: 'Cà phê',
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 100,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Hương vị cà phê Robusta Buôn Ma Thuột đậm đà kết hợp cùng lớp sữa đặc béo ngậy thơm ngon, đá viên thanh mát tạo nên ly cà phê truyền thống chuẩn vị Việt.',
    rating: 4.9,
    ratingCount: 1280,
    prepTime: '~3 phút',
    roastProfile: 'Rang Đậm Vừa (Medium Dark)',
    flavorNotes: 'Hương caramel cháy, socola đắng thanh - Chuẩn vị Phin',
    origin: '100% Robusta Buôn Ma Thuột, Đắk Lắk',
    calories: '165 kcal',
    badge: 'Bán chạy nhất',
    galleryImages: [
      'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    ],
  },
  {
    id: 'prod-bacxiu',
    name: 'Bạc xỉu 3 tầng',
    categoryName: 'Cà phê',
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 5,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Phân lớp sữa tươi thơm lừng, sữa đặc mịn ngọt ngào và cà phê Arabica nhẹ nhàng.',
    rating: 4.8,
    ratingCount: 940,
    prepTime: '~4 phút',
    roastProfile: 'Rang Vừa (Medium Roast)',
    flavorNotes: 'Hương vani, caramen ngọt dịu - Êm dịu đầu lưỡi',
    origin: 'Blend Arabica Cầu Đất & Robusta',
    calories: '185 kcal',
    badge: 'Yêu thích',
  },
  {
    id: 'prod-tradaocamsa',
    name: 'Trà đào cam sả',
    categoryName: 'Trà & Trái cây',
    basePrice: 39000,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 75,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Trà đen ủ lạnh kết hợp đào miếng giòn sần sật, nước cốt cam tươi và sả thanh thơm.',
    rating: 4.9,
    ratingCount: 1520,
    prepTime: '~3 phút',
    roastProfile: 'Trà đen ủ lạnh 12h',
    flavorNotes: 'Vị chua ngọt thanh khiết, thơm nồng tinh dầu sả tươi',
    origin: 'Trà búp tươi Bảo Lộc, Lâm Đồng',
    calories: '120 kcal',
    badge: 'Best seller',
  },
  {
    id: 'prod-cappuccino',
    name: 'Cappuccino Nghệ thuật',
    categoryName: 'Cà phê',
    basePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 60,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Bọt sữa tơ mịn đánh chuẩn barista kết hợp espresso Arabica Cầu Đất nguyên chất.',
    rating: 4.9,
    ratingCount: 860,
    prepTime: '~5 phút',
    roastProfile: 'Rang Đậm Vừa kiểu Ý',
    flavorNotes: 'Bọt sữa béo ngậy, espresso đậm đà quyện socola nâu',
    origin: '100% Arabica Cầu Đất, Đà Lạt',
    calories: '140 kcal',
  },
  {
    id: 'prod-americano',
    name: 'Americano Đá',
    categoryName: 'Cà phê',
    basePrice: 40000,
    imageUrl: 'https://images.unsplash.com/photo-1531835207745-506a1bc035d8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 80,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Vị cà phê thanh nhẹ, hậu vị êm mượt thích hợp cho phiên làm việc tập trung dài.',
    rating: 4.7,
    ratingCount: 710,
    prepTime: '~2 phút',
    roastProfile: 'Rang Đậm (Dark Roast)',
    flavorNotes: 'Đắng thanh khiết, hương gỗ sồi và thảo mộc khô',
    origin: 'Arabica Cầu Đất nguyên chất',
    calories: '15 kcal',
  },
  {
    id: 'prod-travai',
    name: 'Trà vải lài thơm',
    categoryName: 'Trà & Trái cây',
    basePrice: 39000,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 45,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Hương hoa lài thanh khiết ủ cùng quả vải mọng nước ngọt thanh dịu.',
    rating: 4.8,
    ratingCount: 630,
    prepTime: '~3 phút',
    roastProfile: 'Trà xanh ướp hoa lài tươi',
    flavorNotes: 'Hương hoa thoang thoảng, vị ngọt thanh của vải thiều tươi',
    origin: 'Trà Shan Tuyết Hà Giang',
    calories: '110 kcal',
  },
  {
    id: 'prod-espresso',
    name: 'Espresso Đậm đà',
    categoryName: 'Cà phê',
    basePrice: 30000,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 40,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Chiết xuất chuẩn áp suất, lớp crema vàng óng sánh đặc tràn ngập năng lượng.',
    rating: 4.9,
    ratingCount: 520,
    prepTime: '~2 phút',
    roastProfile: 'Rang Đậm (Italian Dark Roast)',
    flavorNotes: 'Lớp crema dày béo, vị đắng mạnh mẽ đầy lôi cuốn',
    origin: 'Robusta Buôn Ma Thuột ủ men',
    calories: '10 kcal',
  },
  {
    id: 'prod-tradautay',
    name: 'Trà dâu tây tươi',
    categoryName: 'Trà & Trái cây',
    basePrice: 40000,
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 0,
    isAvailable: false, // Tạm hết
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Dâu tây Đà Lạt tươi giầm cùng trà hoa cúc thanh mát (hết nguyên liệu vụ sáng).',
    rating: 4.6,
    ratingCount: 410,
    prepTime: '~4 phút',
    roastProfile: 'Trà hoa cúc thảo mộc',
    flavorNotes: 'Vị chua ngọt thanh tao, tươi mát tự nhiên',
    origin: 'Dâu tây thu hoạch tại vườn Đà Lạt',
    calories: '95 kcal',
  },
  {
    id: 'prod-latte',
    name: 'Cà phê Latte',
    categoryName: 'Cà phê',
    basePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 50,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Espresso nhẹ nhàng kết hợp nhiều sữa nóng thanh trùng và lớp foam mỏng mượt mà.',
    rating: 4.8,
    ratingCount: 780,
    prepTime: '~4 phút',
    roastProfile: 'Rang Vừa (Medium Roast)',
    flavorNotes: 'Ngọt béo sữa tươi cao cấp, thơm ngát cà phê Arabica',
    origin: 'Arabica Cầu Đất kết hợp sữa tươi Dalatmilk',
    calories: '170 kcal',
  },
  {
    id: 'prod-trachanh',
    name: 'Trà chanh giã tay',
    categoryName: 'Trà & Trái cây',
    basePrice: 30000,
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
    stock: 70,
    isAvailable: true,
    sizePrices: [
      { size: ProductSize.S, priceAdjustment: 0 },
      { size: ProductSize.M, priceAdjustment: 5000 },
      { size: ProductSize.L, priceAdjustment: 10000 },
    ],
    description: 'Chanh nước hoa thơm ngát giã tay cùng đá viên và trà nhài tươi mát lạnh.',
    rating: 4.7,
    ratingCount: 390,
    prepTime: '~3 phút',
    roastProfile: 'Trà nhài thượng hạng',
    flavorNotes: 'Thanh mát giải nhiệt tức thì, hương tinh dầu chanh bừng tỉnh',
    origin: 'Chanh Quảng Đông & Trà hoa nhài',
    calories: '80 kcal',
  },
];

export const MOCK_PASTRIES = [
  {
    id: 'pastry-croissant',
    name: 'Bánh Croissant Bơ Pháp',
    tag: 'Bánh nướng mới lúc 07:00',
    price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=726&auto=format&fit=crop&ixlib=rb-4.1.0',
  },
  {
    id: 'pastry-cheesecake',
    name: 'Bông Lan Phô Mai Nhật',
    tag: 'Bánh ngọt tráng miệng',
    price: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=700&auto=format&fit=crop&ixlib=rb-4.1.0',
  },
  {
    id: 'pastry-cookie',
    name: 'Cookie Choco Chip Vụn Bơ',
    tag: 'Ăn vặt nhanh',
    price: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0',
  },
  {
    id: 'pastry-coldbrew',
    name: 'Cold Brew Chai Thủy Tinh',
    tag: 'Mang đi tiện lợi',
    price: 48000,
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0',
  },
];

export function getMockProductDetail(idOrSlug: string): ProductDetail | null {
  const match = MOCK_PRODUCTS.find(
    (p) => p.id === idOrSlug || p.name.toLowerCase().includes(idOrSlug.toLowerCase()),
  );
  if (!match) {
    // Nếu tìm không thấy theo id chính xác, fallback về sản phẩm đầu tiên nếu id có chứa "ca-phe" hoặc "prod"
    if (idOrSlug === 'ca-phe-sua-da' || idOrSlug.includes('sua-da')) {
      return {
        ...MOCK_PRODUCTS[0],
        currency: 'VND',
        toppings: MOCK_TOPPINGS,
      };
    }
    return null;
  }

  return {
    id: match.id,
    name: match.name,
    categoryName: match.categoryName,
    basePrice: match.basePrice,
    imageUrl: match.imageUrl,
    isAvailable: match.isAvailable,
    currency: 'VND',
    sizePrices: match.sizePrices,
    toppings: MOCK_TOPPINGS,
  };
}
