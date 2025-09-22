import { useEffect, useState } from 'react';
import { Card, Input, Select, Button } from '../../../components/ui';
import { apiFetch } from '../../../lib/api';

export default function JobFilters({
  // controlled state from useJobs
  searchTerm, setSearchTerm,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  locationFilter, setLocationFilter,
  remoteTypeFilter, setRemoteTypeFilter,
  total = 0,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  // Debounced suggestions
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!open || !searchTerm || searchTerm.length < 2) { setSuggestions([]); return; }
      try {
        const res = await apiFetch(`/jobs/suggestions?q=${encodeURIComponent(searchTerm)}`).then(r => r.json());
        setSuggestions(Array.isArray(res) ? res : []);
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm, open]);

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setRemoteTypeFilter('');
  };

  return (
    <Card className="glass-card glass-amber">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🔍</span>
          <h2 className="text-xl font-semibold text-slate-100">Search & Filter Jobs</h2>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Input
            placeholder="Search jobs by title, company, or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            className="w-full input-glass input-amber"
            icon={<span>🔍</span>}
          />
          {open && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 dropdown-light max-h-60 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} className="w-full text-left item" onMouseDown={() => { setSearchTerm(s); setOpen(false); }}>
                  <span className="text-slate-300">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 *:min-w-0">
          <Input
            placeholder="Location (e.g., Remote, NYC...)"
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            icon={<span>📍</span>}
            className="input-glass input-amber"
          />

          <Select value={remoteTypeFilter} onChange={e => setRemoteTypeFilter(e.target.value)} className="input-glass input-amber">
            <option value="">All Types</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </Select>

          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-glass input-amber">
            <option value="created_at">Date Posted</option>
            <option value="title">Job Title</option>
          </Select>

          <Select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="input-glass input-amber">
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </Select>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between pt-2 border-t gap-2 *:min-w-0">
          <p className="text-sm text-slate-300">Showing {total} result{total !== 1 ? 's' : ''}</p>
          {(searchTerm || locationFilter || remoteTypeFilter) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>
      </div>
    </Card>
  );
}
