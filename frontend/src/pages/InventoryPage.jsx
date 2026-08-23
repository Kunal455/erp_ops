import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Layers,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Stock Inward Form State
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardForm, setInwardForm] = useState({
    itemId: '',
    locationId: '',
    batchNumber: '',
    quantity: 100,
    notes: '',
  });

  // Stock Adjustment Form State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    itemId: '',
    locationId: '',
    batchNumber: '',
    newPhysicalQuantity: 0,
    notes: '',
  });

  const { isOps } = useAuth();

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [invRes, locRes, itemRes] = await Promise.all([
        apiClient.get('/inventory', {
          params: { locationId: selectedLocation || undefined },
        }),
        apiClient.get('/inventory/locations'),
        apiClient.get('/inventory/items'),
      ]);
      setInventory(invRes.data.data || []);
      setLocations(locRes.data.data || []);
      setItems(itemRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [selectedLocation]);

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
    const target = invRow || (inventory.length > 0 ? inventory[0] : null);
    setSelectedBatchForAdjust(target);
    if (target) {
      setAdjustForm({
        itemId: target.itemId,
        locationId: target.locationId,
        batchNumber: target.batchNumber,
        newPhysicalQuantity: target.physicalQuantity,
        notes: '',
      });
    }
    setShowAdjustModal(true);
  };

  // 3 Metric Cards Calculation
  const totalItemsCount = inventory.length;
  const lowStockCount = inventory.filter(
    (i) => i.availableQuantity > 0 && i.availableQuantity <= 15
  ).length;
  const outOfStockCount = inventory.filter((i) => i.availableQuantity === 0).length;

  // Filter inventory by status dropdown & search
  const filteredInventory = inventory.filter((inv) => {
    const matchSearch =
      (inv.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.itemSku || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.batchNumber || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (selectedStatus === 'OUT') return inv.availableQuantity === 0;
    if (selectedStatus === 'LOW') return inv.availableQuantity > 0 && inv.availableQuantity <= 15;
    if (selectedStatus === 'GOOD') return inv.availableQuantity > 15;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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
                setError(null);
                openAdjustModal(inventory.length > 0 ? inventory[0] : null);
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

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            TOTAL ITEMS
          </div>
          <div className="text-4xl font-bold text-slate-900 mt-4 font-sans">
            {totalItemsCount}
          </div>
        </div>

        <div className="bg-[#fffdf5] border border-[#fef3c7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-[#b45309] uppercase tracking-wider">
            LOW STOCK
          </div>
          <div className="text-4xl font-bold text-[#d97706] mt-4 font-sans">
            {lowStockCount}
          </div>
        </div>

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

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#fafafa] text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-4">ITEM / PRODUCT</th>
                <th className="px-6 py-4">LOCATION</th>
                <th className="px-6 py-4">BATCH</th>
                <th className="px-6 py-4 text-center">PHYSICAL</th>
                <th className="px-6 py-4 text-center">RESERVED</th>
                <th className="px-6 py-4 text-center">AVAILABLE</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading inventory data...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((inv) => {
                  const physical = inv.physicalQuantity || 0;
                  const reserved = inv.reservedQuantity || 0;
                  const available = inv.availableQuantity || 0;
                  const minStock = 10;

                  let statusBadge = (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Good</span>
                    </span>
                  );

                  let availColor = 'text-slate-900';

                  if (available === 0) {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span>Out</span>
                      </span>
                    );
                    availColor = 'text-red-600 font-bold';
                  } else if (available <= minStock) {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Low</span>
                      </span>
                    );
                    availColor = 'text-amber-600 font-bold';
                  }

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{inv.itemName}</div>
                        <div className="text-xs font-mono text-slate-400">{inv.itemSku}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800">{inv.locationName}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">
                        {inv.batchNumber}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-700">
                        {physical}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-amber-600">
                        {reserved > 0 ? reserved : '0'}
                      </td>
                      <td className={`px-6 py-4 text-center ${availColor}`}>
                        {available}
                      </td>
                      <td className="px-6 py-4 text-center">{statusBadge}</td>
                      <td className="px-6 py-4 text-right">
                        {isOps && (
                          <button
                            onClick={() => openAdjustModal(inv)}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Adjust</span>
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
              Receive Inward Stock
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Add verified physical quantity from suppliers to a warehouse batch.
            </p>

            <form onSubmit={handleStockInward} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Item / Product
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
                  Destination Warehouse
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
                      {loc.name}
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
                    Quantity Inward
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Inward Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchase order PO-9901 arrival"
                  value={inwardForm.notes}
                  onChange={(e) => setInwardForm({ ...inwardForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
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

      {/* Stock Adjustment Modal with Full Dropdown Selection */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-1">
              Stock Adjustment
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select any inventory batch to correct physical stock counts post verification audit.
            </p>

            <form onSubmit={handleStockAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Select Item / Warehouse / Batch to Adjust
                </label>
                <select
                  required
                  value={selectedBatchForAdjust?.id || ''}
                  onChange={(e) => {
                    const found = inventory.find((inv) => inv.id === e.target.value);
                    if (found) {
                      setSelectedBatchForAdjust(found);
                      setAdjustForm({
                        itemId: found.itemId,
                        locationId: found.locationId,
                        batchNumber: found.batchNumber,
                        newPhysicalQuantity: found.physicalQuantity,
                        notes: '',
                      });
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose Inventory Batch...</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.itemName} · {inv.locationName} · Batch: {inv.batchNumber} (Current: {inv.physicalQuantity}, Reserved: {inv.reservedQuantity})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBatchForAdjust && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Item:</span>
                    <span className="font-bold text-slate-900">
                      {selectedBatchForAdjust.itemName} ({selectedBatchForAdjust.itemSku})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Warehouse:</span>
                    <span className="font-medium text-slate-800">
                      {selectedBatchForAdjust.locationName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Stock Levels:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      Physical: {selectedBatchForAdjust.physicalQuantity} | Reserved: {selectedBatchForAdjust.reservedQuantity} | Available: {selectedBatchForAdjust.availableQuantity}
                    </span>
                  </div>
                </div>
              )}

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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-bold text-slate-900"
                />
                {selectedBatchForAdjust && (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Cannot be lower than reserved quantity ({selectedBatchForAdjust.reservedQuantity}).
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Adjustment Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20 units damaged during transit inspection"
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
                  disabled={!selectedBatchForAdjust}
                  className="px-5 py-2 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
