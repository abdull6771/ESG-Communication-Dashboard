import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";

import RAW from "./src/data/rawData.js";
import AGG from "./src/data/aggData.js";
import { EX, SHORT, C } from "./src/data/exData.js";

const QUAD_COLORS = {
  "Aligned Leaders": "#0d9488",
  "Potential Overstatement": "#dc2626",
  "Under-Communicators": "#2563eb",
  "Low ESG Profile": "#64748b",
};
const fmt = (v, d = 2) =>
  v == null ? "N/A" : typeof v === "number" ? v.toFixed(d) : v;
const pct = (v, d = 1) => (v == null ? "N/A" : v.toFixed(d) + "%");

const Card = ({ children, style = {} }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      padding: 22,
      ...style,
    }}
  >
    {children}
  </div>
);
const KPI = ({ label, value, sub, color = "#1e3a5f" }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
      padding: "16px 20px",
      flex: 1,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        color: "#94a3b8",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    <div style={{ color, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
      {value}
    </div>
    {sub && (
      <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>{sub}</div>
    )}
  </div>
);
const SecTitle = ({ title, sub, tag }) => (
  <div style={{ marginBottom: 16 }}>
    {tag && (
      <div
        style={{
          color: "#0d9488",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 3,
        }}
      >
        {tag}
      </div>
    )}
    <div style={{ color: "#1e3a5f", fontSize: 15, fontWeight: 700 }}>
      {title}
    </div>
    {sub && (
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          marginTop: 3,
          lineHeight: 1.5,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  // Sort: Main/Environmental before ACE/Social before Governance; keep other order stable
  const order = {
    "Main Market": 0,
    Main: 0,
    Environmental: 0,
    "ESG Total": -1,
    Social: 1,
    Governance: 2,
    "ACE Market": 3,
    ACE: 3,
  };
  const sorted = [...payload].sort(
    (a, b) => (order[a.name] ?? 99) - (order[b.name] ?? 99),
  );
  return (
    <div
      style={{
        background: "#1e3a5f",
        borderRadius: 8,
        padding: "9px 13px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}
    >
      {label && (
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>
          {label}
        </div>
      )}
      {sorted.map((p, i) => (
        <div
          key={i}
          style={{
            color: p.color || "#fff",
            fontSize: 11,
            fontWeight: 600,
            marginTop: 1,
          }}
        >
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};
const Badge = ({ text, color = "#0d9488" }) => (
  <span
    style={{
      background: color + "18",
      color,
      border: `1px solid ${color}33`,
      borderRadius: 4,
      padding: "1px 7px",
      fontSize: 10,
      fontWeight: 700,
    }}
  >
    {text}
  </span>
);
// Custom legend that always renders ESG pillars in Environmental → Social → Governance order
const ESG_ORDER = {
  "ESG Total": -1,
  Environmental: 0,
  Social: 1,
  Governance: 2,
};
const ESGLegend = ({ payload }) => {
  if (!payload?.length) return null;
  const sorted = [...payload].sort(
    (a, b) => (ESG_ORDER[a.value] ?? 99) - (ESG_ORDER[b.value] ?? 99),
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        justifyContent: "center",
        flexWrap: "wrap",
        fontSize: 11,
        color: "#64748b",
        marginTop: 4,
      }}
    >
      {sorted.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};
const PILLARS = [
  { key: "Environmental", short: "E", color: C.env },
  { key: "Social", short: "S", color: C.soc },
  { key: "Governance", short: "G", color: C.gov },
];
const usePillarToggle = () => {
  const [vis, setVis] = useState(
    new Set(["Environmental", "Social", "Governance"]),
  );
  const toggle = (key) => {
    setVis((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return [vis, toggle];
};
const PillarToggle = ({ visible, onToggle }) => (
  <div
    style={{
      display: "flex",
      gap: 5,
      justifyContent: "flex-end",
      marginBottom: 6,
    }}
  >
    {PILLARS.map(({ key, short, color }) => {
      const active = visible.has(key);
      return (
        <button
          key={key}
          onClick={() => onToggle(key)}
          title={key}
          style={{
            padding: "2px 10px",
            borderRadius: 12,
            border: `1.5px solid ${color}`,
            background: active ? color : "transparent",
            color: active ? "#fff" : color,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
            lineHeight: 1.6,
          }}
        >
          {short}
        </button>
      );
    })}
  </div>
);
// Custom legend that always renders Main Market before ACE Market
const MKT_ORDER = { "Main Market": 0, Main: 0, "ACE Market": 1, ACE: 1 };
const MarketLegend = ({ payload }) => {
  if (!payload?.length) return null;
  const sorted = [...payload].sort(
    (a, b) => (MKT_ORDER[a.value] ?? 99) - (MKT_ORDER[b.value] ?? 99),
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        justifyContent: "center",
        flexWrap: "wrap",
        fontSize: 11,
        color: "#64748b",
        marginTop: 4,
      }}
    >
      {sorted.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};
const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 16px",
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 11,
      background: "transparent",
      color: active ? "#0d9488" : "#93c5fd",
      borderBottom: active ? "2px solid #0d9488" : "2px solid transparent",
      transition: "all 0.15s",
      whiteSpace: "nowrap",
      fontFamily: "inherit",
      letterSpacing: 0.2,
    }}
  >
    {children}
  </button>
);

function AboutTab() {
  const steps = [
    {
      num: "01",
      title: "Sample Construction",
      text: "621 Shariah-compliant firms listed on Bursa Malaysia (Main Market and ACE Market) were selected, forming a balanced panel of 1,863 firm-year observations across 2022, 2023, and 2024.",
      color: C.env,
    },
    {
      num: "02",
      title: "ESG Communication Scoring",
      text: "Textual ESG communication intensity was measured from firms' annual reports using a keyword-based scoring methodology across three pillars — Environmental, Social, and Governance — normalised as a percentage of total word count.",
      color: C.soc,
    },
    {
      num: "03",
      title: "ESG Performance Benchmarking",
      text: "Externally assessed ESG performance scores were sourced from Refinitiv (now LSEG). These scores serve as an independent benchmark against which communication intensity is compared.",
      color: C.gov,
    },
    {
      num: "04",
      title: "Panel Regression Analysis",
      text: "Fixed-effects panel regression was applied to estimate the relationship between ESG communication intensity and ESG performance scores, controlling for firm-level time-invariant characteristics and isolating within-firm variation over time.",
      color: C.main,
    },
    {
      num: "05",
      title: "Greenwashing Gap Analysis",
      text: "A greenwashing proxy (GW_Gap) was constructed as the standardised difference between ESG communication intensity and ESG performance scores. Positive values indicate over-communication; negative values indicate under-communication.",
      color: "#f59e0b",
    },
  ];

  const keyStats = [
    { label: "Firms", value: "621", sub: "Shariah-listed, Bursa Malaysia" },
    { label: "Observations", value: "1,863", sub: "Balanced panel (3 years)" },
    { label: "Period", value: "2022–2024", sub: "Annual reports" },
    { label: "Sectors", value: "13", sub: "Across Main & ACE Markets" },
    {
      label: "ESG Pillars",
      value: "3",
      sub: "Environmental · Social · Governance",
    },
    { label: "Performance Data", value: "Refinitiv", sub: "LSEG ESG Scores" },
  ];

  const scope = [
    "The sample is limited to Shariah-compliant firms on Bursa Malaysia and may not generalise to conventional firms or other markets.",
    "ESG communication is measured by textual intensity (keyword frequency), not by disclosure quality, depth, or third-party verification.",
    "ESG performance scores rely on Refinitiv's methodology. Divergence across rating providers is well-documented and may affect results.",
    "The study period (2022–2024) predates full implementation of IFRS Sustainability Disclosure Standards in Malaysia.",
    "The greenwashing gap is a structured proxy and does not constitute direct evidence of intentional misrepresentation.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header banner */}
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f 0%,#0d4f6b 100%)",
          borderRadius: 12,
          padding: 28,
        }}
      >
        <div
          style={{
            color: "#93c5fd",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          About This Dashboard
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          ESG Communication Dynamics Among Malaysian Shariah-Listed Firms
        </div>
        <div style={{ color: "#bfdbfe", fontSize: 12, lineHeight: 1.8 }}>
          This dashboard presents the findings of a study examining how 621
          Shariah-compliant firms listed on Bursa Malaysia communicate ESG
          information in their annual reports, and whether that communication
          aligns with externally assessed ESG performance. The analysis covers
          2022–2024 using textual scoring, panel regression, and a greenwashing
          gap framework.
        </div>
      </div>

      {/* Key stats row */}
      <div style={{ display: "flex", gap: 12 }}>
        {keyStats.map((s) => (
          <KPI
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            color="#1e3a5f"
          />
        ))}
      </div>

      {/* Methodology steps */}
      <Card>
        <SecTitle title="Methodology" sub="Five-step research design" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((s) => (
            <div
              key={s.num}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                background: "#f8fafc",
                border: `1.5px solid #e2e8f0`,
                borderLeft: `4px solid ${s.color}`,
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: s.color,
                  opacity: 0.3,
                  lineHeight: 1,
                  minWidth: 28,
                  flexShrink: 0,
                }}
              >
                {s.num}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#1e3a5f",
                    marginBottom: 4,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}
                >
                  {s.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Data sources & scope side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle title="Data Sources" sub="Primary inputs to the analysis" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                src: "Bursa Malaysia",
                desc: "Annual reports of 621 Shariah-listed firms (2022–2024) used for textual ESG communication scoring.",
                color: C.env,
              },
              {
                src: "Refinitiv (LSEG)",
                desc: "External ESG performance scores used as the independent benchmark for communication–performance alignment.",
                color: C.soc,
              },
              {
                src: "Securities Commission Malaysia",
                desc: "Shariah-compliance status and listing segment classification (Main Market / ACE Market).",
                color: C.gov,
              },
            ].map((d) => (
              <div
                key={d.src}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderLeft: `3px solid ${d.color}`,
                  borderRadius: 6,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 11,
                      color: "#1e3a5f",
                      marginBottom: 3,
                    }}
                  >
                    {d.src}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}
                  >
                    {d.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SecTitle title="Scope & Limitations" sub="Boundaries of the study" />
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            {scope.map((l, i) => (
              <li
                key={i}
                style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}
              >
                {l}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Dashboard navigation guide */}
      <Card>
        <SecTitle title="Dashboard Guide" sub="What each tab contains" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          {[
            {
              tab: "📊 Overview",
              desc: "Year-on-year ESG growth and pillar comparison across 2022–2024.",
            },
            {
              tab: "🌿 Pillars",
              desc: "E, S, G pillar breakdown — intensity trends and pillar share.",
            },
            {
              tab: "🏛️ Market",
              desc: "Main Market vs ACE Market — ESG levels and pillar differences.",
            },
            {
              tab: "🏭 Sectors",
              desc: "Sector-level rankings, growth rates, quadrant positioning, and trends.",
            },
            {
              tab: "📈 Distribution",
              desc: "Histogram and statistics of ESG communication intensity across all firm-years.",
            },
            {
              tab: "🔍 Data Explorer",
              desc: "Firm-level data table with filtering and sorting.",
            },
            {
              tab: "☪️ Shariah–ESG",
              desc: "ESG pillar profile and market comparison for Shariah-listed firms.",
            },
            {
              tab: "📐 Statistical Analysis",
              desc: "Fixed-effects regression results — communication vs performance by pillar.",
            },
            {
              tab: "⚠️ Greenwashing",
              desc: "Greenwashing gap analysis — over- and under-communicating firms and sectors.",
            },
            {
              tab: "💡 Recommendations",
              desc: "Report conclusions, implications, limitations, and future research.",
            },
          ].map((g) => (
            <div
              key={g.tab}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  color: "#1e3a5f",
                  marginBottom: 4,
                }}
              >
                {g.tab}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.6 }}>
                {g.desc}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OverviewTab() {
  const yd = AGG.year_data;
  const [visOv, toggleOv] = usePillarToggle();
  const growthData = yd.map((d) => ({
    year: String(d.year),
    growth: d.growth,
    n: d.n,
    esg_com: d.esg_com,
  }));
  const pillarBar = yd.map((d) => ({
    year: String(d.year),
    Environmental: d.env_com,
    Social: d.soc_com,
    Governance: d.gov_com,
  }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <KPI
          label="Total Firms (Balanced Panel)"
          value="621"
          sub="3 years · 1,863 firm-year obs."
          color="#1e3a5f"
        />
        <KPI
          label="Avg ESG Intensity 2022"
          value={pct(yd[0].esg_com)}
          sub="Baseline year"
          color={C.esg}
        />
        <KPI
          label="Avg ESG Intensity 2024"
          value={pct(yd[2].esg_com)}
          sub="Latest year"
          color={C.env}
        />
        <KPI
          label="Total 3-Year Growth"
          value={"+" + pct(yd[2].esg_com - yd[0].esg_com, 1)}
          sub="Absolute increase (pp)"
          color={C.soc}
        />
        <KPI
          label="Avg Refinitiv ESG Score"
          value={fmt(AGG.desc.esg_score.mean)}
          sub="Third-party benchmark"
          color={C.gov}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18 }}>
        <Card>
          <SecTitle
            tag="Figure 1"
            title="Average ESG Communication Intensity (2022–2024)"
            sub="Steady broad-based increase across 621 Shariah-listed firms"
          />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={yd}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 35]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<ESGLegend />} />
              <Line
                type="monotone"
                dataKey="esg_com"
                name="ESG Total"
                stroke={C.esg}
                strokeWidth={3}
                dot={{ r: 6, fill: C.esg, stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="env_com"
                name="Environmental"
                stroke={C.env}
                strokeWidth={2}
                dot={{ r: 4, fill: C.env }}
              />
              <Line
                type="monotone"
                dataKey="soc_com"
                name="Social"
                stroke={C.soc}
                strokeWidth={2}
                dot={{ r: 4, fill: C.soc }}
              />
              <Line
                type="monotone"
                dataKey="gov_com"
                name="Governance"
                stroke={C.gov}
                strokeWidth={2}
                dot={{ r: 4, fill: C.gov }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {yd.map((d, i) => (
              <div
                key={d.year}
                style={{
                  flex: 1,
                  background: "#f8fafc",
                  borderRadius: 6,
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ color: "#1e3a5f", fontSize: 20, fontWeight: 800 }}
                >
                  {pct(d.esg_com, 1)}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{d.year}</div>
                {d.growth > 0 ? (
                  <div
                    style={{
                      color: "#0d9488",
                      fontSize: 10,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    ▲ {d.growth}% YoY
                  </div>
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>
                    Baseline
                  </div>
                )}
                <div style={{ color: "#94a3b8", fontSize: 10 }}>n = {d.n}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.5 }}>
              <strong>Key Insight:</strong> ESG communication intensity
              increases steadily over 2022–2024, indicating a sustained upward
              trend in disclosure practices across firms.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            title="Year-on-Year ESG Growth"
            sub="Percentage change vs prior year"
          />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} barSize={50}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div
                      style={{
                        background: "#1e3a5f",
                        borderRadius: 8,
                        padding: "9px 13px",
                      }}
                    >
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>
                        {label}
                      </div>
                      <div style={{ color: "#fff", fontWeight: 700 }}>
                        Growth: {payload[0].value}%
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>
                        n = {payload[0].payload.n} firms
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="growth" name="YoY Growth %" radius={[5, 5, 0, 0]}>
                {growthData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.growth >= 15
                        ? "#0d9488"
                        : d.growth >= 5
                          ? "#b45309"
                          : "#94a3b8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {[
              ["17.8%", "2022→2023", C.env],
              ["15.4%", "2023→2024", C.soc],
            ].map(([v, l, c]) => (
              <div
                key={l}
                style={{
                  flex: 1,
                  background: c + "10",
                  borderRadius: 6,
                  padding: "8px 12px",
                  border: `1px solid ${c}30`,
                  textAlign: "center",
                }}
              >
                <div style={{ color: c, fontSize: 16, fontWeight: 800 }}>
                  {v}
                </div>
                <div style={{ color: "#64748b", fontSize: 10 }}>{l}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.5 }}>
              <strong>Key Insight:</strong> The data confirms a broad-based
              shift in disclosure behavior over the observation period,
              indicating that the sustained upward trajectory in ESG
              communication is shared across the broader market as practices
              broadly institutionalize.
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SecTitle
          title="Pillar Comparison Across Years (2022–2024)"
          sub="All pillars show steady growth, with Environmental communication seeing the largest proportional increase"
        />
        <PillarToggle visible={visOv} onToggle={toggleOv} />
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={pillarBar} barGap={6}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v + "%"}
            />
            <Tooltip content={<Tip />} />
            <Legend content={<ESGLegend />} />
            {visOv.has("Environmental") && (
              <Bar dataKey="Environmental" fill={C.env} radius={[4, 4, 0, 0]} />
            )}
            {visOv.has("Social") && (
              <Bar dataKey="Social" fill={C.soc} radius={[4, 4, 0, 0]} />
            )}
            {visOv.has("Governance") && (
              <Bar dataKey="Governance" fill={C.gov} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
        <div
          style={{
            marginTop: 12,
            background: "#fef9f0",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            Key Insight
          </div>
          <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
            <b>All three pillars are advancing simultaneously,</b> but they do
            so from differentiated starting points. Governance anchors the
            highest baseline, while Environmental communication shows the
            strongest proportional acceleration — reflecting rising corporate
            attention to climate and climate-related disclosure obligations.
          </div>
        </div>
      </Card>
    </div>
  );
}

function PillarsTab() {
  const yd = AGG.year_data;
  const [visPl, togglePl] = usePillarToggle();
  const pc = AGG.pillar_contrib; // already E,S,G order
  const pillarTrend = yd.map((d) => ({
    year: String(d.year),
    Environmental: d.env_com,
    Social: d.soc_com,
    Governance: d.gov_com,
  }));
  const pillarCross = [
    {
      pillar: "Environmental",
      2022: yd[0].env_com,
      2023: yd[1].env_com,
      2024: yd[2].env_com,
    },
    {
      pillar: "Social",
      2022: yd[0].soc_com,
      2023: yd[1].soc_com,
      2024: yd[2].soc_com,
    },
    {
      pillar: "Governance",
      2022: yd[0].gov_com,
      2023: yd[1].gov_com,
      2024: yd[2].gov_com,
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {pc.map((p) => (
          <KPI
            key={p.name}
            label={p.name + " Communication"}
            value={pct(p.avg)}
            sub={p.pct + "% of total ESG intensity"}
            color={p.color}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle title="E · S · G Intensity Trend (2022–2024)" />
          <PillarToggle visible={visPl} onToggle={togglePl} />
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pillarTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 14]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<ESGLegend />} />
              {visPl.has("Environmental") && (
                <Line
                  type="monotone"
                  dataKey="Environmental"
                  stroke={C.env}
                  strokeWidth={3}
                  dot={{ r: 5, fill: C.env, stroke: "#fff", strokeWidth: 2 }}
                />
              )}
              {visPl.has("Social") && (
                <Line
                  type="monotone"
                  dataKey="Social"
                  stroke={C.soc}
                  strokeWidth={3}
                  dot={{ r: 5, fill: C.soc, stroke: "#fff", strokeWidth: 2 }}
                />
              )}
              {visPl.has("Governance") && (
                <Line
                  type="monotone"
                  dataKey="Governance"
                  stroke={C.gov}
                  strokeWidth={3}
                  dot={{ r: 5, fill: C.gov, stroke: "#fff", strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>
                Governance communication remains the largest and relatively
                stable component over time,
              </b>{" "}
              while Environmental and Social communication increase steadily
              across the period.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            title="Pillar Contribution to Total ESG"
            sub="Governance dominates — share and intensity by pillar"
          />
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ flex: "0 0 48%" }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pc}
                    dataKey="pct"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={46}
                    label={({ name, pct: v }) => `${name.slice(0, 3)}: ${v}%`}
                    labelLine={true}
                  >
                    {pc.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v + "%", name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {pc.map((p) => (
                <div key={p.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        color: "#334155",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{ color: p.color, fontWeight: 700, fontSize: 13 }}
                    >
                      {p.pct}%{" "}
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>
                        ({pct(p.avg)} avg)
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#f1f5f9",
                      borderRadius: 5,
                      height: 10,
                    }}
                  >
                    <div
                      style={{
                        width: `${(p.pct / 50) * 100}%`,
                        height: "100%",
                        background: p.color,
                        borderRadius: 5,
                        transition: "width 0.8s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>Governance accounts for the largest share</b> of total ESG
              communication intensity (avg. 10.98 pp), followed by Environmental
              (7.89 pp) and Social (7.14 pp). This confirms a G-first disclosure
              culture where board structures and compliance matters are
              prioritised over environmental and social reporting.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MarketTab() {
  const mkt = AGG.mkt_data;
  const mktYr = EX.mkt_yr_trend;
  const sm = EX.sec_mkt_counts;
  const [visMkt, toggleMkt] = usePillarToggle();
  const main = mkt.find((m) => m.market === "MAIN");
  const ace = mkt.find((m) => m.market === "ACE");

  const trendCompare = mktYr.map((d) => ({
    year: d.year,
    "Main Market": d.MAIN_esg,
    "ACE Market": d.ACE_esg,
  }));
  // E,S,G order
  const pillarComp = [
    { pillar: "Environmental", Main: main.env_com, ACE: ace.env_com },
    { pillar: "Social", Main: main.soc_com, ACE: ace.soc_com },
    { pillar: "Governance", Main: main.gov_com, ACE: ace.gov_com },
    { pillar: "ESG Total", Main: main.esg_com, ACE: ace.esg_com },
  ];
  const mainPillar = mktYr.map((d) => ({
    year: d.year,
    Environmental: d.MAIN_env,
    Social: d.MAIN_soc,
    Governance: d.MAIN_gov,
  }));
  const acePillar = mktYr.map((d) => ({
    year: d.year,
    Environmental: d.ACE_env,
    Social: d.ACE_soc,
    Governance: d.ACE_gov,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <KPI
          label="Main Market Avg ESG"
          value={pct(main.esg_com)}
          sub={`${main.firms} firms · ${main.n} obs.`}
          color={C.main}
        />
        <KPI
          label="ACE Market Avg ESG"
          value={pct(ace.esg_com)}
          sub={`${ace.firms} firms · ${ace.n} obs.`}
          color={C.ace}
        />
        <KPI
          label="Market Gap (Main − ACE)"
          value={pct(main.esg_com - ace.esg_com)}
          sub="Main Market higher intensity"
          color="#1e3a5f"
        />
        <KPI
          label="Total Firms"
          value="621"
          sub="78 ACE · 543 Main"
          color={C.env}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle
            tag="Figure 4"
            title="Main vs ACE ESG Communication Trend (2022–2024)"
            sub="Both markets show upward trajectory; Main Market consistently higher"
          />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendCompare}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[15, 35]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<MarketLegend />} />
              <Line
                type="monotone"
                dataKey="Main Market"
                stroke={C.main}
                strokeWidth={3}
                dot={{ r: 5, fill: C.main, stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="ACE Market"
                stroke={C.ace}
                strokeWidth={3}
                dot={{ r: 5, fill: C.ace, stroke: "#fff", strokeWidth: 2 }}
                strokeDasharray="6 3"
              />
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>
                Firms listed on the Main Market exhibit higher average ESG
                communication intensity
              </b>{" "}
              compared to firms on the ACE Market. This structural difference
              suggests that listing segment characteristics play a role in
              shaping disclosure practices, independent of sector composition.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            tag="Figure 5"
            title="Pillar-Level Market Comparison (E → S → G)"
            sub="Environmental, Social, Governance breakdown by listing segment"
          />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pillarComp} barGap={8}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="pillar"
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<MarketLegend />} />
              <Bar
                dataKey="Main"
                name="Main Market"
                fill={C.main}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="ACE"
                name="ACE Market"
                fill={C.ace}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>
                ESG communication intensity is not solely sector-driven but also
                shaped by listing market characteristics.
              </b>{" "}
              Firms in the Main Market exhibit more consistently high ESG
              communication levels across sectors relative to ACE Market firms,
              where disclosure is more heterogeneous and selective.
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle
            title="Main Market: E · S · G Pillar Trends"
            sub="Main Market shows strong growth across all pillars, with Environmental leading 60% increase"
          />
          <PillarToggle visible={visMkt} onToggle={toggleMkt} />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mainPillar}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<ESGLegend />} />
              {visMkt.has("Environmental") && (
                <Line
                  type="monotone"
                  dataKey="Environmental"
                  stroke={C.env}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
              {visMkt.has("Social") && (
                <Line
                  type="monotone"
                  dataKey="Social"
                  stroke={C.soc}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
              {visMkt.has("Governance") && (
                <Line
                  type="monotone"
                  dataKey="Governance"
                  stroke={C.gov}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>
                Main Market firms demonstrate higher and more uniform ESG
                communication across all pillars,
              </b>{" "}
              with Energy and Utilities remaining the strongest communicators.
              ESG communication within the Main Market appears more evenly
              distributed across sectors, suggesting comparatively more
              consistent disclosure practices.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            title="ACE Market: E · S · G Pillar Trends"
            sub="ACE Market accelerates dramatically—Environmental and Social grow 80%+, nearly catching Main Market"
          />
          <PillarToggle visible={visMkt} onToggle={toggleMkt} />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={acePillar}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<ESGLegend />} />
              {visMkt.has("Environmental") && (
                <Line
                  type="monotone"
                  dataKey="Environmental"
                  stroke={C.env}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
              {visMkt.has("Social") && (
                <Line
                  type="monotone"
                  dataKey="Social"
                  stroke={C.soc}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
              {visMkt.has("Governance") && (
                <Line
                  type="monotone"
                  dataKey="Governance"
                  stroke={C.gov}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>ACE Market ESG communication is more uneven and selective.</b>
              While Energy and Healthcare show relatively strong disclosure
              levels, several ACE sectors — such as Financial Services,
              Plantation, and Property — display minimal or substantially lower
              ESG communication intensity.
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SecTitle
          title="Number of Firms by Sector and Listing Market"
          sub="Stacked bar — MAIN (teal) + ACE (orange)"
        />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={sm.map((d) => ({
              sector: SHORT[d.sector] || d.sector,
              Main: d.MAIN || 0,
              ACE: d.ACE || 0,
            }))}
            layout="vertical"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const sorted = [...payload].sort((a, b) => {
                  const o = { "Main Market": 0, "ACE Market": 1 };
                  return (o[a.name] ?? 99) - (o[b.name] ?? 99);
                });
                return (
                  <div
                    style={{
                      background: "#1e3a5f",
                      borderRadius: 8,
                      padding: "9px 13px",
                    }}
                  >
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </div>
                    {sorted.map((p, i) => (
                      <div key={i} style={{ color: p.color, fontSize: 11 }}>
                        {p.name}: {p.value} firms
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend content={<MarketLegend />} />
            <Bar dataKey="Main" name="Main Market" fill={C.main} stackId="a" />
            <Bar
              dataKey="ACE"
              name="ACE Market"
              fill={C.ace}
              stackId="a"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div
          style={{
            marginTop: 12,
            background: "#fef9f0",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            Key Insight
          </div>
          <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
            <b>Main Market firms make up the vast majority of the sample</b> and
            concentrate in a few key sectors, while ACE representation is more
            distributed — reflecting the broader diversity of smaller-cap
            companies.
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectorsTab() {
  const sd = AGG.sec_data;
  const [visibleSectors, setVisibleSectors] = useState(
    new Set(sd.map((d) => d.sector)),
  );

  const toggleSector = (sector) => {
    const newVisible = new Set(visibleSectors);
    if (newVisible.has(sector)) {
      newVisible.delete(sector);
    } else {
      newVisible.add(sector);
    }
    setVisibleSectors(newVisible);
  };

  const byLevel = [...sd].sort((a, b) => b.esg_com - a.esg_com);
  const byGrowth = [...sd].sort((a, b) => b.growth - a.growth);
  const medLevel = 31;
  const medGrowth = 7.5;
  const qLabel = (l, g) =>
    l >= medLevel && g >= medGrowth
      ? "Leader"
      : l >= medLevel && g < medGrowth
        ? "Mature"
        : l < medLevel && g >= medGrowth
          ? "Catching-up"
          : "Laggard";
  const qColor = (l, g) =>
    l >= medLevel && g >= medGrowth
      ? C.env
      : l >= medLevel && g < medGrowth
        ? C.main
        : l < medLevel && g >= medGrowth
          ? C.soc
          : "#64748b";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle
            tag="Figure 6"
            title="Average ESG Communication by Sector (2022–2024)"
            sub="Sector ranking by mean ESG communication intensity"
          />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={byLevel.map((d) => ({
                sector: SHORT[d.sector] || d.sector,
                esg_com: d.esg_com,
              }))}
              layout="vertical"
              barSize={14}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 36]}
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <YAxis
                type="category"
                dataKey="sector"
                tick={{ fill: "#475569", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={105}
              />
              <Tooltip content={<Tip />} />
              <Bar dataKey="esg_com" name="ESG Intensity" radius={[0, 4, 4, 0]}>
                {byLevel.map((d, i) => (
                  <Cell key={i} fill={C.sectors[i % C.sectors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.5 }}>
              <strong>Key Insight:</strong> Energy ranks highest in ESG
              communication intensity, followed closely by Utilities and
              Financial Services. The spread between the highest and lowest
              sectors is not extreme, indicating that ESG communication has
              become broadly institutionalized across industries during the
              observed period.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            tag="Figure 7"
            title="Change in ESG Communication by Sector (2022–2024)"
            sub="Absolute improvement (pp) — Construction leads growth"
          />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={byGrowth.map((d) => ({
                sector: SHORT[d.sector] || d.sector,
                growth: d.growth,
              }))}
              layout="vertical"
              barSize={14}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="sector"
                tick={{ fill: "#475569", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={105}
              />
              <Tooltip content={<Tip />} />
              <Bar dataKey="growth" name="Growth (pp)" radius={[0, 4, 4, 0]}>
                {byGrowth.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.growth > 8 ? C.env : d.growth > 6 ? C.main : "#94a3b8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#fef9f0",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              Key Insight
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              <b>
                Construction records the strongest growth in ESG communication,
              </b>{" "}
              followed closely by Consumer Products and Services and Energy.
              Transportation and Logistics and Industrial Products and Services
              also show substantial improvements. In contrast, Utilities —
              despite ranking among the highest in overall ESG level — exhibits
              relatively modest growth, indicating prior maturity. Financial
              Services displays the lowest improvement.
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SecTitle
          title="Sector Growth Ranking — Relative Growth Rate (2022–2024)"
          sub="Percentage change in ESG communication intensity, sorted fastest to slowest"
        />
        <ResponsiveContainer width="100%" height={310}>
          <BarChart
            data={[...sd]
              .sort((a, b) => b.growth_pct - a.growth_pct)
              .map((d) => ({
                sector: SHORT[d.sector] || d.sector,
                growth_pct: d.growth_pct,
                y2022: d.y2022,
                y2024: d.y2024,
                raw: d,
              }))}
            layout="vertical"
            barSize={14}
            margin={{ left: 0, right: 50 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 50]}
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v + "%"}
            />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fill: "#475569", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={105}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {d.sector}
                    </div>
                    <div>Relative growth: {d.growth_pct}%</div>
                    <div>
                      2022: {pct(d.y2022)} → 2024: {pct(d.y2024)}
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="growth_pct"
              name="Relative Growth (%)"
              radius={[0, 4, 4, 0]}
            >
              {[...sd]
                .sort((a, b) => b.growth_pct - a.growth_pct)
                .map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.growth_pct >= 40
                        ? C.env
                        : d.growth_pct >= 30
                          ? C.soc
                          : d.growth_pct >= 20
                            ? C.main
                            : "#94a3b8"
                    }
                  />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 16,
            fontSize: 10,
            color: "#64748b",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {[
            { color: C.env, label: "≥ 40% growth" },
            { color: C.soc, label: "30–39% growth" },
            { color: C.main, label: "20–29% growth" },
            { color: "#94a3b8", label: "< 20% growth" },
          ].map((t) => (
            <div
              key={t.label}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: t.color,
                  flexShrink: 0,
                }}
              />
              {t.label}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            background: "#fef9f0",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            Key Insight
          </div>
          <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
            <b>Leadership in ESG communication is multidimensional.</b> Some
            sectors lead in absolute communication intensity, while others
            differentiate themselves through rapid expansion in disclosure
            practices. Sectors starting from a lower 2022 base record the
            highest relative growth rates, while already-mature communicators
            show the least proportional change.
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle
          tag="Figure 8"
          title="Sector Positioning: ESG Communication Level (2024) vs Growth (2022–2024)"
          sub="Four quadrants — Leaders (high level + high growth), Mature, Catching-up, Laggards"
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}
        >
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="y2024"
                  type="number"
                  domain={[26, 40]}
                  name="Level"
                  tick={{ fill: "#94a3b8", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v + "%"}
                  label={{
                    value: "ESG Level 2024 (%)",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                />
                <YAxis
                  dataKey="growth"
                  type="number"
                  domain={[0, 12]}
                  name="Growth"
                  tick={{ fill: "#94a3b8", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Growth (pp)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  x={medLevel}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={medGrowth}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />
                <ZAxis dataKey="firms" range={[60, 180]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: "#1e3a5f",
                          borderRadius: 8,
                          padding: "9px 13px",
                        }}
                      >
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {SHORT[d.sector] || d.sector}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 10 }}>
                          Level: {pct(d.y2024, 1)} · Growth: {fmt(d.growth, 1)}
                          pp
                        </div>
                        <Badge
                          text={qLabel(d.y2024, d.growth)}
                          color={qColor(d.y2024, d.growth)}
                        />
                      </div>
                    );
                  }}
                />
                <Scatter data={sd}>
                  {sd.map((d, i) => (
                    <Cell key={i} fill={qColor(d.y2024, d.growth)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            {[
              ["Leaders", { top: 24, right: 26 }],
              ["Mature", { bottom: 250, right: 26 }],
              ["Catching-up", { top: 24, left: 50 }],
              ["Laggards", { bottom: 250, left: 50 }],
            ].map(([lbl, pos]) => (
              <div
                key={lbl}
                style={{
                  position: "absolute",
                  ...pos,
                  color: "#b0b8c4",
                  fontSize: 11,
                  fontWeight: 800,
                  opacity: 0.6,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                {lbl}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["Leaders", C.env, "High level + High growth"],
              ["Mature", C.main, "High level + Lower growth"],
              ["Catching-up", C.soc, "Lower level + High growth"],
              ["Laggards", "#64748b", "Lower level + Lower growth"],
            ].map(([lbl, col, desc]) => (
              <div
                key={lbl}
                style={{
                  background: col + "10",
                  borderRadius: 6,
                  padding: "8px 10px",
                  border: `1px solid ${col}30`,
                }}
              >
                <div style={{ color: col, fontSize: 10, fontWeight: 700 }}>
                  {lbl}
                </div>
                <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>
                  {desc}
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {sd.map((d) => (
                <div
                  key={d.sector}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 6px",
                    background: "#f8fafc",
                    borderRadius: 4,
                    fontSize: 9,
                  }}
                >
                  <span style={{ color: "#475569" }}>
                    {SHORT[d.sector] || d.sector}
                  </span>
                  <Badge
                    text={qLabel(d.y2024, d.growth)}
                    color={qColor(d.y2024, d.growth)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            background: "#f0fdf9",
            border: "1px solid #99f6e4",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 14 }}>💡</span>
          <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.6 }}>
            <strong>Key Insight:</strong> The sector positioning matrix reveals
            that leadership in ESG communication is multidimensional. Some
            sectors lead in absolute communication intensity, while others
            differentiate themselves through rapid expansion in disclosure
            practices, providing a dynamic perspective on sector progress.
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle
          tag="Figure 9"
          title="Multi-Sector ESG Communication Trend (2022–2024)"
          sub="Year-on-year trajectory per sector"
        />
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={[2022, 2023, 2024].map((yr) => {
                  const row = { year: yr };
                  sd.forEach((d) => {
                    const key = SHORT[d.sector] || d.sector;
                    row[key] = d["y" + yr];
                  });
                  return row;
                })}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#475569", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[15, 42]}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v + "%"}
                />
                <Tooltip content={<Tip />} />
                {sd.map((d, i) =>
                  visibleSectors.has(d.sector) ? (
                    <Line
                      key={d.sector}
                      type="monotone"
                      dataKey={SHORT[d.sector] || d.sector}
                      name={SHORT[d.sector] || d.sector}
                      stroke={C.sectors[i % C.sectors.length]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ) : null,
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              justifyContent: "center",
              minWidth: 130,
            }}
          >
            {sd.map((d, i) => {
              const isVisible = visibleSectors.has(d.sector);
              return (
                <div
                  key={d.sector}
                  onClick={() => toggleSector(d.sector)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    opacity: isVisible ? 1 : 0.4,
                    transition: "opacity 0.2s",
                    padding: "4px 6px",
                    borderRadius: 4,
                    marginLeft: "-6px",
                    marginRight: "-6px",
                  }}
                  title={isVisible ? "Click to hide" : "Click to show"}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: C.sectors[i % C.sectors.length],
                      flexShrink: 0,
                      opacity: isVisible ? 1 : 0.5,
                    }}
                  />
                  <span
                    style={{
                      color: "#475569",
                      fontSize: 10,
                      fontWeight: 600,
                      textDecoration: isVisible ? "none" : "line-through",
                    }}
                  >
                    {SHORT[d.sector] || d.sector}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            background: "#fef9f0",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            Key Insight
          </div>
          <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
            <b>Sectors follow divergent trajectories</b> — some climb steeply
            while others plateau or grow modestly. ESG communication practices
            are sector-dependent and heterogeneous across industries. The
            overall market average masks substantial variation in how quickly
            individual industries are advancing their disclosure intensity.
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle
          title="Sector Pillar Breakdown (E · S · G)"
          sub="Energy leads with 32% ESG intensity; Governance consistently significant across all sectors"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {byLevel.map((d, i) => (
            <div
              key={d.sector}
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: "10px 14px",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  minWidth: 110,
                  color: "#1e3a5f",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {SHORT[d.sector] || d.sector}
              </div>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                {[
                  ["E", d.env_com, C.env],
                  ["S", d.soc_com, C.soc],
                  ["G", d.gov_com, C.gov],
                ].map(([lbl, val, col]) => (
                  <div
                    key={lbl}
                    style={{
                      flex: 1,
                      background: col + "15",
                      border: `1px solid ${col}30`,
                      borderRadius: 5,
                      padding: "4px 8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: col, fontSize: 9, fontWeight: 700 }}>
                      {lbl}
                    </div>
                    <div style={{ color: col, fontSize: 11, fontWeight: 700 }}>
                      {pct(val)}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  color: C.esg,
                  fontSize: 13,
                  fontWeight: 800,
                  minWidth: 50,
                  textAlign: "right",
                }}
              >
                {pct(d.esg_com)}
              </div>
              <Badge text={d.firms + " firms"} color="#94a3b8" />
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 12,
            background: "#fef9f0",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            Key Insight
          </div>
          <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
            <b>
              Environmental communication is most prominent in Utilities and
              Energy,
            </b>{" "}
            reinforcing that environmentally exposed sectors exhibit stronger
            ESG disclosure. Healthcare leads in Social disclosure, reflecting
            emphasis on stakeholder engagement and employee welfare. Governance
            communication appears most evenly distributed across sectors, with
            Technology, Industrial Products, and Consumer Products ranking
            relatively high. Utilities, while leading in environmental
            communication, exhibits comparatively moderate governance intensity.
          </div>
        </div>
      </Card>
    </div>
  );
}

function DistributionTab() {
  const hist = EX.hist_all;
  const top20 = EX.top20;
  const bot20 = EX.bot20;
  const total = hist.reduce((a, b) => a + b.count, 0);
  const tiers = [
    {
      label: "Low (<15%)",
      count: hist.slice(0, 3).reduce((a, b) => a + b.count, 0),
      color: "#dc2626",
    },
    {
      label: "Mid (15–25%)",
      count: hist.slice(3, 6).reduce((a, b) => a + b.count, 0),
      color: "#b45309",
    },
    {
      label: "High (25–35%)",
      count: hist.slice(5, 8).reduce((a, b) => a + b.count, 0),
      color: "#0d9488",
    },
    {
      label: "V.High (>35%)",
      count: hist.slice(8).reduce((a, b) => a + b.count, 0),
      color: "#2563eb",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {tiers.map((t) => (
          <KPI
            key={t.label}
            label={t.label}
            value={t.count.toString()}
            sub={((t.count / total) * 100).toFixed(1) + "% of observations"}
            color={t.color}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18 }}>
        <Card>
          <SecTitle
            title="ESG Communication Intensity Distribution"
            sub="Frequency histogram — all 1,863 firm-year observations"
          />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hist} barSize={20}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="range"
                tick={{ fill: "#94a3b8", fontSize: 8 }}
                angle={-35}
                textAnchor="end"
                height={50}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const cnt = payload[0].value;
                  return (
                    <div
                      style={{
                        background: "#1e3a5f",
                        borderRadius: 8,
                        padding: "9px 13px",
                      }}
                    >
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>
                        ESG: {label}%
                      </div>
                      <div style={{ color: "#fff", fontWeight: 700 }}>
                        {cnt} obs. ({((cnt / total) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" name="Observations" radius={[3, 3, 0, 0]}>
                {hist.map((d, i) => {
                  const mid =
                    (parseInt(d.range.split("-")[0]) +
                      parseInt(d.range.split("-")[1])) /
                    2;
                  const fill =
                    mid < 15
                      ? "#dc2626"
                      : mid < 25
                        ? "#b45309"
                        : mid < 35
                          ? "#0d9488"
                          : "#2563eb";
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div
            style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
          >
            {tiers.map((t) => (
              <div
                key={t.label}
                style={{
                  background: t.color + "12",
                  border: `1px solid ${t.color}30`,
                  borderRadius: 6,
                  padding: "6px 12px",
                  textAlign: "center",
                  flex: 1,
                }}
              >
                <div style={{ color: t.color, fontSize: 10, fontWeight: 700 }}>
                  {t.label}
                </div>
                <div
                  style={{ color: "#1e3a5f", fontWeight: 800, fontSize: 14 }}
                >
                  {t.count}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 9 }}>
                  {((t.count / total) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.6 }}>
              <strong>Key Insight:</strong> There is a clear upward shift in the
              distribution of ESG communication intensity across firms over the
              observation period. However, a persistent bottom tail indicates
              that some firms still disclose ESG content at very limited levels,
              highlighting an industry reporting gap that has not fully closed.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle title="Distribution Key Statistics" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AGG.box_data.map((b) => (
              <div
                key={b.year}
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    color: "#1e3a5f",
                    fontWeight: 700,
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  {b.year}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 4,
                    fontSize: 11,
                  }}
                >
                  {[
                    ["Median", pct(b.median, 1)],
                    ["IQR", pct(b.q1, 1) + "–" + pct(b.q3, 1)],
                    ["Min", pct(b.min, 1)],
                    ["Max", pct(b.max, 1)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>{k}:</span>
                      <span style={{ color: "#1e3a5f", fontWeight: 600 }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.6 }}>
              <strong>Key Insight:</strong> The upward shift in the distribution
              further highlights that while median and top-tier disclosure
              levels are rising, the minimum bound remains relatively static.
              This confirms that the reporting gap across the broader market
              persists despite widespread growth.
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle
            title="Top 20 Firms by ESG Communication Intensity"
            sub="Highest average ESG communication across all years"
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            {top20.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#f8fafc",
                  borderRadius: 6,
                  padding: "7px 10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span
                  style={{
                    color: i < 3 ? "#b45309" : "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 22,
                  }}
                >
                  #{i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#1e3a5f",
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {f.co}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginTop: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge text={SHORT[f.se] || f.se} color="#475569" />
                    <Badge
                      text={f.mk.includes("MAIN") ? "MAIN" : "ACE"}
                      color={f.mk.includes("MAIN") ? C.main : C.ace}
                    />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.esg, fontWeight: 800, fontSize: 12 }}>
                    {pct(f.esg)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      marginTop: 2,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ color: C.env, fontSize: 9 }}>
                      E:{pct(f.env, 0)}
                    </span>
                    <span style={{ color: C.soc, fontSize: 9 }}>
                      S:{pct(f.soc, 0)}
                    </span>
                    <span style={{ color: C.gov, fontSize: 9 }}>
                      G:{pct(f.gov, 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.5 }}>
              <strong>Key Insight:</strong> Top reporting firms are largely
              concentrated in the Main Market and high-impact sectors,
              suggesting that listing segment characteristics and heightened
              scrutiny play a role in shaping more advanced disclosure
              practices.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            title="Bottom 20 Firms by ESG Communication Intensity"
            sub="Lowest average ESG communication — persistent bottom tail"
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            {bot20.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff5f5",
                  borderRadius: 6,
                  padding: "7px 10px",
                  border: "1px solid #fee2e2",
                }}
              >
                <span
                  style={{
                    color: "#dc2626",
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 22,
                  }}
                >
                  #{i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#1e3a5f",
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {f.co}
                  </div>
                  <Badge text={SHORT[f.se] || f.se} color="#475569" />
                </div>
                <span
                  style={{ color: "#dc2626", fontWeight: 800, fontSize: 12 }}
                >
                  {pct(f.esg)}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "#fff5f5",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#7f1d1d", lineHeight: 1.5 }}>
              <strong>Key Insight:</strong> Firms displaying lower ESG
              communication intensities span various sectors and markets,
              reflecting that limited disclosure remains a firm-specific trait
              rather than being entirely dictated by structural sector
              constraints.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ExplorerTab() {
  const [year, setYear] = useState("ALL");
  const [sector, setSector] = useState("ALL");
  const [market, setMarket] = useState("ALL");
  const [quad, setQuad] = useState("ALL");
  const [sortBy, setSortBy] = useState("esg_com");
  const [search, setSearch] = useState("");
  const [completeOnly, setCompleteOnly] = useState(true);
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;
  const sectors = useMemo(
    () => ["ALL", ...new Set(RAW.map((r) => r[2]).sort())],
    "",
  );
  const quads = [
    "ALL",
    "Aligned Leaders",
    "Potential Overstatement",
    "Under-Communicators",
    "Low ESG Profile",
  ];
  const completeCompanies = useMemo(() => {
    const yearsByCompany = {};
    RAW.forEach((r) => {
      if (!yearsByCompany[r[1]]) yearsByCompany[r[1]] = new Set();
      if (r[8] != null) yearsByCompany[r[1]].add(r[0]);
    });
    return new Set(
      Object.entries(yearsByCompany)
        .filter(([, yrs]) => yrs.size >= 3)
        .map(([name]) => name),
    );
  }, []);
  const filtered = useMemo(
    () =>
      RAW.filter((r) => {
        if (completeOnly && !completeCompanies.has(r[1])) return false;
        if (completeOnly && r[8] == null) return false;
        if (year !== "ALL" && r[0] !== parseInt(year)) return false;
        if (sector !== "ALL" && r[2] !== sector) return false;
        if (market !== "ALL" && r[3] !== market) return false;
        if (quad !== "ALL" && r[10] !== quad) return false;
        if (search && !r[1].toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [year, sector, market, quad, search, completeOnly, completeCompanies],
  );
  const sorted = useMemo(() => {
    const idx =
      {
        esg_com: 4,
        env_com: 5,
        soc_com: 6,
        gov_com: 7,
        esg_score: 8,
        gw_gap: 9,
      }[sortBy] || 4;
    return [...filtered].sort((a, b) => (b[idx] ?? -999) - (a[idx] ?? -999));
  }, [filtered, sortBy]);
  const pageData = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const Sel = ({ label, val, onChange, opts }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label
        style={{
          color: "#94a3b8",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <select
        value={val}
        onChange={(e) => {
          onChange(e.target.value);
          setPage(0);
        }}
        style={{
          background: "#162844",
          border: "1px solid #2d4a6b",
          borderRadius: 6,
          color: "#e2e8f0",
          padding: "6px 10px",
          fontSize: 11,
          outline: "none",
        }}
      >
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          background: "#1e3a5f",
          borderRadius: 10,
          padding: 16,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <Sel
          label="Year"
          val={year}
          onChange={setYear}
          opts={["ALL", "2022", "2023", "2024"]}
        />
        <Sel label="Sector" val={sector} onChange={setSector} opts={sectors} />
        <Sel
          label="Market"
          val={market}
          onChange={setMarket}
          opts={["ALL", "MAIN MARKET", "ACE MARKET"]}
        />
        <Sel label="Quadrant" val={quad} onChange={setQuad} opts={quads} />
        <Sel
          label="Sort By (↓)"
          val={sortBy}
          onChange={setSortBy}
          opts={[
            "esg_com",
            "env_com",
            "soc_com",
            "gov_com",
            "esg_score",
            "gw_gap",
          ]}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            flex: 1,
            minWidth: 160,
          }}
        >
          <label
            style={{
              color: "#94a3b8",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Search Company
          </label>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Type firm name..."
            style={{
              background: "#162844",
              border: "1px solid #2d4a6b",
              borderRadius: 6,
              color: "#e2e8f0",
              padding: "6px 10px",
              fontSize: 11,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            alignSelf: "flex-end",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              color: completeOnly ? "#34d399" : "#94a3b8",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
            title="Show only companies with data in all 3 years (2022–2024)"
          >
            <input
              type="checkbox"
              checked={completeOnly}
              onChange={(e) => {
                setCompleteOnly(e.target.checked);
                setPage(0);
              }}
              style={{ accentColor: "#0d9488", cursor: "pointer" }}
            />
            Complete Data Only
          </label>
        </div>
        <div
          style={{
            background: "#0d9488",
            borderRadius: 6,
            padding: "6px 16px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            alignSelf: "flex-end",
            whiteSpace: "nowrap",
          }}
        >
          {sorted.length} records
          {completeOnly && (
            <span
              style={{
                fontWeight: 400,
                fontSize: 10,
                marginLeft: 6,
                opacity: 0.85,
              }}
            >
              ({completeCompanies.size} firms)
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
        >
          <thead>
            <tr style={{ background: "#1e3a5f" }}>
              {[
                "Company",
                "Year",
                "Sector",
                "Market",
                "Quadrant",
                "ESG%",
                "ENV%",
                "SOC%",
                "GOV%",
                "ESG Score",
                "GW Gap",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 11px",
                    textAlign: ["Company", "Sector", "Quadrant"].includes(h)
                      ? "left"
                      : "center",
                    color: "#93c5fd",
                    fontSize: 10,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => {
              const qcol = QUAD_COLORS[r[10]] || "#94a3b8";
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "7px 11px",
                      color: "#1e3a5f",
                      fontWeight: 600,
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r[1]}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    {r[0]}
                  </td>
                  <td style={{ padding: "7px 11px", fontSize: 10 }}>
                    <Badge text={SHORT[r[2]] || r[2]} color="#475569" />
                  </td>
                  <td style={{ padding: "7px 11px", textAlign: "center" }}>
                    <Badge
                      text={r[3].includes("MAIN") ? "MAIN" : "ACE"}
                      color={r[3].includes("MAIN") ? C.main : C.ace}
                    />
                  </td>
                  <td style={{ padding: "7px 11px" }}>
                    {r[10] ? <Badge text={r[10]} color={qcol} /> : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: C.esg,
                      fontWeight: 700,
                    }}
                  >
                    {pct(r[4])}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: C.env,
                    }}
                  >
                    {pct(r[5])}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: C.soc,
                    }}
                  >
                    {pct(r[6])}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: C.gov,
                    }}
                  >
                    {pct(r[7])}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: "#1e3a5f",
                      fontWeight: 600,
                    }}
                  >
                    {r[8] != null ? fmt(r[8]) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 11px",
                      textAlign: "center",
                      color: r[9] > 0 ? "#dc2626" : "#0d9488",
                      fontWeight: 700,
                    }}
                  >
                    {r[9] != null ? (r[9] > 0 ? "+" : "") + fmt(r[9], 3) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderTop: "1px solid #f1f5f9",
            background: "#f8fafc",
          }}
        >
          <div style={{ color: "#64748b", fontSize: 11 }}>
            Page {page + 1} of {totalPages || 1} · {sorted.length} records
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              ["← Prev", () => setPage(Math.max(0, page - 1)), page === 0],
              [
                "Next →",
                () => setPage(Math.min(totalPages - 1, page + 1)),
                page >= totalPages - 1,
              ],
            ].map(([lbl, fn, dis]) => (
              <button
                key={lbl}
                onClick={fn}
                disabled={dis}
                style={{
                  background: dis ? "#f1f5f9" : "#1e3a5f",
                  border: "none",
                  color: dis ? "#94a3b8" : "#fff",
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: dis ? "default" : "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShariahTab() {
  const yd = AGG.year_data;
  const mkt = AGG.mkt_data;
  const main = mkt.find((m) => m.market === "MAIN");
  const ace = mkt.find((m) => m.market === "ACE");
  // E,S,G order for market bars
  const mktPillar = [
    { pillar: "Environmental", Main: main.env_com, ACE: ace.env_com },
    { pillar: "Social", Main: main.soc_com, ACE: ace.soc_com },
    { pillar: "Governance", Main: main.gov_com, ACE: ace.gov_com },
  ];
  // 2024 radar data E,S,G order
  const radar2024 = [
    { subject: "Environmental", value: yd[2].env_com },
    { subject: "Social", value: yd[2].soc_com },
    { subject: "Governance", value: yd[2].gov_com },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle
            title="Governance Leadership (2022–2024)"
            sub="E → S → G communication intensity — Governance consistently leads"
          />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={yd}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#475569", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 14]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<ESGLegend />} />
              <Line
                type="monotone"
                dataKey="env_com"
                name="Environmental"
                stroke={C.env}
                strokeWidth={2.5}
                dot={{ r: 4, fill: C.env }}
              />
              <Line
                type="monotone"
                dataKey="soc_com"
                name="Social"
                stroke={C.soc}
                strokeWidth={2.5}
                dot={{ r: 4, fill: C.soc }}
              />
              <Line
                type="monotone"
                dataKey="gov_com"
                name="Governance"
                stroke={C.gov}
                strokeWidth={3}
                dot={{ r: 5, fill: C.gov, stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.6 }}>
              <strong>Key Insight:</strong> Governance-related communication
              consistently represents the largest component of ESG disclosure.
              However, Environmental and Social themes are exhibiting steady
              expansion, indicating a broader integration of workforce,
              stakeholder, and climate-related narratives over time.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            title="2024 ESG Radar — E · S · G Balance"
            sub="Latest year pillar profile — Environmental, Social, Governance"
          />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radar2024} cx="50%" cy="50%" outerRadius={80}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 14]}
                tick={{ fill: "#94a3b8", fontSize: 9 }}
              />
              <Radar
                name="2024"
                dataKey="value"
                stroke={C.esg}
                fill={C.esg}
                fillOpacity={0.25}
              />
              <Tooltip formatter={(v) => [pct(v), "Intensity"]} />
            </RadarChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.6 }}>
              <strong>Key Insight:</strong> The relatively limited variation in
              governance communication highlights its structurally dominant
              position across the sample period, whereas Environmental and
              Social pillars lag behind but show more dynamic trajectory shifts,
              reflecting an evolving compliance-first orientation.
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle
            title="Market Pillar Comparison (E → S → G)"
            sub="Main vs ACE — Environmental, Social, Governance breakdown"
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mktPillar} barGap={8}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="pillar"
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<Tip />} />
              <Legend content={<MarketLegend />} />
              <Bar
                dataKey="Main"
                name="Main Market"
                fill={C.main}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="ACE"
                name="ACE Market"
                fill={C.ace}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div
            style={{
              marginTop: 12,
              background: "#f0fdf9",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14 }}>💡</span>
            <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.6 }}>
              <strong>Key Insight:</strong> Firms listed on the Main Market
              exhibit more consistently high ESG communication levels across
              sectors relative to ACE Market firms. This structural difference
              suggests that listing segment characteristics play a role in
              shaping disclosure practices.
            </div>
          </div>
        </Card>
        <Card>
          <SecTitle
            title="Maqasid al-Shariah ↔ ESG Mapping"
            sub="Alignment between Islamic objectives and ESG pillars"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              [
                "Protection of Life (Hifz al-Nafs)",
                "E + S",
                "Health & safety, environmental stewardship",
                C.env,
              ],
              [
                "Protection of Intellect (Hifz al-Aql)",
                "S",
                "Education, training, human capital",
                C.soc,
              ],
              [
                "Protection of Wealth (Hifz al-Mal)",
                "G",
                "Anti-corruption, halal finance, Shariah governance",
                C.gov,
              ],
              [
                "Protection of Progeny (Hifz al-Nasl)",
                "E + S",
                "Community welfare, biodiversity, family",
                C.env,
              ],
              [
                "Protection of Religion (Hifz al-Din)",
                "G",
                "Shariah compliance, ethical business conduct",
                C.gov,
              ],
            ].map(([maq, esg, desc, col]) => (
              <div
                key={maq}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  background: "#f8fafc",
                  borderRadius: 7,
                  padding: "9px 12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    background: col + "18",
                    border: `1px solid ${col}33`,
                    borderRadius: 4,
                    padding: "4px 8px",
                    minWidth: 46,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ color: col, fontSize: 11, fontWeight: 800 }}>
                    {esg}
                  </div>
                </div>
                <div>
                  <div
                    style={{ color: "#1e3a5f", fontSize: 11, fontWeight: 600 }}
                  >
                    {maq}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatsTab() {
  const desc = AGG.desc;
  const statRows = [
    {
      var: "esg_score",
      label: "ESG Score (Refinitiv)",
      group: "ESG Performance",
    },
    {
      var: "env_pillar",
      label: "Environmental Pillar",
      group: "ESG Performance",
    },
    { var: "soc_pillar", label: "Social Pillar", group: "ESG Performance" },
    { var: "gov_pillar", label: "Governance Pillar", group: "ESG Performance" },
    { var: "esg_com", label: "ESG Communication", group: "ESG Communication" },
    {
      var: "env_com",
      label: "Environmental Communication",
      group: "ESG Communication",
    },
    {
      var: "soc_com",
      label: "Social Communication",
      group: "ESG Communication",
    },
    {
      var: "gov_com",
      label: "Governance Communication",
      group: "ESG Communication",
    },
  ];
  const gColors = {
    "ESG Performance": "#1e3a5f",
    "ESG Communication": "#0d9488",
  };
  let lastG = "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Card>
        <SecTitle
          tag="Table 1"
          title="Descriptive Statistics"
          sub="Key variables — 621 firms, 1,863 obs. (2022–2024 balanced panel). ESG-BERT measurement + Refinitiv ESG scores."
        />
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "2px solid #1e3a5f",
                }}
              >
                {[
                  "Variable",
                  "N",
                  "Mean",
                  "Std. Dev.",
                  "Min",
                  "p25",
                  "Median",
                  "p75",
                  "Max",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 12px",
                      textAlign: h === "Variable" ? "left" : "center",
                      color: "#1e3a5f",
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: 0.3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statRows.map((r, i) => {
                const d = desc[r.var];
                const showG = r.group !== lastG;
                lastG = r.group;
                const col = gColors[r.group];
                return (
                  <>
                    {showG && (
                      <tr key={r.group}>
                        <td
                          colSpan={9}
                          style={{
                            padding: "6px 12px",
                            color: col,
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: 1.2,
                            textTransform: "uppercase",
                            background: col + "10",
                          }}
                        >
                          {r.group}
                        </td>
                      </tr>
                    )}
                    <tr
                      key={r.var}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: i % 2 === 0 ? "#fff" : "#fafafa",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          color: "#334155",
                          fontWeight: 500,
                        }}
                      >
                        {r.label}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.n?.toLocaleString() || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#1e3a5f",
                          fontWeight: 700,
                        }}
                      >
                        {d?.mean != null ? fmt(d.mean) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.sd != null ? fmt(d.sd) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.min != null ? fmt(d.min) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.p25 != null ? fmt(d.p25) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.p50 != null ? fmt(d.p50) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.p75 != null ? fmt(d.p75) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {d?.max != null ? fmt(d.max) : "—"}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <SecTitle
          tag="Table 2"
          title="Impact of ESG Communication on ESG Performance"
          sub="Panel regression — firm FE + year FE + controls (ROA, MTBR, log market cap, log revenue)"
        />
        <div style={{ overflowX: "auto", marginBottom: 14 }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "2px solid #1e3a5f",
                }}
              >
                {[
                  "Variable",
                  "(1) ESG Score",
                  "(2) Env. Pillar",
                  "(3) Soc. Pillar",
                  "(4) Gov. Pillar",
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 14px",
                      textAlign: i === 0 ? "left" : "center",
                      color:
                        i === 0
                          ? "#1e3a5f"
                          : i === 1
                            ? C.esg
                            : i === 2
                              ? C.env
                              : i === 3
                                ? C.soc
                                : C.gov,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "esg_com",
                  "0.194***",
                  "(0.044)",
                  "—",
                  "—",
                  "—",
                  "—",
                  "—",
                  "—",
                ],
                [
                  "env_com",
                  "—",
                  "—",
                  "0.491***",
                  "(0.133)",
                  "—",
                  "—",
                  "—",
                  "—",
                ],
                [
                  "soc_com",
                  "—",
                  "—",
                  "—",
                  "—",
                  "0.397***",
                  "(0.131)",
                  "—",
                  "—",
                ],
                ["gov_com", "—", "—", "—", "—", "—", "—", "0.220", "(0.183)"],
                [
                  "Constant",
                  "8.748",
                  "(14.799)",
                  "-11.060",
                  "(15.559)",
                  "16.862",
                  "(19.223)",
                  "17.523",
                  "(26.169)",
                ],
              ].map(([var_, v1, se1, v2, se2, v3, se3, v4, se4], i) => (
                <tr
                  key={var_}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 14px",
                      color: "#334155",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {var_}
                  </td>
                  {[
                    [v1, se1, "#1e3a5f"],
                    [v2, se2, C.env],
                    [v3, se3, C.soc],
                    [v4, se4, C.gov],
                  ].map(([v, se, col], j) => (
                    <td
                      key={j}
                      style={{ padding: "9px 14px", textAlign: "center" }}
                    >
                      <div
                        style={{
                          color: v === "—" ? "#cbd5e1" : col,
                          fontWeight: v === "—" ? "400" : "700",
                          fontSize: 12,
                        }}
                      >
                        {v}
                      </div>
                      {se && se !== "—" && (
                        <div style={{ color: "#94a3b8", fontSize: 10 }}>
                          {se}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {[
                ["Controls", "Yes", "Yes", "Yes", "Yes"],
                ["Year FE", "Yes", "Yes", "Yes", "Yes"],
                ["Observations", "877", "877", "875", "877"],
                ["R-squared", "0.165", "0.293", "0.122", "0.008"],
                ["# Firms", "303", "303", "303", "303"],
              ].map(([l, ...vals]) => (
                <tr
                  key={l}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: l === "R-squared" ? "#f0fdf4" : "#fff",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 14px",
                      color: "#64748b",
                      fontSize: 11,
                    }}
                  >
                    {l}
                  </td>
                  {vals.map((v, i) => (
                    <td
                      key={i}
                      style={{
                        padding: "8px 14px",
                        textAlign: "center",
                        color: "#475569",
                        fontWeight: l === "R-squared" ? "700" : "400",
                        fontSize: 11,
                      }}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            color: "#64748b",
            fontSize: 10,
            marginBottom: 14,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#334155" }}>Notes:</strong> The table reports
          panel regression estimates of the relationship between ESG
          communication intensity and ESG performance. The dependent variables
          are the overall ESG score and its three pillars (environmental,
          social, and governance) obtained from Refinitiv. The key independent
          variables are the corresponding ESG communication measures derived
          from textual analysis of firms' annual reports. All specifications
          include firm-level control variables, namely return on assets (ROA),
          firm size (ln_marketcap), market-to-book ratio (mtb), and firm revenue
          (ln_revenue), as well as year fixed effects. Robust standard errors
          are reported in parentheses. Significance levels are denoted as *** p
          &lt; 0.01, ** p &lt; 0.05, and * p &lt; 0.10.
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div
              style={{
                color: "#166534",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              ✅ Key Finding
            </div>
            <div style={{ color: "#15803d", fontSize: 11, lineHeight: 1.6 }}>
              A 10-point increase in ESG communication intensity → ~2-point
              increase in Refinitiv ESG score (β=0.194, p&lt;0.01). Association
              strongest for <b>Environmental</b> (β=0.491) and <b>Social</b>{" "}
              (β=0.397).
            </div>
          </div>
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 5,
              }}
            >
              ⚠️ Governance Exception
            </div>
            <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
              Governance communication (β=0.220) is{" "}
              <b>not statistically significant</b> — reflecting the relatively
              structural and persistent nature of governance arrangements, which
              may not adjust as rapidly as narrative disclosure intensity.
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <SecTitle
          title="Regression Coefficient Visual Summary"
          sub="Effect size and explanatory power per ESG pillar — E · S · G ordered"
        />
        <div style={{ display: "flex", gap: 14 }}>
          {[
            [
              "ESG Overall",
              "esg_com → esg_score",
              0.194,
              0.165,
              "#1e3a5f",
              "***",
            ],
            [
              "Environmental",
              "env_com → env_pillar",
              0.491,
              0.293,
              C.env,
              "***",
            ],
            ["Social", "soc_com → soc_pillar", 0.397, 0.122, C.soc, "***"],
            ["Governance", "gov_com → gov_pillar", 0.22, 0.008, C.gov, "n.s."],
          ].map(([name, path, beta, r2, col, sig]) => (
            <div
              key={name}
              style={{
                flex: 1,
                background: sig === "n.s." ? "#f8fafc" : col + "08",
                borderRadius: 10,
                padding: 16,
                border: `1px solid ${sig === "n.s." ? "#e2e8f0" : col + "30"}`,
              }}
            >
              <div
                style={{
                  color: sig === "n.s." ? "#94a3b8" : col,
                  fontSize: 10,
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                {name}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 10 }}>
                {path}
              </div>
              <div
                style={{
                  color: sig === "n.s." ? "#94a3b8" : col,
                  fontSize: 26,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                β={beta}
              </div>
              <div
                style={{
                  color: sig === "n.s." ? "#cbd5e1" : "#16a34a",
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 3,
                }}
              >
                {sig}
              </div>
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: 4,
                  height: 5,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    width: `${r2 * 200}%`,
                    height: 5,
                    background: sig === "n.s." ? "#cbd5e1" : col,
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 3 }}>
                R² = {r2}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SecTitle
          title="Coefficient Plot — Communication → Performance"
          sub="β estimates with 95% confidence intervals · n.s. = not significant at p < 0.05"
        />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            layout="vertical"
            data={[
              {
                name: "Environmental",
                beta: 0.491,
                lo: 0.23,
                hi: 0.752,
                col: C.env,
                sig: true,
              },
              {
                name: "Social",
                beta: 0.397,
                lo: 0.14,
                hi: 0.654,
                col: C.soc,
                sig: true,
              },
              {
                name: "ESG Overall",
                beta: 0.194,
                lo: 0.108,
                hi: 0.28,
                col: "#1e3a5f",
                sig: true,
              },
              {
                name: "Governance",
                beta: 0.22,
                lo: -0.139,
                hi: 0.579,
                col: C.gov,
                sig: false,
              },
            ]}
            margin={{ left: 100, right: 60, top: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-0.2, 0.85]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            >
              <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
            </XAxis>
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={95}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: "#1e3a5f",
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <div
                      style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}
                    >
                      {d.name}
                    </div>
                    <div style={{ color: "#93c5fd", fontSize: 11 }}>
                      β = {d.beta}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 10 }}>
                      95% CI [{d.lo}, {d.hi}]
                    </div>
                    <div
                      style={{
                        color: d.sig ? "#4ade80" : "#f87171",
                        fontSize: 10,
                      }}
                    >
                      {d.sig ? "Significant (p < 0.01)" : "Not significant"}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="beta" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {[
                {
                  name: "Environmental",
                  beta: 0.491,
                  lo: 0.23,
                  hi: 0.752,
                  col: C.env,
                  sig: true,
                },
                {
                  name: "Social",
                  beta: 0.397,
                  lo: 0.14,
                  hi: 0.654,
                  col: C.soc,
                  sig: true,
                },
                {
                  name: "ESG Overall",
                  beta: 0.194,
                  lo: 0.108,
                  hi: 0.28,
                  col: "#1e3a5f",
                  sig: true,
                },
                {
                  name: "Governance",
                  beta: 0.22,
                  lo: -0.139,
                  hi: 0.579,
                  col: C.gov,
                  sig: false,
                },
              ].map((d, i) => (
                <Cell key={i} fill={d.sig ? d.col : "#cbd5e1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 16,
            fontSize: 10,
            color: "#64748b",
            justifyContent: "flex-end",
          }}
        >
          {[
            { color: C.env, label: "Significant (p < 0.01)" },
            { color: "#cbd5e1", label: "Not significant" },
          ].map((t) => (
            <div
              key={t.label}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: t.color,
                  flexShrink: 0,
                }}
              />
              {t.label}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            background: "#fef9f0",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            Key Insight
          </div>
          <div style={{ color: "#78350f", fontSize: 11, lineHeight: 1.6 }}>
            <b>
              Overall ESG communication is positively and significantly
              associated with ESG scores (β = 0.194, p &lt; 0.01).
            </b>{" "}
            A 10-point increase in ESG communication intensity is associated
            with approximately a 2-point increase in ESG score. The association
            is strongest for Environmental (β = 0.491, p &lt; 0.01) and Social
            (β = 0.397, p &lt; 0.01) communication. In contrast, Governance
            communication does not exhibit a statistically significant
            association with governance scores — reflecting the relatively
            structural and stable nature of governance arrangements among
            Malaysian Shariah-listed firms.
          </div>
        </div>
      </Card>
    </div>
  );
}

function GWTab() {
  const [selQuad, setSelQuad] = useState("all");
  const scatter = AGG.gw_scatter;
  const qCounts = AGG.quad_counts;
  const secGW = AGG.sec_gw;
  const topQ = AGG.top_by_quad;
  const total = Object.values(qCounts).reduce((a, b) => a + b, 0);
  const filtered =
    selQuad === "all" ? scatter : scatter.filter((d) => d.quadrant === selQuad);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f,#0d4f6b)",
          borderRadius: 12,
          padding: 20,
          border: "none",
        }}
      >
        <div
          style={{
            color: "#93c5fd",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Methodology
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 18px",
              fontFamily: "monospace",
              color: "#fff",
              fontSize: 12,
            }}
          >
            GW_Gap = Z(ESG Communication) − Z(ESG Score)
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              color: "#bfdbfe",
              fontSize: 11,
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: "#4ade80", fontWeight: 700 }}>
              Gap &gt; 0
            </span>
            : Communication exceeds performance → potential
            overstatement&nbsp;·&nbsp;
            <span style={{ color: "#f87171", fontWeight: 700 }}>
              Gap &lt; 0
            </span>
            : Performance exceeds communication → under-communication
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {[
          ["Aligned Leaders", C.env],
          ["Potential Overstatement", "#dc2626"],
          ["Under-Communicators", C.soc],
          ["Low ESG Profile", "#64748b"],
        ].map(([q, col]) => (
          <div
            key={q}
            onClick={() => setSelQuad(selQuad === q ? "all" : q)}
            style={{
              flex: 1,
              background: selQuad === q ? col + "18" : "#fff",
              borderRadius: 10,
              padding: "14px 16px",
              border: `2px solid ${selQuad === q ? col : "#e2e8f0"}`,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                color: col,
                fontSize: 10,
                fontWeight: 700,
                marginBottom: 3,
              }}
            >
              {q}
            </div>
            <div style={{ color: "#1e3a5f", fontSize: 22, fontWeight: 800 }}>
              {qCounts[q] || 0}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 1 }}>
              {(((qCounts[q] || 0) / total) * 100).toFixed(1)}% of obs.
            </div>
          </div>
        ))}
      </div>

      <Card>
        <SecTitle
          tag="Figure 10"
          title="ESG Communication vs ESG Score"
          sub="Standardized scores — click a quadrant above to filter · Red diamonds = top quartile GW risk"
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}
        >
          <div>
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="z_esg"
                  type="number"
                  domain={[-4, 4]}
                  name="Z(ESG Score)"
                  tick={{ fill: "#94a3b8", fontSize: 9 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                  label={{
                    value: "Standardized ESG Score",
                    position: "insideBottom",
                    offset: -14,
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                />
                <YAxis
                  dataKey="z_com"
                  type="number"
                  domain={[-4, 4]}
                  name="Z(ESG Com.)"
                  tick={{ fill: "#94a3b8", fontSize: 9 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                  label={{
                    value: "Standardized ESG Communication",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                <ReferenceLine
                  segment={[
                    { x: -4, y: -4 },
                    { x: 4, y: 4 },
                  ]}
                  stroke="#94a3b8"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Perfect Alignment",
                    position: "insideTopLeft",
                    fill: "#94a3b8",
                    fontSize: 9,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: "#1e3a5f",
                          borderRadius: 8,
                          padding: "9px 13px",
                          maxWidth: 200,
                        }}
                      >
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 10,
                            marginBottom: 3,
                          }}
                        >
                          {d.co}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 10 }}>
                          Z(com): {fmt(d.z_com)}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 10 }}>
                          Z(esg): {fmt(d.z_esg)}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 10 }}>
                          GW Gap: {fmt(d.gw_gap, 3)}
                        </div>
                        <Badge
                          text={d.quadrant}
                          color={QUAD_COLORS[d.quadrant]}
                        />
                      </div>
                    );
                  }}
                />
                <Scatter data={filtered} opacity={0.65}>
                  {filtered.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.high_gw === 1
                          ? "#dc2626"
                          : QUAD_COLORS[d.quadrant] || "#94a3b8"
                      }
                      opacity={d.high_gw === 1 ? 1 : 0.5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 10,
              }}
            >
              {[
                [
                  "Aligned Leaders",
                  "↗ Upper Right — consistent performance & disclosure",
                  C.env,
                ],
                [
                  "Potential Overstatement",
                  "↖ Upper Left — communication > performance",
                  "#dc2626",
                ],
                [
                  "Under-Communicators",
                  "↘ Lower Right — performance > communication",
                  C.soc,
                ],
                [
                  "Low ESG Profile",
                  "↙ Lower Left — low on both dimensions",
                  "#64748b",
                ],
              ].map(([q, desc, col]) => (
                <div
                  key={q}
                  style={{
                    background: col + "10",
                    borderRadius: 6,
                    padding: "7px 10px",
                    border: `1px solid ${col}30`,
                  }}
                >
                  <div style={{ color: col, fontSize: 10, fontWeight: 700 }}>
                    {q}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: 12,
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  color: "#1e3a5f",
                  fontWeight: 700,
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                GW Gap Statistics
              </div>
              {[
                ["Overall", AGG.desc.gw_gap, "#1e3a5f"],
                ["Environmental", AGG.desc.gw_env_gap, C.env],
                ["Social", AGG.desc.gw_soc_gap, C.soc],
                ["Governance", AGG.desc.gw_gov_gap, C.gov],
              ].map(([name, d, col]) => (
                <div
                  key={name}
                  style={{
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      color: col,
                      fontSize: 10,
                      fontWeight: 700,
                      marginBottom: 3,
                    }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      fontSize: 10,
                    }}
                  >
                    <span style={{ color: "#94a3b8" }}>Mean:</span>
                    <b style={{ color: "#1e3a5f" }}>
                      {d?.mean != null ? fmt(d.mean) : "—"}
                    </b>
                    <span style={{ color: "#94a3b8" }}>SD:</span>
                    <span style={{ color: "#475569" }}>
                      {d?.sd != null ? fmt(d.sd) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            background: "#f0fdf9",
            border: "1px solid #99f6e4",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 14 }}>💡</span>
          <div style={{ fontSize: 11, color: "#0f5c4e", lineHeight: 1.5 }}>
            <strong>Key Insight:</strong> While ESG communication and ESG
            performance are positively related, alignment is far from uniform.
            Substantial heterogeneity exists, with a meaningful subset of firms
            exhibiting positive communication-performance gaps where ESG
            communication intensity exceeds their externally assessed
            performance.
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle
          tag="Table 5"
          title="Average Greenwashing Gap by Sector and ESG Pillar (E → S → G)"
          sub="Positive = communication > performance · Negative = performance > communication"
        />
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "2px solid #1e3a5f",
                }}
              >
                {[
                  "Sector",
                  "Overall GW Gap",
                  "Env GW Gap",
                  "Soc GW Gap",
                  "Gov GW Gap",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: h === "Sector" ? "left" : "center",
                      color: "#1e3a5f",
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secGW.map((s, i) => {
                const GWCell = ({ v }) => {
                  const pos = v > 0;
                  return (
                    <td style={{ padding: "7px 12px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 7,
                            background: "#f1f5f9",
                            borderRadius: 4,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: pos ? "50%" : "auto",
                              right: pos ? "auto" : "50%",
                              width: `${Math.min(100, (Math.abs(v) / 1.2) * 100)}%`,
                              height: "100%",
                              background: pos ? "#dc2626" : "#0d9488",
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            color: pos ? "#dc2626" : "#0d9488",
                            fontWeight: 700,
                            fontSize: 10,
                            minWidth: 38,
                          }}
                        >
                          {v > 0 ? "+" : ""}
                          {fmt(v, 3)}
                        </span>
                      </div>
                    </td>
                  );
                };
                return (
                  <tr
                    key={s.sector}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td
                      style={{
                        padding: "7px 12px",
                        color: "#334155",
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    >
                      {SHORT[s.sector] || s.sector}
                    </td>
                    <GWCell v={s.gw_gap} />
                    <GWCell v={s.gw_env} />
                    <GWCell v={s.gw_soc} />
                    <GWCell v={s.gw_gov} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SecTitle
          tag="Table 4"
          title="Top 10 Firms by ESG Communication–Performance Positioning"
          sub="Firm-level quadrant analysis — standardized scores"
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {Object.entries(topQ).map(([quad, firms]) => {
            const col = QUAD_COLORS[quad];
            return (
              <div
                key={quad}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${col}30`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: col,
                    padding: "7px 12px",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {quad}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "25px 1fr 60px 60px 60px",
                    gap: 8,
                    padding: "4px 10px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#64748b",
                    textAlign: "center",
                  }}
                >
                  <div>#</div>
                  <div style={{ textAlign: "left" }}>Company</div>
                  <div>z_esg</div>
                  <div>z_com</div>
                  <div>gw_gap</div>
                </div>
                {firms.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "25px 1fr 60px 60px 60px",
                      gap: 8,
                      padding: "6px 10px",
                      borderBottom: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: 9,
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    >
                      #{i + 1}
                    </span>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          color: "#1e3a5f",
                          fontSize: 9,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {f.co}
                      </div>
                      <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                        <Badge
                          text={SHORT[f.sector] || f.sector}
                          color="#64748b"
                        />
                        <Badge
                          text={f.market.includes("MAIN") ? "MAIN" : "ACE"}
                          color={f.market.includes("MAIN") ? C.main : C.ace}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        color: "#1e3a5f",
                        fontWeight: 700,
                        fontSize: 10,
                        textAlign: "center",
                      }}
                    >
                      {fmt(f.z_esg, 2)}
                    </span>
                    <span
                      style={{
                        color: "#1e3a5f",
                        fontWeight: 700,
                        fontSize: 10,
                        textAlign: "center",
                      }}
                    >
                      {fmt(f.z_com, 2)}
                    </span>
                    <span
                      style={{
                        color: f.gw_gap > 0 ? "#dc2626" : "#0d9488",
                        fontWeight: 700,
                        fontSize: 10,
                        textAlign: "center",
                      }}
                    >
                      {f.gw_gap > 0 ? "+" : ""}
                      {fmt(f.gw_gap, 2)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function RecommendationsTab() {
  const conclusions = [
    {
      icon: "📈",
      title: "ESG Communication Has Grown Substantially",
      text: "ESG communication intensity increased from 22.05% (2022) to 29.98% (2024) — a 36% relative rise. Environmental themes experienced the fastest expansion, consistent with evolving regulatory expectations and global climate-related disclosure standards.",
      color: C.env,
    },
    {
      icon: "🔗",
      title: "Communication Is Positively Linked to Performance",
      text: "ESG communication intensity is positively associated with ESG performance (β = 0.194, p < 0.01). The association is strongest for the Environmental pillar (β = 0.491) and Social pillar (β = 0.397). The Governance pillar shows no statistically significant association, partly due to limited within-firm variation over time.",
      color: C.soc,
    },
    {
      icon: "⚠️",
      title: "Greenwashing Gap Is Measurable and Heterogeneous",
      text: "The mean greenwashing gap of 0.148 indicates a mild aggregate tendency toward over-communication. Plantation (0.57), Utilities (0.41), and Industrial Products & Services (0.36) show the largest positive gaps. Financial Services (−0.88) and Healthcare (−0.33) under-communicate relative to their assessed ESG performance.",
      color: "#f59e0b",
    },
    {
      icon: "🏛️",
      title: "Market Listing Shapes Disclosure Practices",
      text: "Main Market firms consistently demonstrate higher and more uniform ESG communication intensity (26.6%) compared to ACE Market firms (22.1%). This 4.5 pp structural gap suggests listing segment characteristics play a role in shaping disclosure behaviour, independent of sectoral factors.",
      color: C.main,
    },
  ];

  const implications = [
    {
      label: "Regulatory",
      color: "#1e3a5f",
      bg: "#eff6ff",
      border: "#bfdbfe",
      points: [
        "As Malaysia transitions toward full implementation of IFRS Sustainability Disclosure Standards under the National Sustainability Reporting Framework (NSRF), improving not only the volume but also the credibility and performance-alignment of ESG disclosures will be critical.",
        "The measurable greenwashing gap across sectors calls for enhanced verification mechanisms to ensure disclosure quality keeps pace with disclosure quantity.",
      ],
    },
    {
      label: "Analytical",
      color: "#065f46",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      points: [
        "The findings underscore the importance of distinguishing between ESG communication intensity and externally assessed ESG performance. High communication scores do not automatically translate into high ESG outcomes.",
        "Sector-level analysis is essential — ESG communication strategies are shaped by industry characteristics and exposure profiles, meaning aggregate averages can obscure meaningful heterogeneity.",
      ],
    },
  ];

  const limitations = [
    "The study covers a balanced panel of 621 Shariah-listed firms over 2022–2024 only; findings may not generalise to all Malaysian listed companies or other markets.",
    "The Governance pillar shows no significant association with communication intensity, partly because governance disclosure follows a more stable trajectory with limited within-firm variation — fixed-effects models rely on within-firm changes.",
    "ESG performance is benchmarked against Refinitiv ESG Scores. Substantial divergence across rating providers arises from differences in scope, measurement, and weighting methodologies.",
    "The greenwashing gap is a structured proxy measure. It does not directly observe intentional misrepresentation and should not be interpreted as definitive evidence of greenwashing behaviour.",
  ];

  const future = [
    "Incorporate post-IFRS adoption data to evaluate whether mandatory standards improve the alignment between ESG communication and ESG performance.",
    "Use alternative ESG rating providers to test sensitivity of the communication–performance relationship to rating methodology differences.",
    "Pursue longitudinal evaluation of disclosure quality beyond textual intensity — examining depth, specificity, and verifiability of ESG narratives.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Conclusion banner */}
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f 0%,#0d4f6b 100%)",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div
          style={{
            color: "#93c5fd",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Report Conclusion
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          ESG Communication Among Malaysian Shariah-Listed Firms (2022–2024)
        </div>
        <div style={{ color: "#bfdbfe", fontSize: 12, lineHeight: 1.8 }}>
          This report provides a comprehensive assessment of ESG communication
          dynamics among 621 Malaysian Shariah-listed firms over 2022–2024.
          Communication intensity has increased substantially and
          systematically, and is positively associated with ESG performance —
          though the relationship is neither automatic nor uniform across
          pillars and sectors. Measurable greenwashing gaps persist, and the
          transition toward IFRS sustainability standards makes improving
          disclosure credibility and performance-alignment increasingly
          critical.
        </div>
      </div>

      {/* Key conclusions */}
      <Card>
        <SecTitle title="Key Conclusions" sub="Core findings from the report" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {conclusions.map((c) => (
            <div
              key={c.title}
              style={{
                background: "#f8fafc",
                border: `1.5px solid #e2e8f0`,
                borderLeft: `4px solid ${c.color}`,
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: "#1e3a5f",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{c.icon}</span> {c.title}
              </div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
                {c.text}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Implications */}
      <Card>
        <SecTitle
          title="Implications"
          sub="Policy and analytical implications drawn from the report"
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {implications.map((im) => (
            <div
              key={im.label}
              style={{
                background: im.bg,
                border: `1px solid ${im.border}`,
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  color: im.color,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                {im.label} Implications
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {im.points.map((p, i) => (
                  <li
                    key={i}
                    style={{ fontSize: 11, color: "#334155", lineHeight: 1.7 }}
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Limitations & Future Research side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SecTitle title="Limitations" sub="Boundaries of the current study" />
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {limitations.map((l, i) => (
              <li
                key={i}
                style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}
              >
                {l}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SecTitle
            title="Future Research Directions"
            sub="Extensions proposed in the report"
          />
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {future.map((f, i) => (
              <li
                key={i}
                style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}
              >
                {f}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const tabs = [
    { label: "📊 Overview", comp: <OverviewTab /> },
    { label: "🌿 Pillars", comp: <PillarsTab /> },
    { label: "🏛️ Market", comp: <MarketTab /> },
    { label: "🏭 Sectors", comp: <SectorsTab /> },
    { label: "📈 Distribution", comp: <DistributionTab /> },
    { label: "🔍 Data Explorer", comp: <ExplorerTab /> },
    { label: "☪️ Shariah–ESG", comp: <ShariahTab /> },
    { label: "📐 Statistical Analysis", comp: <StatsTab /> },
    { label: "⚠️ Greenwashing", comp: <GWTab /> },
    { label: "💡 Recommendations", comp: <RecommendationsTab /> },
  ];
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "'Georgia','Times New Roman',serif",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f 0%,#0d4f6b 100%)",
        }}
      >
        <div style={{ padding: "20px 32px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 26,
                    background: "#0d9488",
                    borderRadius: 2,
                  }}
                />
                <div>
                  <div
                    style={{
                      color: "#fff",
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: -0.3,
                      marginTop: 2,
                    }}
                  >
                    ESG Communication Among Shariah-Listed Firms in Malaysia
                  </div>
                </div>
              </div>
              <div
                style={{
                  color: "#93c5fd",
                  fontSize: 11,
                  marginLeft: 11,
                  marginTop: 2,
                }}
              >
                ESG-BERT NLP · Refinitiv ESG Scores · Balanced Panel 2022–2024 ·
                Bursa Malaysia
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {[
                ["621", "Firms"],
                ["1,863", "Observations"],
                ["12", "Sectors"],
                ["2022–2024", "Period"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px 14px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                    {v}
                  </div>
                  <div style={{ color: "#93c5fd", fontSize: 9, marginTop: 1 }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            padding: "0 32px",
            marginTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {tabs.map((t, i) => (
            <TabBtn key={i} active={tab === i} onClick={() => setTab(i)}>
              {t.label}
            </TabBtn>
          ))}
        </div>
      </div>
      <div style={{ padding: "24px 32px", maxWidth: 1320, margin: "0 auto" }}>
        {tabs[tab].comp}
      </div>
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "12px 32px",
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: 10 }}>
          © 2026 INCEIF University · DRAFT – CONFIDENTIAL · ESG-BERT (Schimanski
          et al., 2024) · Refinitiv ESG Scores
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Badge text="DRAFT – CONFIDENTIAL" color="#dc2626" />
          <Badge text="Shariah-Compliant" color="#0d9488" />
          <Badge text="NLP · Panel Regression" color="#1e3a5f" />
        </div>
      </div>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#1e3a5f",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(30,58,95,0.35)",
            zIndex: 999,
            transition: "opacity 0.2s",
          }}
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
