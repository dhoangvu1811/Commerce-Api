-- CreateTable
CREATE TABLE "recommendation_events" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "source_product_id" INTEGER NOT NULL,
    "recommended_product_id" INTEGER,
    "position" INTEGER,
    "strategy" VARCHAR(30),
    "similarity_score" DECIMAL(8,4),
    "user_id" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_events_type_created_at_idx" ON "recommendation_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "recommendation_events_source_product_id_idx" ON "recommendation_events"("source_product_id");
