"use client";
import { useEffect, useState, type PointerEvent } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  Code2,
  Database,
  Download,
  Ellipsis,
  History,
  LayoutDashboard,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Play,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
  TrendingUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  executeNaturalLanguageQuery,
  getAnalyticsOverview,
  getDatabaseHealth,
  getSchema,
  getCurrentUser,
  startGoogleLogin,
  logout,
  type AuthUser,
  type AnalyticsOverview,
  getQueryHistory,
  type QueryResponse,
  type QueryHistoryItem,
} from "@/lib/api";
import {
  Area,
  AreaChart,
  Bar,
  Cell,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatHistoryDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const relativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};


const customerColors = [
  "bg-amber-500/15 text-amber-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-violet-500/15 text-violet-300",
  "bg-orange-500/15 text-orange-300",
  "bg-pink-500/15 text-pink-300",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

// Format date-like values in generated query results for readability.
// Month columns show values such as "Sep 2026" instead of raw ISO timestamps.
const formatQueryValue = (column: string, value: unknown): string => {
  if (value === null || value === undefined) return "—";

  const columnLooksLikeDate = /month|date|created_at|updated_at/i.test(column);
  if (
    columnLooksLikeDate &&
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)
  ) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
    }
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

type ResultView = "table" | "bar" | "line" | "pie";

const chartPalette = ["#6ee7a0", "#fbbf24", "#a78bfa", "#fb7185", "#38bdf8", "#fb923c"];

const toChartNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.replace(/[$,\\s]/g, "");
    if (/^-?\\d+(?:\\.\\d+)?$/.test(normalized)) {
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
};

type DataInsight = { title: string; detail: string; icon: "trend" | "target" | "layers" };

function buildDataInsights(
  rows: Array<Record<string, unknown>>,
  metricColumn: string | null,
  categoryColumn: string | null,
  isDemo: boolean
): DataInsight[] {
  if (!rows.length || !metricColumn) {
    return [{
      title: "More numeric data needed",
      detail: "Run a query with at least one numeric column to reveal totals, averages, and standout values.",
      icon: "layers",
    }];
  }

  const values = rows.flatMap((row, index) => {
    const value = toChartNumber(row[metricColumn]);
    return value === null ? [] : [{
      value,
      label: categoryColumn && row[categoryColumn] != null
        ? String(row[categoryColumn])
        : `Row ${index + 1}`,
      row,
      index,
    }];
  });
  if (!values.length) return [];

  const total = values.reduce((sum, item) => sum + item.value, 0);
  const average = total / values.length;
  const highest = values.reduce((best, item) => item.value > best.value ? item : best, values[0]);
  const lowest = values.reduce((best, item) => item.value < best.value ? item : best, values[0]);
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const share = total !== 0 ? Math.abs((highest.value / total) * 100) : null;
  const metricLabel = metricColumn.replaceAll("_", " ");
  const sourcePrefix = isDemo ? "Sample data: " : "From the returned rows: ";

  const insights: DataInsight[] = [
    {
      title: "Highest value",
      detail: `${highest.label} has the highest ${metricLabel} (${numberFormat.format(highest.value)}).`,
      icon: "target",
    },
    {
      title: "Average per row",
      detail: `The average ${metricLabel} across ${values.length} numeric row${values.length === 1 ? "" : "s"} is ${numberFormat.format(average)}.`,
      icon: "trend",
    },
    {
      title: "Range and concentration",
      detail: `Values range from ${numberFormat.format(lowest.value)} to ${numberFormat.format(highest.value)}.${share === null ? "" : ` The highest row represents ${numberFormat.format(share)}% of the absolute total.`}`,
      icon: "layers",
    },
  ];

  // Detect a trend only when the category labels can reliably be interpreted as dates/months.
  if (categoryColumn && values.length >= 2) {
    const dated = values.map((item) => {
      const date = new Date(item.label);
      return { ...item, timestamp: date.getTime() };
    });
    const allDatesValid = dated.every((item) => Number.isFinite(item.timestamp)) &&
      /date|month|time|day|week|year|created|updated/i.test(categoryColumn);

    if (allDatesValid) {
      dated.sort((a, b) => a.timestamp - b.timestamp);
      const first = dated[0];
      const last = dated[dated.length - 1];
      const delta = last.value - first.value;
      const percent = first.value !== 0 ? (delta / Math.abs(first.value)) * 100 : null;
      const direction = delta > 0 ? "increased" : delta < 0 ? "decreased" : "stayed flat";
      insights.push({
        title: "Period trend",
        detail: `${metricLabel} ${direction} from ${numberFormat.format(first.value)} (${first.label}) to ${numberFormat.format(last.value)} (${last.label})${percent === null ? "" : `, a ${numberFormat.format(Math.abs(percent))}% ${delta >= 0 ? "increase" : "decrease"}`}.`,
        icon: "trend",
      });
    }
  }

  // Use the 1.5×IQR rule for potential outliers; require enough observations to avoid
  // over-interpreting very small result sets.
  if (values.length >= 5) {
    const sorted = values.map((item) => item.value).sort((a, b) => a - b);
    const medianOf = (items: number[]) => {
      const mid = Math.floor(items.length / 2);
      return items.length % 2 ? items[mid] : (items[mid - 1] + items[mid]) / 2;
    };
    const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const upperHalf = sorted.slice(Math.ceil(sorted.length / 2));
    const q1 = medianOf(lowerHalf);
    const q3 = medianOf(upperHalf);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter((item) => item.value < lowerBound || item.value > upperBound);

    if (outliers.length) {
      const examples = outliers.slice(0, 3).map((item) =>
        `${item.label} (${numberFormat.format(item.value)})`
      ).join(", ");
      insights.push({
        title: "Potential anomalies",
        detail: `${outliers.length} row${outliers.length === 1 ? "" : "s"} fall outside the 1.5×IQR range. Review ${examples}${outliers.length > 3 ? ", and other flagged rows" : ""}; these are statistical flags, not proof of an error.`,
        icon: "target",
      });
    } else {
      insights.push({
        title: "Outlier check",
        detail: "No values fall outside the 1.5×IQR range in these returned rows.",
        icon: "layers",
      });
    }
  } else {
    insights.push({
      title: "Anomaly check",
      detail: "At least five numeric rows are needed for a more useful outlier check; this result set is too small to flag anomalies reliably.",
      icon: "layers",
    });
  }

  // Recommendations are deliberately descriptive and grounded only in this result set.
  if (share !== null && values.length >= 2 && share >= 50) {
    insights.push({
      title: "Business recommendation",
      detail: `${highest.label} contributes about ${numberFormat.format(share)}% of the absolute ${metricLabel} total in these rows. Validate whether this concentration is expected and consider tracking the remaining categories separately.`,
      icon: "target",
    });
  } else if (values.length >= 2 && Math.abs(highest.value - lowest.value) <= Math.max(Math.abs(average) * 0.1, 0.000001)) {
    insights.push({
      title: "Business recommendation",
      detail: `The returned ${metricLabel} values are relatively similar. Compare additional segments or a longer time window before prioritizing one category over another.`,
      icon: "layers",
    });
  } else {
    insights.push({
      title: "Business recommendation",
      detail: `Use the highest ${metricLabel} row (${highest.label}) as a starting point for follow-up analysis, and compare it with a longer period or another segment before making business decisions.`,
      icon: "trend",
    });
  }

  return insights.map((insight) => ({ ...insight, detail: sourcePrefix + insight.detail }));
}

type SavedQuery = { id: string; name: string; question: string; createdAt: string };

const getSavedQueriesKey = (userId: string) => `querymind:saved-queries:v1:${userId}`;

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Ask your data", icon: MessageSquareText },
  { label: "Query history", icon: History },
];

