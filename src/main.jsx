import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import alertsData from "../data/alerts-ds.json";
import "./styles.css";

const ALL = "All";
const MODEL_OPTIONS = ["SC1x", "SC2x", "SC3x"];
const MAJOR_GROUPS = ["Control & Interface", "Beverage Systems", "Supply & Payment", "Operations & Safety"];
const TYPE_ICONS = { Critical: "", Warning: "", Informational: "" };
const alerts = Array.isArray(alertsData) ? alertsData : alertsData.alerts;
const dataGeneratedAt = Array.isArray(alertsData) ? null : alertsData.metadata?.generated_at;
const SEARCH_FIELDS = [
  "Alert Title", "Type", "Severity", "Alert Description", "System Area",
  "Operator Response", "Model", "Version", "Notes", "Critical Stop Response",
  "Service Response", "Technician Response",
];
const CRITICAL_STOP_CONTENT = {
  term: "Critical Stop Response",
  definition: "An instruction indicating whether the machine or affected service must stop immediately.",
  heading: "Critical stop required",
  instruction: "Stop the machine or affected function immediately. Follow the response guidance before returning it to service.",
};
const GLOSSARY_TERMS = [
  { term: "Alert", definition: "A machine event that communicates a condition, change, or fault requiring awareness or action." },
  { term: "Alert ID", definition: "The unique number used to identify, search for, and share a specific alert." },
  { term: "Critical", definition: "A serious fault that can stop service, affect safety, or require immediate intervention." },
  { term: CRITICAL_STOP_CONTENT.term, definition: CRITICAL_STOP_CONTENT.definition },
  { term: "Escalation", definition: "Passing an unresolved alert to the appropriate service or technical team for further action." },
  { term: "Informational", definition: "A normal operating event or status update that does not require corrective action." },
  { term: "Major Group", definition: "A broad organizational category that brings together related coffee machine System Areas." },
  { term: "Model", definition: "The ACME coffee machine family to which an alert applies, including SC1x, SC2x, and SC3x." },
  { term: "Operator Response", definition: "The immediate action a site operator can take before escalating the alert to a service team." },
  { term: "Out of Service", definition: "A machine or function that must remain unavailable until it has been checked or repaired." },
  { term: "Service Response", definition: "A service-level explanation of the alert's operational impact and expected next step." },
  { term: "Severity", definition: "The impact level assigned to an alert, from Sev1 for the most urgent conditions to Sev5 for informational events." },
  { term: "System Area", definition: "The functional area of the coffee machine associated with an alert, such as heating and boiler, payment, or dispensing." },
  { term: "Technician Response", definition: "Diagnostic or repair guidance intended for a trained coffee machine technician." },
  { term: "Verification Check", definition: "A check performed after an action to confirm the alert is resolved and operation can continue safely." },
  { term: "Warning", definition: "A condition that may affect service if it continues and should be monitored or addressed soon." },
];
const SEVERITY_DEFINITION = GLOSSARY_TERMS.find(({ term }) => term === "Severity").definition;
const TYPE_DEFINITIONS = Object.fromEntries(
  Object.keys(TYPE_ICONS).map((type) => [
    type,
    GLOSSARY_TERMS.find(({ term }) => term === type).definition,
  ]),
);
const severityOrder = { Sev1: 1, Sev2: 2, Sev3: 3, Sev4: 4, Sev5: 5 };
const DEFAULT_VIEW_STATE = {
  query: "",
  type: ALL,
  severity: ALL,
  majorGroup: ALL,
  systemArea: ALL,
  model: ALL,
  sortConfig: { field: "severity", direction: "asc" },
};

const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || "/api/chat";

