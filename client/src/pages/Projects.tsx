import React, { useState } from 'react';
import { FolderOpen, RefreshCw, Grid, List, Filter } from 'lucide-react';
import { useProjects, useProjectFilters } from '@/hooks/useProjects';
import ProjectCard from '@/components/ui/ProjectCard';
import ProjectStats from '@/components/projects/ProjectStats';
import SyncButton from '@/components/ui/SyncButton';
import SearchInput from '@/components/ui/SearchInput';

const Projects: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useProjectFilters();
  const { projects, statistics, isLoading, error, refetch } = useProjects(filters);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load project data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            There was an error loading the project analytics.
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderOpen className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {statistics.totalProjects} project{statistics.totalProjects !== 1 ? 's' : ''} • 
              {statistics.activeProjects} active
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            Filters {showFilters ? '✕' : '☰'}
          </button>
          
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <SyncButton 
            showLabel={false}
            onSyncComplete={(success) => {
              if (success) {
                refetch();
              }
            }}
          />
        </div>
      </div>

      {/* Statistics Overview */}
      <ProjectStats statistics={statistics} isLoading={isLoading} />

      {/* Filters */}
      {showFilters && (
        <div className="animate-fadeIn">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Filters
                  </h3>
                </div>
                
                <button
                  onClick={resetFilters}
                  className="btn btn-ghost btn-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Projects
                  </label>
                  <SearchInput
                    value={filters.search}
                    onChange={(value) => updateFilter('search', value)}
                    placeholder="Search by name, namespace..."
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                    className="form-select"
                  >
                    <option value="lastActivity">Last Activity</option>
                    <option value="name">Name</option>
                    <option value="commits">Total Commits</option>
                    <option value="contributors">Contributors</option>
                    <option value="linesOfCode">Lines of Code</option>
                    <option value="createdAt">Created Date</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => updateFilter('sortOrder', e.target.value as any)}
                    className="form-select"
                  >
                    <option value="desc">Highest First</option>
                    <option value="asc">Lowest First</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFilter('isActive', value === 'all' ? undefined : value === 'true');
                    }}
                    className="form-select"
                  >
                    <option value="all">All Projects</option>
                    <option value="true">Active Only</option>
                    <option value="false">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filters.search || filters.isActive !== undefined
              ? 'Try adjusting your filters to see more projects.'
              : 'Start by syncing data from GitLab to see project analytics.'}
          </p>
          {(filters.search || filters.isActive !== undefined) && (
            <button
              onClick={resetFilters}
              className="btn btn-secondary mr-3"
            >
              Clear Filters
            </button>
          )}
          <SyncButton 
            showLabel={true}
            onSyncComplete={(success) => {
              if (success) {
                refetch();
              }
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {projects.length} project{projects.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  period={`${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  period={`${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Projects;
