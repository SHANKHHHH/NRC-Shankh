import React, { useState, useMemo } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  MagnifyingGlassIcon,
  // FunnelIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface CompletedJob {
  id: number;
  nrcJobNo: string;
  jobPlanId: number;
  jobDemand: string;
  jobDetails: {
    id: number;
    customerName: string;
    preRate: number;
    latestRate: number;
    [key: string]: any;
  };
  purchaseOrderDetails: {
    id: number;
    customer: string;
    unit: string;
    [key: string]: any;
  };
  allSteps: Array<{
    id: number;
    stepName: string;
    machineDetails: Array<{
      unit: string | null;
      machineId: string;
      machineCode: string | null;
      machineType: string;
    }>;
    dispatchProcess?: {
      id: number;
      quantity: number;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  completedAt: string;
  completedBy: string;
  [key: string]: any;
}

interface CompletedJobsTableProps {
  data: CompletedJob[];
  className?: string;
}

interface TableRow {
  date: string;
  nrcJobNo: string;
  customerName: string;
  unit: string;
  preRate: number;
  latestRate: number;
  dispatchQuantity: number;
  deliveryDate: string; 
  totalValue: number;
  originalJob: CompletedJob;
}

interface AggregationData {
  dailyRevenue: { [date: string]: number };
  unitRevenue: { [unit: string]: number };
  customerRevenue: { [customer: string]: number };
  totalRevenue: number;
  totalJobs: number;
}

const CompletedJobsTable: React.FC<CompletedJobsTableProps> = ({ 
  data, 
  className = '' 
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableRow;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  const [filters, setFilters] = useState({
    date: '',
    customer: '',
    unit: ''
  });

  // const [showAggregations, setShowAggregations] = useState(true);
  // const [selectedUnit, setSelectedUnit] = useState<string>("MK");


  // Process and transform the data
  const processedData = useMemo((): TableRow[] => {
    return data.map(job => {
      // Extract unit from DispatchProcess step if available, otherwise from other steps
      let unit = 'N/A';
      const dispatchStep = job.allSteps.find(step => step.stepName === 'DispatchProcess');
      
      if (dispatchStep?.machineDetails?.[0]?.unit) {
        unit = dispatchStep.machineDetails[0].unit;
      } else {
        // Find unit from other steps
        for (const step of job.allSteps) {
          if (step.machineDetails?.[0]?.unit) {
            unit = step.machineDetails[0].unit;
            break;
          }
        }
      }

      // Extract dispatch quantity
      const dispatchQuantity = dispatchStep?.dispatchProcess?.totalDispatchedQty || 0;

      // Calculate total value
      const totalValue = dispatchQuantity * (job.jobDetails?.latestRate || 0);
       const deliveryDate = job.purchaseOrderDetails?.deliveryDate
      ? new Date(job.purchaseOrderDetails.deliveryDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : 'N/A';


      return {
        date: new Date(job.completedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        nrcJobNo: job.nrcJobNo,
        customerName: job.jobDetails?.customerName || job.purchaseOrderDetails?.customer || 'N/A',
        unit: unit,
        preRate: job.jobDetails?.preRate || 0,
        latestRate: job.jobDetails?.latestRate || 0,
        dispatchQuantity,
        totalValue,
        deliveryDate, 
        originalJob: job
      };
    });
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return processedData.filter(row => {
      const matchesDate = !filters.date || row.date.includes(filters.date);
      const matchesCustomer = !filters.customer || 
        row.customerName.toLowerCase().includes(filters.customer.toLowerCase());
      const matchesUnit = !filters.unit || 
        row.unit.toLowerCase().includes(filters.unit.toLowerCase());
      
      return matchesDate && matchesCustomer && matchesUnit;
    });
  }, [processedData, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredData, sortConfig]);

  // Calculate aggregations
  const aggregations = useMemo((): AggregationData => {
    const dailyRevenue: { [date: string]: number } = {};
    const unitRevenue: { [unit: string]: number } = {};
    const customerRevenue: { [customer: string]: number } = {};
    let totalRevenue = 0;
    let totalJobs = sortedData.length;

    sortedData.forEach(row => {
      // Daily revenue
      dailyRevenue[row.date] = (dailyRevenue[row.date] || 0) + row.totalValue;
      
      // Unit revenue
      unitRevenue[row.unit] = (unitRevenue[row.unit] || 0) + row.totalValue;
      
      // Customer revenue
      customerRevenue[row.customerName] = (customerRevenue[row.customerName] || 0) + row.totalValue;
      
      totalRevenue += row.totalValue;
    });

    return {
      dailyRevenue,
      unitRevenue,
      customerRevenue,
      totalRevenue,
      totalJobs
    };
  }, [sortedData]);

  // Handle sorting
  const handleSort = (key: keyof TableRow) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // Get sort indicator
  const getSortIndicator = (key: keyof TableRow) => {
    if (sortConfig?.key !== key) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-blue-600" />
      : <ChevronDownIcon className="h-4 w-4 text-blue-600" />;
  };

  // Format currency
  const formatCurrency = (amount: number, fractionDigits = 2) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(amount);
  };

console.log("sorted data", sortedData)

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-[#00AEEF] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CurrencyRupeeIcon className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Completed Jobs Summary</h2>
              <p className="text-blue-100">Daily Production & Revenue Tracking</p>
            </div>
          </div>
          {/* <button
            onClick={() => setShowAggregations(!showAggregations)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <FunnelIcon className="h-4 w-4" />
            <span>{showAggregations ? 'Hide' : 'Show'} Analytics</span>
          </button> */}
        </div>
      </div>

      {/* Aggregations Section */}
      {/* {showAggregations && (
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <CurrencyRupeeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(aggregations.totalRevenue)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Total Job Cards</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{aggregations.totalJobs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Active Units</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(aggregations.unitRevenue).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Active Days</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {Object.keys(aggregations.dailyRevenue).length}
              </p>
            </div>
          </div> */}

          

          {/* Top Performers */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> */}
            {/* <div className="bg-white p-4 rounded-lg border border-gray-200">
  <div className="flex items-center justify-between mb-2">
    <h4 className="font-semibold text-gray-800">Top Revenue Unit</h4>
    
   
    <select
      value={selectedUnit}
      onChange={(e) => setSelectedUnit(e.target.value)}
      className="text-sm border border-gray-300 rounded-md px-2 py-1"
    >
      
      <option value="MK">MK</option>
      <option value="NR1">NR1</option>
      <option value="NR2">NR2</option>
      <option value="DG">DG</option>
      <option value="NR">NR</option>
    </select>
  </div> */}

  {/* {(() => {
    // If filter applied, show only that unit
    let unitEntries = Object.entries(aggregations.unitRevenue);

    if (selectedUnit !== "All") {
      unitEntries = unitEntries.filter(([unit]) => unit === selectedUnit);
    }

    const topUnit = unitEntries.sort(([,a], [,b]) => b - a)[0];

    return topUnit ? (
      <div>
        <p className="text-lg font-bold text-blue-600">{topUnit[0]}</p>
        <p className="text-sm text-gray-600">{formatCurrency(topUnit[1])}</p>
      </div>
    ) : (
      <p className="text-gray-500">No data</p>
    );
  })()}
</div> */}

            {/* <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Top Customer</h4>
              {(() => {
                const topCustomer = Object.entries(aggregations.customerRevenue)
                  .sort(([,a], [,b]) => b - a)[0];
                return topCustomer ? (
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      {topCustomer[0].length > 20 ? topCustomer[0].substring(0, 20) + '...' : topCustomer[0]}
                    </p>
                    <p className="text-sm text-gray-600">{formatCurrency(topCustomer[1])}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data</p>
                );
              })()}
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 ">
              <h4 className="font-semibold text-gray-800 mb-2">Best Day</h4>
              {(() => {
                const bestDay = Object.entries(aggregations.dailyRevenue)
                  .sort(([,a], [,b]) => b - a)[0];
                return bestDay ? (
                  <div>
                    <p className="text-lg font-bold text-purple-600">{bestDay[0]}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(bestDay[1])}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data</p>
                );
              })()}
            </div>
          </div>
        </div>
      )} */}

      {/* Filters */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <CalendarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by date..."
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <UserIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by customer..."
              value={filters.customer}
              onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <BuildingOfficeIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by unit..."
              value={filters.unit}
              onChange={(e) => setFilters(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {[
                { key: 'date', label: 'Date' },
                // { key: 'nrcJobNo', label: 'NRC Job No' },
                { key: 'customerName', label: 'Customer Name' },
                { key: 'unit', label: 'Unit' },
                // { key: 'preRate', label: 'Pre Rate' },
                // { key: 'latestRate', label: 'Latest Rate' },
                { key: 'dispatchDate', label: 'Dispatch Date' },
                { key: 'dispatchQuantity', label: 'Dispatch Qty' },
                { key: 'totalValue', label: 'Total Value' }
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof TableRow)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {getSortIndicator(key as keyof TableRow)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center space-y-2">
                    <MagnifyingGlassIcon className="h-8 w-8 text-gray-300" />
                    <p>No completed jobs found</p>
                    {Object.values(filters).some(f => f) && (
                      <p className="text-sm">Try adjusting your filters</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr 
                  key={`${row.nrcJobNo}-${index}`}
                  className={`hover:bg-gray-50 transition-colors ${
                    row.totalValue > 10000 ? 'bg-green-50' : 
                    row.totalValue > 5000 ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.date}
                  </td>
                  {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {row.nrcJobNo}
                  </td> */}
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={row.customerName}>
                    {row.customerName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {row.unit}
                    </span>
                  </td>
                  {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.preRate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.latestRate)}
                  </td> */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 items-center">
                    {row.deliveryDate}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 ">
                    {row.dispatchQuantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap ">
                    <span className={`text-sm font-bold ${
                      row.totalValue > 10000 ? 'text-green-600' : 
                      row.totalValue > 5000 ? 'text-yellow-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(row.totalValue)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {sortedData.length} of {processedData.length} completed jobs</span>
          <span>Total Revenue: {formatCurrency(aggregations.totalRevenue)}</span>
        </div>
      </div>
    </div>
  );
};

export default CompletedJobsTable; 