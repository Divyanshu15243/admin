import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiDownload, FiFileText, FiCalendar } from "react-icons/fi";
import * as XLSX from "xlsx";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";

import OrderServices from "@/services/OrderServices";
import { notifyError } from "@/utils/toast";

// ── PDF styles ──
const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#6b7280", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 16, color: "#10b981" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  summaryCard: { width: "30%", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: 8 },
  summaryLabel: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#065f46" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: "6 4", borderBottom: "1px solid #e5e7eb" },
  tableRow: { flexDirection: "row", padding: "5 4", borderBottom: "1px solid #f3f4f6" },
  col1: { width: "8%" },
  col2: { width: "28%" },
  col3: { width: "14%" },
  col4: { width: "14%" },
  col5: { width: "14%" },
  col6: { width: "12%" },
  col7: { width: "10%" },
  th: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
  td: { fontSize: 9, color: "#374151" },
  footer: { marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 8, fontSize: 9, color: "#9ca3af", textAlign: "center" },
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── PDF Document ──
const MonthlyReportPDF = ({ data, month, year }) => {
  const { orders = [], summary = {} } = data;
  const monthName = MONTHS[month - 1];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page} orientation="landscape">
        <Text style={pdfStyles.title}>Monthly Sales Report</Text>
        <Text style={pdfStyles.subtitle}>{monthName} {year} — N23 Gujarati Basket</Text>

        {/* Summary */}
        <Text style={pdfStyles.sectionTitle}>Summary</Text>
        <View style={pdfStyles.summaryGrid}>
          {[
            ["Total Orders", summary.totalOrders],
            ["Total Sales", `₹${parseFloat(summary.totalSales||0).toFixed(2)}`],
            ["Total Discount", `₹${parseFloat(summary.totalDiscount||0).toFixed(2)}`],
            ["Shipping Collected", `₹${parseFloat(summary.totalShipping||0).toFixed(2)}`],
            ["Owner Profit", `₹${parseFloat(summary.ownerProfit||0).toFixed(2)}`],
            ["Referral Commission", `₹${parseFloat(summary.referralCommission||0).toFixed(2)}`],
            ["Cash Orders", summary.cashOrders],
            ["Online Orders", summary.onlineOrders],
            ["POS Orders", summary.posOrders],
            ["Delivered", summary.deliveredOrders],
            ["Pending", summary.pendingOrders],
          ].map(([label, value]) => (
            <View key={label} style={pdfStyles.summaryCard}>
              <Text style={pdfStyles.summaryLabel}>{label}</Text>
              <Text style={pdfStyles.summaryValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Orders Table */}
        <Text style={pdfStyles.sectionTitle}>Order Details</Text>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.th, pdfStyles.col1]}>#</Text>
          <Text style={[pdfStyles.th, pdfStyles.col2]}>Customer</Text>
          <Text style={[pdfStyles.th, pdfStyles.col3]}>Date</Text>
          <Text style={[pdfStyles.th, pdfStyles.col4]}>Payment</Text>
          <Text style={[pdfStyles.th, pdfStyles.col5]}>Total</Text>
          <Text style={[pdfStyles.th, pdfStyles.col6]}>Source</Text>
          <Text style={[pdfStyles.th, pdfStyles.col7]}>Status</Text>
        </View>
        {orders.map((order, i) => (
          <View key={order._id} style={[pdfStyles.tableRow, i % 2 === 1 && { backgroundColor: "#f9fafb" }]}>
            <Text style={[pdfStyles.td, pdfStyles.col1]}>{order.invoice}</Text>
            <Text style={[pdfStyles.td, pdfStyles.col2]}>{order.user_info?.name?.substring(0, 22) || "—"}</Text>
            <Text style={[pdfStyles.td, pdfStyles.col3]}>{new Date(order.createdAt).toLocaleDateString("en-IN")}</Text>
            <Text style={[pdfStyles.td, pdfStyles.col4]}>{order.paymentMethod}</Text>
            <Text style={[pdfStyles.td, pdfStyles.col5]}>₹{parseFloat(order.total||0).toFixed(2)}</Text>
            <Text style={[pdfStyles.td, pdfStyles.col6]}>{order.orderSource || "Online"}</Text>
            <Text style={[pdfStyles.td, pdfStyles.col7]}>{order.status}</Text>
          </View>
        ))}

        <Text style={pdfStyles.footer}>
          Generated on {new Date().toLocaleString("en-IN")} — N23 Gujarati Basket
        </Text>
      </Page>
    </Document>
  );
};

