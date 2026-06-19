-- CreateTable
CREATE TABLE "product_similarities" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "similar_products" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_similarities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_similarities_product_id_key" ON "product_similarities"("product_id");
