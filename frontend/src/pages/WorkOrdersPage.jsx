import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Check,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';

export const WorkOrdersPage = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    locationId: '',
    itemId: '',
    requiredQuantity: 10,
    notes: '',
  });
  const [stockCheckPreview, setStockCheckPreview] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { isAdmin } = useAuth();

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const [woRes, locRes, itemRes] = await Promise.all([
        apiClient.get('/work-orders'),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
      ]);
      setWorkOrders(woRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
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
      setSuccessMsg('Production Work Order created successfully!');
      setShowCreateModal(false);
      setFormData({
        locationId: '',
        itemId: '',
        requiredQuantity: 10,
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
      setSuccessMsg(`Work Order updated to ${nextStatus}`);
      fetchWorkOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update work order status');
    }
  };

  const totalCount = workOrders.length;
  const assignedCount = workOrders.filter((w) => w.status === 'ASSIGNED').length;
  const inProgressCount = workOrders.filter((w) => w.status === 'IN_PROGRESS').length;
  const completedCount = workOrders.filter((w) => w.status === 'COMPLETED').length;

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchSearch =
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (wo.item?.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter !== 'ALL' && wo.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Assigned
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            In Progress
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
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
            Work Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manufacturing & assembly jobs with real-time material shortage calculation
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm cursor-pointer"
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

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            TOTAL ORDERS
          </div>
          <div className="text-4xl font-bold text-slate-900 mt-4 font-sans">
            {totalCount}
          </div>
        </div>

        <div className="bg-[#fffdf5] border border-[#fef3c7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#b45309] uppercase tracking-wider">
            IN PROGRESS
          </div>
          <div className="text-4xl font-bold text-[#d97706] mt-4 font-sans">
            {inProgressCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            COMPLETED
          </div>
          <div className="text-4xl font-bold text-emerald-600 mt-4 font-sans">
            {completedCount}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search work order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="ALL">Status: All</option>
          <option value="ASSIGNED">Status: Assigned</option>
          <option value="IN_PROGRESS">Status: In Progress</option>
          <option value="COMPLETED">Status: Completed</option>
        </select>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#fafafa] text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-4">ORDER NO.</th>
                <th className="px-6 py-4">TARGET PRODUCT</th>
                <th className="px-6 py-4">FACILITY</th>
                <th className="px-6 py-4 text-center">REQUIRED</th>
                <th className="px-6 py-4 text-center">SHORTAGE ANALYSIS</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading work orders...
                  </td>
                </tr>
              ) : filteredWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                filteredWorkOrders.map((wo) => {
                  const shortage = wo.shortage ?? (wo.stockCheck?.shortageQuantity || 0);
                  const available = wo.availableStock ?? (wo.stockCheck?.availableQuantity || 0);
                  const hasShortage = shortage > 0;

                  return (
                    <tr key={wo.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-mono font-semibold text-[#4f46e5]">
                        {wo.workOrderNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{wo.item?.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{wo.item?.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {wo.location?.name}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {wo.requiredQuantity} {wo.item?.uom}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasShortage ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Shortage: {shortage} {wo.item?.uom}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            <span>Stock Ready ({available} Avail)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(wo.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end space-x-2">
                            {wo.status === 'ASSIGNED' && (
                              <button
                                onClick={() => handleUpdateStatus(wo.id, 'IN_PROGRESS')}
                                className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                              >
                                Start
                              </button>
                            )}
                            {wo.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleUpdateStatus(wo.id, 'COMPLETED')}
                                className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                              >
                                Complete
                              </button>
                            )}
                            {wo.status === 'COMPLETED' && (
                              <span className="text-xs text-slate-400 italic">Done</span>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-1">
              Create Work Order
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Schedule manufacturing job. Shortage is computed automatically.
            </p>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Manufacturing Facility
                </label>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Facility...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Item...</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {stockCheckPreview && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    stockCheckPreview.hasShortage
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Material Stock Calculation:</span>
                    <span>
                      {stockCheckPreview.hasShortage
                        ? `Shortage: ${stockCheckPreview.shortageQuantity} Units`
                        : 'Sufficient Available Stock'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Facility Stock: {stockCheckPreview.availableQuantity} | Needed: {formData.requiredQuantity}
                  </div>
                </div>
              )}

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
                  className="px-5 py-2 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl transition shadow-sm"
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
