# Tài Liệu Định Mức Pha Chế (BrewLite Seed Recipes & Inventory)

Tài liệu này tổng hợp danh mục nguyên liệu, định mức tiêu hao nguyên liệu cho từng món (Size S, M, L), Topping và thông tin tài khoản Quản trị hệ thống BrewLite.

---

## 1. Danh Mục Nguyên Liệu (`Ingredient`)

| Tên Nguyên Liệu | Đơn Vị (`unit`) | Tồn Kho (`stock`) | Ngưỡng Báo Động (`minThreshold`) | Ghi Chú |
| :--- | :---: | :---: | :---: | :--- |
| Nước lọc | ml | 20,000 | 2,000 | Pha chế trà/cà phê |
| Hạt cà phê Robusta | g | 10,000 | 1,000 | Pha cà phê phin, Bạc xỉu |
| Hạt cà phê Arabica | g | 5,000 | 500 | Pha Espresso, Americano, Latte, Cappuccino |
| Sữa đặc | ml | 8,000 | 1,000 | |
| Sữa tươi | ml | 10,000 | 2,000 | |
| Đường nước | ml | 5,000 | 500 | |
| Hồng trà | g | 3,000 | 300 | Cốt trà Đào |
| Lục trà | g | 3,000 | 300 | Cốt trà Nhãn, Quýt, Dâu |
| Siro Đào / Nhãn / Dâu / Quýt | ml | 2,000 | 200 | Siro trái cây |
| Mứt Đào / Dâu / Quýt | g | 2,000 | 200 | Mứt trái cây |
| Trân châu trắng | g | 5,000 | 500 | Topping |
| Bột Creamer Cheese | g | 2,000 | 200 | Topping |
| Đào miếng hộp | g | 40 | 200 | **Tồn kho thấp dùng cho test hết hàng** |

---

## 2. Định Mức Sản Phẩm (`ProductRecipe`)

Tỉ lệ quy đổi theo Size: **Size M (Chuẩn - Factor 1.0)**, **Size S (Factor 0.8)**, **Size L (Factor 1.2)**.

### Cà Phê
1. **Cà phê sữa đá**
   - Size S: 20g Robusta, 24ml Sữa đặc
   - Size M: 25g Robusta, 30ml Sữa đặc
   - Size L: 30g Robusta, 36ml Sữa đặc
2. **Bạc xỉu**
   - Size S: 20g Robusta, 28ml Sữa đặc, 48ml Sữa tươi
   - Size M: 25g Robusta, 35ml Sữa đặc, 60ml Sữa tươi
   - Size L: 30g Robusta, 42ml Sữa đặc, 72ml Sữa tươi
3. **Americano**
   - Size S: 14g Arabica, 80ml Nước lọc
   - Size M: 18g Arabica, 100ml Nước lọc
   - Size L: 22g Arabica, 120ml Nước lọc
4. **Cappuccino**
   - Size S: 14g Arabica, 88ml Sữa tươi
   - Size M: 18g Arabica, 110ml Sữa tươi
   - Size L: 22g Arabica, 132ml Sữa tươi
5. **Latte**
   - Size S: 14g Arabica, 112ml Sữa tươi
   - Size M: 18g Arabica, 140ml Sữa tươi
   - Size L: 22g Arabica, 168ml Sữa tươi
6. **Espresso**
   - Size S: 14g Arabica
   - Size M: 18g Arabica
   - Size L: 22g Arabica

### Trà Trái Cây
1. **Trà đào**
   - Size S: 2g Hồng trà, 24ml Siro Đào, 16g Mứt Đào, 16ml Đường nước
   - Size M: 3g Hồng trà, 30ml Siro Đào, 20g Mứt Đào, 20ml Đường nước
   - Size L: 4g Hồng trà, 36ml Siro Đào, 24g Mứt Đào, 24ml Đường nước
2. **Trà nhãn**
   - Size S: 2g Lục trà, 40ml Siro Nhãn, 32ml Đường nước
   - Size M: 3g Lục trà, 50ml Siro Nhãn, 40ml Đường nước
   - Size L: 4g Lục trà, 60ml Siro Nhãn, 48ml Đường nước
3. **Trà quýt**
   - Size S: 2g Lục trà, 24ml Siro Quýt, 16g Mứt Quýt, 24ml Đường nước
   - Size M: 3g Lục trà, 30ml Siro Quýt, 20g Mứt Quýt, 30ml Đường nước
   - Size L: 4g Lục trà, 36ml Siro Quýt, 24g Mứt Quýt, 36ml Đường nước
4. **Trà dâu**
   - Size S: 2g Lục trà, 24ml Siro Dâu, 16g Mứt Dâu, 24ml Đường nước
   - Size M: 3g Lục trà, 30ml Siro Dâu, 20g Mứt Dâu, 30ml Đường nước
   - Size L: 4g Lục trà, 36ml Siro Dâu, 24g Mứt Dâu, 36ml Đường nước

---

## 3. Định Mức Topping (`ToppingRecipe`)

1. **Trân châu trắng**: 30g Trân châu trắng / phần
2. **Kem Cheese**: 20g Bột Creamer Cheese / phần
3. **Đào miếng**: 30g Đào miếng hộp / phần

---

## 4. Tài Khoản Quản Trị Mẫu (`ADMIN`)

- **Email**: `admin@brewlite.com` (Đọc từ biến `ADMIN_EMAIL`)
- **Password**: `Admin@123456` (Đọc từ biến `ADMIN_PASSWORD`)
- **Role**: `ADMIN`
- **Mã hóa**: Bcrypt (10 rounds)