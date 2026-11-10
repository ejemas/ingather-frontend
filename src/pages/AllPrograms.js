import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getDashboardBootstrap, deleteProgram } from '../api/programService';
import IgDashShell, { DashIcon, DashDialog, StatusPill, DateTile } from '../components/IgDashShell';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { dateBadge, formatNumber, formatTimeRange, localToday } from '../utils/dashboardFormat';

const PAGE_SIZE = 8;
const TABS = [['all', 'All'], ['active', 'Active'], ['upcoming', 'Upcoming'], ['completed', 'Completed']];
const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['attended', 'Most attended']];
const DATA_OPTS = [['all', 'All'], ['collect-data', 'Collecting'], ['count-only', 'Count only']];
const searchIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
const filterIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;

const pick = (params, key, allowed, fallback) => {
  const value = params.get(key);
  return allowed.some(([k]) => k === value) ? value : fallback;
};

function AllPrograms() {
  const toast = useToast();
  const navigate = useNavigate();
  const { template, setTemplateKey } = useEventTemplate();
  // Stable handle: changing the wording must not trigger another data load.
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => localToday(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [query, setQuery] = useState(params.get('q') || '');
  const filterRef = useRef(null);
  const listTopRef = useRef(null);

  const tab = pick(params, 'status', TABS, 'all');
  const sort = pick(params, 'sort', SORTS, 'newest');
  const dataMode = pick(params, 'data', DATA_OPTS, 'all');
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  const updateParams = (changes, keepPage = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all' || (key === 'sort' && value === 'newest')) next.delete(key);
      else next.set(key, value);
    });
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  };

  // Search updates the address bar a moment after typing stops.
  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get('q') || '') !== query.trim()) updateParams({ q: query.trim() });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoadError('');
      try {
        const res = await getDashboardBootstrap(null, null, today);
        if (!alive) return;
        setData(res);
        if (res.church?.organizationType) setTemplateRef.current(res.church.organizationType);
      } catch (error) {
        if (!alive) return;
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(error.response?.data?.error || 'We could not load your events. Check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [today, reloadKey, navigate]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onDown = (event) => { if (filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [filterOpen]);

  const stats = data?.stats;
  const church = data?.church ? { name: data.church.churchName, email: data.church.email, logoUrl: data.church.logoUrl } : null;
  const plural = template?.event?.plural || 'Events';
  const singular = template?.event?.singular || 'Event';
  const allLabel = template?.event?.all || `All ${plural}`;
  const titleWord = allLabel.replace(/^All\s+/i, '');

  const all = useMemo(() => (stats?.recentPrograms || []).map((p) => ({ ...p, status: p.status || 'completed' })), [stats]);
  const searched = useMemo(() => {
    const q = (params.get('q') || '').toLowerCase();
    return all.filter((e) => (dataMode === 'all' || (dataMode === 'collect-data' ? e.trackingMode === 'collect-data' : e.trackingMode !== 'collect-data'))
      && (!q || String(e.title || '').toLowerCase().includes(q)));
  }, [all, params, dataMode]);
  const counts = useMemo(() => searched.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, { all: searched.length }), [searched]);
  const results = useMemo(() => {
    const list = tab === 'all' ? [...searched] : searched.filter((e) => e.status === tab);
    const key = (e) => `${e.date}T${e.startTime || '00:00'}`;
    if (sort === 'oldest') list.sort((a, b) => key(a).localeCompare(key(b)));
    else if (sort === 'attended') list.sort((a, b) => (b.totalScans || 0) - (a.totalScans || 0) || key(b).localeCompare(key(a)));
    else {
      // Newest first: what's happening now, then what's next (soonest first), then past events (latest first).
      const rank = { active: 0, upcoming: 1, completed: 2 };
      list.sort((a, b) => (rank[a.status] - rank[b.status])
        || (a.status === 'upcoming' ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a))));
    }
    return list;
  }, [searched, tab, sort]);
  const maxAttendance = useMemo(() => Math.max(1, ...all.map((e) => e.totalScans || 0)), [all]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = results.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(results.length, safePage * PAGE_SIZE);
  const filtersChanged = sort !== 'newest' || dataMode !== 'all';

  const goPage = (n) => {
    updateParams({ page: n > 1 ? String(n) : null }, true);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteProgram(deleting.id);
      toast.success(template.dashboard?.deleteSuccess || 'Event deleted.');
      setDeleting(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      toast.error(error.response?.data?.error || template.dashboard?.deleteFailure || 'Could not delete this event.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteButton = (e) => {
    const canDelete = e.status === 'completed';
    return (
      <button
        type="button"
        className="ig-db-trash"
        aria-label={canDelete ? `Delete ${e.title}` : `Stop ${e.title} before deleting it`}
        title={canDelete ? 'Delete' : `Stop this ${singular.toLowerCase()} before deleting it`}
        disabled={!canDelete}
        onClick={() => setDeleting(e)}
      >{DashIcon.trash}</button>
    );
  };

  const total = stats?.totalProgramsAllTime || 0;

  return (
    <IgDashShell
      active="events"
      crumb={allLabel}
      church={church}
      counts={{ preEvents: stats?.preEventCount || 0, events: total }}
      unreadCount={data?.unreadCount || 0}
      live={stats?.live || null}
      template={template}
    >
      <div className="ig-db-page">
        <div className="ig-db-hello ig-ae-head">
          <div className="ig-db-hello-text">
            <span>{loading ? ' ' : `${formatNumber(total)} ${total === 1 ? singular.toLowerCase() : plural.toLowerCase()} in this workspace`}</span>
            <h1>All <span className="ig-db-title-mark">{titleWord}</span></h1>
          </div>
          <div className="ig-ae-tools" ref={filterRef}>
            <label className="ig-ae-search">
              {searchIcon}
              <input
                type="search"
                placeholder={`Search ${plural.toLowerCase()}`}
                aria-label={`Search ${plural.toLowerCase()}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={120}
              />
            </label>
            <button
              type="button"
              className={`ig-ae-filter-btn${filterOpen ? ' is-open' : ''}`}
              aria-label="Sort and filter"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((v) => !v)}
            >
              {filterIcon}
              {filtersChanged && <span className="ig-ae-filter-dot" aria-hidden="true" />}
            </button>
            {filterOpen && (
              <div className="ig-ae-pop" role="dialog" aria-label={`Sort and filter ${plural.toLowerCase()}`}>
                <span className="ig-ae-pop-caret" aria-hidden="true" />
                <div className="ig-ae-pop-head">
                  <strong>Sort and filter</strong>
                  <button type="button" onClick={() => updateParams({ sort: null, data: null })}>Reset</button>
                </div>
                <fieldset>
                  <legend>Sort by</legend>
                  <div className="ig-ae-sorts" role="radiogroup">
                    {SORTS.map(([key, label]) => (
                      <button key={key} type="button" role="radio" aria-checked={sort === key} className={sort === key ? 'is-on' : ''} onClick={() => updateParams({ sort: key })}>
                        {label}<span aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Data collection</legend>
                  <div className="ig-ae-chips">
                    {DATA_OPTS.map(([key, label]) => (
                      <button key={key} type="button" aria-pressed={dataMode === key} className={dataMode === key ? 'is-on' : ''} onClick={() => updateParams({ data: key })}>{label}</button>
                    ))}
                  </div>
                </fieldset>
                <button type="button" className="ig-db-btn-ink" onClick={() => setFilterOpen(false)}>
                  Show {formatNumber(results.length)} {results.length === 1 ? singular.toLowerCase() : plural.toLowerCase()}
                </button>
              </div>
            )}
          </div>
          <Link to="/create-program" className="ig-db-btn-primary ig-ae-create">{DashIcon.plus}{template?.event?.create || 'Create Event'}</Link>
        </div>

        {loadError && !data && (
          <div className="ig-db-card ig-db-error" role="alert">
            <strong>Your {plural.toLowerCase()} didn't load</strong>
            <span>{loadError}</span>
            <button type="button" className="ig-db-btn-ink" onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}>Try again</button>
          </div>
        )}

        {(loading || data) && (
          <section className="ig-db-card ig-ae-list" aria-label={plural} ref={listTopRef}>
            <div className="ig-db-tabs ig-ae-tabs" role="tablist" aria-label={`Filter ${plural.toLowerCase()}`}>
              {TABS.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => updateParams({ status: key })}>
                  {label}<span className={`ig-db-tab-count${key === 'upcoming' && counts.upcoming ? ' is-hot' : ''}`}>{loading ? '' : formatNumber(counts[key] || 0)}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="ig-ae-skel">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="ig-db-skel is-row" />)}</div>
            ) : pageItems.length === 0 ? (
              <div className="ig-db-empty">
                {all.length === 0 ? (
                  <>
                    <strong>No {plural.toLowerCase()} yet</strong>
                    <span>Create your first {singular.toLowerCase()} to start checking guests in.</span>
                    <Link to="/create-program" className="ig-db-btn-primary is-inline">{DashIcon.plus}{template?.event?.create || 'Create Event'}</Link>
                  </>
                ) : (
                  <>
                    <strong>No {plural.toLowerCase()} found for this filter.</strong>
                    <span>Try another tab or search, or create a new {singular.toLowerCase()}.</span>
                    <button type="button" className="ig-db-btn-ghost" onClick={() => { setQuery(''); setParams(new URLSearchParams(), { replace: true }); }}>Clear filters</button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="ig-db-table ig-ae-table" role="table" aria-label={plural}>
                  <div className="ig-db-tr ig-ae-tr is-head" role="row">
                    <span role="columnheader">{singular}</span><span role="columnheader">Time</span><span role="columnheader">Status</span>
                    <span role="columnheader">Attendance</span><span role="columnheader">Data collection</span><span role="columnheader" className="is-right">Actions</span>
                  </div>
                  {pageItems.map((e) => {
                    const collecting = e.trackingMode === 'collect-data';
                    const pct = Math.round(((e.totalScans || 0) / maxAttendance) * 100);
                    return (
                      <div className="ig-db-tr ig-ae-tr" role="row" key={e.id}>
                        <span role="cell" className="ig-db-ev">
                          <DateTile date={e.date} highlight={e.status === 'active'} large />
                          <span className="ig-db-ev-text"><strong>{e.title}</strong><span>{dateBadge(e.date).weekday}</span></span>
                        </span>
                        <span role="cell" className="ig-db-muted-cell">{formatTimeRange(e.startTime, e.endTime)}</span>
                        <span role="cell"><StatusPill status={e.status} /></span>
                        <span role="cell" className="ig-ae-att">
                          <strong>{e.status === 'upcoming' ? '-' : formatNumber(e.totalScans)}</strong>
                          <span className="ig-ae-meter" aria-hidden="true"><span className={e.status === 'active' ? 'is-hot' : ''} style={{ width: `${e.status === 'upcoming' ? 0 : pct}%` }} /></span>
                        </span>
                        <span role="cell" className={collecting ? 'ig-db-data-cell' : 'ig-db-data-cell is-muted'}>{collecting ? 'Collecting' : 'Count only'}</span>
                        <span role="cell" className="ig-db-actions">
                          <Link to={`/program/${e.id}`} className="ig-db-view">View</Link>
                          {deleteButton(e)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="ig-ae-cards">
                  {pageItems.map((e) => {
                    const collecting = e.trackingMode === 'collect-data';
                    return (
                      <div className="ig-ae-card" key={e.id}>
                        <div className="ig-ae-card-top">
                          <DateTile date={e.date} highlight={e.status === 'active'} large />
                          <span className="ig-ae-card-text"><strong>{e.title}</strong><span>{formatTimeRange(e.startTime, e.endTime)}</span></span>
                          <span className="ig-db-ev-card-count"><strong>{e.status === 'upcoming' ? '-' : formatNumber(e.totalScans)}</strong><span>attended</span></span>
                        </div>
                        <div className="ig-ae-card-foot">
                          <StatusPill status={e.status} />
                          <span className="ig-ae-card-data">{collecting ? 'Collecting' : 'Count only'}</span>
                          <Link to={`/program/${e.id}`} className="ig-db-view">View</Link>
                          {deleteButton(e)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <nav className="ig-ae-pager" aria-label="Pages">
                  <span>Showing <strong>{from} to {to}</strong> of {formatNumber(results.length)}</span>
                  <span className="ig-ae-pager-btns">
                    <button type="button" onClick={() => goPage(safePage - 1)} disabled={safePage <= 1} aria-label="Previous page">{DashIcon.chevronLeft}<span>Previous</span></button>
                    <strong aria-live="polite">Page {safePage} of {pages}</strong>
                    <button type="button" onClick={() => goPage(safePage + 1)} disabled={safePage >= pages} aria-label="Next page"><span>Next</span>{DashIcon.chevronRight}</button>
                  </span>
                </nav>
              </>
            )}
          </section>
        )}
      </div>

      {deleting && (
        <DashDialog
          tone="danger"
          icon={DashIcon.trash}
          title={`Delete "${deleting.title}"?`}
          cancelLabel={`Keep ${singular.toLowerCase()}`}
          confirmLabel={`Delete ${singular.toLowerCase()}`}
          busy={deleteBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        >
          This permanently removes the {singular.toLowerCase()}
          {deleting.totalScans > 0 ? `, its ${formatNumber(deleting.totalScans)} check-ins and its report` : ' and its report'}. You can't undo this.
        </DashDialog>
      )}
    </IgDashShell>
  );
}

export default AllPrograms;
