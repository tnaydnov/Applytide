import { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Select, Modal, Textarea } from '../components/ui';
import { useToast } from '../lib/toast';
import api from '../lib/api';

const SEARCH_SCOPES = [
  { value: 'all', label: '🔍 All', description: 'Search across all content' },
  { value: 'jobs', label: '💼 Jobs', description: 'Search job listings' },
  { value: 'applications', label: '📝 Applications', description: 'Search your applications' },
  { value: 'companies', label: '🏢 Companies', description: 'Search companies' },
  { value: 'interviews', label: '🎤 Interviews', description: 'Search interviews' }
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'salary_desc', label: 'Highest Salary' },
  { value: 'salary_asc', label: 'Lowest Salary' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'company_asc', label: 'Company A-Z' }
];

export default function AdvancedSearchPage() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [sort, setSort] = useState('relevance');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState({
    location: '',
    remote_type: '',
    company: '',
    application_status: [],
    salary_min: '',
    salary_max: '',
    date_start: '',
    date_end: '',
    has_salary_info: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [aggregations, setAggregations] = useState({});
  const [queryTime, setQueryTime] = useState(0);
  
  const searchInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    loadFilterOptions();
    loadSavedSearches();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2 && showSuggestions) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  async function loadFilterOptions() {
    try {
      const options = await api.getFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  }

  async function loadSavedSearches() {
    try {
      const searches = await api.getSavedSearches();
      setSavedSearches(searches);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  }

  async function fetchSuggestions() {
    try {
      const suggestions = await api.getSearchSuggestions(query);
      setSuggestions(suggestions);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    }
  }

  async function performSearch(page = 1) {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const searchRequest = {
        query: query.trim(),
        scope,
        sort,
        page,
        page_size: pagination.page_size,
        filters: buildFiltersObject()
      };

      const response = await api.advancedSearch(searchRequest);
      
      setResults(response.results || []);
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
        has_next: response.has_next,
        has_prev: response.has_prev
      });
      setAggregations(response.aggregations || {});
      setQueryTime(response.query_time_ms || 0);

      // Scroll to results
      if (page === 1) {
        document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' });
      }

    } catch (err) {
      toast.error(`Search failed: ${err.message || err}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function buildFiltersObject() {
    const filterObj = {};
    
    if (filters.location) filterObj.location = filters.location;
    if (filters.remote_type) filterObj.remote_type = filters.remote_type;
    if (filters.company) filterObj.company = filters.company;
    if (filters.application_status.length > 0) filterObj.application_status = filters.application_status;
    if (filters.has_salary_info !== null) filterObj.has_salary_info = filters.has_salary_info;
    
    if (filters.salary_min || filters.salary_max) {
      filterObj.salary_range = {};
      if (filters.salary_min) filterObj.salary_range.min = parseInt(filters.salary_min);
      if (filters.salary_max) filterObj.salary_range.max = parseInt(filters.salary_max);
    }
    
    if (filters.date_start || filters.date_end) {
      filterObj.date_range = {};
      if (filters.date_start) filterObj.date_range.start = filters.date_start;
      if (filters.date_end) filterObj.date_range.end = filters.date_end;
    }

    return Object.keys(filterObj).length > 0 ? filterObj : null;
  }

  async function saveCurrentSearch() {
    if (!saveSearchName.trim()) {
      toast.error('Please enter a name for the saved search');
      return;
    }

    try {
      const savedSearch = {
        name: saveSearchName.trim(),
        query,
        scope,
        filters: buildFiltersObject(),
        sort,
        alert_enabled: false,
        alert_frequency: 'daily'
      };

      await api.saveSearch(savedSearch);
      toast.success('Search saved successfully!');
      setShowSaveModal(false);
      setSaveSearchName('');
      loadSavedSearches();
    } catch (err) {
      toast.error(`Failed to save search: ${err.message || err}`);
    }
  }

  function clearAllFilters() {
    setFilters({
      location: '',
      remote_type: '',
      company: '',
      application_status: [],
      salary_min: '',
      salary_max: '',
      date_start: '',
      date_end: '',
      has_salary_info: null
    });
    setQuery('');
    setResults([]);
    setAggregations({});
  }

  function handleSuggestionClick(suggestion) {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  }

  function getResultIcon(type) {
    const icons = {
      job: '💼',
      application: '📝',
      company: '🏢',
      interview: '🎤'
    };
    return icons[type] || '📄';
  }

  function formatResultMetadata(result) {
    const meta = result.metadata;
    const items = [];

    if (meta.company_name) items.push(`🏢 ${meta.company_name}`);
    if (meta.location) items.push(`📍 ${meta.location}`);
    if (meta.remote_type) items.push(`🌐 ${meta.remote_type}`);
    if (meta.status) items.push(`📊 ${meta.status}`);
    if (meta.salary_min && meta.salary_max) {
      items.push(`💰 $${meta.salary_min.toLocaleString()} - $${meta.salary_max.toLocaleString()}`);
    }

    return items;
  }

  const activeFiltersCount = Object.values(filters).filter(value => 
    value && (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Advanced Search</h1>
        <p className="text-gray-600">Search across all your job search data with powerful filters</p>
      </div>

      {/* Search Interface */}
      <Card className="p-6">
        {/* Search Bar */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              ref={searchInputRef}
              placeholder="Search jobs, applications, companies, and more..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={e => e.key === 'Enter' && performSearch(1)}
              className="text-lg py-3"
              icon={<span className="text-xl">🔍</span>}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                    onMouseDown={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="text-lg">{suggestion.type === 'job_title' ? '💼' : '🏢'}</span>
                    <div>
                      <div className="font-medium text-gray-900">{suggestion.text}</div>
                      <div className="text-sm text-gray-500">
                        {suggestion.type === 'job_title' ? 'Job Title' : 'Company'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Scope Selection */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Search in:</span>
              <div className="flex space-x-1">
                {SEARCH_SCOPES.map(scopeOption => (
                  <button
                    key={scopeOption.value}
                    onClick={() => setScope(scopeOption.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      scope === scopeOption.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={scopeOption.description}
                  >
                    {scopeOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Selection */}
            <Select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="min-w-[140px]"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={activeFiltersCount > 0 ? 'border-blue-500 text-blue-600' : ''}
            >
              <span className="mr-2">🔧</span>
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Search Button */}
            <Button
              onClick={() => performSearch(1)}
              loading={loading}
              disabled={!query.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <span className="mr-2">🚀</span>
              Search
            </Button>

            {/* Save Search */}
            {query && (
              <Button
                variant="outline"
                onClick={() => setShowSaveModal(true)}
              >
                <span className="mr-2">💾</span>
                Save Search
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <Input
                  placeholder="e.g., Remote, San Francisco, NYC"
                  value={filters.location}
                  onChange={e => setFilters({...filters, location: e.target.value})}
                />
              </div>

              {/* Remote Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                <Select
                  value={filters.remote_type}
                  onChange={e => setFilters({...filters, remote_type: e.target.value})}
                >
                  <option value="">All Types</option>
                  {filterOptions.remote_types?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>

              {/* Company Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <Input
                  placeholder="Company name"
                  value={filters.company}
                  onChange={e => setFilters({...filters, company: e.target.value})}
                />
              </div>

              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={filters.salary_min}
                  onChange={e => setFilters({...filters, salary_min: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                <Input
                  type="number"
                  placeholder="150000"
                  value={filters.salary_max}
                  onChange={e => setFilters({...filters, salary_max: e.target.value})}
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <Input
                  type="date"
                  value={filters.date_start}
                  onChange={e => setFilters({...filters, date_start: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <Input
                  type="date"
                  value={filters.date_end}
                  onChange={e => setFilters({...filters, date_end: e.target.value})}
                />
              </div>

              {/* Has Salary Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Info</label>
                <Select
                  value={filters.has_salary_info === null ? '' : filters.has_salary_info.toString()}
                  onChange={e => setFilters({...filters, has_salary_info: e.target.value === '' ? null : e.target.value === 'true'})}
                >
                  <option value="">Any</option>
                  <option value="true">Has Salary Info</option>
                  <option value="false">No Salary Info</option>
                </Select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Search Results */}
      {(results.length > 0 || loading) && (
        <div id="search-results">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Search Results</h2>
              <p className="text-gray-600">
                {loading ? 'Searching...' : `${pagination.total.toLocaleString()} results found in ${queryTime}ms`}
              </p>
            </div>
            {aggregations.top_companies && (
              <div className="text-sm text-gray-500">
                Top companies: {aggregations.top_companies.slice(0, 3).map(c => c.name).join(', ')}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="space-y-4 mt-4">
            {loading ? (
              // Loading skeletons
              [...Array(5)].map((_, index) => (
                <Card key={index} className="animate-pulse p-6">
                  <div className="flex space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              results.map((result, index) => (
                <Card key={`${result.type}-${result.id}`} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex space-x-4">
                    {/* Result Icon */}
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-xl">
                      {getResultIcon(result.type)}
                    </div>

                    {/* Result Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {result.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <span className="bg-gray-100 px-2 py-1 rounded-full capitalize">
                              {result.type}
                            </span>
                            {formatResultMetadata(result).map((item, i) => (
                              <span key={i}>{item}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Relevance</div>
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(result.score * 10) / 10}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {result.description && (
                        <p className="text-gray-700 mb-3">{result.description}</p>
                      )}

                      {/* Highlight */}
                      {result.highlight && Object.keys(result.highlight).length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <div className="text-sm text-yellow-800">
                            <strong>Matches:</strong>
                            {Object.entries(result.highlight).map(([field, highlights]) => (
                              <span key={field} className="ml-2">
                                {highlights.map((highlight, i) => (
                                  <span key={i} dangerouslySetInnerHTML={{ __html: highlight }} />
                                ))}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && !loading && (
            <Card className="mt-8 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                  {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
                  {pagination.total.toLocaleString()} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => performSearch(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => performSearch(pagination.page + 1)}
                    disabled={!pagination.has_next}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !loading && query && (
        <Card className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search query or filters to find what you're looking for.
          </p>
          <div className="space-x-2">
            <Button variant="outline" onClick={clearAllFilters}>
              Clear Filters
            </Button>
            <Button onClick={() => setShowFilters(true)}>
              Adjust Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Save Search Modal */}
      <Modal 
        show={showSaveModal} 
        onClose={() => setShowSaveModal(false)}
        title="Save Search"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Save this search configuration to quickly access it later and optionally set up alerts.
          </p>
          
          <Input
            label="Search Name"
            placeholder="e.g., Senior Developer Jobs in SF"
            value={saveSearchName}
            onChange={e => setSaveSearchName(e.target.value)}
          />
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Search Configuration</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Query:</strong> {query}</div>
              <div><strong>Scope:</strong> {SEARCH_SCOPES.find(s => s.value === scope)?.label}</div>
              <div><strong>Sort:</strong> {SORT_OPTIONS.find(s => s.value === sort)?.label}</div>
              {activeFiltersCount > 0 && (
                <div><strong>Filters:</strong> {activeFiltersCount} active</div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrentSearch}>
              Save Search
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
