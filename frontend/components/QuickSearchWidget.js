import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, Button, Input } from './ui';
import api from '../lib/api';

const QUICK_FILTERS = [
  { label: 'Recent Jobs', query: '', scope: 'jobs', filters: { date_range: { start: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0] } } },
  { label: 'Remote Work', query: 'remote', scope: 'jobs', filters: { remote_type: 'Remote' } },
  { label: 'High Salary', query: '', scope: 'jobs', filters: { salary_range: { min: 100000 } } },
  { label: 'My Applications', query: '', scope: 'applications', filters: {} },
  { label: 'Interview Ready', query: '', scope: 'applications', filters: { application_status: ['Interview', 'Final Interview'] } }
];

export default function QuickSearchWidget() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
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

  async function fetchSuggestions() {
    try {
      const response = await api.getSearchSuggestions(query);
      setSuggestions(response || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    }
  }

  function handleSearch(searchQuery = query, scope = 'all', filters = null) {
    if (!searchQuery.trim() && !filters) return;

    // Save to recent searches
    const searchItem = {
      query: searchQuery,
      scope,
      filters,
      timestamp: Date.now()
    };

    const updated = [searchItem, ...recentSearches.filter(item => 
      !(item.query === searchQuery && item.scope === scope)
    )].slice(0, 5);

    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    // Navigate to search page with parameters
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (scope && scope !== 'all') params.set('scope', scope);
    if (filters) params.set('filters', JSON.stringify(filters));

    router.push(`/search?${params.toString()}`);
  }

  function handleSuggestionClick(suggestion) {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  }

  function handleRecentSearchClick(search) {
    handleSearch(search.query, search.scope, search.filters);
  }

  function handleQuickFilterClick(filter) {
    handleSearch(filter.query, filter.scope, filter.filters);
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Quick Search</h2>
          <p className="text-gray-600">Find jobs, applications, companies, and more</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="Search for anything..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
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

        {/* Search Button */}
        <Button
          onClick={() => handleSearch()}
          disabled={!query.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-3"
        >
          <span className="mr-2">🚀</span>
          Search Everything
        </Button>

        {/* Quick Filters */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Quick Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_FILTERS.map((filter, index) => (
              <button
                key={index}
                onClick={() => handleQuickFilterClick(filter)}
                className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-900 text-sm">{filter.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {filter.scope === 'jobs' && 'Search jobs'}
                  {filter.scope === 'applications' && 'Search applications'}
                  {filter.scope === 'all' && 'Search everything'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {search.query || `${search.scope} search`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {search.scope} • {new Date(search.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Search Link */}
        <div className="text-center pt-2 border-t">
          <button
            onClick={() => router.push('/search')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Advanced Search & Filters →
          </button>
        </div>
      </div>
    </Card>
  );
}
