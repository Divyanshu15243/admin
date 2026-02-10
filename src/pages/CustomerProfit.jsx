import {
  Card,
  CardBody,
  Table,
  TableCell,
  TableContainer,
  TableHeader,
  Select,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@windmill/react-ui";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEye, FiDownload } from "react-icons/fi";
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
  const [paymentStatus, setPaymentStatus] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { t } = useTranslation();

  const handleViewBankDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const exportData = customersWithProfit.map((customer) => ({
      "Customer ID": customer._id,
      "Customer Name": customer.name,
      "Profit (₹)": customer.walletBalance?.toFixed(2) || "0.00",
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

  const handleStatusChange = async (customerId, status) => {
    try {
      if (status === "paid") {
        const customer = customersWithProfit.find(c => c._id === customerId);
        await CustomerServices.updateCustomer(customerId, { walletBalance: 0 });
        await CustomerServices.sendPaymentNotification(customerId, customer.walletBalance);
        setPaymentStatus((prev) => ({ ...prev, [customerId]: status }));
        notifySuccess("Payment marked as paid, wallet reset, and notification sent to customer");
        window.location.reload();
      } else {
        setPaymentStatus((prev) => ({ ...prev, [customerId]: status }));
        notifySuccess(`Payment status updated to ${status}`);
      }
    } catch (error) {
      notifyError("Failed to update payment status");
    }
  };

  const customersWithProfit = data || [];

  return (
    <>
      <PageTitle>Customer Profit</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody>
            <div className="flex justify-end mb-4">
              <Button onClick={handleExportExcel} className="flex items-center gap-2">
                <FiDownload />
                Export Excel Report
              </Button>
            </div>
            {loading ? (
              <TableLoading row={12} col={5} width={190} height={20} />
            ) : customersWithProfit.length !== 0 ? (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>Customer ID</TableCell>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Total Profit</TableCell>
                      <TableCell>Bank Details</TableCell>
                      <TableCell>Action</TableCell>
                    </tr>
                  </TableHeader>
                  <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800 text-gray-700 dark:text-gray-400">
                    {customersWithProfit.map((customer) => (
                      <tr key={customer._id}>
                        <TableCell>
                          <span className="text-sm">{customer._id}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold">{customer.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-green-600">
                            ₹{customer.walletBalance?.toFixed(2) || "0.00"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleViewBankDetails(customer)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <FiEye /> View
                          </button>
                        </TableCell>
                        <TableCell>
                          <Select
                            className="border h-10 text-sm focus:outline-none block w-full bg-gray-100 dark:bg-white border-transparent focus:bg-white"
                            value={paymentStatus[customer._id] || "unpaid"}
                            onChange={(e) => handleStatusChange(customer._id, e.target.value)}
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                          </Select>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableContainer>
            ) : (
              <NotFound title="No customers with profit found." />
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>Bank Details - {selectedCustomer?.name}</ModalHeader>
        <ModalBody>
          {selectedCustomer?.bankDetails ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-600">Account Holder Name</p>
                <p className="text-base">{selectedCustomer.bankDetails.accountHolderName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Account Number</p>
                <p className="text-base">{selectedCustomer.bankDetails.accountNumber}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">IFSC Code</p>
                <p className="text-base">{selectedCustomer.bankDetails.ifscCode}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Bank Name</p>
                <p className="text-base">{selectedCustomer.bankDetails.bankName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Branch Name</p>
                <p className="text-base">{selectedCustomer.bankDetails.branchName}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No bank details available</p>
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
