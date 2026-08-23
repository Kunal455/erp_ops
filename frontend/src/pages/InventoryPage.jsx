import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Package,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);

  const [inwardForm, setInwardForm] = useState({
    itemId: '',
    locationId: '',
    batchNumber: '',
    quantity: 100,
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    itemId: '',
    locationId: '',
    batchNumber: '',
    newPhysicalQuantity: 0,
    notes: '',
  });

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const { isAdmin, isOps } = useAuth();

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [invRes, locRes, itemRes] = await Promise.all([
        apiClient.get('/inventory', {
          params: {
            search: search || undefined,
            locationId: selectedLocation || undefined,
          },
        }),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
      ]);

      setInventory(invRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [search, selectedLocation]);

  const handleStockInward = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post('/inventory/stock-in', inwardForm);
      setSuccessMsg('Stock inward successful! Inventory updated.');
      setShowInwardModal(false);
      setInwardForm({
        itemId: '',
        locationId: '',
        batchNumber: '',
        quantity: 100,
        notes: '',
      });
      fetchInventoryData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to perform stock-in');
    }
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.patch('/inventory/adjust', adjustForm);
      setSuccessMsg('Stock adjusted successfully!');
      setShowAdjustModal(false);
      fetchInventoryData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const openAdjustModal = (invRow) => {
    setSelectedBatchForAdjust(invRow);
    setAdjustForm({
      itemId: invRow.itemId,
      locationId: invRow.locationId,
      batchNumber: invRow.batchNumber,
      newPhysicalQuantity: invRow.physicalQuantity,
      notes: '',
    });
    setShowAdjustModal(true);
  };

  // Metrics computation for Stat Cards
  const totalItemsCount = items.length > 0 ? items.length : inventory.length;
  const lowStockCount = inventory.filter(
    (i) => i.availableQuantity > 0 && i.availableQuantity <= 15
  ).length;
  const outOfStockCount = inventory.filter((i) => i.availableQuantity === 0).length;

  // Filter inventory by status dropdown
  const filteredInventory = inventory.filter((inv) => {
    if (selectedStatus === 'OUT') return inv.availableQuantity === 0;
    if (selectedStatus === 'LOW') return inv.availableQuantity > 0 && inv.availableQuantity <= 15;
    if (selectedStatus === 'GOOD') return inv.availableQuantity > 15;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-slate-900 tracking-tight">
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and adjust your physical stock levels
          </p>
        </div>

        {isOps && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setError(null);
                setShowInwardModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-xs cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4 text-indigo-600" />
              <span>Stock Inward</span>
            </button>
            <button
              onClick={() => {
                if (inventory.length > 0) {
                  openAdjustModal(inventory[0]);
                }
              }}
              className="inline-flex items-center space-x-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Stock Adjustment</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
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
        {/* Total Items */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            TOTAL ITEMS
          </div>
          <div className="text-4xl font-bold text-slate-900 mt-4 font-sans">
            {totalItemsCount}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-[#fffdf5] border border-[#fef3c7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#b45309] uppercase tracking-wider">
            LOW STOCK
          </div>
          <div className="text-4xl font-bold text-[#d97706] mt-4 font-sans">
            {lowStockCount}
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-[#fef8f8] border border-[#fee2e2] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#b91c1c] uppercase tracking-wider">
            OUT OF STOCK
          </div>
          <div className="text-4xl font-bold text-[#dc2626] mt-4 font-sans">
            {outOfStockCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Location selector */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Warehouses</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          {/* Status filter dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Stock</option>
            <option value="GOOD">Good Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table matching screenshot columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#fafafa] text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-4">PRODUCT</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4 text-center">CURRENT STOCK</th>
                <th className="px-6 py-4 text-center">MIN STOCK</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading inventory data...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((inv) => {
                  const currentStock = inv.availableQuantity;
                  const minStock = 10; // Standard ERP safety threshold

                  let statusBadge = (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Good</span>
                    </span>
                  );

                  let stockColor = 'text-slate-900';

                  if (currentStock === 0) {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span>Out</span>
                      </span>
                    );
                    stockColor = 'text-red-600 font-bold';
                  } else if (currentStock <= minStock) {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Low</span>
                      </span>
                    );
                    stockColor = 'text-amber-600 font-bold';
                  }

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{inv.itemName}</div>
                        <div className="text-xs text-slate-400">
                          {inv.locationName} · Batch: {inv.batchNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                        {inv.itemSku}
                      </td>
                      <td className={`px-6 py-4 text-center text-sm ${stockColor}`}>
                        {currentStock}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {minStock}
                      </td>
                      <td className="px-6 py-4 text-center">{statusBadge}</td>
                      <td className="px-6 py-4 text-right">
                        {isOps && (
                          <button
                            onClick={() => openAdjustModal(inv)}
                            className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg transition cursor-pointer"
                          >
                            Adjust
                          </button>
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

      {/* Stock Inward Modal */}
      {showInwardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-1">
              Stock Inward
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Receive raw materials or finished products into warehouse batches.
            </p>

            <form onSubmit={handleStockInward} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Product Item
                </label>
                <select
                  required
                  value={inwardForm.itemId}
                  onChange={(e) => setInwardForm({ ...inwardForm, itemId: e.target.value })}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Target Warehouse
                </label>
                <select
                  required
                  value={inwardForm.locationId}
                  onChange={(e) => setInwardForm({ ...inwardForm, locationId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
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
                    Batch Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-2026-01"
                    value={inwardForm.batchNumber}
                    onChange={(e) =>
                      setInwardForm({ ...inwardForm, batchNumber: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardForm.quantity}
                    onChange={(e) =>
                      setInwardForm({ ...inwardForm, quantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl transition shadow-sm"
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-1">
              Stock Adjustment
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Update physical count post physical verification audit.
            </p>

            <form onSubmit={handleStockAdjust} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  <span className="text-slate-500">Item: </span>
                  <span className="font-bold text-slate-800">
                    {selectedBatchForAdjust?.itemName} ({selectedBatchForAdjust?.itemSku})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Warehouse: </span>
                  <span className="font-semibold text-slate-800">
                    {selectedBatchForAdjust?.locationName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Batch: </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {selectedBatchForAdjust?.batchNumber}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Physical Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustForm.newPhysicalQuantity}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      newPhysicalQuantity: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Adjustment Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cycle count verification"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl transition shadow-sm"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
