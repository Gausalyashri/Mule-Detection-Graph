import { useState, useEffect, useRef } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area
} from "recharts";

function NetworkGraph({ nodes, links, selectedNode, onSelectNode }) {
  const canvasRef = useRef(null);
  const posRef = useRef({});
  const dragRef = useRef(null);

  useEffect(() => {
    if (!nodes.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const positions = {};
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      positions[n.id] = {
        x: W / 2 + (W * 0.3) * Math.cos(angle),
        y: H / 2 + (H * 0.3) * Math.sin(angle)
      };
    });
    posRef.current = positions;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      links.forEach(l => {
        const s = positions[l.source], t = positions[l.target];
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = "rgba(0,247,255,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      nodes.forEach(n => {
        const p = positions[n.id];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, 2 * Math.PI);
        ctx.fillStyle = selectedNode === n.id ? "#00f7ff" : "#0a1628";
        ctx.strokeStyle = selectedNode === n.id ? "#fff" : "#00f7ff";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = selectedNode === n.id ? "#000" : "#00f7ff";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.id, p.x, p.y);
      });
    };

    draw();

    const getScaled = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height)
      };
    };

    const getNode = (mx, my) => {
      for (const [id, p] of Object.entries(positions)) {
        if (Math.hypot(mx - p.x, my - p.y) < 14) return id;
      }
      return null;
    };

    const onMouseDown = (e) => {
      const { x, y } = getScaled(e);
      const hit = getNode(x, y);
      if (hit) dragRef.current = hit;
    };

    const onMouseMove = (e) => {
      if (!dragRef.current) return;
      const { x, y } = getScaled(e);
      positions[dragRef.current].x = x;
      positions[dragRef.current].y = y;
      draw();
    };

    const onMouseUp = (e) => {
      const { x, y } = getScaled(e);
      const hit = getNode(x, y);
      if (hit && !dragRef.current) onSelectNode(hit);
      if (dragRef.current && hit === dragRef.current) onSelectNode(hit);
      dragRef.current = null;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
    };
  }, [nodes, links, selectedNode]);

  return (
    <canvas
      ref={canvasRef}
      width={420}
      height={220}
      style={{ cursor: "grab", width: "100%", height: "auto" }}
    />
  );
}
export default function App() {
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [riskData, setRiskData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState([]);
  const [chains, setChains] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats] = useState({ total: 0, flagged: 0, blocked: 0, chains: 0 });

  const fetchAll = () => {
    fetch("http://127.0.0.1:8000/graph")
      .then(res => res.json())
      .then(data => {
        setGraph(data);
        setStats(prev => ({
          ...prev,
          total: data?.links?.length || 0,
          chains: data?.nodes?.length || 0
        }));
      }).catch(console.error);

    fetch("http://127.0.0.1:8000/risk-table")
      .then(res => res.json())
      .then(data => setRiskData(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("http://127.0.0.1:8000/alerts")
      .then(res => res.json())
      .then(data => setAlerts(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("http://127.0.0.1:8000/fraud-trend")
      .then(res => res.json())
      .then(data => setTrend(data))
      .catch(console.error);

    fetch("http://127.0.0.1:8000/mule-chains")
      .then(res => res.json())
      .then(data => setChains(data.mule_networks || []))
      .catch(console.error);

    fetch("http://127.0.0.1:8000/anomaly")
      .then(res => res.json())
      .then(data => setAnomalies(data.anomalies || []))
      .catch(console.error);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const NEW_ALERTS = [
      { account: "A3", alert: "New inbound transfer ₹1,12,000 detected" },
      { account: "A7", alert: "Suspicious withdrawal cluster identified" },
      { account: "A5", alert: "KYC mismatch — flagged for review" },
    ];
    let i = 0;
    const iv = setInterval(() => {
      setAlerts(prev => [{ ...NEW_ALERTS[i % NEW_ALERTS.length] }, ...prev.slice(0, 6)]);
      setStats(s => ({ ...s, flagged: s.flagged + 1 }));
      i++;
    }, 4500);
    return () => clearInterval(iv);
  }, []);

  const CS = {
    app: { minHeight: "100vh", background: "#050a14", color: "#c8d8f0", padding: "24px", fontFamily: "monospace",fontSize:14},
    panel: { border: "1px solid rgba(0,247,255,0.1)", borderRadius: 10, padding: 20 },
    panelTitle: { fontSize: 11, marginBottom: 16, color: "rgba(0,247,255,0.7)", letterSpacing: 2 },
    dot: (c) => ({ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block", marginRight: 6 })
  };

  const nodeInfo = selectedNode ? riskData.find(r => r.account === selectedNode) : null;
  const nodeAnomalies = selectedNode
    ? anomalies.filter(a => a.sender === selectedNode || a.receiver === selectedNode)
    : [];

  return (
    <div style={CS.app}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: "#00f7ff", margin: 0 }}>MULEGRAPH AI</h2>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Financial Crime Intelligence Platform</div>
        </div>
        <div style={{ fontSize: 12, color: "#ff003c" }}>● LIVE MONITORING</div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <div style={CS.panel}><h3 style={{ margin: "0 0 4px", color: "#00f7ff" }}>{stats.total}</h3>TOTAL TRANSACTIONS</div>
        <div style={CS.panel}><h3 style={{ margin: "0 0 4px", color: "#ff003c" }}>{stats.flagged}</h3>FLAGGED ACCOUNTS</div>
        <div style={CS.panel}><h3 style={{ margin: "0 0 4px", color: "#c084fc" }}>{anomalies.length}</h3>AI ANOMALIES</div>
        <div style={CS.panel}><h3 style={{ margin: "0 0 4px", color: "#00ff9f" }}>{stats.chains}</h3>MULE NETWORKS</div>
      </div>

      {/* NETWORK + INSPECTOR */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={CS.panel}>
          <div style={CS.panelTitle}><span style={CS.dot("#00f7ff")} />TRANSACTION NETWORK</div>
          {graph.nodes.length === 0 ? (
            <div style={{ color: "#00f7ff", opacity: 0.5 }}>No transactions in database</div>
          ) : (
            <NetworkGraph
              nodes={graph.nodes}
              links={graph.links}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}
        </div>

        <div style={CS.panel}>
          <div style={CS.panelTitle}><span style={CS.dot("#ff003c")} />NODE INSPECTOR</div>
          {nodeInfo ? (
            <div>
              <div style={{ color: "#00f7ff", fontSize: 22, marginBottom: 12 }}>{nodeInfo.account}</div>
              <div style={{ marginBottom: 6, fontSize: 12 }}>RISK SCORE</div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: nodeInfo.risk_score > 0.5 ? "#ff003c" : "#00ff9f", fontSize: 20, fontWeight: "bold" }}>
                  {Math.round(nodeInfo.risk_score * 100)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#0a1628", marginBottom: 16 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  width: `${Math.round(nodeInfo.risk_score * 100)}%`,
                  background: nodeInfo.risk_score > 0.5 ? "#ff003c" : "#00ff9f",
                  transition: "width 0.4s"
                }} />
              </div>
              <div style={{ fontSize: 11, marginBottom: 8, color: "rgba(0,247,255,0.7)" }}>AI ANOMALIES INVOLVING NODE</div>
              {nodeAnomalies.length === 0 ? (
                <div style={{ fontSize: 11, opacity: 0.5 }}>None detected</div>
              ) : (
                nodeAnomalies.map((a, i) => (
                  <div key={i} style={{ fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(255,0,60,0.1)" }}>
                    {a.sender} → {a.receiver} | ₹{a.amount.toLocaleString()} | score: {a.anomaly_score}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ opacity: 0.5, fontSize: 12 }}>Click a node in the graph to inspect</div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>

        <div style={CS.panel}>
          <div style={CS.panelTitle}><span style={CS.dot("#00ff9f")} />RISK ANALYTICS</div>
          {riskData.map((r, i) => (
            <div key={i} onClick={() => setSelectedNode(r.account)}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,247,255,0.05)", cursor: "pointer", color: selectedNode === r.account ? "#00f7ff" : "#c8d8f0" }}>
              <span>{r.account}</span>
              <span style={{ color: r.risk_score > 0.5 ? "#ff003c" : "#00ff9f" }}>
                {Math.round(r.risk_score * 100)}%
              </span>
            </div>
          ))}
        </div>

        <div style={CS.panel}>
          <div style={CS.panelTitle}><span style={CS.dot("#c084fc")} />FRAUD TIMELINE</div>
          {trend.length > 0 ? (
            <AreaChart width={320} height={180} data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,247,255,0.1)" />
              <XAxis dataKey="month" stroke="#c8d8f0" tick={{ fontSize: 10 }} />
              <YAxis stroke="#c8d8f0" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid #00f7ff22", fontSize: 11 }} />
              <Area type="monotone" dataKey="cases" stroke="#c084fc" fill="rgba(192,132,252,0.15)" />
            </AreaChart>
          ) : (
            <div style={{ opacity: 0.5 }}>Waiting for data...</div>
          )}
        </div>

        <div style={CS.panel}>
          <div style={CS.panelTitle}><span style={CS.dot("#ff003c")} />DETECTED MULE CHAINS</div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {chains.map((chain, i) => (
              <div key={i} style={{ padding: "3px 0", fontSize: 11, borderBottom: "1px solid rgba(255,0,60,0.1)" }}>
                Chain {i + 1}: {chain.join(" → ")}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* AI ANOMALY TABLE */}
      <div style={CS.panel}>
        <div style={CS.panelTitle}><span style={CS.dot("#ff003c")} />AI ANOMALY DETECTION — ISOLATION FOREST</div>
        {anomalies.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: 12 }}>No anomalies detected</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, fontSize: 11 }}>
            <div style={{ opacity: 0.6 }}>SENDER</div>
            <div style={{ opacity: 0.6 }}>RECEIVER</div>
            <div style={{ opacity: 0.6 }}>AMOUNT</div>
            <div style={{ opacity: 0.6 }}>ANOMALY SCORE</div>
            {anomalies.map((a, i) => (
              <>
                <div key={`s${i}`}>{a.sender}</div>
                <div key={`r${i}`}>{a.receiver}</div>
                <div key={`a${i}`}>₹{a.amount.toLocaleString()}</div>
                <div key={`sc${i}`} style={{ color: a.anomaly_score > 0.1 ? "#ff003c" : "#00ff9f" }}>
                  {a.anomaly_score}
                </div>
              </>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}