export default function Home() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [question, setQuestion] = useState(
    "Show me the top 5 customers by revenue"
  );
  const [activeNav, setActiveNav] = useState("Overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSql, setShowSql] = useState(true);
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dbStatus, setDbStatus] = useState<
    "checking" | "connected" | "unavailable"
  >("checking");
  const [schemaTables, setSchemaTables] = useState<string[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [resultView, setResultView] = useState<ResultView>("table");
  const [demoMode, setDemoMode] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [savedQueryNotice, setSavedQueryNotice] = useState<string | null>(null);
  const [sceneTilt, setSceneTilt] = useState({ x: 0, y: 0 });

  function handleScenePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setSceneTilt({ x: (0.5 - y) * 10, y: (x - 0.5) * 16 });
  }

  function resetSceneTilt() {
    setSceneTilt({ x: 0, y: 0 });
  }

  async function handleLogout() {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setAuthError(null);
    try {
      await logout();
    } catch {
      // Clear the local UI even if the logout request cannot reach the server.
    } finally {
      setUser(null);
      setQueryHistory([]);
      setQueryResult(null);
      setQueryError(null);
      setSavedQueries([]);
      setSavedQueryNotice(null);
      setLogoutLoading(false);
    }
  }

  // Derive chart configuration from the current query result. Keep this inside
  // the component so it updates whenever a new result is loaded.
  const chartColumns = queryResult?.columns ?? [];
  const chartRows = queryResult?.rows ?? [];
  const chartMetricColumn = chartColumns.find((column) =>
    chartRows.some((row) => toChartNumber(row[column]) !== null)
  ) ?? null;
  const chartCategoryColumn = chartColumns.find((column) =>
    column !== chartMetricColumn && chartRows.some((row) => {
      const value = row[column];
      return value !== null && value !== undefined && toChartNumber(value) === null;
    })
  ) ?? chartColumns.find((column) => column !== chartMetricColumn) ?? null;
  const queryChartData: Array<{ label: string; value: number }> = chartMetricColumn
    ? chartRows.slice(0, 100).flatMap((row, index) => {
        const value = toChartNumber(row[chartMetricColumn]);
        if (value === null) return [];
        const rawLabel = chartCategoryColumn ? row[chartCategoryColumn] : `Row ${index + 1}`;
        const label = rawLabel === null || rawLabel === undefined || String(rawLabel).trim() === ""
          ? `Row ${index + 1}`
          : String(rawLabel);
        return [{ label, value }];
      })
    : [];
  const dataInsights = buildDataInsights(
    chartRows as Array<Record<string, unknown>>,
    chartMetricColumn,
    chartCategoryColumn,
    Boolean(queryResult?.explanation.startsWith("DEMO DATA:"))
  );

  useEffect(() => {
    function handleGlobalSearchShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key === "/" && !isTyping && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => {
          document.getElementById("querymind-global-search")?.focus();
        }, 0);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }

    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  function chooseSearchResult(kind: "nav" | "table" | "saved" | "history", value: string) {
    if (kind === "nav") {
      setActiveNav(value);
    } else if (kind === "table") {
      setActiveNav("Ask your data");
      setQuestion(`Show me the data from ${value}`);
    } else if (kind === "saved") {
      const saved = savedQueries.find((item) => item.id === value);
      if (saved) {
        setQuestion(saved.question);
        setActiveNav("Ask your data");
      }
    } else if (kind === "history") {
      setActiveNav("Query history");
      setExpandedHistoryId(value);
    }
    setSearchOpen(false);
    setSearchQuery("");
  }

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
          setAuthError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (authLoading || !user) return;

    // Defer localStorage hydration until the authenticated user's ID is known.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(getSavedQueriesKey(user.id));
        if (!raw) {
          setSavedQueries([]);
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedQueries(parsed.filter((item): item is SavedQuery =>
            item && typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.question === "string" &&
            typeof item.createdAt === "string"
          ));
        } else {
          setSavedQueries([]);
        }
      } catch {
        setSavedQueries([]);
        setSavedQueryNotice("Saved queries could not be loaded from this browser.");
      }
    });
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  function persistSavedQueries(next: SavedQuery[]) {
    if (!user) return;
    setSavedQueries(next);
    try {
      window.localStorage.setItem(getSavedQueriesKey(user.id), JSON.stringify(next));
      setSavedQueryNotice(null);
    } catch {
      setSavedQueryNotice("Unable to save in this browser. Check local storage settings.");
    }
  }

  function saveCurrentQuery() {
    const trimmed = question.trim();
    if (trimmed.length < 3) {
      setSavedQueryNotice("Enter a question before saving it.");
      return;
    }
    const name = window.prompt("Name this saved query", trimmed.slice(0, 60));
    if (name === null) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setSavedQueryNotice("Saved query name cannot be empty.");
      return;
    }
    const duplicate = savedQueries.some((item) => item.question === trimmed);
    if (duplicate) {
      setSavedQueryNotice("This question is already saved.");
      return;
    }
    persistSavedQueries([
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanName, question: trimmed, createdAt: new Date().toISOString() },
      ...savedQueries,
    ]);
    setSavedQueryNotice("Query saved in this browser.");
  }

  function renameSavedQuery(item: SavedQuery) {
    const name = window.prompt("Rename saved query", item.name);
    if (name === null) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setSavedQueryNotice("Saved query name cannot be empty.");
      return;
    }
    persistSavedQueries(savedQueries.map((saved) => saved.id === item.id ? { ...saved, name: cleanName } : saved));
    setSavedQueryNotice("Saved query renamed.");
  }

  function deleteSavedQuery(item: SavedQuery) {
    if (!window.confirm(`Delete saved query “${item.name}”?`)) return;
    persistSavedQueries(savedQueries.filter((saved) => saved.id !== item.id));
    setSavedQueryNotice("Saved query deleted.");
  }

  async function loadQueryHistory() {
    setHistoryLoading(true);
    try {
      const result = await getQueryHistory();
      setQueryHistory(result.history);
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to load query history.");
    } finally {
      setHistoryLoading(false);
    }
  }


  useEffect(() => {
    let cancelled = false;
    if (authLoading || !user) return;

    // Load only after the current session has been verified.
    getQueryHistory()
      .then((result) => {
        if (cancelled) return;
        setQueryHistory(result.history);
        setHistoryError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setHistoryError(
          error instanceof Error ? error.message : "Unable to load query history."
        );
      });

    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading || !user) return;

    async function loadAnalytics() {
      try {
        const result = await getAnalyticsOverview();
        if (!cancelled) {
          setAnalytics(result);
          setAnalyticsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalyticsError(
            error instanceof Error
              ? error.message
              : "Unable to load live analytics from PostgreSQL."
          );
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading || !user) return;

    async function loadDatabaseStatus() {
      try {
        const result = await getDatabaseHealth();
        if (!cancelled) {
          setDbStatus(
            result.database === "connected" ? "connected" : "unavailable"
          );
        }
      } catch {
        if (!cancelled) setDbStatus("unavailable");
      }
    }

    async function loadSchema() {
      try {
        const result = await getSchema();
        if (!cancelled) {
          setSchemaTables(result.tables);
          setSchemaError(null);
        }
      } catch {
        if (!cancelled) setSchemaError("Unable to load database tables.");
      } finally {
        if (!cancelled) setSchemaLoading(false);
      }
    }

    void loadDatabaseStatus();
    void loadSchema();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  async function runQuery() {
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 3 || loading) return;

    setLoading(true);
    setHasRun(false);
    setQueryError(null);
    setQueryResult(null);

    try {
      if (demoMode) {
        // Local, clearly labeled sample results. This branch never calls the backend or Gemini.
        const normalizedQuestion = trimmedQuestion.toLowerCase();
        let columns: string[];
        let rows: Array<Record<string, unknown>>;
        let sql: string;
        let explanation: string;

        if (normalizedQuestion.includes("month") || normalizedQuestion.includes("trend")) {
          columns = ["month", "revenue", "orders"];
          rows = [
            { month: "Jan 2026", revenue: 4280, orders: 18 },
            { month: "Feb 2026", revenue: 5120, orders: 22 },
            { month: "Mar 2026", revenue: 4760, orders: 20 },
            { month: "Apr 2026", revenue: 6340, orders: 27 },
            { month: "May 2026", revenue: 5890, orders: 24 },
            { month: "Jun 2026", revenue: 7210, orders: 31 },
          ];
          sql = "-- DEMO ONLY: monthly revenue sample\nSELECT month, revenue, orders FROM demo_monthly_revenue ORDER BY month;";
          explanation = "DEMO DATA: Sample monthly revenue and order counts for chart and export testing. No database query was executed.";
        } else if (normalizedQuestion.includes("order")) {
          columns = ["month", "orders", "revenue"];
          rows = [
            { month: "Jan 2026", orders: 18, revenue: 4280 },
            { month: "Feb 2026", orders: 22, revenue: 5120 },
            { month: "Mar 2026", orders: 20, revenue: 4760 },
            { month: "Apr 2026", orders: 27, revenue: 6340 },
            { month: "May 2026", orders: 24, revenue: 5890 },
          ];
          sql = "-- DEMO ONLY: sample order summary\nSELECT month, orders, revenue FROM demo_order_summary ORDER BY month;";
          explanation = "DEMO DATA: Example order summary for testing. These are fixed sample values, not live database results.";
        } else {
          columns = ["customer_name", "orders", "revenue"];
          rows = [
            { customer_name: "Aarav Sharma", orders: 8, revenue: 1240.5 },
            { customer_name: "Priya Patel", orders: 7, revenue: 1085.0 },
            { customer_name: "Rohan Verma", orders: 6, revenue: 940.75 },
            { customer_name: "Ananya Singh", orders: 5, revenue: 815.25 },
            { customer_name: "Kabir Mehta", orders: 4, revenue: 690.0 },
          ];
          sql = "-- DEMO ONLY: top customers sample\nSELECT customer_name, orders, revenue FROM demo_top_customers ORDER BY revenue DESC LIMIT 5;";
          explanation = "DEMO DATA: Fixed sample customer revenue values for testing the table, charts, and CSV/JSON downloads. No Gemini request or database query was made.";
        }

        setQueryResult({
          question: trimmedQuestion,
          sql,
          explanation,
          columns,
          rows,
          rowCount: rows.length,
          durationMs: 1,
        });
        setHasRun(true);
        setQueryError(null);
        setResultView("table");
        return;
      }

      const result = await executeNaturalLanguageQuery(trimmedQuestion);
      setQueryResult(result);
      setHasRun(true);
    } catch (error) {
      setQueryError(
        error instanceof Error
          ? error.message
          : "Unable to execute the query. Please try again."
      );
    } finally {
      setLoading(false);
      if (!demoMode) void loadQueryHistory();
    }
  }

  const downloadQueryFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportQueryResultsJSON = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    downloadQueryFile(
      JSON.stringify(queryResult.rows, null, 2),
      "querymind-results.json",
      "application/json"
    );
  };

  const exportQueryResultsCSV = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const columns = queryResult.columns;
    const escapeCSV = (value: unknown): string => {
      let text = "";
      if (value !== null && value !== undefined) {
        text = typeof value === "object" ? JSON.stringify(value) : String(value);
      }
      // Prevent CSV formula injection when opening the file in spreadsheet apps.
      if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csvRows = [
      columns.map(escapeCSV).join(","),
      ...queryResult.rows.map((row) =>
        columns.map((column) => escapeCSV(row[column])).join(",")
      ),
    ];
    downloadQueryFile("\uFEFF" + csvRows.join("\r\n"), "querymind-results.csv", "text/csv");
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0c0e0c] text-[#e9ece7]">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <LoaderCircle size={20} className="animate-spin text-emerald-300" />
          Verifying your QueryMind session...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="qm-login qm-login-page relative min-h-screen overflow-hidden bg-[#080d0a] text-[#eef7f0]">
        <style jsx global>{`
          .qm-login { isolation: isolate; }
          /* Desktop: fit the complete login experience in one viewport. */
          .qm-login-page { height: 100vh; height: 100dvh; min-height: 0 !important; overflow: hidden; }
          .qm-login-layout { height: 100%; min-height: 0 !important; }
          .qm-login-stage { transition: transform 180ms ease-out; will-change: transform; animation: none; }
          @media (min-width: 1024px) {
            .qm-login-layout { grid-template-columns: minmax(0,1.2fr) minmax(340px,.8fr); overflow: hidden; }
            .qm-login-layout > section { min-height: 0; padding-top: 16px !important; padding-bottom: 16px !important; }
            .qm-login-layout > section:first-child { justify-content: center; }
            .qm-login-layout > section:first-child > div:nth-child(2) { margin-top: 18px !important; }
            .qm-login-layout .qm-login-scene { min-height: clamp(190px, 29vh, 300px); max-height: 32vh; margin-top: 16px !important; }
            .qm-login-layout .qm-login-stage { scale: .78; }
            .qm-login-layout > section:first-child > div:last-child { margin-top: 12px !important; }
            .qm-login-layout > section:last-child > div { max-height: calc(100dvh - 24px); }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden { padding: 20px !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden .mb-8 { margin-bottom: 14px !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden .mt-8 { margin-top: 18px !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden .my-7 { margin-top: 14px !important; margin-bottom: 14px !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden .mt-8.border-t { margin-top: 18px !important; padding-top: 12px !important; }
            .qm-login-layout > section:last-child > div > p { margin-top: 8px !important; }
          }
          @media (min-width: 1024px) and (max-height: 760px) {
            .qm-login-layout > section { padding-top: 8px !important; padding-bottom: 8px !important; }
            .qm-login-layout > section:first-child > div:nth-child(2) { margin-top: 10px !important; }
            .qm-login-layout > section:first-child > div:nth-child(2) p { margin-top: 10px !important; line-height: 1.5 !important; }
            .qm-login-layout .qm-login-scene { min-height: 180px; max-height: 25vh; margin-top: 10px !important; }
            .qm-login-layout .qm-login-stage { scale: .65; }
            .qm-login-layout > section:first-child > div:last-child { margin-top: 8px !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden { padding: 16px !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden h2 { font-size: 1.65rem !important; }
            .qm-login-layout > section:last-child > div > div.relative.overflow-hidden .space-y-4 { gap: 10px !important; }
          }
          @media (max-width: 1023px) {
            .qm-login-page { height: auto; min-height: 100vh !important; min-height: 100dvh !important; overflow-x: hidden; overflow-y: auto; }
            .qm-login-layout { height: auto; min-height: 100vh !important; min-height: 100dvh !important; }
          }
          .qm-login-scene { min-height: 390px; perspective: 1100px; isolation: isolate; }
          .qm-login-grid {
            background-image: linear-gradient(rgba(52,211,153,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,.075) 1px,transparent 1px);
            background-size: 30px 30px;
            transform: perspective(450px) rotateX(58deg) scale(1.8);
            transform-origin: center bottom;
            mask-image: linear-gradient(to bottom,transparent,black);
          }
          .qm-login-stage { width: 320px; height: 290px; transform-style: preserve-3d; animation: qm-login-float 5s ease-in-out infinite; }
          .qm-login-database { position:absolute; inset:35px 55px 65px; transform-style:preserve-3d; transform:rotateX(-12deg) rotateY(-22deg); }
          .qm-login-db-layer { position:absolute; left:0; width:210px; height:72px; transform-style:preserve-3d; }
          .qm-login-db-layer-1 { top:0; }
          .qm-login-db-layer-2 { top:53px; }
          .qm-login-db-layer-3 { top:106px; }
          .qm-login-db-top { position:absolute; inset:0; z-index:2; height:45px; border:2px solid #6ee7b7; border-radius:50%; background:radial-gradient(ellipse,#164e36 0%,#052e20 65%,#10b981 100%); box-shadow:0 0 18px #10b98155,inset 0 0 18px #34d39944; }
          .qm-login-db-body { position:absolute; top:22px; width:210px; height:45px; border-right:2px solid #34d399; border-left:2px solid #34d399; background:linear-gradient(90deg,#071b12,#14532d 45%,#071b12); box-shadow:inset 0 0 22px #10b98133,0 8px 18px #0008; }
          .qm-login-db-bottom { position:absolute; top:44px; width:210px; height:45px; border:2px solid #10b981; border-radius:50%; box-shadow:0 0 18px #10b98166; }
          .qm-login-db-lights { display:flex; gap:7px; position:absolute; right:14px; top:19px; }
          .qm-login-db-lights span { width:4px; height:4px; border-radius:50%; background:#6ee7b7; box-shadow:0 0 8px #34d399; animation:qm-login-blink 1.8s ease-in-out infinite alternate; }
          .qm-login-db-lights span:nth-child(2) { animation-delay:.3s; }
          .qm-login-db-lights span:nth-child(3) { animation-delay:.6s; }
          .qm-login-db-lights span:nth-child(4) { animation-delay:.9s; }
          .qm-login-ring { position:absolute; left:50%; top:48%; width:275px; height:85px; border:1px solid #34d39988; border-radius:50%; transform:translate(-50%,-50%) rotateX(65deg); box-shadow:0 0 20px #10b98122; }
          .qm-login-ring-two { width:310px; height:110px; border-color:#10b98144; animation:qm-login-ring-pulse 3s ease-in-out infinite; }
          .qm-login-base { position:absolute; bottom:8px; left:50%; display:flex; align-items:center; gap:9px; width:235px; padding:15px; border:1px solid #34d39966; border-radius:12px; background:linear-gradient(135deg,#153c29,#08140d); color:#a7f3d0; box-shadow:0 15px 35px #0009,0 0 24px #10b98122; transform:translateX(-50%) rotateX(8deg); }
          .qm-login-live-dot { width:6px; height:6px; margin-left:auto; border-radius:50%; background:#6ee7b7; box-shadow:0 0 10px #34d399; }
          .qm-login-float-card { position:absolute; z-index:5; display:flex; align-items:center; gap:8px; padding:10px 12px; border:1px solid #34d39944; border-radius:10px; background:#0b1912dd; color:#a7f3d0; font-size:10px; backdrop-filter:blur(12px); box-shadow:0 12px 30px #0005; }
          .qm-login-card-left { top:36px; left:-8px; animation:qm-login-card-float 4s ease-in-out infinite; }
          .qm-login-card-right { top:95px; right:-8px; animation:qm-login-card-float 4s ease-in-out infinite reverse; }
          .qm-login-float-card i { width:5px; height:5px; border-radius:50%; background:#6ee7b7; }
          .qm-login-cube { position:absolute; z-index:4; width:17px; height:17px; border:1px solid #6ee7b7; background:#34d39922; box-shadow:0 0 15px #10b98166; transform:rotate(35deg) skew(-8deg,-8deg); animation:qm-login-cube-float 4s ease-in-out infinite; }
          .qm-login-cube-one { top:90px; left:32px; }
          .qm-login-cube-two { top:150px; right:28px; animation-delay:-1.3s; }
          .qm-login-cube-three { bottom:65px; left:55px; animation-delay:-2s; }
          @keyframes qm-login-float { 0%,100% { transform:translateY(0) rotateX(0); } 50% { transform:translateY(-9px) rotateX(2deg); } }
          @keyframes qm-login-card-float { 0%,100% { translate:0 0; } 50% { translate:0 -8px; } }
          @keyframes qm-login-cube-float { 0%,100% { translate:0 0; } 50% { translate:5px -12px; } }
          @keyframes qm-login-ring-pulse { 0%,100% { opacity:.4; scale:.95; } 50% { opacity:1; scale:1.05; } }
          @keyframes qm-login-blink { from { opacity:.35; } to { opacity:1; } }
          @media(max-width:480px) { .qm-login-scene { min-height:330px; } .qm-login-stage { scale:.85; } .qm-login-card-left { left:-5px; } .qm-login-card-right { right:-5px; } }
          @media(prefers-reduced-motion:reduce) { .qm-login-stage { transition:none; } .qm-login-ring-two,.qm-login-float-card,.qm-login-cube,.qm-login-db-lights span { animation:none !important; } }
        `}</style>

        <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-500/[0.12] blur-[120px]" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-green-400/[0.08] blur-[120px]" />

        <div className="qm-login-layout relative mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="flex flex-col justify-center px-5 pb-5 pt-10 sm:px-10 lg:px-14 lg:py-12 xl:px-20">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.12)]">
                <Activity size={23} />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">QueryMind</p>
                <p className="mt-0.5 text-[10px] tracking-[0.22em] text-emerald-200/60">AI DATA INTELLIGENCE</p>
              </div>
            </div>

            <div className="mt-10 max-w-2xl sm:mt-14 lg:mt-16">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-1.5 text-[11px] text-emerald-200">
                <Sparkles size={13} /> YOUR AI-POWERED WORKSPACE
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-[-0.045em] sm:text-5xl xl:text-6xl">
                Your data.<br />
                <span className="bg-gradient-to-r from-emerald-200 via-emerald-400 to-green-500 bg-clip-text text-transparent">One question away.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">
                Ask questions in plain English. Turn complex databases into meaningful answers, visual insights, and smarter decisions.
              </p>
            </div>

            {/* CSS-only 3D database: no image files or 3D library required */}
            <div className="qm-login-scene group relative mt-7 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-emerald-400/15 bg-[#080f0b] sm:mt-9" onPointerMove={handleScenePointerMove} onPointerLeave={resetSceneTilt} onPointerCancel={resetSceneTilt}>
              <div className="qm-login-grid absolute inset-0" />
              <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="qm-login-stage relative" style={{ transform: `rotateX(${sceneTilt.x}deg) rotateY(${sceneTilt.y}deg)` }}>
                <div className="qm-login-ring" />
                <div className="qm-login-ring qm-login-ring-two" />
                <div className="qm-login-database">
                  {[0, 1, 2].map((layer) => (
                    <div key={layer} className={`qm-login-db-layer qm-login-db-layer-${layer + 1}`}>
                      <div className="qm-login-db-top" />
                      <div className="qm-login-db-body">
                        <div className="qm-login-db-lights"><span /><span /><span /><span /></div>
                      </div>
                      <div className="qm-login-db-bottom" />
                    </div>
                  ))}
                </div>
                <div className="qm-login-float-card qm-login-card-left"><Database size={15} /><span>Structured data</span><i /></div>
                <div className="qm-login-float-card qm-login-card-right"><Sparkles size={15} /><span>AI processing</span><i /></div>
                <div className="qm-login-cube qm-login-cube-one" />
                <div className="qm-login-cube qm-login-cube-two" />
                <div className="qm-login-cube qm-login-cube-three" />
                <div className="qm-login-base"><Activity size={16} /><span>QueryMind</span><span className="qm-login-live-dot" /></div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] text-emerald-100/60">
                <span>AI DATA ENGINE</span>
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />Intelligent analytics</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[11px] text-zinc-400 sm:text-xs">
              <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" />Secure sign-in</span>
              <span className="flex items-center gap-2"><Database size={15} className="text-emerald-300" />PostgreSQL</span>
              <span className="flex items-center gap-2"><Sparkles size={15} className="text-emerald-300" />AI-powered analytics</span>
            </div>
          </section>

          <section className="flex items-center justify-center px-5 pb-12 pt-6 sm:px-10 sm:pb-16 lg:px-10 lg:py-12 xl:px-16">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-emerald-400/[0.06] blur-2xl" />
              <div className="relative overflow-hidden rounded-[26px] border border-white/[0.11] bg-gradient-to-br from-[#18211a]/95 via-[#101611]/95 to-[#0c110d]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-9">
                <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-400/[0.08] blur-3xl" />
                <div className="relative">
                  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 shadow-[0_0_30px_rgba(52,211,153,0.08)]"><Activity size={24} /></div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-emerald-200/70">WELCOME TO QUERYMIND</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Think in questions.</h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">Sign in to explore your data, generate SQL, and uncover insights with AI.</p>

                  {authError && <div role="alert" className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-200">{authError}</div>}

                  <button type="button" onClick={startGoogleLogin} className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-200/20 bg-gradient-to-r from-emerald-300 to-green-300 px-4 py-3.5 text-sm font-semibold text-[#092014] shadow-[0_8px_30px_rgba(16,185,129,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(16,185,129,0.22)] active:translate-y-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">G</span>
                    Continue with Google <ArrowRight size={16} className="ml-auto" />
                  </button>

                  <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-white/[0.09]" /><span className="text-[10px] text-zinc-500">SIMPLE · SECURE · SMART</span><div className="h-px flex-1 bg-white/[0.09]" /></div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-emerald-300/10 p-2 text-emerald-200"><MessageSquareText size={16} /></div>
                      <div><p className="text-xs font-medium text-zinc-200">Ask in natural language</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">Explore your database without writing every query by hand.</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-emerald-300/10 p-2 text-emerald-200"><BarChart3 size={16} /></div>
                      <div><p className="text-xs font-medium text-zinc-200">Turn results into insights</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">Analyze results with tables, charts, and query history.</p></div>
                    </div>
                  </div>

                  <p className="mt-8 border-t border-white/[0.08] pt-5 text-center text-[10px] leading-5 text-zinc-500"><ShieldCheck size={13} className="mr-1 inline text-emerald-300" />Secure sign-in · Your session is managed by QueryMind.</p>
                </div>
              </div>
              <p className="mt-5 text-center text-[10px] tracking-wide text-zinc-600">BUILT FOR CURIOUS MINDS</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="qm-dashboard-root min-h-screen bg-[#0c0e0c] text-[#e9ece7]">
      <style jsx global>{`
        /* QueryMind responsive dashboard */
        .qm-dashboard-root,
        .qm-dashboard-root * {
          min-width: 0;
        }

        .qm-dashboard-root {
          width: 100%;
          overflow-x: clip;
        }

        .qm-dashboard-root > div.flex.min-h-screen {
          width: 100%;
          min-width: 0;
        }

        .qm-dashboard-root header {
          min-width: 0;
        }

        .qm-dashboard-root .recharts-responsive-container {
          min-width: 0 !important;
          max-width: 100%;
        }

        .qm-dashboard-root table {
          max-width: 100%;
        }

        .qm-dashboard-root pre {
          max-width: 100%;
          overflow-x: auto;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1023px) {
          .qm-dashboard-root > div.flex.min-h-screen > section {
            width: 100%;
            max-width: 100%;
          }

          .qm-dashboard-root header {
            gap: 8px;
            padding-left: 12px;
            padding-right: 12px;
          }

          .qm-dashboard-root header > div:last-child {
            flex-shrink: 0;
          }

          .qm-dashboard-root .recharts-wrapper,
          .qm-dashboard-root .recharts-surface {
            max-width: 100%;
          }

          .qm-dashboard-root [class*="overflow-x-auto"] {
            max-width: 100%;
            overscroll-behavior-x: contain;
            -webkit-overflow-scrolling: touch;
          }
        }

        @media (max-width: 767px) {
          .qm-dashboard-root > div.flex.min-h-screen {
            min-height: 100dvh;
          }

          .qm-dashboard-root header {
            position: sticky;
            top: 0;
            z-index: 20;
            min-height: 64px;
            height: auto;
            background: rgba(12, 14, 12, 0.96);
            backdrop-filter: blur(14px);
          }

          .qm-dashboard-root header > div:first-child {
            flex: 1 1 auto;
            overflow: hidden;
          }

          .qm-dashboard-root header > div:last-child {
            gap: 4px;
          }

          .qm-dashboard-root header > div:last-child > button {
            padding: 8px;
          }

          .qm-dashboard-root .mx-auto.max-w-\\[1500px\\] {
            width: 100%;
            padding: 14px;
          }

          .qm-dashboard-root h1 {
            overflow-wrap: anywhere;
          }

          .qm-dashboard-root .grid {
            min-width: 0;
          }

          .qm-dashboard-root .grid > * {
            min-width: 0;
          }

          .qm-dashboard-root [class*="grid-cols-2"],
          .qm-dashboard-root [class*="grid-cols-3"],
          .qm-dashboard-root [class*="grid-cols-4"] {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .qm-dashboard-root [class*="overflow-x-auto"] table {
            min-width: 520px;
          }

          .qm-dashboard-root input,
          .qm-dashboard-root textarea,
          .qm-dashboard-root select {
            max-width: 100%;
            font-size: 16px;
          }

          .qm-dashboard-root button {
            touch-action: manipulation;
          }

          .qm-dashboard-root [role="dialog"] {
            max-height: 80dvh;
          }
        }

        @media (max-width: 380px) {
          .qm-dashboard-root .mx-auto.max-w-\\[1500px\\] {
            padding: 10px;
          }

          .qm-dashboard-root header {
            padding-left: 8px;
            padding-right: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .qm-dashboard-root *,
          .qm-dashboard-root *::before,
          .qm-dashboard-root *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <div className="flex min-h-screen">
        {mobileMenu && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-white/[0.07] bg-[#101210] transition-transform lg:static lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-[#102014]">
                <Activity size={21} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">QueryMind</p>
                <p className="text-[10px] tracking-[0.19em] text-zinc-500">
                  AI ANALYTICS
                </p>
              </div>
            </div>
            <button
              aria-label="Close navigation"
              className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 lg:hidden"
              onClick={() => setMobileMenu(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-zinc-600">
              WORKSPACE
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const selected = activeNav === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setActiveNav(item.label);
                      setMobileMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${
                      selected
                        ? "bg-emerald-400/10 font-medium text-emerald-300"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                    {item.label === "Query history" && (
                      <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-500">
                        {queryHistory.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 pt-8">
            <div className="mb-3 flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-zinc-600">
                YOUR DATA
              </p>
              <button
                aria-label="Add database"
                title="Add database"
                className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
              >
                <Plus size={15} />
              </button>
            </div>
            <button className="flex w-full items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-left hover:border-white/15">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <Database size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">E-commerce DB</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      dbStatus === "connected"
                        ? "bg-emerald-400"
                        : dbStatus === "unavailable"
                          ? "bg-rose-400"
                          : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  {dbStatus === "connected"
                    ? "Connected to PostgreSQL"
                    : dbStatus === "unavailable"
                      ? "Database unavailable"
                      : "Connecting to database..."}
                </p>
              </div>
              <ChevronDown size={14} className="text-zinc-600" />
            </button>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center gap-2 text-emerald-300">
                <ShieldCheck size={17} />
                <span className="text-xs font-medium">Security first</span>
              </div>
              <p className="text-[11px] leading-5 text-zinc-500">
                Queries will be validated and executed with read-only database
                permissions.
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-3 text-[10px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Read-only query environment
              </div>
            </div>
            <button
              onClick={() => setActiveNav("Settings")}
              className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <Settings2 size={17} />
              Settings
            </button>
            <div className="mt-3 flex items-center gap-3 border-t border-white/[0.07] pt-4">
              {user.picture ? (
                <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7c5a4] text-xs font-bold text-[#282219]">
                  {user.name.trim().charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{user.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-500">{user.email}</p>
              </div>
              <button type="button" onClick={() => void handleLogout()} disabled={logoutLoading} title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50">
                {logoutLoading ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
                onClick={() => setMobileMenu(true)}
              >
                <LayoutDashboard size={19} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{activeNav}</p>
                <p className="mt-1 hidden text-[11px] text-zinc-500 sm:block">
                  Workspace /{" "}
                  <span className="text-zinc-300">{activeNav}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search dashboard"
                className="hidden items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2 text-[11px] text-zinc-500 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.04] hover:text-zinc-300 md:flex"
              >
                <Search size={14} />
                <span>Search anything</span>
                <kbd className="ml-5 rounded border border-white/10 px-1.5 py-0.5 text-[9px]">/</kbd>
              </button>
              <button
                aria-label="Notifications"
                className="relative rounded-lg p-2 text-zinc-400 hover:bg-white/5"
              >
                <Bell size={18} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </button>
              <div className="hidden h-6 w-px bg-white/10 sm:block" />
              <button className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/5">
                <Database size={14} className="text-emerald-300" />
                <span className="hidden sm:inline">E-commerce DB</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </header>

          {searchOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSearchOpen(false);
                  setSearchQuery("");
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-label="Search QueryMind"
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#111612] shadow-2xl shadow-black/50"
              >
                <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
                  <Search size={18} className="shrink-0 text-emerald-300" />
                  <input
                    id="querymind-global-search"
                    autoFocus
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search pages, tables, saved queries..."
                    aria-label="Search pages, tables, and queries"
                    className="min-w-0 flex-1 bg-transparent py-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    aria-label="Close search"
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-[55vh] overflow-y-auto p-3">
                  {(() => {
                    const term = searchQuery.trim().toLowerCase();
                    const matches = (value: string) => !term || value.toLowerCase().includes(term);
                    const pages = navItems.filter((item) => matches(item.label));
                    const tables = schemaTables.filter(matches);
                    const saved = savedQueries.filter((item) => matches(item.name) || matches(item.question));
                    const history = queryHistory.filter((item) =>
                      matches(item.question) || matches(item.sql ?? "")
                    ).slice(0, 5);
                    const hasResults = pages.length + tables.length + saved.length + history.length > 0;

                    if (!hasResults) {
                      return (
                        <p className="px-3 py-8 text-center text-sm text-zinc-500">
                          No results found for “{searchQuery}”.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {pages.length > 0 && (
                          <div>
                            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Pages</p>
                            {pages.map((item) => {
                              const Icon = item.icon;
                              return (
                                <button key={item.label} type="button" onClick={() => chooseSearchResult("nav", item.label)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-emerald-400/10 hover:text-emerald-200">
                                  <Icon size={16} className="text-emerald-300" />
                                  <span>{item.label}</span>
                                  <ArrowRight size={14} className="ml-auto text-zinc-600" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {tables.length > 0 && (
                          <div>
                            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Database tables</p>
                            {tables.map((table) => (
                              <button key={table} type="button" onClick={() => chooseSearchResult("table", table)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-emerald-400/10 hover:text-emerald-200">
                                <Table2 size={16} className="text-emerald-300" />
                                <span>{table}</span>
                                <span className="ml-auto text-[10px] text-zinc-600">Ask data</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {saved.length > 0 && (
                          <div>
                            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Saved queries</p>
                            {saved.map((item) => (
                              <button key={item.id} type="button" onClick={() => chooseSearchResult("saved", item.id)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-emerald-400/10">
                                <Bookmark size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm text-zinc-200">{item.name}</span>
                                  <span className="mt-1 block truncate text-xs text-zinc-500">{item.question}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {history.length > 0 && (
                          <div>
                            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Query history</p>
                            {history.map((item) => (
                              <button key={item.id} type="button" onClick={() => chooseSearchResult("history", item.id)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-emerald-400/10">
                                <History size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                                <span className="min-w-0 truncate text-sm text-zinc-300">{item.question}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-2.5 text-[10px] text-zinc-600">
                  <span>Search pages, database tables, and queries</span>
                  <span><kbd className="rounded border border-white/10 px-1.5 py-0.5">ESC</kbd> to close</span>
                </div>
              </section>
            </div>
          )}

          <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-7 lg:p-9">
            {activeNav === "Query history" ? (
              <section className="space-y-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] text-emerald-300">
                      <History size={12} /> SAVED EXECUTIONS
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Query history</h1>
                    <p className="mt-2 text-xs leading-6 text-zinc-500 sm:text-sm">Review previous questions, execution status, and generated SQL.</p>
                  </div>
                  <button onClick={() => void loadQueryHistory()} disabled={historyLoading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium hover:bg-white/[0.06] disabled:opacity-50">
                    <LoaderCircle size={14} className={historyLoading ? "animate-spin" : "hidden"} />
                    Refresh history
                  </button>
                </div>

                {historyError && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-xs text-rose-300">{historyError}</div>}

                <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111311]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] p-4 sm:px-5">
                    <div><h2 className="text-sm font-medium">All queries</h2><p className="mt-1 text-[11px] text-zinc-500">Showing {queryHistory.length} saved record{queryHistory.length === 1 ? "" : "s"} (up to 100)</p></div>
                    <span className="inline-flex items-center gap-2 text-[10px] text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> PostgreSQL history</span>
                  </div>
                  {historyLoading && queryHistory.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-xs text-zinc-500"><LoaderCircle size={16} className="animate-spin" /> Loading query history...</div>
                  ) : queryHistory.length === 0 ? (
                    <div className="p-12 text-center"><History size={26} className="mx-auto mb-3 text-zinc-600" /><p className="text-sm text-zinc-300">No query history yet</p><p className="mt-2 text-xs text-zinc-500">Run a question in Ask your data and it will appear here.</p><button onClick={() => setActiveNav("Ask your data")} className="mt-4 rounded-lg bg-emerald-300 px-4 py-2 text-xs font-semibold text-[#102014] hover:bg-emerald-200">Ask your data</button></div>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {queryHistory.map((item) => {
                        const expanded = expandedHistoryId === item.id;
                        const statusClass = item.status === "success" ? "bg-emerald-400/10 text-emerald-300" : item.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-300";
                        return (
                          <article key={item.id} className="p-4 sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400"><Code2 size={16} /></div>
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-medium text-zinc-200">{item.question}</p>
                                <p className="mt-2 text-[10px] text-zinc-500">{formatHistoryDate(item.createdAt)} <span className="px-1">·</span> {relativeTime(item.createdAt)}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${statusClass}`}>{item.status}</span>
                                  {item.rowCount !== null && <span className="rounded-md border border-white/[0.07] px-2 py-1 text-[10px] text-zinc-400">{item.rowCount} rows</span>}
                                  {item.durationMs !== null && <span className="rounded-md border border-white/[0.07] px-2 py-1 text-[10px] text-zinc-400">{item.durationMs} ms</span>}
                                </div>
                              </div>
                              <button onClick={() => setExpandedHistoryId(expanded ? null : item.id)} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-zinc-300 hover:bg-white/[0.04]">
                                {expanded ? "Hide details" : "View details"}<ChevronDown size={13} className={`transition ${expanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                            {expanded && <div className="mt-4 space-y-3 rounded-lg border border-white/[0.06] bg-black/20 p-3 sm:ml-12 sm:p-4">
                              {item.generatedSql ? <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Generated SQL</p><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-black/30 p-3 text-[11px] leading-5 text-emerald-100/80"><code>{item.generatedSql}</code></pre></div> : <p className="text-xs text-zinc-500">No SQL was saved for this record.</p>}
                              {item.errorMessage && <div className="rounded-md border border-rose-400/15 bg-rose-400/[0.05] p-3"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300">Error details</p><p className="break-words text-xs text-zinc-300">{item.errorMessage}</p></div>}
                              {item.completedAt && <p className="text-[10px] text-zinc-600">Completed: {formatHistoryDate(item.completedAt)}</p>}
                            </div>}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] text-emerald-300">
                  <Sparkles size={12} />
                  YOUR AI DATA WORKSPACE
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Your data, <span className="text-zinc-500">in focus.</span>
                </h1>
                <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-500 sm:text-sm">
                  Ask questions in plain English. Turn your database into
                  answers, charts, and decisions.
                </p>
              </div>
              <button
                onClick={() => {
                  setQuestion("");
                  document.getElementById("question-input")?.focus();
                }}
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium transition hover:bg-white/[0.06] sm:self-auto"
              >
                <Plus size={15} />
                New analysis
              </button>
            </div>

            <section className="relative overflow-hidden rounded-2xl border border-emerald-300/15 bg-[#141914] p-4 sm:p-6 lg:p-7">
              <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.06] blur-3xl" />
              <div className="relative">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-sm font-medium">Ask your data</span>
                  <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[9px] text-zinc-500">
                    NATURAL LANGUAGE
                  </span>
                </div>

                <label htmlFor="question-input" className="sr-only">
                  Ask a question about your data
                </label>
                <textarea
                  id="question-input"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void runQuery();
                    }
                  }}
                  placeholder="e.g. Which products generated the most revenue last month?"
                  rows={3}
                  className="min-h-[96px] w-full resize-y bg-transparent text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-lg"
                />

                <div className="mt-4 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={demoMode}
                      onClick={() => {
                        setDemoMode((current) => !current);
                        setQueryResult(null);
                        setQueryError(null);
                        setHasRun(false);
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-medium transition ${demoMode ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/[0.08] text-zinc-400 hover:bg-white/[0.04]"}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${demoMode ? "bg-amber-300" : "bg-zinc-600"}`} />
                      Demo mode: {demoMode ? "ON" : "OFF"}
                    </button>
                    {demoMode && <span className="text-[10px] text-amber-200/80">Sample data only · no Gemini/API calls</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Revenue trends", "Top customers", "Order analysis"].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setQuestion(
                            suggestion === "Revenue trends"
                              ? "Show me monthly revenue trends"
                              : suggestion === "Top customers"
                                ? "Show me the top 5 customers by revenue"
                                : "Analyze order volume by month"
                          )}
                          className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] text-zinc-400 transition hover:border-emerald-300/30 hover:text-emerald-200"
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    onClick={() => void runQuery()}
                    disabled={!question.trim() || loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 py-2.5 text-xs font-semibold text-[#102014] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : hasRun ? (
                      <Check size={15} />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                    {loading ? "Analyzing..." : "Run analysis"}
                    {!loading && <ArrowRight size={14} />}
                  </button>
                </div>
                <p className="mt-3 text-[10px] text-zinc-600">
                  Powered by Gemini, RAG, and PostgreSQL. Queries use the backend&apos;s read-only execution pipeline.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#111411] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold"><Bookmark size={16} className="text-emerald-300" /> Saved queries</div>
                  <p className="mt-1 text-xs text-zinc-500">Save questions and reuse them later. Saved locally in this browser.</p>
                </div>
                <button type="button" onClick={saveCurrentQuery} disabled={!question.trim() || loading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus size={14} /> Save current question
                </button>
              </div>
              {savedQueryNotice && <p role="status" className="mt-3 text-xs text-emerald-200/80">{savedQueryNotice}</p>}
              {savedQueries.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/[0.09] px-4 py-6 text-center">
                  <p className="text-xs text-zinc-400">No saved queries yet</p>
                  <p className="mt-1 text-[11px] text-zinc-600">Enter a question above and select “Save current question”.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {savedQueries.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-200">{item.name}</p>
                        <p className="mt-1 break-words text-[11px] leading-5 text-zinc-500">{item.question}</p>
                        <p className="mt-1 text-[10px] text-zinc-600">Saved {formatHistoryDate(item.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button type="button" onClick={() => { setQuestion(item.question); setActiveNav("Ask your data"); document.getElementById("question-input")?.focus(); }} className="rounded-lg bg-emerald-300 px-3 py-2 text-[11px] font-semibold text-[#102014] transition hover:bg-emerald-200">Load question</button>
                        <button type="button" aria-label={`Rename ${item.name}`} title="Rename" onClick={() => renameSavedQuery(item)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"><Pencil size={14} /></button>
                        <button type="button" aria-label={`Delete ${item.name}`} title="Delete" onClick={() => deleteSavedQuery(item)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:border-rose-400/30 hover:bg-rose-400/[0.06] hover:text-rose-200"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {queryError && (
              <section
                role="alert"
                className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4"
              >
                <p className="text-sm font-medium text-rose-300">Query failed</p>
                <p className="mt-2 break-words text-xs leading-5 text-zinc-400">
                  {queryError}
                </p>
              </section>
            )}

            {queryResult && (
              <section className="overflow-hidden rounded-xl border border-emerald-300/15 bg-[#111311]">
                <div className="flex flex-col gap-2 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h2 className="text-sm font-medium">Query results</h2>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {queryResult.rowCount} rows returned · {queryResult.durationMs} ms
                    </p>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ${queryResult.explanation.startsWith("DEMO DATA:") ? "bg-amber-400/[0.08] text-amber-200" : "bg-emerald-400/[0.08] text-emerald-300"}`}>
                    <Check size={12} /> {queryResult.explanation.startsWith("DEMO DATA:") ? "Demo sample · not live data" : "Executed successfully"}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  {queryResult.explanation.startsWith("DEMO DATA:") && (
                    <div className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-[11px] text-amber-100">
                      Demo mode is active. These predefined sample rows are not from your database and must not be treated as real analytics.
                    </div>
                  )}
                  <p className="text-xs leading-6 text-zinc-300">{queryResult.explanation}</p>
                  <section aria-label="Data insights" className="mt-4 rounded-xl border border-emerald-300/15 bg-gradient-to-br from-emerald-300/[0.06] to-transparent p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-300" />
                        <h3 className="text-sm font-semibold text-zinc-100">AI Insights</h3>
                      </div>
                      <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[9px] text-zinc-400">
                        {queryResult.explanation.startsWith("DEMO DATA:") ? "Demo sample · local analysis" : "Instant analysis · no extra API call"}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-5 text-zinc-500">Quick, rule-based observations calculated from the rows returned by this query. No additional Gemini request is made.</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {dataInsights.map((insight, index) => {
                        const InsightIcon = insight.icon === "target" ? TrendingUp : insight.icon === "trend" ? Activity : BarChart3;
                        return (
                          <article key={`${insight.title}-${index}`} className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
                            <div className="flex items-center gap-2 text-emerald-200"><InsightIcon size={14} /><span className="text-[11px] font-medium">{insight.title}</span></div>
                            <p className="mt-2 text-[11px] leading-5 text-zinc-300">{insight.detail}</p>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Visualize results</p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {resultView === "table"
                          ? "Inspect the raw query output."
                          : chartMetricColumn
                            ? `Charting ${chartMetricColumn.replaceAll("_", " ")}${chartCategoryColumn ? ` by ${chartCategoryColumn.replaceAll("_", " ")}` : ""}.`
                            : "This result needs a numeric column to create a chart."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.07] bg-black/20 p-1">
                      {([
                        ["table", "Table"],
                        ["bar", "Bar"],
                        ["line", "Line"],
                        ["pie", "Pie"],
                      ] as const).map(([view, label]) => (
                        <button
                          key={view}
                          onClick={() => setResultView(view)}
                          className={`rounded-md px-3 py-1.5 text-[10px] transition ${
                            resultView === view
                              ? "bg-emerald-300 text-[#102014] font-semibold"
                              : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                          }`}
                          aria-pressed={resultView === view}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={exportQueryResultsCSV}
                        disabled={queryResult.rows.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-2 text-[10px] font-medium text-zinc-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download size={12} /> Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={exportQueryResultsJSON}
                        disabled={queryResult.rows.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-2 text-[10px] font-medium text-zinc-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download size={12} /> Export JSON
                      </button>
                    </div>
                  </div>

                  {resultView === "table" ? (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.07]">
                    <table className="w-full min-w-max text-left text-xs">
                      <thead className="bg-white/[0.025]">
                        <tr>
                          {queryResult.columns.map((column) => (
                            <th key={column} className="whitespace-nowrap border-b border-white/[0.07] px-4 py-3 font-medium capitalize text-zinc-400">
                              {column.replaceAll("_", " ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                            {queryResult.columns.map((column) => {
                              const value = row[column];
                              return (
                                <td key={column} className="whitespace-nowrap px-4 py-3 text-zinc-300">
                                  {formatQueryValue(column, value)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {queryResult.rows.length === 0 && (
                          <tr>
                            <td colSpan={Math.max(queryResult.columns.length, 1)} className="px-4 py-8 text-center text-zinc-500">
                              The query ran successfully, but returned no rows.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  ) : queryChartData.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-white/[0.07] p-10 text-center">
                      <BarChart3 size={24} className="mx-auto mb-3 text-zinc-600" />
                      <p className="text-sm text-zinc-300">Unable to chart these results</p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Choose Table view or run a query that returns a numeric column, such as revenue, quantity, or order count.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 h-[300px] w-full rounded-lg border border-white/[0.07] bg-black/10 p-3 sm:h-[360px] sm:p-5">
                      <ResponsiveContainer width="100%" height="100%">
                        {resultView === "bar" ? (
                          <BarChart data={queryChartData} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                            <CartesianGrid stroke="#ffffff0b" vertical={false} />
                            <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fill: "#a3aaa1", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#737b72", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "#191d19", border: "1px solid #303730", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#dfe7de" }} />
                            <Bar dataKey="value" name={chartMetricColumn ?? "Value"} fill="#6ee7a0" radius={[4, 4, 0, 0]} maxBarSize={48} />
                          </BarChart>
                        ) : resultView === "line" ? (
                          <LineChart data={queryChartData} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                            <CartesianGrid stroke="#ffffff0b" vertical={false} />
                            <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fill: "#a3aaa1", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#737b72", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "#191d19", border: "1px solid #303730", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#dfe7de" }} />
                            <Line type="monotone" dataKey="value" name={chartMetricColumn ?? "Value"} stroke="#6ee7a0" strokeWidth={2.5} dot={{ r: 3, fill: "#6ee7a0" }} activeDot={{ r: 5 }} />
                          </LineChart>
                        ) : (
                          <PieChart>
                            <Tooltip contentStyle={{ background: "#191d19", border: "1px solid #303730", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#dfe7de" }} />
                            <Pie data={queryChartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="78%" innerRadius="42%" paddingAngle={2}>
                              {queryChartData.map((entry, index) => (
                                <Cell key={`${entry.label}-${index}`} fill={chartPalette[index % chartPalette.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            )}

            {analyticsError && (
              <section role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4">
                <p className="text-sm font-medium text-rose-300">Live analytics unavailable</p>
                <p className="mt-2 break-words text-xs leading-5 text-zinc-400">{analyticsError}</p>
              </section>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total revenue",
                  value: analytics ? formatCurrency(analytics.kpis.totalRevenue) : "—",
                  icon: TrendingUp,
                },
                {
                  label: "Total orders",
                  value: analytics ? analytics.kpis.totalOrders.toLocaleString() : "—",
                  icon: Table2,
                },
                {
                  label: "Total customers",
                  value: analytics ? analytics.kpis.totalCustomers.toLocaleString() : "—",
                  icon: Users,
                },
                {
                  label: "Avg. order value",
                  value: analytics ? formatCurrency(analytics.kpis.averageOrderValue) : "—",
                  icon: BarChart3,
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-[#111311] p-4 transition hover:border-white/[0.13] sm:p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-500">{stat.label}</p>
                      <Icon size={17} className="text-zinc-600" />
                    </div>
                    <p className="mt-4 break-words text-2xl font-semibold tracking-tight sm:text-[27px]">
                      {analyticsLoading ? "Loading…" : stat.value}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-1 text-[10px] text-emerald-300">
                        <Database size={12} /> Live data
                      </span>
                      <span className="text-[10px] text-zinc-600">PostgreSQL</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
              <section className="min-w-0 rounded-xl border border-white/[0.07] bg-[#111311] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium">Revenue overview <span className="ml-2 text-[9px] font-normal text-emerald-300">LIVE</span></h2>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Monthly revenue from PostgreSQL
                    </p>
                  </div>
                  <span className="rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-zinc-500">
                    {analytics?.monthlyRevenue.length ?? 0} months
                  </span>
                </div>
                <div className="mt-5 h-[230px] w-full sm:h-[270px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.monthlyRevenue ?? []} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6ee7a0" stopOpacity={0.23} />
                          <stop offset="95%" stopColor="#6ee7a0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ffffff0b" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#737b72", fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "#737b72", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip
                        contentStyle={{ background: "#191d19", border: "1px solid #303730", borderRadius: 10, fontSize: 12 }}
                        labelStyle={{ color: "#dfe7de" }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6ee7a0" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5, fill: "#6ee7a0", stroke: "#101410", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {!analyticsLoading && (analytics?.monthlyRevenue.length ?? 0) === 0 && (
                  <p className="py-2 text-center text-[11px] text-zinc-500">No monthly revenue data is available yet.</p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[10px] text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Monthly revenue
                  <span className="ml-auto">Live PostgreSQL data</span>
                </div>
              </section>

              <section className="min-w-0 rounded-xl border border-white/[0.07] bg-[#111311] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium">Top customers <span className="ml-2 text-[9px] font-normal text-emerald-300">LIVE</span></h2>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Ranked by total revenue
                    </p>
                  </div>
                  <button
                    onClick={() => setQuestion("Show the top 5 customers by revenue")}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
                    aria-label="Use top customers query"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="mt-5 h-[230px] w-full sm:h-[270px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.topCustomers ?? []} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#ffffff0b" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#737b72", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                      <YAxis type="category" dataKey="name" width={105} tick={{ fill: "#a3aaa1", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#191d19", border: "1px solid #303730", borderRadius: 10, fontSize: 12 }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="#6ee7a0" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {!analyticsLoading && (analytics?.topCustomers.length ?? 0) === 0 && (
                  <p className="py-2 text-center text-[11px] text-zinc-500">No customer revenue data is available yet.</p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[10px] text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Revenue by customer
                  <span className="ml-auto">Live PostgreSQL data</span>
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111311]">
              <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:px-5">
                <div>
                  <h2 className="text-sm font-medium">Customer breakdown <span className="ml-2 text-[9px] font-normal text-emerald-300">LIVE</span></h2>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Your highest-value customers from PostgreSQL
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-zinc-400 hover:bg-white/5">
                    <Search size={13} />
                    Filter results
                  </button>
                  <button
                    onClick={() => {
                      const rows = analytics?.topCustomers ?? [];
                      const csv = [
                        ["Customer", "Orders", "Revenue"],
                        ...rows.map((customer) => [customer.name, customer.orders, customer.revenue]),
                      ].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "querymind-top-customers.csv";
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={!analytics?.topCustomers.length}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-zinc-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] text-zinc-500">
                      <th className="px-5 py-3 font-medium">CUSTOMER</th>
                      <th className="px-5 py-3 font-medium">ORDERS</th>
                      <th className="px-5 py-3 font-medium">TOTAL REVENUE</th>
                      <th className="px-5 py-3 font-medium">STATUS</th>
                      <th className="px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.topCustomers ?? []).map((customer, index) => (
                      <tr
                        key={customer.name}
                        className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold ${customerColors[index % customerColors.length]}`}>
                              {customer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium">{customer.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-400">
                          {customer.orders}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium">
                          ${customer.revenue.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-zinc-400">
                            <span className="h-1 w-1 rounded-full bg-zinc-500" />
                            In database
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button aria-label={`More options for ${customer.name}`} className="rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-white">
                            <Ellipsis size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!analyticsLoading && (analytics?.topCustomers.length ?? 0) === 0) && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-zinc-500">No customer records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-[10px] text-zinc-500">
                <span>{analyticsLoading ? "Loading customer data…" : `Showing ${analytics?.topCustomers.length ?? 0} customers · Live PostgreSQL data`}</span>
                <button className="flex items-center gap-1.5 text-zinc-300 hover:text-emerald-300">
                  View all <ArrowRight size={12} />
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-white/[0.07] bg-[#111311] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-zinc-500" />
                    <h2 className="text-sm font-medium">Recent queries</h2>
                  </div>
                  <button
                    onClick={() => setActiveNav("Query history")}
                    className="text-[10px] text-zinc-500 hover:text-emerald-300"
                  >
                    View history
                  </button>
                </div>
                <div className="space-y-1">
                  {queryHistory.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveNav("Query history"); setExpandedHistoryId(item.id); }}
                      className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition hover:bg-white/[0.035]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400"><Code2 size={15} /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs">{item.question}</p><p className="mt-1 text-[10px] text-zinc-600">{relativeTime(item.createdAt)}</p></div>
                      <span className={`hidden rounded-md px-2 py-1 text-[9px] capitalize sm:inline ${item.status === "success" ? "bg-emerald-400/10 text-emerald-300" : item.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-300"}`}>{item.status}</span>
                      <ArrowRight size={13} className="shrink-0 text-zinc-600" />
                    </button>
                  ))}
                  {!historyLoading && queryHistory.length === 0 && <p className="p-3 text-xs text-zinc-500">No saved queries yet.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-white/[0.07] bg-[#111311] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Database size={16} className="text-zinc-500" />
                  <h2 className="text-sm font-medium">Database schema</h2>
                  <span className="ml-auto rounded-md border border-white/[0.07] px-2 py-1 text-[9px] text-zinc-500">
                    {schemaLoading ? "LOADING" : schemaError ? "UNAVAILABLE" : "LIVE SCHEMA"}
                  </span>
                </div>
                <div className="space-y-2">
                  {schemaLoading ? (
                    <p className="p-3 text-xs text-zinc-500">
                      Loading database schema...
                    </p>
                  ) : schemaError ? (
                    <p role="alert" className="p-3 text-xs text-rose-300">
                      {schemaError}
                    </p>
                  ) : schemaTables.length === 0 ? (
                    <p className="p-3 text-xs text-zinc-500">
                      No business tables found.
                    </p>
                  ) : (
                    schemaTables.map((tableName) => (
                      <div
                        key={tableName}
                        className="flex items-center gap-3 rounded-lg border border-white/[0.05] p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400">
                          <Table2 size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{tableName}</p>
                          <p className="mt-1 truncate text-[10px] text-zinc-600">
                            Available in PostgreSQL
                          </p>
                        </div>
                        <span className="hidden shrink-0 text-[9px] text-emerald-300 sm:inline">
                          Connected
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
                  <ShieldCheck size={13} className="text-emerald-300" />
                  Live schema available for Gemini + RAG.
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111311]">
              <button
                onClick={() => setShowSql(!showSql)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left sm:px-5"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 size={16} className="text-emerald-300" />
                  <div>
                    <p className="text-xs font-medium">Generated SQL</p>
                    <p className="mt-1 text-[10px] text-zinc-500">Preview of the query behind your insights</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-zinc-500 transition ${showSql ? "rotate-180" : ""}`} />
              </button>
              {showSql && (
                <div className="border-t border-white/[0.07]">
                  <div className="flex items-center justify-between gap-3 bg-white/[0.02] px-4 py-2.5 sm:px-5">
                    <span className="text-[10px] text-zinc-500">PostgreSQL</span>
                    <span className={`text-[10px] ${queryResult ? "text-emerald-300" : queryError ? "text-rose-300" : "text-zinc-500"}`}>
                      {queryResult ? (queryResult.explanation.startsWith("DEMO DATA:") ? "Demo sample" : "Executed") : queryError ? "Failed" : "Waiting for query"}
                    </span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-6 text-emerald-100/80 sm:px-5 sm:text-xs">
                    <code>{queryResult?.sql ?? "-- Submit a question to generate SQL."}</code>
                  </pre>
                  {queryResult && (
                    <div className="border-t border-white/[0.07] px-4 py-3 sm:px-5">
                      <p className="text-[10px] text-zinc-500">SQL generated by Gemini and executed by the backend.</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {hasRun && queryResult && (
              <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                <Check size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-xs font-medium text-emerald-200">Analysis complete</p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                    {queryResult.explanation.startsWith("DEMO DATA:") ? `Demo generated ${queryResult.rowCount} sample rows in ${queryResult.durationMs} ms. No SQL was executed.` : `PostgreSQL returned ${queryResult.rowCount} rows in ${queryResult.durationMs} ms.`}
                  </p>
                </div>
              </div>
            )}

            <footer className="flex flex-col justify-between gap-2 border-t border-white/[0.06] py-4 text-[10px] text-zinc-600 sm:flex-row sm:items-center">
              <span>QueryMind · AI analytics workspace</span>
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${dbStatus === "connected" ? "bg-emerald-400" : dbStatus === "unavailable" ? "bg-rose-400" : "bg-amber-400"}`} />
                {dbStatus === "connected" ? "PostgreSQL connected" : dbStatus === "unavailable" ? "Database unavailable" : "Checking database..."}
              </span>
            </footer>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
