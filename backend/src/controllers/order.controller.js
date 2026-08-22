const orderService = require('../services/order.service');

async function createOrder(req, res, next) {
  try {
    const { customerName, locationId, items } = req.body;
    const data = await orderService.createOrder({
      customerName,
      locationId,
      items,
      userId: req.user?.id,
    });
    res.status(201).json({
      success: true,
      message: 'Customer Order created successfully in DRAFT status',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function reserveStock(req, res, next) {
  try {
    const data = await orderService.reserveOrderStock(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Stock successfully reserved for customer order',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const data = await orderService.cancelOrder(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Customer Order cancelled and reserved stock released',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function fulfillOrder(req, res, next) {
  try {
    const data = await orderService.fulfillOrder(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Customer Order fulfilled and physical stock consumed',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function listOrders(req, res, next) {
  try {
    const { locationId, status } = req.query;
    const data = await orderService.listOrders({
      locationId,
      status,
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    const data = await orderService.getOrderById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  reserveStock,
  cancelOrder,
  fulfillOrder,
  listOrders,
  getOrderById,
};
