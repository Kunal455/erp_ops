const transferService = require('../services/transfer.service');

async function requestTransfer(req, res, next) {
  try {
    const { sourceLocationId, destinationLocationId, itemId, batchNumber, quantity } = req.body;
    const data = await transferService.requestTransfer({
      sourceLocationId,
      destinationLocationId,
      itemId,
      batchNumber,
      quantity: Number(quantity),
      userId: req.user?.id,
    });
    res.status(201).json({
      success: true,
      message: 'Internal stock transfer requested successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function dispatchTransfer(req, res, next) {
  try {
    const data = await transferService.dispatchTransfer(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Transfer successfully dispatched. Source inventory reduced.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function receiveTransfer(req, res, next) {
  try {
    const data = await transferService.receiveTransfer(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Transfer successfully received. Destination inventory updated.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function listTransfers(req, res, next) {
  try {
    const { sourceLocationId, destinationLocationId, status, itemId } = req.query;
    const data = await transferService.listTransfers({
      sourceLocationId,
      destinationLocationId,
      status,
      itemId,
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getTransferById(req, res, next) {
  try {
    const data = await transferService.getTransferById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requestTransfer,
  dispatchTransfer,
  receiveTransfer,
  listTransfers,
  getTransferById,
};
