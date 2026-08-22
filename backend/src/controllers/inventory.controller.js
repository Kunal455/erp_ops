const inventoryService = require('../services/inventory.service');

async function getInventory(req, res, next) {
  try {
    const { locationId, itemId, category, search } = req.query;
    const data = await inventoryService.getInventory({
      locationId,
      itemId,
      category,
      search,
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getStockSummary(req, res, next) {
  try {
    const { itemId } = req.query;
    const data = await inventoryService.getStockSummary(itemId);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function stockIn(req, res, next) {
  try {
    const { itemId, locationId, batchNumber, quantity, notes } = req.body;
    const data = await inventoryService.stockIn({
      itemId,
      locationId,
      batchNumber,
      quantity: Number(quantity),
      userId: req.user?.id,
      notes,
    });
    res.status(201).json({
      success: true,
      message: 'Stock successfully added to inventory',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function adjustStock(req, res, next) {
  try {
    const { itemId, locationId, batchNumber, newPhysicalQuantity, notes } = req.body;
    const data = await inventoryService.adjustStock({
      itemId,
      locationId,
      batchNumber,
      newPhysicalQuantity: Number(newPhysicalQuantity),
      userId: req.user?.id,
      notes,
    });
    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getLocations(req, res, next) {
  try {
    const data = await inventoryService.getLocations();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getItems(req, res, next) {
  try {
    const data = await inventoryService.getItems();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getTransactions(req, res, next) {
  try {
    const { locationId, itemId, type, limit } = req.query;
    const data = await inventoryService.getTransactions({
      locationId,
      itemId,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInventory,
  getStockSummary,
  stockIn,
  adjustStock,
  getLocations,
  getItems,
  getTransactions,
};
