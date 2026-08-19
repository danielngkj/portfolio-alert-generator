import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import alertsData from "../data/alerts-ds.json";
import "./styles.css";

const ALL = "All";
const MODEL_OPTIONS = ["SC1x", "SC2x", "SC3x"];
const TYPE_ICONS = { Critical: "!", Warning: "▲", Informational: "i" };
const alerts = Array.isArray(alertsData) ? alertsData : alertsData.alerts;
const dataGeneratedAt = Array.isArray(alertsData) ? null : alertsData.metadata?.generated_at;
const SEARCH_FIELDS = [
  "Alert Title", "Type", "Severity", "Alert Description", "Component",
  "Operator Response", "Model", "Version", "Notes", "Critical Stop Response",
  "Service Response", "Technician Response",
];

const severityOrder = { Sev1: 1, Sev2: 2, Sev3: 3, Sev4: 4, Sev5: 5 };

function formatTimestamp(timestamp) {
  if (!timestamp) return "Version unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function uniqueValues(field) {
  return [...new Set(alerts.map((alert) => alert[field]).filter(Boolean))].sort();
}

function matchesQuery(alert, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (/^\d+$/.test(needle)) return alert.ID === needle;
  return SEARCH_FIELDS.some((field) =>
    String(alert[field] ?? "").toLowerCase().includes(needle));
}

function alertModels(alert) {
  if (alert.Model === ALL) return MODEL_OPTIONS;
  return String(alert.Model ?? "")
    .split(",")
    .map((model) => model.trim());
}

function matchesModel(alert, model) {
  return model === ALL || alertModels(alert).includes(model);
}

