import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  Plus,
  Send,
  DownloadCloud,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
} from 'lucide-react';

export const TransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const { isAdmin, isOps } = useAuth();

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const [trfRes, locRes, itemRes] = await Promise.all([
        apiClient.get('/transfers'),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
      ]);
      setTransfers(trfRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (formData.sourceLocationId === formData.destinationLocationId) {
      setError('Source and destination locations cannot be the same');
      return;
    }

    try {
      await apiClient.post('/transfers', formData);
      setSuccessMsg('Stock transfer request created successfully!');
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>REQUESTED</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3" />
            <span>DISPATCHED (In Transit)</span>
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>RECEIVED</span>
          </span>
        );
      default:
        return <span className="text-xs font-bold text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span>Internal Warehouse Transfers</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Transactional stock movements (Source reduces on dispatch; Destination credits on receipt)
          </p>
        </div>

        {(isAdmin || isOps) && (
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Transfer Request</span>
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

      {/* Transfers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Transfer #</th>
                <th className="px-6 py-4">Item & Batch</th>
                <th className="px-6 py-4">Source Warehouse</th>
                <th className="px-6 py-4">Destination Warehouse</th>
                <th className="px-6 py-4 text-center">Quantity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading Stock Transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No stock transfers requested yet.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {trf.transferNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{trf.item?.name}</div>
                      <div className="text-xs font-mono text-slate-400">
                        {trf.item?.sku} · Batch: {trf.batchNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{trf.sourceLocation?.name}</div>
                      <div className="text-xs text-slate-400">{trf.sourceLocation?.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{trf.destinationLocation?.name}</div>
                      <div className="text-xs text-slate-400">{trf.destinationLocation?.code}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      {trf.quantity} {trf.item?.uom}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(trf.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {(isAdmin || isOps) && (
                        <div className="flex items-center justify-end space-x-2">
                          {trf.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleDispatch(trf.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          {trf.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleReceive(trf.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-sm"
                            >
                              <DownloadCloud className="w-3.5 h-3.5" />
                              <span>Receive Stock</span>
                            </button>
                          )}
                          {trf.status === 'RECEIVED' && (
                            <span className="text-xs text-slate-400 font-medium italic">Completed</span>
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

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Request Internal Transfer</h2>
            <p className="text-xs text-slate-500 mb-4">
              Move inventory between facilities with full transactional consistency.
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
                    Batch Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-ST-001"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Transfer Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-md"
                >
                  Create Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
