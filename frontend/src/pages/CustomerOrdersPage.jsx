import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { itemId: '', batchNumber: '', quantity: 1 },
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
    setOrderItems([...orderItems, { itemId: '', batchNumber: '', quantity: 1 }]);
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
      setSuccessMsg('Customer Order created successfully in DRAFT status!');
      setShowCreateModal(false);
      setCustomerName('');
      setLocationId('');
      setOrderItems([{ itemId: '', batchNumber: '', quantity: 1 }]);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3" />
            <span>DRAFT</span>
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3" />
            <span>RESERVED</span>
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            <span>FULFILLED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3" />
            <span>CANCELLED</span>
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
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>Customer Orders & Stock Reservation</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Order management with concurrency-safe stock reservation (Row-level locked MySQL transactions)
          </p>
        </div>

        {(isAdmin || isSales) && (
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Customer Order</span>
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Order #</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Fulfillment Warehouse</th>
                <th className="px-6 py-4">Ordered Items</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Reservation & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading Customer Orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No customer orders found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {ord.customerName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{ord.location?.name}</div>
                      <div className="text-xs text-slate-400">{ord.location?.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {ord.items?.map((item) => (
                          <div key={item.id} className="text-xs text-slate-700">
                            <span className="font-semibold text-slate-900">{item.item?.name}</span>
                            <span className="text-slate-500"> ({item.quantity} {item.item?.uom})</span>
                            {item.batchNumber && (
                              <span className="font-mono text-[10px] text-slate-400 ml-1">
                                [{item.batchNumber}]
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(ord.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {(isAdmin || isSales) && (
                        <div className="flex items-center justify-end space-x-2">
                          {ord.status === 'DRAFT' && (
                            <button
                              onClick={() => handleReserveStock(ord.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-sm"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Reserve Stock</span>
                            </button>
                          )}
                          {ord.status === 'RESERVED' && (
                            <>
                              <button
                                onClick={() => handleFulfillOrder(ord.id)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Fulfill</span>
                              </button>
                              <button
                                onClick={() => handleCancelOrder(ord.id)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-lg transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Release / Cancel</span>
                              </button>
                            </>
                          )}
                          {(ord.status === 'FULFILLED' || ord.status === 'CANCELLED') && (
                            <span className="text-xs text-slate-400 font-medium italic">
                              Closed
                            </span>
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

      {/* Create Customer Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Create Customer Order</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter customer requirements. Orders are created in DRAFT state ready for stock reservation.
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
                    placeholder="e.g. Apex Automation Ltd"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Fulfillment Warehouse
                  </label>
                  <select
                    required
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Warehouse...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((row, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <select
                        required
                        value={row.itemId}
                        onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Select Item...</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.sku})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Batch (optional)"
                        value={row.batchNumber}
                        onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                      />

                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
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
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
