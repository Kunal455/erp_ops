import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Users,
} from 'lucide-react';

export const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { itemId: '', batchNumber: '', quantity: 1, unitPrice: 1500 },
  ]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { isAdmin, isSales } = useAuth();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordRes, locRes, itemRes] = await Promise.all([
        apiClient.get('/orders'),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
      ]);
      setOrders(ordRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { itemId: '', batchNumber: '', quantity: 1, unitPrice: 1500 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validItems = orderItems.filter((i) => i.itemId && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid line item');
      return;
    }

    try {
      await apiClient.post('/orders', {
        customerName,
        locationId,
        items: validItems,
      });
      setSuccessMsg('Customer order generated successfully in DRAFT status!');
      setShowCreateModal(false);
      setCustomerName('');
      setLocationId('');
      setOrderItems([{ itemId: '', batchNumber: '', quantity: 1, unitPrice: 1500 }]);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer order');
    }
  };

  const handleReserveStock = async (orderId) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/orders/${orderId}/reserve`);
      setSuccessMsg('Stock successfully reserved! Available warehouse inventory decreased atomically.');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Stock reservation failed. Insufficient available stock.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      setSuccessMsg('Order cancelled and reserved stock returned to available pool.');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleFulfillOrder = async (orderId) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/orders/${orderId}/fulfill`);
      setSuccessMsg('Order fulfilled and physical warehouse stock consumed.');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fulfill order');
    }
  };

  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'DRAFT' || o.status === 'RESERVED').length;
  const deliveredCount = orders.filter((o) => o.status === 'FULFILLED').length;

  const filteredOrders = orders.filter((ord) => {
    const matchSearch =
      ord.customerName.toLowerCase().includes(search.toLowerCase()) ||
      ord.orderNumber.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === 'PENDING') return ord.status === 'DRAFT' || ord.status === 'RESERVED';
    if (statusFilter === 'DELIVERED') return ord.status === 'FULFILLED';
    if (statusFilter === 'CANCELLED') return ord.status === 'CANCELLED';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Reserved
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs font-semibold text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-slate-900 tracking-tight">
            Sales Challans & Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all sales challans and deliveries
          </p>
        </div>

        {(isAdmin || isSales) && (
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Challan</span>
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

      {/* 3 Metric Cards matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            TOTAL CHALLANS
          </div>
          <div className="text-4xl font-bold text-slate-900 mt-4 font-sans">
            {totalCount}
          </div>
        </div>

        <div className="bg-[#fffdf5] border border-[#fef3c7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#b45309] uppercase tracking-wider">
            PENDING
          </div>
          <div className="text-4xl font-bold text-[#d97706] mt-4 font-sans">
            {pendingCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            DELIVERED
          </div>
          <div className="text-4xl font-bold text-emerald-600 mt-4 font-sans">
            {deliveredCount}
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search challan..."
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
          <option value="PENDING">Status: Pending</option>
          <option value="DELIVERED">Status: Delivered</option>
          <option value="CANCELLED">Status: Cancelled</option>
        </select>
      </div>

      {/* Table matching screenshot columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#fafafa] text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-4">CHALLAN NO.</th>
                <th className="px-6 py-4">CUSTOMER</th>
                <th className="px-6 py-4">DATE</th>
                <th className="px-6 py-4">AMOUNT</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading challans...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No sales challans found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const dateStr = new Date(ord.createdAt || Date.now()).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: '2-digit' }
                  );

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-mono font-semibold text-[#4f46e5]">
                        {ord.orderNumber}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {ord.customerName}
                        <div className="text-xs font-normal text-slate-400 font-sans">
                          {ord.location?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{dateStr}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{(ord.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(ord.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {(isAdmin || isSales) && (
                          <div className="flex items-center justify-end space-x-2">
                            {ord.status === 'DRAFT' && (
                              <button
                                onClick={() => handleReserveStock(ord.id)}
                                className="px-3 py-1 text-xs font-semibold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg transition shadow-xs"
                              >
                                Reserve Stock
                              </button>
                            )}
                            {ord.status === 'RESERVED' && (
                              <>
                                <button
                                  onClick={() => handleFulfillOrder(ord.id)}
                                  className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                                >
                                  Deliver
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(ord.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {(ord.status === 'FULFILLED' || ord.status === 'CANCELLED') && (
                              <span className="text-xs text-slate-400 font-medium italic">
                                Completed
                              </span>
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-1">
              Generate Sales Challan
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Create a sales order for dispatch and customer delivery.
            </p>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Customer Name / Account
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LPU Industrial Corp"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Dispatch Warehouse
                  </label>
                  <select
                    required
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Warehouse...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Challan Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                    >
                      <select
                        required
                        value={row.itemId}
                        onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Select Item...</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.sku})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                      />

                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
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
                  className="px-5 py-2 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl transition shadow-sm"
                >
                  Generate Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