// ── Main Component ──
const MonthlyReport = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["monthly-report", month, year],
    queryFn: () => OrderServices.getMonthlyReport({ month, year }),
    enabled: false,
  });

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const handleGenerate = () => refetch();

  const handleExcelDownload = () => {
    if (!data?.orders?.length) return notifyError("No data to export!");
    const rows = data.orders.map((o) => ({
      "Invoice": o.invoice,
      "Customer": o.user_info?.name || "—",
      "Email": o.user_info?.email || "—",
      "Date": new Date(o.createdAt).toLocaleDateString("en-IN"),
      "Payment Method": o.paymentMethod,
      "Sub Total": parseFloat(o.subTotal || 0).toFixed(2),
      "Discount": parseFloat(o.discount || 0).toFixed(2),
      "Shipping": parseFloat(o.shippingCost || 0).toFixed(2),
      "Total": parseFloat(o.total || 0).toFixed(2),
      "Owner Profit": parseFloat(o.ownerProfit || 0).toFixed(2),
      "Referral Commission": parseFloat(o.referralCommission || 0).toFixed(2),
      "Source": o.orderSource || "Online",
      "Status": o.status,
    }));

    // summary sheet
    const s = data.summary;
    const summaryRows = [
      ["Report", `${MONTHS[month-1]} ${year}`],
      ["Total Orders", s.totalOrders],
      ["Total Sales (₹)", parseFloat(s.totalSales||0).toFixed(2)],
      ["Total Discount (₹)", parseFloat(s.totalDiscount||0).toFixed(2)],
      ["Shipping Collected (₹)", parseFloat(s.totalShipping||0).toFixed(2)],
      ["Owner Profit (₹)", parseFloat(s.ownerProfit||0).toFixed(2)],
      ["Referral Commission (₹)", parseFloat(s.referralCommission||0).toFixed(2)],
      ["Cash Orders", s.cashOrders],
      ["Online Orders", s.onlineOrders],
      ["POS Orders", s.posOrders],
      ["Delivered", s.deliveredOrders],
      ["Pending", s.pendingOrders],
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Orders");
    XLSX.writeFile(wb, `Monthly_Report_${MONTHS[month-1]}_${year}.xlsx`);
  };

  const s = data?.summary;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-8">
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
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button
          onClick={handleGenerate}
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
              fileName={`Monthly_Report_${MONTHS[month-1]}_${year}.pdf`}
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
            {[
              { label: "Total Orders", value: s.totalOrders, color: "text-gray-700" },
              { label: "Total Sales", value: `₹${parseFloat(s.totalSales||0).toFixed(2)}`, color: "text-emerald-600" },
              { label: "Owner Profit", value: `₹${parseFloat(s.ownerProfit||0).toFixed(2)}`, color: "text-blue-600" },
              { label: "Referral Paid", value: `₹${parseFloat(s.referralCommission||0).toFixed(2)}`, color: "text-purple-600" },
              { label: "Discount Given", value: `₹${parseFloat(s.totalDiscount||0).toFixed(2)}`, color: "text-orange-500" },
              { label: "POS Orders", value: s.posOrders, color: "text-teal-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-100 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
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
                  <th className="px-3 py-2 text-right">Profit</th>
                  <th className="px-3 py-2 text-center">Source</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">#{order.invoice}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{order.user_info?.name || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2 text-gray-500">{order.paymentMethod}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">₹{parseFloat(order.total||0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-blue-600">₹{parseFloat(order.ownerProfit||0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.orderSource === "POS" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                        {order.orderSource || "Online"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        /delivered/i.test(order.status) ? "bg-emerald-100 text-emerald-700" :
                        /pending/i.test(order.status) ? "bg-orange-100 text-orange-700" :
                        /cancel/i.test(order.status) ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.orders.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No orders found for this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyReport;
