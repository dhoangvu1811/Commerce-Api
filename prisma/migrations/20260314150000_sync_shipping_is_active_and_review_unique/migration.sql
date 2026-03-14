-- Sync migration to align manual DB drift with migration history.
-- 1) Ensure shipping_addresses has is_active.
ALTER TABLE "shipping_addresses"
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- 2) Enforce one review per user per product (matches schema @@unique([userId, productId])).
-- This block avoids duplicate constraint creation when database already has the constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_user_id_product_id_key'
  ) THEN
    ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_user_id_product_id_key"
    UNIQUE ("user_id", "product_id");
  END IF;
END $$;
