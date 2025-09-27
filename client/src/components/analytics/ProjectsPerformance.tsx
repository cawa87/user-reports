import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { GitBranch, Users, Code, Zap } from 'lucide-react';

interface ProjectsPerformanceProps {
  performance: {
    period: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
    projects: Array<{
      project: {
        id: number;
        name: string;
        namespace: string;
      };
      metrics: {
        commits: number;
        contributors: number;
        linesAdded: number;
        linesDeleted: number;
        filesChanged: number;
        velocity: number;
      };
    }>;
    summary: {
      totalProjects: number;
      totalCommits: number;
      totalContributors: number;
      avgVelocity: number;
    };
  };
  isLoading?: boolean;
}

const ProjectsPerformance: React.FC<ProjectsPerformanceProps> = ({
  performance,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="skeleton h-8 w-16 mb-2"></div>
                <div className="skeleton h-4 w-24"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-body">
            <div className="skeleton h-6 w-48 mb-4"></div>
            <div className="skeleton h-64 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
  
  // Prepare data for charts
  const topProjects = performance.projects.slice(0, 10);
  const chartData = topProjects.map((project, index) => ({
    name: project.project.name,
    fullName: `${project.project.namespace}/${project.project.name}`,
    commits: project.metrics.commits,
    contributors: project.metrics.contributors,
    velocity: project.metrics.velocity,
    linesAdded: project.metrics.linesAdded,
    linesDeleted: project.metrics.linesDeleted,
    filesChanged: project.metrics.filesChanged,
    color: colors[index % colors.length],
  }));

  const pieData = topProjects.map((project, index) => ({
    name: project.project.name,
    value: project.metrics.commits,
    color: colors[index % colors.length],
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {data.fullName}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Commits: {data.commits}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Contributors: {data.contributors}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Velocity: {data.velocity.toFixed(2)} commits/day
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Lines: +{data.linesAdded.toLocaleString()} -{data.linesDeleted.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const summary = [
    {
      title: 'Total Projects',
      value: performance.summary.totalProjects.toLocaleString(),
      subtitle: 'Active projects',
      icon: GitBranch,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Total Commits',
      value: performance.summary.totalCommits.toLocaleString(),
      subtitle: `${performance.period} period`,
      icon: Code,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Contributors',
      value: performance.summary.totalContributors.toLocaleString(),
      subtitle: 'Active developers',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Avg Velocity',
      value: `${performance.summary.avgVelocity.toFixed(1)}/day`,
      subtitle: 'Commits per day',
      icon: Zap,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summary.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`stat-card ${stat.bgColor} border-0`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.bgColor.replace(/\/20$/, '/40')}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {stat.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commits Bar Chart */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Projects by Commits
            </h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    type="number"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  />
                  <YAxis 
                    dataKey="name"
                    type="category"
                    width={100}
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="commits" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Commit Distribution Pie Chart */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Commit Distribution
            </h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Commits']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-4">
              {pieData.slice(0, 6).map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-16">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Projects Table */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Performance Details
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contributors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Code Changes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Velocity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {topProjects.map((project, index) => (
                  <tr key={project.project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {project.project.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {project.project.namespace}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {project.metrics.commits}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {project.metrics.contributors}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 dark:text-green-400">
                            +{project.metrics.linesAdded.toLocaleString()}
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            -{project.metrics.linesDeleted.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {project.metrics.filesChanged} files
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {project.metrics.velocity.toFixed(1)}/day
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPerformance;

