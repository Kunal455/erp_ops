const workOrderService = require('../services/workOrder.service');

async function createWorkOrder(req, res, next) {
  try {
    const { locationId, itemId, requiredQuantity, assignedUserId, notes, materials } = req.body;
    const data = await workOrderService.createWorkOrder({
      locationId,
      itemId,
      requiredQuantity: Number(requiredQuantity),
      assignedUserId,
      notes,
      materials,
    });
    res.status(201).json({
      success: true,
      message: 'Work Order created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function listWorkOrders(req, res, next) {
  try {
    const { locationId, status } = req.query;
    const data = await workOrderService.listWorkOrders({
      locationId,
      status,
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getWorkOrderById(req, res, next) {
  try {
    const data = await workOrderService.getWorkOrderById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function calculateStockCheck(req, res, next) {
  try {
    const { locationId, itemId, requiredQuantity } = req.query;
    const data = await workOrderService.calculateMaterialStockCheck(
      locationId,
      itemId,
      Number(requiredQuantity || 1)
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const data = await workOrderService.updateStatus(req.params.id, status, req.user?.id);
    res.status(200).json({
      success: true,
      message: `Work Order status updated to ${status}`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createWorkOrder,
  listWorkOrders,
  getWorkOrderById,
  calculateStockCheck,
  updateStatus,
};
