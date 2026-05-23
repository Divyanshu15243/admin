import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiDownload, FiFileText, FiCalendar } from "react-icons/fi";
import * as XLSX from "xlsx";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";

import OrderServices from "@/services/OrderServices";
import { notifyError } from "@/utils/toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt = (v) => `₹${parseFloat(v || 0).toFixed(2)}`;

// ── PDF ──
const pdfStyles = StyleSheet.create({
  page:         { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title:        { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  subtitle:     { fontSize: 10, color: "#6b7280", marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 14, color: "#10b981" },
  grid:         { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  card:         { width: "22%", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 3, padding: 6 },
  cardLabel:    { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  cardValue:    { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#065f46" },
  thead:        { flexDirection: "row", backgroundColor: "#f3f4f6", padding: "5 3", borderBottom: "1px solid #e5e7eb" },
  trow:         { flexDirection: "row", padding: "4 3", borderBottom: "1px solid #f3f4f6" },
  th:           { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151" },
  td:           { fontSize: 8, color: "#374151" },
  c1: { width: "7%" },  c2: { width: "22%" }, c3: { width: "11%" },
  c4: { width: "11%" }, c5: { width: "12%" }, c6: { width: "12%" },
  c7: { width: "10%" }, c8: { width: "9%" },  c9: { width: "6%" },
  footer: { marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 6, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

const MonthlyReportPDF = ({ data, month, year }) => {
  const { orders = [], summary: s = {} } = data;
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page} orientation="landscape">
        <Text style={pdfStyles.title}>Monthly Sales Report</Text>
        <Text style={pdfStyles.subtitle}>{MONTHS[month - 1]} {year} — N23 Gujarati Basket</Text>

        <Text style={pdfStyles.sectionTitle}>Summary</Text>
        <View style={pdfStyles.grid}>
          {[
            ["Total Orders",        s.totalOrders],
            ["Total Sales",         fmt(s.totalSales)],
            ["Total Profit",        fmt(s.totalProfit)],
            ["Owner Profit",        fmt(s.ownerProfit)],
            ["Referral Commission", fmt(s.referralCommission)],
            ["Total Discount",      fmt(s.totalDiscount)],
            ["Shipping Collected",  fmt(s.totalShipping)],
            ["Cash Orders",         s.cashOrders],
            ["Online Orders",       s.onlineOrders],
            ["POS Orders",          s.posOrders],
            ["Delivered",           s.deliveredOrders],
            ["Pending",             s.pendingOrders],
            ["Cancelled",           s.cancelOrders],
          ].map(([label, value]) => (
            <View key={label} style={pdfStyles.card}>
              <Text style={pdfStyles.cardLabel}>{label}</Text>
              <Text style={pdfStyles.cardValue}>{value ?? 0}</Text>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.sectionTitle}>Order Details</Text>
        <View style={pdfStyles.thead}>
          {[["c1","#"],["c2","Customer"],["c3","Date"],["c4","Payment"],["c5","Total"],["c6","Profit"],["c7","Owner Profit"],["c8","Source"],["c9","Status"]].map(([col, label]) => (
            <Text key={col} style={[pdfStyles.th, pdfStyles[col]]}>{label}</Text>
          ))}
        </View>
        {orders.map((o, i) => (
          <View key={o._id} style={[pdfStyles.trow, i % 2 === 1 && { backgroundColor: "#f9fafb" }]}>
            <Text style={[pdfStyles.td, pdfStyles.c1]}>{o.invoice}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c2]}>{(o.user_info?.name || "—").substring(0, 20)}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c3]}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c4]}>{o.paymentMethod}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c5]}>{fmt(o.total)}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c6]}>{fmt(o.totalProfit)}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c7]}>{fmt(o.ownerProfit)}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c8]}>{o.orderSource || "Online"}</Text>
            <Text style={[pdfStyles.td, pdfStyles.c9]}>{o.status}</Text>
          </View>
        ))}
        <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleString("en-IN")} — N23 Gujarati Basket</Text>
      </Page>
    </Document>
  );
};

