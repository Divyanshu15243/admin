import { useContext, useState, useRef } from "react";
import { FiSearch, FiTrash2, FiPrinter, FiPlus, FiMinus, FiEye, FiUser, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { WindmillContext } from "@windmill/react-ui";
import { useQuery } from "@tanstack/react-query";
import ReactToPrint from "react-to-print";

// internal imports
import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import ProductServices from "@/services/ProductServices";
import OrderServices from "@/services/OrderServices";
import CustomerServices from "@/services/CustomerServices";
import AttributeServices from "@/services/AttributeServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError, notifySuccess } from "@/utils/toast";
import { AdminContext } from "@/context/AdminContext";

const POS = () => {
  const { mode } = useContext(WindmillContext);
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;
  const printRef = useRef();

  const { currency, getNumberTwo, showingTranslateValue } = useUtilsFunction();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [posPage, setPosPage] = useState(1);

  // customer states
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // variant modal states
  const [variantModal, setVariantModal] = useState(null); // product with variants
  const [selectedVariant, setSelectedVariant] = useState({});

  const { data: customersData } = useQuery({
    queryKey: ["pos-customers", customerSearch],
    queryFn: () => CustomerServices.getAllCustomers({ searchText: customerSearch }),
    enabled: customerSearch.length > 0,
  });

  const customers = Array.isArray(customersData) ? customersData : customersData?.customers || [];

  // fetch all attributes to map IDs to names
  const { data: attributesData } = useQuery({
    queryKey: ["all-attributes"],
    queryFn: () => AttributeServices.getShowingAttributes({}),
  });

  // build a flat map: { attributeId: { name, children: { childId: childName } } }
  const attrMap = {};
  if (attributesData) {
    attributesData.forEach((attr) => {
      attrMap[attr._id] = {
        name: showingTranslateValue(attr.name),
        children: {},
      };
      attr.values?.forEach((child) => {
        attrMap[attr._id].children[child._id] = showingTranslateValue(child.name);
      });
    });
  }

  // given a variant object, return readable label like "150g / Red"
  const getVariantLabel = (variant) => {
    const parts = [];
    Object.keys(variant).forEach((key) => {
      if (['_id','price','originalPrice','quantity','discount','productId','barcode','sku','image'].includes(key)) return;
      const attrName = attrMap[key]?.children[variant[key]] || variant[key];
      if (attrName) parts.push(attrName);
    });
    return parts.join(' / ') || 'Default';
  };

  const { data: posOrdersData, isLoading: posOrdersLoading, refetch: refetchPosOrders } = useQuery({
    queryKey: ["pos-orders", posPage],
    queryFn: () =>
      OrderServices.getAllOrders({
        status: "POS-Completed",
        page: posPage,
        limit: 10,
      }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () =>
      ProductServices.getAllProducts({
        page: 1,
        limit: 50,
        category: "",
        title: search,
        price: "",
      }),
  });

  const products = data?.products || [];

  // add to cart - check for variants first
  const addToCart = (product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    if (hasVariants) {
      setSelectedVariant({});
      setVariantModal(product);
      return;
    }
    addProductToCart(product, null);
  };

  const addProductToCart = (product, variant) => {
    const price = variant ? (variant.price || product.prices?.price || 0) : product.prices?.price || 0;
    const cartId = variant ? `${product._id}-${variant.productId || JSON.stringify(variant)}` : product._id;
    const variantLabel = variant ? getVariantLabel(variant) : null;
    const existing = cart.find((i) => i.cartId === cartId);
    if (existing) {
      setCart(cart.map((i) => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, {
        ...product,
        cartId,
        quantity: 1,
        price,
        variantLabel,
        variantInfo: variant || null,
      }]);
    }
    setVariantModal(null);
    setSelectedVariant({});
  };

  const handleAddVariantToCart = () => {
    if (!variantModal) return;
    const variant = variantModal.variants?.find(
      (v) => Object.keys(selectedVariant).every((k) => v[k] === selectedVariant[k])
    );
    if (!variant) return notifyError("Please select all variant options!");
    addProductToCart(variantModal, variant);
  };

  const updateQty = (cartId, qty) => {
    if (qty < 1) return removeFromCart(cartId);
    setCart(cart.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i)));
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter((i) => i.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCompletedOrder(null);
  };

  const subTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = (subTotal * Math.min(discount, 100)) / 100;
  const total = subTotal - discountAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return notifyError("Cart is empty!");
    setIsSubmitting(true);
    try {
      const customerInfo = selectedCustomer
        ? {
            name: selectedCustomer.name,
            email: selectedCustomer.email,
            contact: selectedCustomer.phone || selectedCustomer.shippingAddress?.contact || "N/A",
            address: selectedCustomer.shippingAddress?.address || "In-Store",
            city: selectedCustomer.shippingAddress?.city || "",
            country: selectedCustomer.shippingAddress?.country || "",
            zipCode: selectedCustomer.shippingAddress?.zipCode || "",
          }
        : {
            name: "Walk-in Customer",
            email: "pos@n23gujaratibasket.com",
            contact: "N/A",
            address: "In-Store",
            city: "",
            country: "",
            zipCode: "",
          };

      const orderData = {
        cart: cart.map((i) => ({
          _id: i._id,
          title: showingTranslateValue(i.title) + (i.variantLabel ? ` (${i.variantLabel})` : ""),
          image: i.image?.[0] || "",
          quantity: i.quantity,
          price: i.price,
          itemTotal: i.price * i.quantity,
        })),
        subTotal: parseFloat(subTotal.toFixed(2)),
        shippingCost: 0,
        discount: parseFloat(discountAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        paymentMethod,
        status: "POS-Completed",
        user_info: customerInfo,
        customerId: selectedCustomer?._id || null,
        orderSource: "POS",
        createdBy: adminInfo?.name || "Admin",
      };

      const res = await OrderServices.addPosOrder(orderData);
      setCompletedOrder({ ...orderData, invoice: res?.invoice || res?._id || "POS" });
      notifySuccess("Order placed successfully!");
    } catch (err) {
      notifyError(err?.message || "Order failed!");
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <PageTitle>Point of Sale</PageTitle>

      {/* Customer Search */}
      <div className="mb-4 relative">
        <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
          <FiUser className="text-gray-400" />
          {selectedCustomer ? (
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {selectedCustomer.name}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  {selectedCustomer.email}
                </span>
                {(selectedCustomer.phone || selectedCustomer.shippingAddress?.contact) && (
                  <span className="text-xs text-gray-400 ml-2">
                    • {selectedCustomer.phone || selectedCustomer.shippingAddress?.contact}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); setShowCustomerDropdown(false); }}
                className="text-gray-400 hover:text-red-500"
              >
                <FiX size={14} />
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Search customer by name or email..."
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="flex-1 text-sm outline-none bg-transparent dark:text-white placeholder-gray-400"
            />
          )}
        </div>

        {/* Customer Dropdown */}
        {showCustomerDropdown && customerSearch && customers.length > 0 && !selectedCustomer && (
          <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {customers.map((c) => (
              <button
                key={c._id}
                onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(""); }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-gray-700 text-sm"
              >
                <p className="font-semibold text-gray-700 dark:text-gray-200">{c.name}</p>
                <p className="text-xs text-gray-400">
                  {c.email}
                  {(c.phone || c.shippingAddress?.contact) && (
                    <span className="ml-2">• {c.phone || c.shippingAddress?.contact}</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* LEFT — Product Grid */}
        <div className="flex-1">
          {/* Search */}
          <div className="relative mb-4">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {isLoading ? (
            <Loading loading={isLoading} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => {
                const price = product.prices?.price || 0;
                const title = showingTranslateValue(product.title);
                const img = product.image?.[0];
                return (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-left hover:border-emerald-400 hover:shadow-md transition-all"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={title}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                      {title}
                    </p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">
                      {currency}{getNumberTwo(price)}
                    </p>
                  </button>
                );
              })}
              {products.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-10">
                  No products found.
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Cart */}
        <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-700 dark:text-gray-200 font-serif">
                Cart ({cart.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-400 hover:text-red-600 text-sm flex items-center gap-1"
              >
                <FiTrash2 size={14} /> Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72 lg:max-h-[400px]">
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">
                Add products to cart
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                      {showingTranslateValue(item.title)}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-emerald-500">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {currency}{getNumberTwo(item.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.cartId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-red-100"
                    >
                      <FiMinus size={10} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.cartId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-emerald-100"
                    >
                      <FiPlus size={10} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-red-500 w-16 text-right">
                    {currency}{getNumberTwo(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.cartId)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-24 shrink-0">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-24 shrink-0">
                Payment
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{currency}{getNumberTwo(subTotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-orange-500">
                  <span>Discount ({discount}%)</span>
                  <span>- {currency}{getNumberTwo(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-800 dark:text-white border-t pt-2">
                <span>Total</span>
                <span className="text-emerald-600">
                  {currency}{getNumberTwo(total)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {isSubmitting ? "Processing..." : `Charge ${currency}${getNumberTwo(total)}`}
            </button>

            {/* Print Receipt */}
            {completedOrder && (
              <ReactToPrint
                trigger={() => (
                  <button className="w-full py-2 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                    <FiPrinter size={14} /> Print Receipt
                  </button>
                )}
                content={() => printRef.current}
              />
            )}
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {variantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-200">
                  {showingTranslateValue(variantModal.title)}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Select a variant to add to cart</p>
              </div>
              <button onClick={() => setVariantModal(null)} className="text-gray-400 hover:text-red-500">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {variantModal.variants?.map((variant, idx) => {
                const label = getVariantLabel(variant);
                const price = variant.price || variantModal.prices?.price || 0;
                const stock = variant.quantity ?? variant.stock ?? null;
                return (
                  <button
                    key={idx}
                    onClick={() => addProductToCart(variantModal, variant)}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {label}
                      </p>
                      {stock !== null && (
                        <p className="text-xs text-gray-400">Stock: {stock}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {currency}{getNumberTwo(price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Receipt */}
      {completedOrder && (
        <div className="hidden">
          <div ref={printRef} className="p-6 text-sm font-serif max-w-xs mx-auto">
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold">
                <span className="text-emerald-600">N23</span> Gujarati Basket
              </h1>
              <p className="text-xs text-gray-500 mt-1">POS Receipt</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleString()}
              </p>
            </div>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <div className="text-xs text-gray-600 mb-2">
              <p><span className="font-semibold">Customer:</span> {completedOrder.user_info?.name}</p>
              {completedOrder.user_info?.contact && completedOrder.user_info?.contact !== "N/A" && (
                <p><span className="font-semibold">Phone:</span> {completedOrder.user_info?.contact}</p>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left pb-1">Item</th>
                  <th className="text-center pb-1">Qty</th>
                  <th className="text-right pb-1">Amt</th>
                </tr>
              </thead>
              <tbody>
                {completedOrder.cart.map((item, i) => (
                  <tr key={i}>
                    <td className="py-0.5 pr-2">{item.title?.substring(0, 18)}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">
                      {currency}{getNumberTwo(item.itemTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>{currency}{getNumberTwo(completedOrder.subTotal)}</span>
            </div>
            {completedOrder.discount > 0 && (
              <div className="flex justify-between text-xs text-orange-500">
                <span>Discount</span>
                <span>- {currency}{getNumberTwo(completedOrder.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>Total</span>
              <span>{currency}{getNumberTwo(completedOrder.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Payment</span>
              <span>{completedOrder.paymentMethod}</span>
            </div>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <p className="text-center text-xs text-gray-500">
              Thank you for shopping with us!
            </p>
          </div>
        </div>
      )}
      {/* POS Orders Table */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 font-serif">
          POS Orders
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs uppercase">
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {posOrdersLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : posOrdersData?.orders?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No POS orders found.
                  </td>
                </tr>
              ) : (
                posOrdersData?.orders?.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      #{order.invoice}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {currency}{getNumberTwo(order.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/order/${order._id}`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                      >
                        <FiEye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {posOrdersData?.totalDoc > 10 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500">
              <span>
                Page {posPage} of {Math.ceil(posOrdersData.totalDoc / 10)}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={posPage === 1}
                  onClick={() => setPosPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  disabled={posPage >= Math.ceil(posOrdersData.totalDoc / 10)}
                  onClick={() => setPosPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default POS;