function loadViewState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("alert-atlas-view") || "{}");
    const storedSort = stored.sortConfig?.field === "component"
      ? { ...stored.sortConfig, field: "systemArea" }
      : stored.sortConfig;
    return {
      ...DEFAULT_VIEW_STATE,
      ...stored,
      systemArea: stored.systemArea ?? stored.component ?? ALL,
      sortConfig: storedSort ?? DEFAULT_VIEW_STATE.sortConfig,
    };
  } catch {
    return DEFAULT_VIEW_STATE;
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Version unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function PortfolioBar({ onNavigate }) {
  return (
    <div className="portfolio-bar" aria-label="Portfolio context">
      <div className="portfolio-bar-inner">
        <span>Portfolio project by <strong>Daniel Ng</strong></span>
        <span className="portfolio-divider" aria-hidden="true">·</span>
        <a href="/about" onClick={(event) => { event.preventDefault(); onNavigate("/about"); }}>Case study</a>
        <span className="portfolio-divider" aria-hidden="true">·</span>
        <a
          href="https://github.com/danielngkj/portfolio-alert-generator"
          target="_blank"
          rel="noreferrer"
        >GitHub</a>
        <span className="portfolio-divider" aria-hidden="true">·</span>
        <a href="https://danielng.co" target="_blank" rel="noreferrer">Back to portfolio</a>
      </div>
    </div>
  );
}

function SiteBanner({ onNavigate, currentPath }) {
  const resourceLink = (path, label, className) => (
    <a
      className={className}
      href={path}
      aria-current={currentPath === path ? "page" : undefined}
      onClick={(event) => { event.preventDefault(); onNavigate(path); }}
    >{label}</a>
  );
  return (
    <>
      <PortfolioBar onNavigate={onNavigate} />
      <header className="site-banner">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <a className="site-brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
          <span className="bean-icon" aria-hidden="true" />
          <span><strong>ACME COFFEE</strong></span>
        </a>
        <nav aria-label="Site navigation">
          {resourceLink("/glossary", "Glossary")}
          {resourceLink("/sitemap", "Sitemap")}
          {resourceLink("/about", "About this project", "nav-featured")}
          <a className="banner-download" href="/downloads/alert-atlas.pdf" download>
            <span className="pdf-mini-icon" aria-hidden="true">PDF</span> Download PDF
          </a>
        </nav>
      </header>
    </>
  );
}

function SiteFooter({ onNavigate }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(null);
  const launcherRef = useRef(null);
  const drawerRef = useRef(null);
  const chatRef = useRef(null);
  const closeChat = () => {
    setChatOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  };

  useEffect(() => {
    const root = document.documentElement;
    if (chatWidth) root.style.setProperty("--chatbot-drawer-width", `${chatWidth}px`);
    return () => root.style.removeProperty("--chatbot-drawer-width");
  }, [chatWidth]);

  const resizeChat = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = drawerRef.current?.getBoundingClientRect().width || 360;
    const updateWidth = (moveEvent) => {
      const maxWidth = Math.max(200, Math.min(window.innerWidth * 0.7, 720));
      setChatWidth(Math.min(maxWidth, Math.max(200, startWidth + startX - moveEvent.clientX)));
    };
    const stopResize = () => {
      window.removeEventListener("pointermove", updateWidth);
      window.removeEventListener("pointerup", stopResize);
    };
    window.addEventListener("pointermove", updateWidth);
    window.addEventListener("pointerup", stopResize, { once: true });
  };

  const resizeWithKeyboard = (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const currentWidth = drawerRef.current?.getBoundingClientRect().width || 360;
    const maxWidth = Math.max(200, Math.min(window.innerWidth * 0.7, 720));
    const change = event.key === "ArrowLeft" ? 20 : -20;
    setChatWidth(Math.min(maxWidth, Math.max(200, currentWidth + change)));
  };

  useEffect(() => {
    document.body.classList.toggle("chatbot-open", chatOpen);
    if (chatOpen) drawerRef.current?.focus();
    return () => document.body.classList.remove("chatbot-open");
  }, [chatOpen]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && chatOpen) {
        closeChat();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [chatOpen]);

  return (
    <>
      {!chatOpen && (
        <button
          ref={launcherRef}
          className="chatbot-launcher"
          type="button"
          aria-expanded={false}
          aria-controls="chatbot-drawer"
          onClick={() => setChatOpen(true)}
        >Ask AI</button>
      )}
      {chatOpen && (
        <aside
          ref={drawerRef}
          id="chatbot-drawer"
          className="chatbot-drawer"
          aria-label="Ask AI documentation assistant"
          tabIndex="-1"
        >
          <button
            className="chatbot-resize-handle"
            type="button"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Ask AI sidebar"
            aria-valuemin="200"
            aria-valuemax="720"
            aria-valuenow={chatWidth || undefined}
            onPointerDown={resizeChat}
            onKeyDown={resizeWithKeyboard}
          />
          <div className="chatbot-drawer-header">
            <div>
              <h2>Ask AI</h2>
            </div>
            <div className="chatbot-drawer-actions">
              <button className="chatbot-new-chat" type="button" onClick={() => chatRef.current?.reset()}>New chat</button>
              <button className="chatbot-close" type="button" aria-label="Close Ask AI" onClick={closeChat}>×</button>
            </div>
          </div>
          <documentation-chat
            ref={chatRef}
            hide-header="true"
            api-url={CHATBOT_API_URL}
            title="Ask AI"
            placeholder="Ask about an alert or symptom…"
            welcome="Ask about an alert or symptom and I’ll search the available documentation."
          />
          <a className="chatbot-about-link" href="/chatbot" onClick={(event) => { event.preventDefault(); onNavigate("/chatbot"); }}>How it works</a>
        </aside>
      )}
      <footer className="site-footer">
        <div className="site-footer-meta">
          <div className="site-footer-line">
            <strong>Alert atlas</strong>
            <span className="site-disclaimer">Portfolio demonstration · Fictional data · Not for operational use</span>
          </div>
          <div className="site-footer-line site-footer-data">
            <span>Data generated {formatTimestamp(dataGeneratedAt)} · {alerts.length} records</span>
          </div>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>Alerts</a>
          <a href="/glossary" onClick={(event) => { event.preventDefault(); onNavigate("/glossary"); }}>Glossary</a>
          <a href="/sitemap" onClick={(event) => { event.preventDefault(); onNavigate("/sitemap"); }}>Sitemap</a>
          <a href="/about" onClick={(event) => { event.preventDefault(); onNavigate("/about"); }}>About</a>
        </nav>
      </footer>
    </>
  );
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

function HighlightedText({ text, query }) {
  const value = String(text ?? "");
  const needle = query.trim();
  if (!needle || /^\d+$/.test(needle)) return value;
  const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escapedNeedle})`, "gi"));
  return parts.map((part, index) => (
    part.toLowerCase() === needle.toLowerCase()
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : part
  ));
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

function majorGroupSlug(group) {
  return group.toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function GroupTabs({ value, onChange }) {
  return (
    <div className="group-tabs" aria-label="Filter by major group">
      <div role="group" aria-label="Major groups">
        {[ALL, ...MAJOR_GROUPS].map((group) => (
          <button
            key={group}
            type="button"
            className={value === group ? "active" : ""}
            aria-pressed={value === group}
            onClick={() => onChange(group)}
          >
            {group}
          </button>
        ))}
      </div>
    </div>
  );
}

function SeverityBadge({ value }) {
  return (
    <span
      className={`severity ${value.toLowerCase()}`}
      tabIndex="0"
      aria-label={`${value}. ${SEVERITY_DEFINITION}`}
      data-tooltip={SEVERITY_DEFINITION}
    >
      S{value.replace(/^Sev/, "")}
    </span>
  );
}

function glossarySlug(term) {
  return term.toLowerCase().replaceAll(" ", "-");
}

function GlossaryTerm({ term, children = term }) {
  const definition = GLOSSARY_TERMS.find((entry) => entry.term === term)?.definition;
  return (
    <span
      className="glossary-term-trigger"
      tabIndex="0"
      aria-label={`${children}: ${definition}`}
      data-tooltip={definition}
    >
      {children}
    </span>
  );
}

function ResponseHeading({ term, icon }) {
  return (
    <div className="response-heading">
      {icon && <span className="response-icon" aria-hidden="true">{icon}</span>}
      <GlossaryTerm term={term} />
    </div>
  );
}

function SortableHeader({ field, label, sortConfig, onSort }) {
  const active = sortConfig.field === field;
  const direction = active ? sortConfig.direction : null;
  return (
    <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button className={active ? "active" : ""} onClick={() => onSort(field)}>
        {label}<span className="sort-arrow" aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

function AlertTable({ alerts: tableAlerts, onOpen, sortConfig, onSort, query }) {
  return (
    <div className="table-shell" aria-live="polite">
      <table className="alert-table">
        <thead>
          <tr>
            <SortableHeader field="id" label="Alert" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader field="severity" label="Status" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader field="systemArea" label="System Area" sortConfig={sortConfig} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {tableAlerts.map((alert, index) => (
            <tr
              key={`${alert.ID}-${index}`}
              className={alert.Type.toLowerCase()}
              tabIndex="0"
              aria-label={`Open alert ${alert.ID}: ${alert["Alert Title"]}`}
              aria-describedby={`operator-tooltip-${alert.ID}-${index}`}
              onClick={() => onOpen(alert.ID)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(alert.ID);
                }
              }}
            >
              <td
                className="table-title"
                onMouseMove={(event) => {
                  const tooltip = event.currentTarget.querySelector(".operator-tooltip");
                  if (!tooltip) return;
                  const gap = 14;
                  const bounds = tooltip.getBoundingClientRect();
                  const left = Math.min(event.clientX + gap, window.innerWidth - bounds.width - 12);
                  const below = event.clientY + gap;
                  const top = below + bounds.height <= window.innerHeight - 12
                    ? below
                    : Math.max(12, event.clientY - bounds.height - gap);
                  tooltip.style.setProperty("--tooltip-left", `${Math.max(12, left)}px`);
                  tooltip.style.setProperty("--tooltip-top", `${top}px`);
                }}
              >
                <div className="table-title-heading">
                  <span className="table-alert-id">{alert.ID}</span>
                  <strong><HighlightedText text={alert["Alert Title"]} query={query} /></strong>
                  <span className="table-version">{alert.Version}</span>
                </div>
                <span className="table-description"><HighlightedText text={alert["Alert Description"]} query={query} /></span>
                <span
                  className="operator-tooltip"
                  id={`operator-tooltip-${alert.ID}-${index}`}
                  role="tooltip"
                >
                  <strong>Operator response</strong>
                  <span className="operator-tooltip-date">Last updated {alert["Last Update"]}</span>
                  <span className="operator-tooltip-response">{alert["Operator Response"] || "No operator action required."}</span>
                </span>
              </td>
              <td className="status-cell">
                <span
                  className={`type-icon ${alert.Type.toLowerCase()}`}
                  role="img"
                  aria-label={`${alert.Type}. ${TYPE_DEFINITIONS[alert.Type]}`}
                  data-tooltip={TYPE_DEFINITIONS[alert.Type]}
                  tabIndex="0"
                >
                  {TYPE_ICONS[alert.Type]}
                </span>
                <SeverityBadge value={alert.Severity} />
              </td>
              <td>{alert["System Area"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentlyUpdated({ alerts: recentAlerts, onOpen }) {
  return (
    <section className="recent-section" id="recent-updates" aria-labelledby="recent-heading">
      <div className="recent-heading">
        <h2 id="recent-heading">Recently updated</h2>
      </div>
      <div className="recent-grid">
        {recentAlerts.map((alert) => (
          <a
            href={`/${alert.ID}`}
            key={alert.ID}
            aria-label={`Alert ${alert.ID}: ${alert["Alert Title"]}, updated ${alert["Last Update"]}`}
            aria-describedby={`recent-tooltip-${alert.ID}`}
            onClick={(event) => {
              event.preventDefault();
              onOpen(alert.ID);
            }}
          >
            <span
              className={`type-icon ${alert.Type.toLowerCase()}`}
              role="img"
              aria-label={alert.Type}
            >
              {TYPE_ICONS[alert.Type]}
            </span>
            <span className="recent-copy">
              <strong>{alert.ID}</strong>
              <small>{alert["Last Update"]}</small>
            </span>
            <span className="recent-arrow" aria-hidden="true">→</span>
            <span className="recent-tooltip" id={`recent-tooltip-${alert.ID}`} role="tooltip">
              <strong>{alert["Alert Title"]}</strong>
              <span>{alert["Alert Description"]}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function AlertDetail({ alert, onBack, onOpenAlert, onSelectTaxonomy, onNavigate, currentPath }) {
  const [copyStatus, setCopyStatus] = useState("");

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(successMessage);
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      setCopyStatus(copied ? successMessage : "Copy failed");
    }
    window.setTimeout(() => setCopyStatus(""), 1800);
  };

  const copyLink = () => copyText(window.location.href, "Link copied");

  if (!alert) {
    return (
      <main className="detail-shell">
        <SiteBanner onNavigate={onNavigate} currentPath={currentPath} />
        <section className="empty-state" id="main-content" tabIndex="-1">
          <span>?</span><h1 data-route-heading tabIndex="-1">Alert not found</h1>
          <p>The requested alert ID does not exist in this catalogue.</p>
          <button onClick={onBack}>Browse all alerts</button>
        </section>
        <SiteFooter onNavigate={onNavigate} />
      </main>
    );
  }

  const response = alert["Operator Response"] || "No operator action required.";
  const criticalStopRequired = String(alert["Critical Stop Response"] || "").trim().toLowerCase() === "yes";
  const copyDetails = () => copyText([
    `${alert.ID} - ${alert["Alert Title"]}`,
    "",
    "Operator Response:",
    response,
    "",
    "Service Response:",
    alert["Service Response"] || "—",
    "",
    "Technician Response:",
    alert["Technician Response"] || "—",
    "",
    `URL: ${window.location.href}`,
  ].join("\n"), "Details copied");
  const relatedAlerts = alerts
    .filter((candidate) => candidate.ID !== alert.ID)
    .map((candidate) => ({
      alert: candidate,
      score: (candidate["System Area"] === alert["System Area"] ? 2 : 0) + (candidate.Model === alert.Model ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || severityOrder[left.alert.Severity] - severityOrder[right.alert.Severity])
    .slice(0, 4)
    .map(({ alert: candidate }) => candidate);

  return (
      <main className="detail-shell">
      <SiteBanner onNavigate={onNavigate} currentPath={currentPath} />
      <div className="detail-toolbar detail-toolbar-actions">
        <div className="detail-actions">
          <span className="copy-status" aria-live="polite">{copyStatus}</span>
          <button onClick={copyDetails}>Copy alert details</button>
          <button className="icon-action" onClick={copyLink} aria-label="Copy link" data-tooltip="Copy link">
            <span aria-hidden="true">🔗︎</span>
          </button>
          <button className="icon-action" onClick={() => window.print()} aria-label="Print" data-tooltip="Print">
            <span aria-hidden="true">⎙</span>
          </button>
        </div>
      </div>
      <article className={`detail-card ${alert.Type.toLowerCase()}`} id="main-content" tabIndex="-1">
        <div className="card-topline">
          <span className="alert-id">{alert.ID}</span>
          <span className="card-meta-right">
            <span className="date">Updated {alert["Last Update"]}</span>
            <SeverityBadge value={alert.Severity} />
          </span>
        </div>
        <div className="taxonomy-breadcrumb" aria-label="Alert taxonomy">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onSelectTaxonomy(alert["Major Group"], ALL);
            }}
          >{alert["Major Group"]}</a>
          <span aria-hidden="true">/</span>
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onSelectTaxonomy(alert["Major Group"], alert["System Area"]);
            }}
          >{alert["System Area"]}</a>
        </div>
        <h1 data-route-heading tabIndex="-1">{alert["Alert Title"]}</h1>
        <p className="detail-description">{alert["Alert Description"]}</p>
        {criticalStopRequired && (
          <aside className="critical-stop-callout" aria-label={CRITICAL_STOP_CONTENT.heading}>
            <span className="critical-stop-mark" aria-hidden="true">STOP</span>
            <div>
              <strong>{CRITICAL_STOP_CONTENT.heading}</strong>
              <p>{CRITICAL_STOP_CONTENT.instruction}</p>
            </div>
          </aside>
        )}

        <dl className="detail-metadata">
          {["Type", "Model", "Version", "Critical Stop Response", "Notes"].map((field) => (
            <div key={field} className={field === "Type" ? "type-metadata" : undefined}>
              <dt>{["Type", "Model", "Critical Stop Response"].includes(field)
                ? <GlossaryTerm term={field === "Type" ? alert.Type : field}>{field}</GlossaryTerm>
                : field}</dt>
              <dd
                tabIndex={field === "Type" ? "0" : undefined}
                aria-label={field === "Type" ? `${alert.Type}. ${TYPE_DEFINITIONS[alert.Type]}` : undefined}
                data-tooltip={field === "Type" ? TYPE_DEFINITIONS[alert.Type] : undefined}
              >
                {alert[field] || "—"}
              </dd>
            </div>
          ))}
        </dl>

        <section className="detail-guidance">
          <div><ResponseHeading term="Operator Response" /><p>{response}</p></div>
          <div><ResponseHeading term="Service Response" /><p>{alert["Service Response"] || "—"}</p></div>
          <div><ResponseHeading term="Technician Response" icon="🔧" /><p>{alert["Technician Response"] || "—"}</p></div>
        </section>

        {relatedAlerts.length > 0 && (
          <section className="related-alerts" aria-labelledby="related-alerts-heading">
            <h2 id="related-alerts-heading">Related alerts</h2>
            <ul className="related-links">
              {relatedAlerts.map((related) => (
                <li key={related.ID}>
                  <a
                    href={`/${related.ID}`}
                    onClick={(event) => { event.preventDefault(); onOpenAlert(related.ID); }}
                  >
                    <strong>{related.ID}</strong>
                    <span>{related["Alert Title"]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}

function GlossaryPage({ onNavigate, currentPath }) {
  return (
    <main className="group-page-shell">
      <SiteBanner onNavigate={onNavigate} currentPath={currentPath} />
      <header className="group-page-header" id="main-content" tabIndex="-1">
        <span>Reference</span>
        <h1 data-route-heading tabIndex="-1">Alert glossary</h1>
        <p>Plain-language definitions for the terms used throughout Alert atlas.</p>
      </header>
      <section className="glossary-grid" aria-label="Glossary terms">
        {GLOSSARY_TERMS.map(({ term, definition }, index) => {
          const slug = glossarySlug(term);
          return (
            <article id={slug} key={term} className="glossary-term">
              <span className="term-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{term}<a href={`#${slug}`} aria-label={`Link to ${term}`}>#</a></h2>
                <p>{definition}</p>
              </div>
            </article>
          );
        })}
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}

