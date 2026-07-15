import { useState } from "react";
import SalesPipeline from "./SalesPipeline.jsx";
import Leads from "./Leads.jsx";

// Sales Pipeline is its own top-level section (separate from Projects,
// which is execution-only after an advance payment) — see architecture
// note in AdminShell.jsx. Two views over the same lead data: the Kanban
// (SalesPipeline.jsx) and the sortable/filterable table (Leads.jsx),
// neither of which is modified here — just toggled within one page.
export default function SalesPipelinePage() {
  const [view, setView] = useState("kanban");

  return (
    <div>
      <div style={{ borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {[["kanban", "Kanban"], ["table", "Table"]].map(([k, l]) => (
          <button key={k} className={`dk-tab ${view === k ? "on" : ""}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {view === "kanban" && <SalesPipeline />}
      {view === "table" && <Leads />}
    </div>
  );
}
