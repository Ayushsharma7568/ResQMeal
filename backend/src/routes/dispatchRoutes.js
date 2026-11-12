import express from 'express';
import { getDispatchStatus, runDispatchCycle } from '../services/dispatchEngine.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Optional authentication middleware: if Authorization header is present,
 * verifies user; otherwise permits read-only status access.
 */
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

/**
 * GET /api/dispatch/active-status
 * Real-time monitoring of autonomous dispatch queue states, active listings, and escalation tiers.
 */
router.get('/active-status', optionalProtect, async (req, res) => {
  try {
    const status = await getDispatchStatus();
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('Dispatch active-status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve dispatch engine status',
      error: error.message
    });
  }
});

/**
 * POST /api/dispatch/run-cycle
 * Manually trigger a dispatch evaluation cycle (e.g., for testing or admin manual dispatch).
 */
router.post('/run-cycle', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await runDispatchCycle();
    res.status(200).json({
      status: 'success',
      message: 'Dispatch cycle executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Manual dispatch cycle error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute dispatch cycle',
      error: error.message
    });
  }
});

export default router;

