import { Drawer } from '@/components/overlays/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export type ProjectFilterState = {
  opdrachtgever: string;
  executionClass: string;
  status: string;
};

export function ProjectsFilterDrawer({
  open,
  values,
  onChange,
  onClose,
  onReset,
}: {
  open: boolean;
  values: ProjectFilterState;
  onChange: (patch: Partial<ProjectFilterState>) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Geavanceerde filters">
      <div className="form-grid single">
        <label className="field-shell">
          <span>Opdrachtgever</span>
          <Input value={values.opdrachtgever} onChange={(event) => onChange({ opdrachtgever: event.target.value })} placeholder="Bijv. CWS Staalbouw" />
        </label>
        <label className="field-shell">
          <span>Executieklasse</span>
          <Select value={values.executionClass} onChange={(event) => onChange({ executionClass: event.target.value })}>
            <option value="all">Alle uitvoeringsklassen</option>
            <option value="exc1">EXC1</option>
            <option value="exc2">EXC2</option>
            <option value="exc3">EXC3</option>
            <option value="exc4">EXC4</option>
          </Select>
        </label>
        <label className="field-shell">
          <span>Status</span>
          <Select value={values.status} onChange={(event) => onChange({ status: event.target.value })}>
            <option value="all">Alle statussen</option>
            <option value="concept">Concept</option>
            <option value="in-uitvoering">In uitvoering</option>
            <option value="in-controle">In controle</option>
            <option value="gereed">Gereed</option>
            <option value="geblokkeerd">Geblokkeerd</option>
          </Select>
        </label>
      </div>

      <div className="drawer-footer-actions">
        <Button variant="secondary" onClick={onReset}>Reset filters</Button>
        <Button onClick={onClose}>Filters toepassen</Button>
      </div>
    </Drawer>
  );
}
