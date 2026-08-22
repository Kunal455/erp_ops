import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const WorkOrdersPage = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    locationId: '',
    itemId: '',
    requiredQuantity: 10,
    assignedUserId: '',
    notes: '',
  });
  const [stockCheckPreview, setStockCheckPreview] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { isAdmin } = useAuth();

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const [woRes, locRes, itemRes, userRes] = await Promise.all([
        apiClient.get('/work-orders'),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
        apiClient.get('/auth/users'),
      ]);
      setWorkOrders(woRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
      setUsers(userRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  useEffect(() => {
    const checkStock = async () => {
      if (formData.locationId && formData.itemId && formData.requiredQuantity > 0) {
        try {
          const res = await apiClient.get('/work-orders/stock-check/calculate', {
            params: {
              locationId: formData.locationId,
              itemId: formData.itemId,
              requiredQuantity: formData.requiredQuantity,
            },
          });
          setStockCheckPreview(res.data.data);
        } catch {
          setStockCheckPreview(null);
        }
      } else {
        setStockCheckPreview(null);
      }
    };
    checkStock();
  }, [formData.locationId, formData.itemId, formData.requiredQuantity]);

  const handleCreateWorkOrder = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post('/work-orders', formData);
      setSuccessMsg('Work Order created successfully!');
      setShowCreateModal(false);
      setFormData({
        locationId: '',
        itemId: '',
        requiredQuantity: 10,
        assignedUserId: '',
        notes: '',
      });
      setStockCheckPreview(null);
      fetchWorkOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create work order');
    }
  };

  const handleUpdateStatus = async (woId, nextStatus) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.patch(`/work-orders/${woId}/status`, { status: nextStatus });
      setSuccessMsg(`Work Order transitioned to ${nextStatus}`);
      fetchWorkOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update work order status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>ASSIGNED</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Play className="w-3 h-3" />
            <span>IN PROGRESS</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            <span>COMPLETED</span>
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
            <ClipboardList className="w-6 h-6 text-purple-600" />
            <span>Work Orders & Material Stock Check</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Production assembly jobs with live shortage calculation (Formula: Shortage = max(Required - Available, 0))
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
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

      {/* Work Orders List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Work Order #</th>
                <th className="px-6 py-4">Target Item</th>
                <th className="px-6 py-4">Warehouse Location</th>
                <th className="px-6 py-4 text-center">Required Qty</th>
                <th className="px-6 py-4 text-center">Live Stock & Shortage</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading Work Orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => {
                  const shortage = wo.shortage ?? (wo.stockCheck?.shortageQuantity || 0);
                  const available = wo.availableStock ?? (wo.stockCheck?.availableQuantity || 0);
                  const hasShortage = shortage > 0;

                  return (
                    <tr key={wo.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                        {wo.workOrderNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{wo.item?.name}</div>
                        <div className="text-xs font-mono text-slate-400">{wo.item?.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {wo.location?.name}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {wo.requiredQuantity} {wo.item?.uom}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-slate-500">
                            Available: <strong>{available} {wo.item?.uom}</strong>
                          </span>
                          {hasShortage ? (
                            <span className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Shortage: {shortage} {wo.item?.uom}</span>
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>Sufficient Stock</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(wo.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end space-x-2">
                            {wo.status === 'ASSIGNED' && (
                              <button
                                onClick={() => handleUpdateStatus(wo.id, 'IN_PROGRESS')}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                              >
                                Start Progress
                              </button>
                            )}
                            {wo.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleUpdateStatus(wo.id, 'COMPLETED')}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                              >
                                Complete WO
                              </button>
                            )}
                            {wo.status === 'COMPLETED' && (
                              <span className="text-xs text-slate-400 font-medium italic">Finished</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Create New Work Order</h2>
            <p className="text-xs text-slate-500 mb-4">
              Schedule assembly production. Material stock shortages are dynamically computed.
            </p>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assembly Location / Warehouse
                </label>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Warehouse...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Target Item
                  </label>
                  <select
                    required
                    value={formData.itemId}
                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Item...</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Required Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requiredQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, requiredQuantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign Operations User
                </label>
                <select
                  value={formData.assignedUserId}
                  onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter((u) => u.role === 'OPERATIONS' || u.role === 'ADMIN')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              {/* Real-time Shortage Calculation Box */}
              {stockCheckPreview && (
                <div
                  className={`p-4 rounded-xl border ${
                    stockCheckPreview.hasShortage
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="flex items-center space-x-2">
                      {stockCheckPreview.hasShortage ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>Material Stock Analysis</span>
                    </span>
                    <span>
                      {stockCheckPreview.hasShortage
                        ? `Shortage: ${stockCheckPreview.shortageQuantity} Units`
                        : 'Stock Available'}
                    </span>
                  </div>
                  <div className="text-xs mt-1 text-slate-600 flex justify-between">
                    <span>Available at Location: {stockCheckPreview.availableQuantity}</span>
                    <span>Required: {formData.requiredQuantity}</span>
                  </div>
                </div>
              )}

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
                  className="px-5 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition shadow-md"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
