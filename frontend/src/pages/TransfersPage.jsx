import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  Plus,
  Send,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';

export const TransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    sourceLocationId: '',
    destinationLocationId: '',
    itemId: '',
    batchNumber: '',
    quantity: 10,
  });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { isOps } = useAuth();

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const [trfRes, locRes, itemRes, invRes] = await Promise.all([
        apiClient.get('/transfers'),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
        apiClient.get('/inventory'),
      ]);
      setTransfers(trfRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
      setInventoryList(invRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  // Compute available batches at chosen source warehouse for chosen item
  const availableBatches = inventoryList.filter(
    (inv) =>
      inv.locationId === formData.sourceLocationId &&
      inv.itemId === formData.itemId &&
      inv.availableQuantity > 0
  );

  const selectedBatchInfo = availableBatches.find((b) => b.batchNumber === formData.batchNumber);
  const maxAvailableQty = selectedBatchInfo ? selectedBatchInfo.availableQuantity : 0;

  // Auto-select batch when source location and item change
  useEffect(() => {
    if (availableBatches.length > 0) {
      if (!formData.batchNumber || !availableBatches.some((b) => b.batchNumber === formData.batchNumber)) {
        setFormData((prev) => ({
          ...prev,
          batchNumber: availableBatches[0].batchNumber,
          quantity: Math.min(prev.quantity || 10, availableBatches[0].availableQuantity),
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, batchNumber: '' }));
    }
  }, [formData.sourceLocationId, formData.itemId, availableBatches]);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (formData.sourceLocationId === formData.destinationLocationId) {
      setError('Source and destination locations cannot be the same');
      return;
    }

    if (!formData.batchNumber) {
      setError('Please select a valid inventory batch with available stock');
      return;
    }

    if (maxAvailableQty > 0 && formData.quantity > maxAvailableQty) {
      setError(`Cannot transfer ${formData.quantity} units. Available in batch is only ${maxAvailableQty} units.`);
      return;
    }

    try {
      await apiClient.post('/transfers', formData);
      setSuccessMsg('Stock transfer request generated successfully in REQUESTED status!');
      setShowCreateModal(false);
      setFormData({
        sourceLocationId: '',
        destinationLocationId: '',
        itemId: '',
        batchNumber: '',
        quantity: 10,
      });
      fetchTransfers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleDispatch = async (transferId) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/transfers/${transferId}/dispatch`);
      setSuccessMsg('Transfer dispatched! Source inventory reduced atomically in database.');
      fetchTransfers();
    } catch (err) {
      setError(err.response?.data?.message || 'Dispatch failed');
    }
  };

  const handleReceive = async (transferId) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/transfers/${transferId}/receive`);
      setSuccessMsg('Transfer received! Destination inventory credited.');
      fetchTransfers();
    } catch (err) {
      setError(err.response?.data?.message || 'Receive failed');
    }
  };

  const totalCount = transfers.length;
  const inTransitCount = transfers.filter((t) => t.status === 'DISPATCHED').length;
  const receivedCount = transfers.filter((t) => t.status === 'RECEIVED').length;

  const filteredTransfers = transfers.filter((trf) => {
    const matchSearch =
      trf.transferNumber.toLowerCase().includes(search.toLowerCase()) ||
      (trf.item?.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter !== 'ALL' && trf.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Requested
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            In Transit
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Received
          </span>
        );
      default:
        return <span className="text-xs font-semibold text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-slate-900 tracking-tight">
            Stock Transfers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inter-warehouse stock movements with two-phase verification
          </p>
        </div>

        {isOps && (
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Transfer</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-700 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            TOTAL TRANSFERS
          </div>
          <div className="text-4xl font-bold text-slate-900 mt-4 font-sans">
            {totalCount}
          </div>
        </div>

        <div className="bg-[#fffdf5] border border-[#fef3c7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#b45309] uppercase tracking-wider">
            IN TRANSIT
          </div>
          <div className="text-4xl font-bold text-[#b45309] mt-4 font-sans">
            {inTransitCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            RECEIVED
          </div>
          <div className="text-4xl font-bold text-emerald-600 mt-4 font-sans">
            {receivedCount}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transfer number, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 shadow-xs"
          >
            <option value="ALL">Status: All</option>
            <option value="REQUESTED">Requested</option>
            <option value="DISPATCHED">In Transit</option>
            <option value="RECEIVED">Received</option>
          </select>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#fafafa] text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-4">TRANSFER NO.</th>
                <th className="px-6 py-4">ITEM / BATCH</th>
                <th className="px-6 py-4">ROUTE (FROM → TO)</th>
                <th className="px-6 py-4 text-center">QUANTITY</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading transfers...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No stock transfers found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {trf.transferNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{trf.item?.name}</div>
                      <div className="text-xs font-mono text-slate-400">
                        {trf.item?.sku} · Batch: {trf.batchNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                        <span>{trf.sourceLocation?.name}</span>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{trf.destinationLocation?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      {trf.quantity} {trf.item?.uom}
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(trf.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {isOps && (
                        <div className="flex items-center justify-end space-x-2">
                          {trf.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleDispatch(trf.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg transition cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          {trf.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleReceive(trf.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                            >
                              <DownloadCloud className="w-3 h-3" />
                              <span>Receive</span>
                            </button>
                          )}
                          {trf.status === 'RECEIVED' && (
                            <span className="text-xs text-slate-400 italic">Completed</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-1">
              Request Stock Transfer
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Move inventory between warehouse locations with concurrency safety.
            </p>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Source Warehouse
                  </label>
                  <select
                    required
                    value={formData.sourceLocationId}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceLocationId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Origin...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Destination Warehouse
                  </label>
                  <select
                    required
                    value={formData.destinationLocationId}
                    onChange={(e) =>
                      setFormData({ ...formData, destinationLocationId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Destination...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Item to Transfer
                </label>
                <select
                  required
                  value={formData.itemId}
                  onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Item...</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Available Batch at Origin
                  </label>
                  {availableBatches.length > 0 ? (
                    <select
                      required
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-700 focus:outline-none focus:border-indigo-500"
                    >
                      {availableBatches.map((b) => (
                        <option key={b.batchNumber} value={b.batchNumber}>
                          {b.batchNumber} (Avail: {b.availableQuantity})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 font-italic">
                      {formData.sourceLocationId && formData.itemId
                        ? 'No available batches found'
                        : 'Select warehouse & item first'}
                    </div>
                  )}
                  {formData.sourceLocationId && formData.itemId && availableBatches.length === 0 && (
                    <span className="text-[11px] text-red-600 font-medium mt-1 block">
                      ⚠️ No available stock at this origin warehouse.
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Transfer Quantity {maxAvailableQty > 0 && `(Max: ${maxAvailableQty})`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxAvailableQty > 0 ? maxAvailableQty : undefined}
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableBatches.length === 0}
                  className="px-5 py-2 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