function SitemapPage({ onOpenAlert, onNavigate, currentPath }) {
  return (
    <main className="group-page-shell" id="sitemap-top">
      <SiteBanner onNavigate={onNavigate} currentPath={currentPath} />
      <header className="group-page-header" id="main-content" tabIndex="-1">
        <span>Reference</span>
        <h1 data-route-heading tabIndex="-1">Sitemap</h1>
        <p>Browse all alerts by major group and system area.</p>
      </header>
      <nav className="sitemap-contents" aria-label="Sitemap contents">
        <a href="/chatbot" onClick={(event) => { event.preventDefault(); onNavigate("/chatbot"); }}>How the chatbot works</a>
        {MAJOR_GROUPS.map((group) => <a key={group} href={`#${majorGroupSlug(group)}`}>{group}</a>)}
      </nav>
      <div className="sitemap-groups">
        {MAJOR_GROUPS.map((group) => {
          const groupAlerts = alerts.filter((alert) => alert["Major Group"] === group);
          const systemAreas = [...new Set(groupAlerts.map((alert) => alert["System Area"]))].sort();
          return (
            <section key={group} id={majorGroupSlug(group)} className="sitemap-group">
              <div className="sitemap-group-heading">
                <h2>{group}</h2>
                <span>{groupAlerts.length} alerts</span>
              </div>
              <div className="group-area-sections">
                {systemAreas.map((area) => {
                  const areaAlerts = groupAlerts.filter((alert) => alert["System Area"] === area);
                  return (
                    <section key={area} id={majorGroupSlug(area)} className="group-area-section" aria-labelledby={`area-${majorGroupSlug(area)}`}>
                      <div className="group-area-heading">
                        <h3 id={`area-${majorGroupSlug(area)}`}>
                          <a href={`#${majorGroupSlug(area)}`}>{area}<span aria-hidden="true">#</span></a>
                        </h3>
                        <span>{areaAlerts.length} {areaAlerts.length === 1 ? "alert" : "alerts"}</span>
                      </div>
                      <ul>
                        {areaAlerts.map((alert) => (
                          <li key={alert.ID}>
                            <a href={`/${alert.ID}`} onClick={(event) => { event.preventDefault(); onOpenAlert(alert.ID); }}>
                              <strong>{alert.ID}</strong>
                              <span
                                className={`type-icon ${alert.Type.toLowerCase()}`}
                                role="img"
                                aria-label={`${alert.Type}. ${TYPE_DEFINITIONS[alert.Type]}`}
                                data-tooltip={TYPE_DEFINITIONS[alert.Type]}
                                tabIndex="0"
                              >{TYPE_ICONS[alert.Type]}</span>
                              <span>{alert["Alert Title"]}</span>
                              <SeverityBadge value={alert.Severity} />
                              <span className="group-alert-arrow" aria-hidden="true">→</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
              <a className="sitemap-back-top" href="#sitemap-top">Back to top ↑</a>
            </section>
          );
        })}
      </div>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}

function AboutPage({ onNavigate, currentPath }) {
  return (
    <main className="group-page-shell">
      <SiteBanner onNavigate={onNavigate} currentPath={currentPath} />
      <header className="group-page-header" id="main-content" tabIndex="-1">
        <span>Portfolio project</span>
        <h1 data-route-heading tabIndex="-1">About Alert atlas</h1>
        <p>A portfolio showcase to show how I built and turned one structured source into help for web and print.</p>
      </header>
      <section className="pipeline-diagram" aria-labelledby="pipeline-title">
        <div className="pipeline-heading">
          <span>Content flow</span>
          <h2 id="pipeline-title">From source to publication</h2>
        </div>
        <div className="pipeline-flow">
          <div className="pipeline-node pipeline-source">
            <span>Source</span>
            <a
              className="pipeline-source-link"
              href="/downloads/alert-atlas-catalog.xlsx"
              download
            >
              Excel alert catalogue <span aria-hidden="true">↓</span>
            </a>
          </div>
          <span className="pipeline-arrow" aria-hidden="true">→</span>
          <div className="pipeline-node pipeline-transform">
            <span>Transform</span>
            <strong>Python generation and extraction</strong>
          </div>
          <span className="pipeline-arrow" aria-hidden="true">→</span>
          <div className="pipeline-node pipeline-structured">
            <span>Structured data</span>
            <strong>Reusable JSON alert records</strong>
          </div>
          <span className="pipeline-arrow" aria-hidden="true">→</span>
          <div className="pipeline-node pipeline-publish pipeline-outputs">
            <span>Publish</span>
            <strong>Website</strong>
            <strong>PDF handbook</strong>
            <strong>Grounded AI assistant</strong>
          </div>
        </div>
        <div className="reuse-map" aria-labelledby="reuse-map-title">
          <h3 id="reuse-map-title">Content reuse</h3>
          <div className="reuse-flow">
            <div className="reuse-source">
              <span>Maintain once</span>
              <strong>Glossary definition</strong>
            </div>
            <span className="reuse-arrow" aria-hidden="true">→</span>
            <div className="reuse-destinations" aria-label="Reused in three places">
              <span className="reuse-destination glossary">Glossary page</span>
              <span className="reuse-destination tooltip">Table tooltips</span>
              <span className="reuse-destination detail">Alert detail tooltips</span>
            </div>
          </div>
        </div>
      </section>
      <div className="about-sections">
        <section>
          <h2>Why it exists</h2>
          <p>This alert documentation generator turns a spreadsheet-based coffee machine alert catalogue into a searchable website, downloadable PDF, and grounded AI assistant. It keeps support information easy to find, understand, and maintain.</p>
        </section>
        <section>
          <h2>Reusable content</h2>
          <p>One structured dataset powers the website, handbook, and AI assistant. Glossary definitions are maintained in one central list and reused on the reference page and in relevant tooltips.</p>
        </section>
        <section>
          <h2>How it was built</h2>
          <p>I designed the information architecture, alert taxonomy, data pipeline, interface, and accessibility behavior. OpenAI Codex assisted with implementation and iteration. I reviewed the work, tested the outputs, and made all final product decisions.</p>
          <a
            className="about-source-link"
            href="https://github.com/danielngkj/portfolio-alert-generator"
          >
            View source on GitHub <span aria-hidden="true">↗</span>
          </a>
          <a
            className="about-source-link"
            href="/chatbot"
            onClick={(event) => { event.preventDefault(); onNavigate("/chatbot"); }}
          >
            How the chatbot works <span aria-hidden="true">→</span>
          </a>
        </section>
        <section>
          <h2>Fictional by design</h2>
          <p>ACME COFFEE, its coffee machine models, alerts, and guidance are fictional. This project is not associated with any real manufacturer and is not intended for use with real equipment.</p>
        </section>
      </div>
      <section className="project-resources" aria-labelledby="project-resources-title">
        <div className="project-resources-copy">
          <h2 id="project-resources-title">Project resources</h2>
          <p>The downloadable Excel catalogue is the active source used to generate this website and PDF. Its synthetic text includes occasional intentional human-style errors for demonstration purposes.</p>
        </div>
        <div className="project-resource-links">
          <a href="/downloads/alert-atlas-catalog.xlsx" download>
            Download Excel catalogue <span aria-hidden="true">↓</span>
          </a>
          <a href="https://github.com/danielngkj/portfolio-alert-generator">
            View source on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}

function FlowIcon({ name }) {
  const paths = {
    question: <><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2h3A3.5 3.5 0 0 1 15 5.5v3a3.5 3.5 0 0 1-3.5 3.5H9l-3.5 2v-2.7A3.5 3.5 0 0 1 5 8.5v-3Z" /><path d="M9.2 6.2a1.5 1.5 0 1 1 2.3 1.3c-.8.4-1 .7-1 1.3M10.5 10.7h.01" /></>,
    widget: <><rect x="2.5" y="3" width="13" height="11" rx="1.5" /><path d="M2.5 6h13M6 9h2M10 9h3M6 11.5h5" /></>,
    api: <><rect x="3" y="2.5" width="12" height="3" rx="1" /><rect x="3" y="7" width="12" height="3" rx="1" /><rect x="3" y="11.5" width="12" height="3" rx="1" /><path d="M5.5 4h.01M5.5 8.5h.01M5.5 13h.01" /></>,
    evidence: <><path d="M4 2.5h6l3 3v8.8a1.2 1.2 0 0 1-1.2 1.2H4a1.2 1.2 0 0 1-1.2-1.2V3.7A1.2 1.2 0 0 1 4 2.5Z" /><path d="M10 2.8V6h3M6 9h4M6 11.5h3" /><circle cx="12.5" cy="12" r="2.3" /><path d="m14.2 13.7 1.5 1.5" /></>,
    response: <><path d="M4 2.5h6l3 3v8.8a1.2 1.2 0 0 1-1.2 1.2H4a1.2 1.2 0 0 1-1.2-1.2V3.7A1.2 1.2 0 0 1 4 2.5Z" /><path d="M10 2.8V6h3M5.5 10l2 2 4-4" /></>,
  };
  return <svg className="chatbot-flow-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" aria-hidden="true">{paths[name]}</svg>;
}

function ChatbotPage({ onNavigate, currentPath }) {
  return (
    <main className="group-page-shell">
      <SiteBanner onNavigate={onNavigate} currentPath={currentPath} />
      <header className="group-page-header" id="main-content" tabIndex="-1">
        <span>Portfolio project</span>
        <h1 data-route-heading tabIndex="-1">How the chatbot works</h1>
        <p>See how a visitor’s question becomes a cited answer based on the alert documentation.</p>
      </header>

      <section className="chatbot-architecture" aria-labelledby="chatbot-architecture-title">
        <div className="chatbot-architecture-heading">
          <span>Overview</span>
          <h2 id="chatbot-architecture-title">From question to useful answer</h2>
        </div>
        <div className="chatbot-flow" aria-label="Chatbot request flow diagram">
          <div className="chatbot-flow-node"><FlowIcon name="question" /><span>01 · Ask</span><strong>Visitor question</strong><small>“What should the operator do?”</small></div>
          <span className="chatbot-flow-arrow" aria-hidden="true">→</span>
          <div className="chatbot-flow-node"><FlowIcon name="widget" /><span>02 · Send</span><strong>Portal widget</strong><small>Simple chat interface in Alert atlas</small></div>
          <span className="chatbot-flow-arrow" aria-hidden="true">→</span>
          <div className="chatbot-flow-node"><FlowIcon name="api" /><span>03 · Find</span><strong>Chat API</strong><small>Searches the alert documentation index</small></div>
          <span className="chatbot-flow-arrow" aria-hidden="true">→</span>
          <div className="chatbot-flow-node"><FlowIcon name="evidence" /><span>04 · Find support</span><strong>Relevant evidence</strong><small>Accepted alert sources and metadata</small></div>
          <span className="chatbot-flow-arrow" aria-hidden="true">→</span>
          <div className="chatbot-flow-node"><FlowIcon name="response" /><span>05 · Return</span><strong>Cited response</strong><small>Answer, citations, and expandable sources</small></div>
        </div>
      </section>

      <div className="chatbot-overview-sections">
        <section>
          <h2>What I built</h2>
          <p>The portal sends a visitor’s question to a separate API, which retrieves relevant alert documentation before generating a cited answer.</p>
        </section>
        <section>
          <h2>How it was created</h2>
          <p>A structured alert dataset powers retrieval and source metadata. A dependency-free web component keeps the interface embeddable, while the stable API keeps the portal separate from the chatbot runtime.</p>
        </section>
        <section>
          <h2>Evidence and safety</h2>
          <p>Answers use relevant alert documentation, retain citations, and expose supporting sources. When the documentation cannot support an answer, the chatbot refuses rather than filling the gap with general knowledge. The browser never receives the provider key or direct index access.</p>
        </section>
      </div>
      <section className="chatbot-try-it" aria-label="Try Ask AI from the portal">
        <div>
          <span>Try it</span>
          <p>Use the floating `Ask AI` button on any page to open the assistant without leaving the alert catalogue.</p>
        </div>
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}

function App() {
  const [initialViewState] = useState(loadViewState);
  const controlsSentinelRef = useRef(null);
  const [path, setPath] = useState(window.location.pathname);
  const previousPathRef = useRef(path);
  const [compactSearch, setCompactSearch] = useState(false);
  const [query, setQuery] = useState(initialViewState.query);
  const [type, setType] = useState(initialViewState.type);
  const [severity, setSeverity] = useState(initialViewState.severity);
  const [majorGroup, setMajorGroup] = useState(initialViewState.majorGroup);
  const [systemArea, setSystemArea] = useState(initialViewState.systemArea);
  const [model, setModel] = useState(initialViewState.model);
  const [sortConfig, setSortConfig] = useState(initialViewState.sortConfig);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (previousPathRef.current === path) return undefined;
    previousPathRef.current = path;
    const focusFrame = window.requestAnimationFrame(() => {
      document.querySelector("[data-route-heading]")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [path]);

  useEffect(() => {
    sessionStorage.setItem("alert-atlas-view", JSON.stringify({
      query, type, severity, majorGroup, systemArea, model, sortConfig,
    }));
  }, [query, type, severity, majorGroup, systemArea, model, sortConfig]);

  useEffect(() => {
    const sentinel = controlsSentinelRef.current;
    if (!sentinel) {
      setCompactSearch(false);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setCompactSearch(!entry.isIntersecting && entry.boundingClientRect.top < 10),
      { rootMargin: "-10px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [path]);

  const route = decodeURIComponent(path.replace(/^\/+|\/+$/g, ""));
  const isGlossary = route === "glossary";
  const isSitemap = route === "sitemap";
  const isAbout = route === "about";
  const isChatbot = route === "chatbot";
  const alertId = isGlossary || isSitemap || isAbout || isChatbot ? "" : route;
  const selectedAlert = alertId ? alerts.find((alert) => alert.ID === alertId) : null;

  const navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(window.location.pathname);
    if (window.location.hash) {
      window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "smooth" }), 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navigateToTaxonomy = (nextGroup, nextSystemArea) => {
    setMajorGroup(nextGroup);
    setSystemArea(nextSystemArea);
    navigate("/");
  };

  const systemAreaOptions = useMemo(() => [...new Set(alerts
    .filter((alert) => type === ALL || alert.Type === type)
    .filter((alert) => severity === ALL || alert.Severity === severity)
    .filter((alert) => majorGroup === ALL || alert["Major Group"] === majorGroup)
    .filter((alert) => matchesModel(alert, model))
    .filter((alert) => matchesQuery(alert, query))
    .map((alert) => alert["System Area"])
    .filter(Boolean))].sort(), [query, type, severity, majorGroup, model]);

  useEffect(() => {
    if (systemArea !== ALL && !systemAreaOptions.includes(systemArea)) {
      setSystemArea(ALL);
    }
  }, [systemArea, systemAreaOptions]);

  const filteredAlerts = useMemo(() => {
    const valueForSort = (alert) => {
      switch (sortConfig.field) {
        case "id": return Number(alert.ID);
        case "severity": return severityOrder[alert.Severity];
        case "title": return alert["Alert Title"];
        case "type": return alert.Type;
        case "systemArea": return alert["System Area"];
        case "model": return alert.Model;
        case "updated": return alert["Last Update"];
        default: return alert["Alert Title"];
      }
    };
    return alerts
      .filter((alert) => type === ALL || alert.Type === type)
      .filter((alert) => severity === ALL || alert.Severity === severity)
      .filter((alert) => majorGroup === ALL || alert["Major Group"] === majorGroup)
      .filter((alert) => systemArea === ALL || alert["System Area"] === systemArea)
      .filter((alert) => matchesModel(alert, model))
      .filter((alert) => matchesQuery(alert, query))
      .toSorted((a, b) => {
        const aValue = valueForSort(a);
        const bValue = valueForSort(b);
        const comparison = typeof aValue === "number"
          ? aValue - bValue
          : String(aValue ?? "").localeCompare(String(bValue ?? ""));
        return comparison * (sortConfig.direction === "asc" ? 1 : -1) || Number(a.ID) - Number(b.ID);
      });
  }, [query, type, severity, majorGroup, systemArea, model, sortConfig]);

  const handleSort = (field) => {
    setSortConfig((current) => ({
      field,
      direction: current.field === field
        ? (current.direction === "asc" ? "desc" : "asc")
        : (field === "updated" ? "desc" : "asc"),
    }));
  };

  const clearFilters = () => {
    setQuery(""); setType(ALL); setSeverity(ALL); setMajorGroup(ALL); setSystemArea(ALL); setModel(ALL);
  };
  const hasFilters = query.trim() || [type, severity, majorGroup, systemArea, model].some((value) => value !== ALL);

  const counts = alerts.reduce((result, alert) => {
    result[alert.Type] = (result[alert.Type] || 0) + 1;
    return result;
  }, {});
  const recentAlerts = useMemo(() => alerts
    .toSorted((a, b) => b["Last Update"].localeCompare(a["Last Update"]) || Number(b.ID) - Number(a.ID))
    .slice(0, 6), []);

  useEffect(() => {
    document.title = isGlossary
      ? "Glossary · Alert atlas"
      : isSitemap
        ? "Sitemap · Alert atlas"
      : isAbout
        ? "About · Alert atlas"
      : isChatbot
        ? "How the chatbot works · Alert atlas"
      : alertId && selectedAlert
        ? `${selectedAlert["Alert Title"]} · Alert atlas`
        : "Alert atlas";
  }, [alertId, isAbout, isChatbot, isGlossary, isSitemap, selectedAlert]);

  if (isGlossary) {
    return <GlossaryPage onNavigate={navigate} currentPath={path} />;
  }

  if (isSitemap) {
    return (
      <SitemapPage
        onOpenAlert={(id) => navigate(`/${id}`)}
        onNavigate={navigate}
        currentPath={path}
      />
    );
  }

  if (isAbout) {
    return <AboutPage onNavigate={navigate} currentPath={path} />;
  }

  if (isChatbot) {
    return <ChatbotPage onNavigate={navigate} currentPath={path} />;
  }

  if (alertId) {
    return (
      <AlertDetail
        alert={selectedAlert}
        onBack={() => navigate("/")}
        onOpenAlert={(id) => navigate(`/${id}`)}
        onSelectTaxonomy={navigateToTaxonomy}
        onNavigate={navigate}
        currentPath={path}
      />
    );
  }

  return (
    <main>
      <SiteBanner onNavigate={navigate} currentPath={path} />
      <header className="hero" id="main-content" tabIndex="-1">
        <div className="hero-copy">
          <div>
            <h1 data-route-heading tabIndex="-1">Help with your coffee machine</h1>
            <p>Look up an alert and find out what to do next.</p>
          </div>
          <div className="summary" aria-label="Alert summary">
            <div className="summary-stat"><strong>{alerts.length}</strong><span>Total alerts</span></div>
            <div className="summary-stat"><strong>{counts.Critical}</strong><span>Critical</span></div>
            <div className="summary-stat"><strong>{uniqueValues("System Area").length}</strong><span>System areas</span></div>
            <a className="summary-link" href="#recent-updates">Recent updates <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </header>

      <div className="controls-sentinel" ref={controlsSentinelRef} aria-hidden="true" />
      <section className={`controls${compactSearch ? " compact" : ""}`} aria-label="Search and filter alerts">
        <label className="search-field">
          <span className="sr-only">Search alerts</span>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search titles, descriptions, system areas, responses…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <button className="clear-query" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
        </label>
        <GroupTabs value={majorGroup} onChange={(group) => { setMajorGroup(group); setSystemArea(ALL); }} />
        <div className="filter-grid">
          <SelectFilter label="Type" value={type} options={uniqueValues("Type")} onChange={setType} />
          <SelectFilter label="Severity" value={severity} options={uniqueValues("Severity")} onChange={setSeverity} />
          <SelectFilter label="System Area" value={systemArea} options={systemAreaOptions} onChange={setSystemArea} />
          <SelectFilter label="Model" value={model} options={MODEL_OPTIONS} onChange={setModel} />
        </div>
      </section>

      <div className="results-bar">
        <p>
          <strong>{filteredAlerts.length}</strong> {filteredAlerts.length === 1 ? "alert" : "alerts"}
          {majorGroup === ALL ? " found" : <> in <strong>{majorGroup}</strong></>}
        </p>
        <div>
          {hasFilters && <button className="reset" onClick={clearFilters}>Clear all filters</button>}
          <label className="sort-field">Sort by
            <select
              value={sortConfig.field}
              onChange={(event) => setSortConfig({
                field: event.target.value,
                direction: event.target.value === "updated" ? "desc" : "asc",
              })}
            >
              <option value="id">ID</option>
              <option value="severity">Severity</option>
              <option value="updated">Last updated</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
              <option value="systemArea">System Area</option>
            </select>
          </label>
        </div>
      </div>

      {filteredAlerts.length ? (
        <AlertTable
          alerts={filteredAlerts}
          onOpen={(id) => navigate(`/${id}`)}
          sortConfig={sortConfig}
          onSort={handleSort}
          query={query}
        />
      ) : (
        <section className="empty-state">
          <span>0</span><h2>No alerts match</h2><p>Try a broader search or clear your filters.</p>
          <button onClick={clearFilters}>Show all alerts</button>
        </section>
      )}

      <RecentlyUpdated alerts={recentAlerts} onOpen={(id) => navigate(`/${id}`)} />

      <SiteFooter onNavigate={navigate} />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
