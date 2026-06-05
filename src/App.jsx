import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function App() {
  const data = [
    { month: "Jan", inflation: 4.1 },
    { month: "Feb", inflation: 4.3 },
    { month: "Mar", inflation: 4.6 },
    { month: "Apr", inflation: 4.8 },
    { month: "May", inflation: 5.1 },
    { month: "Jun", inflation: 5.4 },
    { month: "Jul", inflation: 5.7 },
  ];

  const [report, setReport] = useState("");

  function generateReport() {
    setReport(`
Inflation has increased steadily from 4.1% to 5.7%.

Economic momentum remains positive, but rising prices indicate increasing inflationary pressure.

GDP growth remains healthy at 4.9%, suggesting continued economic expansion.

Exchange-rate fluctuations and global energy prices remain key risks.

Forecast:
Inflation is likely to remain elevated over the next quarter unless monetary policy tightens.
    `);
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Arial",
        backgroundColor: "#f3f4f6",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: "250px",
          backgroundColor: "#111827",
          color: "white",
          padding: "30px",
        }}
      >
        <h2 style={{ fontSize: "28px" }}>EconAI</h2>

        <div style={{ marginTop: "40px", lineHeight: "3" }}>
          <p>📊 Dashboard</p>
          <p>📈 Analytics</p>
          <p>🌍 Global Markets</p>
          <p>🤖 AI Reports</p>
          <p>⚙ Settings</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          padding: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          Economic AI Dashboard
        </h1>

        <p style={{ color: "#6b7280" }}>
          Real-time economic intelligence platform
        </p>

        {/* KPI CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          {[
            ["Inflation", "5.7%"],
            ["GDP Growth", "4.9%"],
            ["Unemployment", "7.1%"],
            ["Exchange Rate", "KES 129/USD"],
          ].map((item) => (
            <div
              key={item[0]}
              style={{
                backgroundColor: "white",
                padding: "25px",
                borderRadius: "15px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <h3>{item[0]}</h3>
              <h1>{item[1]}</h1>
            </div>
          ))}
        </div>

        {/* CHART */}
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "15px",
            marginTop: "30px",
          }}
        >
          <h2>Inflation Trend Analysis</h2>

          <div style={{ height: "350px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="inflation"
                  stroke="#2563eb"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI REPORT */}
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "15px",
            marginTop: "30px",
          }}
        >
          <h2>AI Economic Analysis</h2>

          <button
            onClick={generateReport}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Generate AI Report
          </button>

          {report && (
            <div
              style={{
                marginTop: "20px",
                backgroundColor: "#f9fafb",
                padding: "20px",
                borderRadius: "10px",
                whiteSpace: "pre-line",
              }}
            >
              {report}
            </div>
          )}
        </div>

        {/* FORECAST */}
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "15px",
            marginTop: "30px",
          }}
        >
          <h2>Economic Forecast</h2>

          <p>
            📈 Inflation Forecast (Next Quarter): <b>6.1%</b>
          </p>

          <p>
            📊 GDP Forecast: <b>5.2%</b>
          </p>

          <p>
            💱 USD/KES Forecast: <b>131</b>
          </p>
        </div>

        {/* RISK MONITOR */}
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "15px",
            marginTop: "30px",
            marginBottom: "40px",
          }}
        >
          <h2>Economic Risk Monitor</h2>

          <p>🟡 Inflation Risk: Medium</p>
          <p>🟢 Growth Risk: Low</p>
          <p>🟡 Currency Risk: Medium</p>
          <p>🔴 Energy Price Risk: High</p>
        </div>
      </div>
    </div>
  );
}