// ── Main ──
const MonthlyReport = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["monthly-report", month, year],
    queryFn:  () => OrderServices.getMonthlyReport({ month, year }),
    enabled:  false,
  });

  const handleExcelDownload = () => {
    if (!data?.orders?.length) return notifyError("No data to export!");

    const s = data.summary;
    const summaryRows = [
      ["Report",                  `${MONTHS[month - 1]} ${year}`],
      ["Total Orders",            s.totalOrders],
      ["Total Sales (₹)",         parseFloat(s.totalSales   || 0).toFixed(2)],
      ["Total Profit (₹)",        parseFloat(s.totalProfit  || 0).toFixed(2)],
      ["Owner Profit (₹)",        parseFloat(s.ownerProfit  || 0).toFixed(2)],
      ["Referral Commission (₹)", parseFloat(s.referralCommission || 0).toFixed(2)],
      ["Total Discount (₹)",      parseFloat(s.totalDiscount || 0).toFixed(2)],
      ["Shipping Collected (₹)",  parseFloat(s.totalShipping || 0).toFixed(2)],
      ["Cash Orders",             s.cashOrders],
      ["Online Orders",           s.onlineOrders],
      ["POS Orders",              s.posOrders],
      ["Delivered",               s.deliveredOrders],
      ["Pending",                 s.pendingOrders],
      ["Cancelled",               s.cancelOrders],
    ];

    const orderRows = data.orders.map((o) => ({
      "Invoice":            o.invoice,
      "Customer":           o.user_info?.name || "—",
      "Email":              o.user_info?.email || "—",
      "Date":               new Date(o.createdAt).toLocaleDateString("en-IN"),
      "Payment Method":     o.paymentMethod,
      "Sub Total":          parseFloat(o.subTotal || 0).toFixed(2),
      "Discount":           parseFloat(o.discount || 0).toFixed(2),
      "Shipping":           parseFloat(o.shippingCost || 0).toFixed(2),
      "Total":              parseFloat(o.total || 0).toFixed(2),
      "Total Profit":       parseFloat(o.totalProfit || 0).toFixed(2),
      "Owner Profit":       parseFloat(o.ownerProfit || 0).toFixed(2),
      "Referral Commission":parseFloat(o.referralCommission || 0).toFixed(2),
      "Source":             o.orderSource || "Online",
      "Status":             o.status,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows),  "Orders");
    XLSX.writeFile(wb, `Monthly_Report_${MONTHS[month - 1]}_${year}.xlsx`);
  };

  const s = data?.summary;

  const summaryCards = s ? [
    { label: "Total Orders",        value: s.totalOrders,                                    color: "text-gray-700",    bg: "bg-gray-50" },
    { label: "Total Sales",         value: fmt(s.totalSales),                                color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Profit",        value: fmt(s.totalProfit),                               color: "text-blue-700",    bg: "bg-blue-50" },
    { label: "Owner Profit",        value: fmt(s.ownerProfit),                               color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Referral Commission", value: fmt(s.referralCommission),                        color: "text-purple-600",  bg: "bg-purple-50" },
    { label: "Discount Given",      value: fmt(s.totalDiscount),                             color: "text-orange-500",  bg: "bg-orange-50" },
    { label: "Delivered",           value: s.deliveredOrders,                                color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending",             value: s.pendingOrders,                                  color: "text-orange-500",  bg: "bg-orange-50" },
    { label: "Cancelled",           value: s.cancelOrders,                                   color: "text-red-500",     bg: "bg-red-50" },
    { label: "POS Orders",          value: s.posOrders,                                      color: "text-teal-600",    bg: "bg-teal-50" },
    { label: "Online Orders",       value: s.onlineOrders,                                   color: "text-blue-600",    bg: "bg-blue-50" },
    { label: "Cash Orders",         value: s.cashOrders,                                     color: "text-gray-600",    bg: "bg-gray-50" },
  ] : [];

  const statusBadge = (status) => {
    if (/delivered/i.test(status))    return "bg-emerald-100 text-emerald-700";
    if (/pending/i.test(status))      return "bg-orange-100 text-orange-700";
    if (/cancel/i.test(status))       return "bg-red-100 text-red-700";
    if (/pos-completed/i.test(status))return "bg-teal-100 text-teal-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <FiCalendar className="text-emerald-500" size={20} />
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 font-serif">Monthly Report</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white"
        >
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Generate Report"}
        </button>

        {data && (
          <>
            <button
              onClick={handleExcelDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <FiDownload size={14} /> Excel
            </button>

            <PDFDownloadLink
              document={<MonthlyReportPDF data={data} month={month} year={year} />}
              fileName={`Monthly_Report_${MONTHS[month - 1]}_${year}.pdf`}
            >
              {({ loading }) => (
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  <FiFileText size={14} /> {loading ? "Preparing..." : "PDF"}
                </button>
              )}
            </PDFDownloadLink>
          </>
        )}
      </div>

      {/* Summary Cards */}
      {data && s && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
            {summaryCards.map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} dark:bg-gray-700 rounded-lg p-3 border border-gray-100 dark:border-gray-600`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Profit breakdown note */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600 text-xs text-blue-700 dark:text-blue-300">
            <strong>Profit breakdown:</strong> Total Profit = product margin (selling price − cost).
            Owner Profit = 100% if no referrer, or 60% if customer was referred.
            Referral Commission = 40% paid to referrer's wallet.
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-300">
                  <th className="px-3 py-2 text-left">Invoice</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Payment</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Total Profit</th>
                  <th className="px-3 py-2 text-right">Owner Profit</th>
                  <th className="px-3 py-2 text-right">Referral</th>
                  <th className="px-3 py-2 text-center">Source</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">#{order.invoice}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{order.user_info?.name || "—"}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2 text-gray-500">{order.paymentMethod}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmt(order.total)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-600">{fmt(order.totalProfit)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{fmt(order.ownerProfit)}</td>
                    <td className="px-3 py-2 text-right text-purple-600">{fmt(order.referralCommission)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.orderSource === "POS" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                        {order.orderSource || "Online"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.orders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      No orders found for {MONTHS[month - 1]} {year}.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Footer totals row */}
              {data.orders.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 font-bold text-sm border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200" colSpan={4}>
                      Totals ({s.totalOrders} orders)
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600">{fmt(s.totalSales)}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{fmt(s.totalProfit)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{fmt(s.ownerProfit)}</td>
                    <td className="px-3 py-2 text-right text-purple-600">{fmt(s.referralCommission)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyReport;
