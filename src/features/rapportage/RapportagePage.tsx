import React from "react";
import { useNavigate } from "react-router-dom";

type ReportRow = {
  id: string;
  title: string;
  type?: string;
  created_at?: string;
  project_id?: string;
};

type Props = {
  rows?: ReportRow[];
};

export default function RapportagePage({ rows = [] }: Props) {
  const navigate = useNavigate();

  return (
    <div className="page page-rapportage">
      <div className="page-header">
        <h1>Rapportage</h1>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Titel</th>
              <th>Type</th>
              <th>Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3}>Geen rapportregels beschikbaar.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onDoubleClick={() => row.project_id && navigate(`/projecten/${row.project_id}`)}
                  style={{ cursor: row.project_id ? "pointer" : "default" }}
                >
                  <td>{row.title}</td>
                  <td>{row.type ?? "onbekend"}</td>
                  <td>{row.created_at ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
