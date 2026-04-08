import React from "react";

type Option = { id: string; name: string };

type Props = {
  weld: Record<string, any>;
  wpsList?: Option[];
  welders?: Option[];
  materials?: Option[];
  onChange: (field: string, value: string) => void;
};

export default function WeldInspectionModal({ weld, wpsList = [], welders = [], materials = [], onChange }: Props) {
  return (
    <div>
      <h2>Gegevens van de las</h2>

      <label>
        WPS
        <select value={weld.wps_id ?? ""} onChange={(e) => onChange("wps_id", e.target.value)}>
          <option value="">Kies WPS</option>
          {wpsList.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </label>

      <label>
        Lasser
        <select value={weld.welder_id ?? ""} onChange={(e) => onChange("welder_id", e.target.value)}>
          <option value="">Kies lasser</option>
          {welders.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </label>

      <label>
        Materiaal
        <select value={weld.material_id ?? ""} onChange={(e) => onChange("material_id", e.target.value)}>
          <option value="">Kies materiaal</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
