const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const purchaseOrderController = require('../controllers/purchaseOrderController');

const router = Router();

router.get('/', requireAuth, purchaseOrderController.getPurchaseOrders);
router.get('/:id', requireAuth, purchaseOrderController.getPurchaseOrderById);

// NOTE: Restricted strictly to 'Admin' (Approvers who approve invoices should not create the POs matched against them).
// Revert by adding 'Approver' to requireRole('Admin', 'Approver') if business rules permit Approvers to create POs.
router.post(
  '/',
  requireAuth,
  requireRole('Admin'),
  purchaseOrderController.createPurchaseOrder
);

module.exports = router;
