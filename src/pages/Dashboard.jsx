import {
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
  WindmillContext,
} from "@windmill/react-ui";
import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiRefreshCw, FiShoppingCart, FiTruck, FiUsers } from "react-icons/fi";
import { ImCreditCard, ImStack } from "react-icons/im";

//internal import
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import LineChart from "@/components/chart/LineChart/LineChart";
import PieChart from "@/components/chart/Pie/PieChart";
import CardItem from "@/components/dashboard/CardItem";
import CardItemTwo from "@/components/dashboard/CardItemTwo";
import ChartCard from "@/components/chart/ChartCard";
import OrderTable from "@/components/order/OrderTable";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import OrderServices from "@/services/OrderServices";
import CustomerServices from "@/services/CustomerServices";
import AnimatedContent from "@/components/common/AnimatedContent";
import MonthlyReport from "@/components/MonthlyReport";

const Dashboard = () => {
  const { t } = useTranslation();
  const { mode } = useContext(WindmillContext);

  const { currentPage, handleChangePage } = useContext(SidebarContext);

  // react hook
  const [todayOrderAmount, setTodayOrderAmount] = useState(0);
  const [yesterdayOrderAmount, setYesterdayOrderAmount] = useState(0);
  const [salesReport, setSalesReport] = useState([]);
  const [todayCashPayment, setTodayCashPayment] = useState(0);
  const [todayCardPayment, setTodayCardPayment] = useState(0);
  const [todayCreditPayment, setTodayCreditPayment] = useState(0);
  const [yesterdayCashPayment, setYesterdayCashPayment] = useState(0);
  const [yesterdayCardPayment, setYesterdayCardPayment] = useState(0);
  const [yesterdayCreditPayment, setYesterdayCreditPayment] = useState(0);

  const {
    data: bestSellerProductChart,
    loading: loadingBestSellerProduct,
    error,
  } = useAsync(OrderServices.getBestSellerProductChart);

  const { data: dashboardRecentOrder, loading: loadingRecentOrder } = useAsync(
    () => OrderServices.getDashboardRecentOrder({ page: currentPage, limit: 8 })
  );

  const { data: dashboardOrderCount, loading: loadingOrderCount } = useAsync(
    OrderServices.getDashboardCount
  );

  const { data: customersData, loading: loadingCustomers } = useAsync(() =>
    CustomerServices.getAllCustomers({ searchText: "" })
  );

  const { data: dashboardOrderAmount, loading: loadingOrderAmount } = useAsync(
    OrderServices.getDashboardAmount
  );

  // console.log("dashboardOrderCount", dashboardOrderCount);

  const { dataTable, serviceData } = useFilter(dashboardRecentOrder?.orders);

  useEffect(() => {
    if (!dashboardOrderAmount) return;

    const { todayOrders = [], yesterdayOrders = [], chartOrders = [] } = dashboardOrderAmount;

    // today total
    setTodayOrderAmount(todayOrders.reduce((sum, o) => sum + o.total, 0));

    // yesterday total
    setYesterdayOrderAmount(yesterdayOrders.reduce((sum, o) => sum + o.total, 0));

    // sales chart — last 30 days, no overlap
    const chartMap = {};
    const chartData = [];
    chartOrders.forEach((order) => {
      const date = order.updatedAt.split("T")[0];
      if (!chartMap[date]) {
        chartMap[date] = { date, total: 0, order: 0 };
        chartData.push(chartMap[date]);
      }
      chartMap[date].total += order.total;
      chartMap[date].order += 1;
    });
    setSalesReport(chartData);

    // today payment method breakdown
    const todayMethodMap = {};
    todayOrders.forEach(({ paymentMethod, total }) => {
      if (!todayMethodMap[paymentMethod]) todayMethodMap[paymentMethod] = 0;
      todayMethodMap[paymentMethod] += total;
    });
    setTodayCashPayment(todayMethodMap["Cash"] || 0);
    setTodayCardPayment(todayMethodMap["Card"] || 0);
    setTodayCreditPayment(todayMethodMap["Credit"] || 0);

    // yesterday payment method breakdown
    const yestMethodMap = {};
    yesterdayOrders.forEach(({ paymentMethod, total }) => {
      if (!yestMethodMap[paymentMethod]) yestMethodMap[paymentMethod] = 0;
      yestMethodMap[paymentMethod] += total;
    });
    setYesterdayCashPayment(yestMethodMap["Cash"] || 0);
    setYesterdayCardPayment(yestMethodMap["Card"] || 0);
    setYesterdayCreditPayment(yestMethodMap["Credit"] || 0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardOrderAmount]);

  return (
    <>
      <PageTitle>{t("DashboardOverview")}</PageTitle>

      <AnimatedContent>
        <div className="grid gap-2 mb-8 xl:grid-cols-5 md:grid-cols-2">
          <CardItemTwo
            mode={mode}
            title="Today Order"
            title2="TodayOrder"
            Icon={ImStack}
            cash={todayCashPayment || 0}
            card={todayCardPayment || 0}
            credit={todayCreditPayment || 0}
            price={todayOrderAmount || 0}
            className="text-white dark:text-emerald-100 bg-teal-600"
            loading={loadingOrderAmount}
          />

          <CardItemTwo
            mode={mode}
            title="Yesterday Order"
            title2="YesterdayOrder"
            Icon={ImStack}
            cash={yesterdayCashPayment || 0}
            card={yesterdayCardPayment || 0}
            credit={yesterdayCreditPayment || 0}
            price={yesterdayOrderAmount || 0}
            className="text-white dark:text-orange-100 bg-orange-400"
            loading={loadingOrderAmount}
          />

          <CardItemTwo
            mode={mode}
            title2="ThisMonth"
            Icon={FiShoppingCart}
            price={dashboardOrderAmount?.thisMonthlyOrderAmount || 0}
            className="text-white dark:text-emerald-100 bg-blue-500"
            loading={loadingOrderAmount}
          />

          <CardItemTwo
            mode={mode}
            title2="LastMonth"
            Icon={ImCreditCard}
            loading={loadingOrderAmount}
            price={dashboardOrderAmount?.lastMonthOrderAmount || 0}
            className="text-white dark:text-teal-100 bg-cyan-600"
          />

          <CardItemTwo
            mode={mode}
            title2="AllTimeSales"
            Icon={ImCreditCard}
            price={dashboardOrderAmount?.totalAmount || 0}
            className="text-white dark:text-emerald-100 bg-emerald-600"
            loading={loadingOrderAmount}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CardItem
            title="Total Order"
            Icon={FiShoppingCart}
            loading={loadingOrderCount}
            quantity={dashboardOrderCount?.totalOrder || 0}
            className="text-orange-600 dark:text-orange-100 bg-orange-100 dark:bg-orange-500"
          />
          <CardItem
            title="Total Customers"
            Icon={FiUsers}
            loading={loadingCustomers}
            quantity={customersData?.length || 0}
            className="text-purple-600 dark:text-purple-100 bg-purple-100 dark:bg-purple-500"
          />
          <CardItem
            title={t("OrderPending")}
            Icon={FiRefreshCw}
            loading={loadingOrderCount}
            quantity={dashboardOrderCount?.totalPendingOrder?.count || 0}
            amount={dashboardOrderCount?.totalPendingOrder?.total || 0}
            className="text-blue-600 dark:text-blue-100 bg-blue-100 dark:bg-blue-500"
          />
          <CardItem
            title={t("OrderProcessing")}
            Icon={FiTruck}
            loading={loadingOrderCount}
            quantity={dashboardOrderCount?.totalProcessingOrder || 0}
            className="text-teal-600 dark:text-teal-100 bg-teal-100 dark:bg-teal-500"
          />
          <CardItem
            title={t("OrderDelivered")}
            Icon={FiCheck}
            loading={loadingOrderCount}
            quantity={dashboardOrderCount?.totalDeliveredOrder || 0}
            className="text-emerald-600 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 my-8">
          <ChartCard
            mode={mode}
            loading={loadingOrderAmount}
            title={t("WeeklySales")}
          >
            <LineChart salesReport={salesReport} />
          </ChartCard>

          <ChartCard
            mode={mode}
            loading={loadingBestSellerProduct}
            title={t("BestSellingProducts")}
          >
            <PieChart data={bestSellerProductChart} />
          </ChartCard>
        </div>

        <div className="grid gap-4 md:grid-cols-2 my-8">
          <ChartCard
            mode={mode}
            loading={loadingOrderAmount}
            title="Monthly Profit Distribution (60/40)"
          >
            <PieChart
              data={{
                bestSellingProduct: [
                  {
                    _id: "Owner Profit (60%)",
                    count: dashboardOrderAmount?.thisMonthOwnerProfit || 0,
                  },
                  {
                    _id: "Referral Commission (40%)",
                    count: dashboardOrderAmount?.thisMonthReferralCommission || 0,
                  },
                ],
              }}
            />
          </ChartCard>

          <ChartCard
            mode={mode}
            loading={loadingOrderAmount}
            title="Profit Breakdown"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Owner Profit (60%)</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ₹{dashboardOrderAmount?.thisMonthOwnerProfit?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Referral Commission (40%)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{dashboardOrderAmount?.thisMonthReferralCommission?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg border-t-2 border-gray-300">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Total Monthly Profit</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹{((dashboardOrderAmount?.thisMonthOwnerProfit || 0) + (dashboardOrderAmount?.thisMonthReferralCommission || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </AnimatedContent>

      <MonthlyReport />

      <PageTitle>{t("RecentOrder")}</PageTitle>

      {/* <Loading loading={loading} /> */}

      {loadingRecentOrder ? (
        <TableLoading row={5} col={4} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>{t("InvoiceNo")}</TableCell>
                <TableCell>{t("TimeTbl")}</TableCell>
                <TableCell>{t("CustomerName")} </TableCell>
                <TableCell> {t("MethodTbl")} </TableCell>
                <TableCell> {t("AmountTbl")} </TableCell>
                <TableCell>{t("OderStatusTbl")}</TableCell>
                <TableCell>{t("ActionTbl")}</TableCell>
                <TableCell className="text-right">{t("InvoiceTbl")}</TableCell>
              </tr>
            </TableHeader>

            <OrderTable orders={dataTable} />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={dashboardRecentOrder?.totalOrder}
              resultsPerPage={8}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="Sorry, There are no orders right now." />
      )}
    </>
  );
};

export default Dashboard;
