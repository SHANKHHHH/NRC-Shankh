import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Decimation,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Decimation
);

interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

interface PieChartComponentProps {
  data: PieChartData[];
  title: string;
  height?: number;
  showLegend?: boolean;
  colors?: string[];
  className?: string;
  maxDataPoints?: number;
  showPercentage?: boolean;
  showValues?: boolean;
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({
  data,
  title,
  height = 300,
  showLegend = true,
  colors = ['#00AEEF', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'],
  className = '',
  maxDataPoints = 20,
  showPercentage = true,
  showValues = true
}) => {
  // Optimize data for large datasets
  const optimizedData = useMemo(() => {
    if (data.length <= maxDataPoints) return data;
    
    // For pie charts, we'll group small values into "Others" category
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const mainData = sortedData.slice(0, maxDataPoints - 1);
    const otherData = sortedData.slice(maxDataPoints - 1);
    
    if (otherData.length > 0) {
      const otherSum = otherData.reduce((sum, item) => sum + item.value, 0);
      return [
        ...mainData,
        { name: 'Others', value: otherSum, color: '#9CA3AF' }
      ];
    }
    
    return mainData;
  }, [data, maxDataPoints]);

  const chartData = useMemo(() => ({
    labels: optimizedData.map(item => item.name),
    datasets: [
      {
        data: optimizedData.map(item => item.value),
        backgroundColor: optimizedData.map((item, index) => item.color || colors[index % colors.length]),
        borderColor: optimizedData.map((item, index) => item.color || colors[index % colors.length]),
        borderWidth: 2,
        hoverOffset: 8,
        borderRadius: 4,
        // Performance optimizations
        cutout: '40%', // Create a donut chart for better visual appeal
      },
    ],
  }), [optimizedData, colors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 11,
            weight: '500'
          },
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets[0];
            const labels = chart.data.labels;
            return labels.map((label: string, index: number) => {
              const value = datasets.data[index] as number;
              const total = datasets.data.reduce(
                (a: number, b: number) => a + (b as number),
                0
              );
              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

              return {
                text: `${label} (${percentage}%)`,
                fillStyle: datasets.backgroundColor[index],
                strokeStyle: datasets.borderColor[index],
                lineWidth: 2,
                pointStyle: 'circle',
                hidden: false,
                index: index,
              };
            });
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (tooltipItems: any[]) => {
            return tooltipItems[0].label;
          },
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed as number;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + (b as number),
              0
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

            const result: string[] = [];
            if (showValues) result.push(`Value: ${value.toLocaleString()}`);
            if (showPercentage) result.push(`Percentage: ${percentage}%`);

            return result;
          }
        }
      },
      decimation: {
        enabled: true,
        algorithm: 'min-max' as const,
        samples: 50,
      },
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: '#fff',
      },
    },
    animation: {
      duration: optimizedData.length > 50 ? 0 : 1000, // Disable animation for large datasets
    },
    responsiveAnimationDuration: 0,
  }), [showLegend, showValues, showPercentage, optimizedData.length]);

  const totalValue = useMemo(() => 
    optimizedData.reduce((sum, item) => sum + item.value, 0), 
    [optimizedData]
  );

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        {data.length > maxDataPoints && (
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Showing top {maxDataPoints - 1} + Others ({optimizedData.length} of {data.length})
          </div>
        )}
      </div>
      
      {/* Total Value Display */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-gray-800">
          {totalValue.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">Total</div>
      </div>
      
      <div style={{ height: height }} className="relative">
        <Pie data={chartData} options={options} />
        {optimizedData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div>No data available</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Data Summary */}
      {optimizedData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {optimizedData.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color || colors[index % colors.length] }}
                />
                <span className="text-gray-600">{item.name}:</span>
                <span className="font-medium">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PieChartComponent; 