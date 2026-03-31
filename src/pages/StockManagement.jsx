import { useState } from "react";
import { FiSearch, FiEdit2, FiCheck, FiX, FiAlertTriangle, FiPackage } from "react-icons/fi";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// internal imports
import PageTitle from "@/components/Typography/PageTitle";
import ProductServices from "@/services/ProductServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError, notifySuccess } from "@/utils/toast";

const StockManagement = () => {
  const { showingTranslateValue, currency, getNumberTwo } = useUtilsFunction();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null); // productId or variantProductId
  const [editValue, setEditValue] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | out
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-products", page, search],
    queryFn: () =>
      ProductServices.getAllProducts({
        page,
        limit,
        category: "",
        title: search,
        price: "",
      }),
  });

  const products = data?.products || [];
  const totalDoc = data?.totalDoc || 0;

  // filter products by stock status
  const filteredProducts = products.filter((p) => {
    const stock = p.stock ?? 0;
    if (filter === "out") return stock === 0;
    if (filter === "low") return stock > 0 && stock <= 10;
    return true;
  });

  const getStockBadge = (stock) => {
    if (stock === 0)
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
          Out of Stock
        </span>
      );
    if (stock <= 10)
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
          Low Stock
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600">
        In Stock
      </span>
    );
  };

  const handleEdit = (id, currentStock) => {
    setEditingId(id);
    setEditValue(String(currentStock ?? 0));
  };

  const handleSave = async (product, variantIndex = null) => {
    const newStock = parseInt(editValue);
    if (isNaN(newStock) || newStock < 0)
      return notifyError("Enter a valid stock number!");

    try {
      let updatedData = {};

      if (variantIndex !== null) {
        // update variant stock
        const updatedVariants = product.variants.map((v, i) =>
          i === variantIndex ? { ...v, quantity: newStock } : v
        );
        updatedData = { variants: updatedVariants };
      } else {
        updatedData = { stock: newStock };
      }

      await ProductServices.updateProduct(product._id, updatedData);
      notifySuccess("Stock updated successfully!");
      setEditingId(null);
      setEditValue("");
      refetch();
    } catch (err) {
      notifyError(err?.message || "Failed to update stock!");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  // stats
  const outOfStock = products.filter((p) => (p.stock ?? 0) === 0).length;
  const lowStock = products.filter(
    (p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10
  ).length;
  const inStock = products.filter((p) => (p.stock ?? 0) > 10).length;

  return (
    <>
      <PageTitle>Stock Management</PageTitle>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilter("all")}
          className={`cursor-pointer p-4 rounded-xl border flex items-center gap-4 transition-all ${
            filter === "all"
              ? "border-emerald-400 bg-emerald-50 dark:bg-gray-700"
              : "border-gray-100 bg-white dark:bg-gray-800"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <FiPackage className="text-emerald-600" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Products</p>
            <p className="text-xl font-bold text-gray-700 dark:text-white">
              {totalDoc}
            </p>
          </div>
        </div>

        <div
          onClick={() => setFilter("low")}
          className={`cursor-pointer p-4 rounded-xl border flex items-center gap-4 transition-all ${
            filter === "low"
              ? "border-orange-400 bg-orange-50 dark:bg-gray-700"
              : "border-gray-100 bg-white dark:bg-gray-800"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <FiAlertTriangle className="text-orange-500" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Low Stock (≤10)</p>
            <p className="text-xl font-bold text-orange-500">{lowStock}</p>
          </div>
        </div>

        <div
          onClick={() => setFilter("out")}
          className={`cursor-pointer p-4 rounded-xl border flex items-center gap-4 transition-all ${
            filter === "out"
              ? "border-red-400 bg-red-50 dark:bg-gray-700"
              : "border-gray-100 bg-white dark:bg-gray-800"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <FiAlertTriangle className="text-red-500" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Out of Stock</p>
            <p className="text-xl font-bold text-red-500">{outOfStock}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Products</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs uppercase">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-center">Price</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const title = showingTranslateValue(product.title);
                const img = product.image?.[0];
                const hasVariants =
                  product.isCombination && product.variants?.length > 0;

                return (
                  <>
                    {/* Main Product Row */}
                    <tr
                      key={product._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {img ? (
                            <img
                              src={img}
                              alt={title}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-gray-400 text-xs">
                              N/A
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200 text-xs">
                              {title}
                            </p>
                            {hasVariants && (
                              <p className="text-xs text-emerald-500">
                                {product.variants.length} variants
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {product.sku || "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
                        {currency}{getNumberTwo(product.prices?.price || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!hasVariants && (
                          editingId === product._id ? (
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 border border-emerald-400 rounded px-2 py-1 text-center text-sm focus:outline-none dark:bg-gray-700 dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <span className={`font-bold text-sm ${
                              (product.stock ?? 0) === 0
                                ? "text-red-500"
                                : (product.stock ?? 0) <= 10
                                ? "text-orange-500"
                                : "text-gray-700 dark:text-gray-200"
                            }`}>
                              {product.stock ?? 0}
                            </span>
                          )
                        )}
                        {hasVariants && (
                          <span className="text-xs text-gray-400">See below</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!hasVariants && getStockBadge(product.stock ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!hasVariants && (
                          editingId === product._id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSave(product)}
                                className="text-emerald-500 hover:text-emerald-700"
                              >
                                <FiCheck size={16} />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-red-400 hover:text-red-600"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(product._id, product.stock)}
                              className="text-blue-400 hover:text-blue-600"
                            >
                              <FiEdit2 size={15} />
                            </button>
                          )
                        )}
                      </td>
                    </tr>

                    {/* Variant Rows */}
                    {hasVariants &&
                      product.variants.map((variant, vIdx) => {
                        const variantId = `${product._id}-v${vIdx}`;
                        const variantStock = variant.quantity ?? 0;
                        return (
                          <tr
                            key={variantId}
                            className="bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="px-4 py-2 pl-16">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ↳ {variant.productId || `Variant ${vIdx + 1}`}
                              </p>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-400">
                              {variant.sku || "—"}
                            </td>
                            <td className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                              {currency}{getNumberTwo(variant.price || 0)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {editingId === variantId ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 border border-emerald-400 rounded px-2 py-1 text-center text-sm focus:outline-none dark:bg-gray-700 dark:text-white"
                                  autoFocus
                                />
                              ) : (
                                <span className={`font-bold text-sm ${
                                  variantStock === 0
                                    ? "text-red-500"
                                    : variantStock <= 10
                                    ? "text-orange-500"
                                    : "text-gray-700 dark:text-gray-200"
                                }`}>
                                  {variantStock}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {getStockBadge(variantStock)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {editingId === variantId ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSave(product, vIdx)}
                                    className="text-emerald-500 hover:text-emerald-700"
                                  >
                                    <FiCheck size={16} />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <FiX size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEdit(variantId, variantStock)}
                                  className="text-blue-400 hover:text-blue-600"
                                >
                                  <FiEdit2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalDoc > limit && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500">
            <span>
              Page {page} of {Math.ceil(totalDoc / limit)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Prev
              </button>
              <button
                disabled={page >= Math.ceil(totalDoc / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StockManagement;
