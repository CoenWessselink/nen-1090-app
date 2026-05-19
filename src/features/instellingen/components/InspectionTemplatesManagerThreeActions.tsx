import { useEffect } from 'react';
import { InspectionTemplatesManager as BaseInspectionTemplatesManager } from './InspectionTemplatesManagerRuntime';

function enhanceTemplateActions() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.mobile-list-stack .section-title-row'));
  for (const row of cards) {
    const button = Array.from(row.querySelectorAll<HTMLButtonElement>('button')).find((node) => /dupliceer\s*&\s*bewerk/i.test(node.textContent || ''));
    if (!button || button.dataset.threeActionsReady === '1') continue;

    button.dataset.threeActionsReady = '1';
    button.textContent = 'Edit';

    const duplicateButton = button.cloneNode(false) as HTMLButtonElement;
    duplicateButton.type = 'button';
    duplicateButton.textContent = 'Dupliceer';
    duplicateButton.className = button.className;
    duplicateButton.onclick = () => button.click();

    const deleteButton = button.cloneNode(false) as HTMLButtonElement;
    deleteButton.type = 'button';
    deleteButton.textContent = 'Verwijder';
    deleteButton.className = button.className;
    deleteButton.onclick = () => {
      const message = 'Standaardtemplates zijn read-only en kunnen niet worden verwijderd. Dupliceer eerst naar een tenant-template.';
      const event = new CustomEvent('weldinspect:toast', { detail: { type: 'warning', title: 'Niet verwijderbaar', message } });
      window.dispatchEvent(event);
      window.alert(message);
    };

    const container = button.parentElement;
    if (container) {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(3, minmax(88px, 1fr))';
      container.style.gap = '8px';
      button.after(duplicateButton, deleteButton);
    }
  }
}

export function InspectionTemplatesManager() {
  useEffect(() => {
    enhanceTemplateActions();
    const observer = new MutationObserver(() => enhanceTemplateActions());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <BaseInspectionTemplatesManager />;
}

export default InspectionTemplatesManager;
