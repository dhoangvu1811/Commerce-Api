/**
 * Routes — telemetry gợi ý sản phẩm tương tự
 */

import type { Router } from 'express'
import express from 'express'
import { recommendationEventController } from '~/controllers/recommendationEventController.js'
import { recommendationEventValidation } from '~/validations/recommendationEventValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { recommendationEventLimiter } from '~/middlewares/rateLimitMiddleware.js'

const router: Router = express.Router()

router.post(
  '/',
  recommendationEventLimiter,
  authMiddleware.verifyOptionalToken,
  recommendationEventValidation.ingest,
  recommendationEventController.ingest
)

export const recommendationEventRouter = router
