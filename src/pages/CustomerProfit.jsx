import {
  Card,
  CardBody,
  Table,
  TableCell,
  TableContainer,
  TableHeader,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@windmill/react-ui";
import React, { useState } from "react";
import { FiEye, FiDownload, FiSend } from "react-icons/fi";
import * as XLSX from "xlsx";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import useAsync from "@/hooks/useAsync";
import CustomerServices from "@/services/CustomerServices";
import AnimatedContent from "@/components/common/AnimatedContent";
import { notifySuccess, notifyError } from "@/utils/toast";

const CustomerProfit = () => {
  const { data, loading } = useAsync(CustomerServices.getAllCustomers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [neftNumbers, setNeftNumbers] = useState({}); // { customerId: neftNumber }
  const [sending, setSending] = useState({}); // { customerId: true/false }

  const customersWithProfit = (data || []).filter(
    (c) => (c.walletBalance || 0) > 0
  );

  const handleViewBankDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const exportData = customersWithProfit.map((customer) => ({
      "Customer Name": customer.name,
      "Email": customer.email || "N/A",
      "Phone": customer.phone || "N/A",
      "Referral Profit (₹)": parseFloat(customer.walletBalance || 0).toFixed(2),
      "Account Holder Name": customer.bankDetails?.accountHolderName || "N/A",
      "Account Number": customer.bankDetails?.accountNumber || "N/A",
      "IFSC Code": customer.bankDetails?.ifscCode || "N/A",
      "Bank Name": customer.bankDetails?.bankName || "N/A",
      "Branch Name": customer.bankDetails?.branchName || "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Profit");
    XLSX.writeFile(wb, "customer_profit_report.xlsx");
    notifySuccess("Excel report downloaded successfully");
  };

  const handleSendNeft = async (customer) => {
    const neftNumber = neftNumbers[customer._id]?.trim();
    if (!neftNumber) return notifyError("Please enter NEFT / Transaction number!");
    if (!customer.email) return notifyError("This customer has no email address!");

    setSending((prev) => ({ ...prev, [customer._id]: true }));
    try {
      await CustomerServices.sendNeftNotification(
        customer._id,
        customer.walletBalance,
        neftNumber
      );
      notifySuccess(`NEFT notification sent to ${customer.name} and wallet reset!`);
      setNeftNumbers((prev) => ({ ...prev, [customer._id]: "" }));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to send notification");
    }
    setSending((prev) => ({ ...prev, [customer._id]: false }));
  };

  return (
    <>
      <PageTitle>Customer Profit</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing customers with pending referral balance
              </p>
              <Button onClick={handleExportExcel} className="flex items-center gap-2">
                <FiDownload /> Export Excel
              </Button>
            </div>

            {loading ? (
              <TableLoading row={8} col={6} width={190} height={20} />
            ) : customersWithProfit.length !== 0 ? (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Email / Phone</TableCell>
                      <TableCell>Referral Balance</TableCell>
                      <TableCell>Bank Details</TableCell>
                      <TableCell>NEFT / Txn Number</TableCell>
                      <TableCell>Send & Reset</TableCell>
                    </tr>
                  </TableHeader>
                  <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800 text-gray-700 dark:text-gray-400">
                    {customersWithProfit.map((customer) => (
                      <tr key={customer._id}>
                        <TableCell>
                          <span className="text-sm font-semibold">{customer.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500 block">{customer.email || "—"}</span>
                          <span className="text-xs text-gray-500 block">{customer.phone || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-emerald-600">
                            ₹{parseFloat(customer.walletBalance || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleViewBankDetails(customer)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <FiEye size={14} /> View
                          </button>
                        </TableCell>
                        <TableCell>
                          <input
                            type="text"
                            value={neftNumbers[customer._id] || ""}
                            onChange={(e) =>
                              setNeftNumbers((prev) => ({
                                ...prev,
                                [customer._id]: e.target.value,
                              }))
                            }
                            placeholder="Enter NEFT / UTR number"
                            className="w-48 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleSendNeft(customer)}
                            disabled={sending[customer._id] || !neftNumbers[customer._id]?.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md transition-colors"
                          >
                            <FiSend size={13} />
                            {sending[customer._id] ? "Sending..." : "Send & Reset"}
                          </button>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableContainer>
            ) : (
              <NotFound title="No customers with pending referral balance." />
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      {/* Bank Details Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>Bank Details — {selectedCustomer?.name}</ModalHeader>
        <ModalBody>
          {selectedCustomer?.bankDetails ? (
            <div className="space-y-3">
              {[
                ["Account Holder", selectedCustomer.bankDetails.accountHolderName],
                ["Account Number", selectedCustomer.bankDetails.accountNumber],
                ["IFSC Code", selectedCustomer.bankDetails.ifscCode],
                ["Bank Name", selectedCustomer.bankDetails.bankName],
                ["Branch Name", selectedCustomer.bankDetails.branchName],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                </div>
              ))}
              <div className="mt-4 p-3 bg-emerald-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500 uppercase">Amount to Transfer</p>
                <p className="text-xl font-bold text-emerald-600">
                  ₹{parseFloat(selectedCustomer?.walletBalance || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No bank details added by this customer.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsModalOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default CustomerProfit;
