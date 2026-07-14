import { useState } from "react";
import SalesPipeline from "./SalesPipeline.jsx";
import ProjectsGrid from "./ProjectsGrid.jsx";

export default function Projects() {
  const [tab, setTab] = useState("pipeline");

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Projects</h1>
      <div style={{ fontSize: 13, color: "var(--mut)", marginBottom: 16 }}>
        {tab === "pipeline"
          ? "Every lead before an advance payment — drag cards through the stages."
          : "Customers who've paid an advance — active, in-progress work."}
      </div>

      <div style={{ borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {[["pipeline", "Sales Pipeline"], ["projects", "Projects"]].map(([k, l]) => (
          <button key={k} className={`dk-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "pipeline" && <SalesPipeline />}
      {tab === "projects" && <ProjectsGrid />}
    </div>
  );
}
