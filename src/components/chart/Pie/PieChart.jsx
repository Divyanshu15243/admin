import "chart.js/auto";
import { Pie } from "react-chartjs-2";

// draws each slice's value (and share %) inside the slice
const sliceValuePlugin = {
  id: "sliceValues",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!dataset || !meta) return;

    const total = dataset.data.reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (!total) return;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc, i) => {
      const value = Number(dataset.data[i]) || 0;
      if (!value || arc.hidden) return;
      const share = (value / total) * 100;
      // skip very thin slices, the text would overflow
      if (share < 4) return;

      const { x, y } = arc.tooltipPosition();
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(value, x, y - 8);
      ctx.font = "12px sans-serif";
      ctx.fillText(`${share.toFixed(1)}%`, x, y + 8);
    });

    ctx.restore();
  },
};

const PieChart = ({ data }) => {
  const PieOption = {
    data: {
      datasets: [
        {
          data: data?.bestSellingProduct?.map((selling) => selling.count),
          backgroundColor: ["#10B981", "#3B82F6", "#F97316", "#0EA5E9"],
          label: "Sold",
        },
      ],
      labels: data?.bestSellingProduct?.map((selling) =>
        typeof selling._id === "object" ? (selling._id?.en || Object.values(selling._id)[0] || "Unknown") : selling._id
      ),
    },
    options: {
      responsive: true,
      cutoutPercentage: 80,
    },
    plugins: [sliceValuePlugin],
  };

  return (
    <div>
      <Pie {...PieOption} className="chart" />
    </div>
  );
};

export default PieChart;