function SelectFilter({ label, value, options, onChange }) {
  const pluralLabel = label === "Severity" ? "severities" : `${label.toLowerCase()}s`;
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL}>All {pluralLabel}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AlertTable({ alerts: tableAlerts, onOpen }) {
  return (
    <div className="table-shell" aria-live="polite">
      <table className="alert-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Severity</th>
            <th scope="col">Alert</th>
            <th scope="col">Type</th>
            <th scope="col">Component</th>
            <th scope="col">Model</th>
            <th scope="col">Last updated</th>
            <th scope="col"><span className="sr-only">Open alert</span></th>
          </tr>
        </thead>
        <tbody>
          {tableAlerts.map((alert, index) => (
            <tr
              key={`${alert.ID}-${index}`}
              className={alert.Type.toLowerCase()}
              tabIndex="0"
              aria-label={`Open alert ${alert.ID}: ${alert["Alert Title"]}`}
              onClick={() => onOpen(alert.ID)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(alert.ID);
                }
              }}
            >
              <td className="table-id">{alert.ID}</td>
              <td><span className={`severity ${alert.Severity.toLowerCase()}`}>{alert.Severity}</span></td>
              <td className="table-title">
                <strong>{alert["Alert Title"]}</strong>
                <span>{alert["Alert Description"]}</span>
              </td>
              <td className="type-cell">
                <span
                  className={`type-icon ${alert.Type.toLowerCase()}`}
                  role="img"
                  aria-label={alert.Type}
                  data-tooltip={alert.Type}
                  tabIndex="0"
                >
                  {TYPE_ICONS[alert.Type]}
                </span>
              </td>
              <td>{alert.Component}</td>
              <td>{alert.Model}</td>
              <td>{alert["Last Update"]}</td>
              <td className="row-arrow" aria-hidden="true">→</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertDetail({ alert, onBack }) {
  if (!alert) {
    return (
      <main className="detail-shell">
        <button className="back-link" onClick={onBack}>← Back to alerts</button>
        <section className="empty-state">
          <span>?</span><h1>Alert not found</h1>
          <p>The requested alert ID does not exist in this catalogue.</p>
          <button onClick={onBack}>Browse all alerts</button>
        </section>
      </main>
    );
  }

  const response = alert["Operator Response"] || "No operator action required.";
  return (
    <main className="detail-shell">
      <button className="back-link" onClick={onBack}>← Back to alerts</button>
      <article className={`detail-card ${alert.Type.toLowerCase()}`}>
        <div className="card-topline">
          <span className={`severity ${alert.Severity.toLowerCase()}`}>{alert.Severity}</span>
          <span className="alert-id">Alert {alert.ID}</span>
          <span className="date">Updated {alert["Last Update"]}</span>
        </div>
        <h1>{alert["Alert Title"]}</h1>
        <p className="detail-description">{alert["Alert Description"]}</p>

        <dl className="detail-metadata">
          {["Type", "Component", "Model", "Version", "Critical Stop Response", "Notes"].map((field) => (
            <div key={field}><dt>{field}</dt><dd>{alert[field] || "—"}</dd></div>
          ))}
        </dl>

        <section className="detail-guidance">
          <div className="operator-guidance"><span>Operator response</span><p>{response}</p></div>
          <div><span>Service response</span><p>{alert["Service Response"] || "—"}</p></div>
          <div><span>Technician response</span><p>{alert["Technician Response"] || "—"}</p></div>
        </section>
      </article>
    </main>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [component, setComponent] = useState(ALL);
  const [model, setModel] = useState(ALL);
  const [sort, setSort] = useState("severity");

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const alertId = decodeURIComponent(path.replace(/^\/+|\/+$/g, ""));
  const selectedAlert = alertId ? alerts.find((alert) => alert.ID === alertId) : null;

  const navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const componentOptions = useMemo(() => [...new Set(alerts
    .filter((alert) => type === ALL || alert.Type === type)
    .filter((alert) => severity === ALL || alert.Severity === severity)
    .filter((alert) => matchesModel(alert, model))
    .filter((alert) => matchesQuery(alert, query))
    .map((alert) => alert.Component)
    .filter(Boolean))].sort(), [query, type, severity, model]);

  useEffect(() => {
    if (component !== ALL && !componentOptions.includes(component)) {
      setComponent(ALL);
    }
  }, [component, componentOptions]);

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => type === ALL || alert.Type === type)
      .filter((alert) => severity === ALL || alert.Severity === severity)
      .filter((alert) => component === ALL || alert.Component === component)
      .filter((alert) => matchesModel(alert, model))
      .filter((alert) => matchesQuery(alert, query))
      .toSorted((a, b) => {
        if (sort === "title") return a["Alert Title"].localeCompare(b["Alert Title"]);
        if (sort === "updated") return b["Last Update"].localeCompare(a["Last Update"]);
        return severityOrder[a.Severity] - severityOrder[b.Severity] || Number(a.ID) - Number(b.ID);
      });
  }, [query, type, severity, component, model, sort]);

  const clearFilters = () => {
    setQuery(""); setType(ALL); setSeverity(ALL); setComponent(ALL); setModel(ALL);
  };
  const hasFilters = query || [type, severity, component, model].some((value) => value !== ALL);

  const counts = alerts.reduce((result, alert) => {
    result[alert.Type] = (result[alert.Type] || 0) + 1;
    return result;
  }, {});

  useEffect(() => {
    document.title = alertId && selectedAlert
      ? `${selectedAlert["Alert Title"]} · ACME Alert Atlas`
      : "ACME Alert Atlas";
  }, [alertId, selectedAlert]);

  if (alertId) {
    return <AlertDetail alert={selectedAlert} onBack={() => navigate("/")} />;
  }

  return (
    <main>
      <header className="hero">
        <div className="eyebrow"><span className="bean-icon" aria-hidden="true" /> Operations knowledge base</div>
        <div className="hero-copy">
          <div>
            <h1>ACME Alert Atlas</h1>
            <p>Get every coffee machine back up and brewing—fast.</p>
          </div>
          <div className="summary" aria-label="Alert summary">
            <strong>{alerts.length}</strong><span>Total alerts</span>
            <strong>{counts.Critical}</strong><span>Critical</span>
            <strong>{uniqueValues("Component").length}</strong><span>Components</span>
            <strong className="data-status">●</strong><span>Data generated {formatTimestamp(dataGeneratedAt)}</span>
          </div>
        </div>
      </header>

      <section className="controls" aria-label="Search and filter alerts">
        <label className="search-field">
          <span className="sr-only">Search alerts</span>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search titles, descriptions, components, responses…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <button className="clear-query" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
        </label>
        <div className="filter-grid">
          <SelectFilter label="Type" value={type} options={uniqueValues("Type")} onChange={setType} />
          <SelectFilter label="Severity" value={severity} options={uniqueValues("Severity")} onChange={setSeverity} />
          <SelectFilter label="Component" value={component} options={componentOptions} onChange={setComponent} />
          <SelectFilter label="Model" value={model} options={MODEL_OPTIONS} onChange={setModel} />
        </div>
      </section>

      <div className="results-bar">
        <p><strong>{filteredAlerts.length}</strong> {filteredAlerts.length === 1 ? "alert" : "alerts"} found</p>
        <div>
          {hasFilters && <button className="reset" onClick={clearFilters}>Clear filters</button>}
          <label className="sort-field">Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="severity">Severity</option>
              <option value="updated">Last updated</option>
              <option value="title">Title</option>
            </select>
          </label>
        </div>
      </div>

      {filteredAlerts.length ? (
        <AlertTable alerts={filteredAlerts} onOpen={(id) => navigate(`/${id}`)} />
      ) : (
        <section className="empty-state">
          <span>0</span><h2>No alerts match</h2><p>Try a broader search or clear your filters.</p>
          <button onClick={clearFilters}>Show all alerts</button>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
