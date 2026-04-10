
import { useEffect, useState } from "react";
import { apiRequest } from "../services/apiClient";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    apiRequest("/api/v1/reports").then(data => {
      setReports(data.items || []);
    });
  }, []);

  return (
    <div>
      <h1>Rapportage</h1>
      {reports.length === 0 ? <p>Geen rapporten</p> :
        reports.map((r:any) => <div key={r.id}>{r.title}</div>)
      }
    </div>
  );
}
