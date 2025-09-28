import React from 'react';

const KPICard = ({ kpi }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</p>
          <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {kpi.change}
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${getColorClasses(kpi.color)}`}>
          <span className="text-2xl">{kpi.icon}</span>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
