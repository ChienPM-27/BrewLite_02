-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_threshold" INTEGER NOT NULL DEFAULT 50,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size" "ProductSize" NOT NULL DEFAULT 'M',
    "ingredient_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topping_recipes" (
    "id" TEXT NOT NULL,
    "topping_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "topping_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_ingredient_usages" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_ingredient_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipes_product_id_size_ingredient_id_key" ON "product_recipes"("product_id", "size", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "topping_recipes_topping_id_ingredient_id_key" ON "topping_recipes"("topping_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_ingredient_usages_order_id_ingredient_id_key" ON "order_ingredient_usages"("order_id", "ingredient_id");

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topping_recipes" ADD CONSTRAINT "topping_recipes_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "toppings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topping_recipes" ADD CONSTRAINT "topping_recipes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ingredient_usages" ADD CONSTRAINT "order_ingredient_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ingredient_usages" ADD CONSTRAINT "order_ingredient_usages_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
