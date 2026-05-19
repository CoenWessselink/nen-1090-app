import { useEffect } from 'react';
import { InspectionTemplatesManager as BaseInspectionTemplatesManager } from './InspectionTemplatesManagerRuntime';

function setButtonText(button: HTMLButtonElement, text: string) {
  button.textContent = text;
  button.setAttribute('aria-label', text);
  button.style.whiteSpace = 'normal';
  button.style.minHeight = '44px';
  button.style.justifyContent = 'center';
}

function makeReadOnlyDeleteButton(source: HTMLButtonElement) {
  const button = source.cloneNode(false) as HTMLButtonElement;
  button.type = 'button';
  button.className = source.className;
  setButtonText(button, 'Verwijderen');
  button.onclick = () => {
    const message = 'Standaardtemplates zijn read-only en kunnen niet worden verwijderd. Dupliceer eerst naar een tenant-template.';
    window.dispatchEvent(new CustomEvent('weldinspect:toast', { detail: { type: 'warning', title: 'Niet verwijderbaar', message } }));
    window.alert(message);
  };
  return button;
}

function makeDuplicateButton(source: HTMLButtonElement) {
  const button = source.cloneNode(false) as HTMLButtonElement;
  button.type = 'button';
  button.className = source.className;
  setButtonText(button, 'Dupliceren');
  button.onclick = () => source.click();
  return button;
}

function normalizeActionContainer(container: HTMLElement) {
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(3, minmax(86px, 1fr))';
  container.style.gap = '8px';
  container.style.alignItems = 'stretch';
  container.style.width = '100%';
}

function enhanceLockedTemplateActionRow(container: HTMLElement, originalButton: HTMLButtonElement) {
  if (container.dataset.threeActionsReady === '1') return;
  container.dataset.threeActionsReady = '1';
  normalizeActionContainer(container);
  setButtonText(originalButton, 'Edit');
  originalButton.dataset.templateAction = 'edit';

  const duplicateButton = makeDuplicateButton(originalButton);
  duplicateButton.dataset.templateAction = 'duplicate';

  const deleteButton = makeReadOnlyDeleteButton(originalButton);
  deleteButton.dataset.templateAction = 'delete';

  originalButton.after(duplicateButton, deleteButton);
}

function normalizeTenantTemplateActionRow(container: HTMLElement) {
  normalizeActionContainer(container);
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
  for (const button of buttons) {
    const text = (button.textContent || '').toLowerCase();
    if (text.includes('bewerken') || text === 'edit') setButtonText(button, 'Edit');
    if (text.includes('duplic')) setButtonText(button, 'Dupliceren');
    if (text.includes('verwij')) setButtonText(button, 'Verwijderen');
  }

  const edit = buttons.find((button) => /edit/i.test(button.textContent || ''));
  const duplicate = buttons.find((button) => /dupliceren/i.test(button.textContent || ''));
  const remove = buttons.find((button) => /verwijderen/i.test(button.textContent || ''));
  if (edit && duplicate && remove && container.firstElementChild !== edit) {
    container.replaceChildren(edit, duplicate, remove);
  }
}

function enhanceTemplateActions() {
  const actionContainers = Array.from(document.querySelectorAll<HTMLElement>('.mobile-list-stack .section-title-row .toolbar-cluster'));
  for (const container of actionContainers) {
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    if (!buttons.length) continue;

    const mergedButton = buttons.find((button) => /dupliceer\s*&\s*bewerk/i.test(button.textContent || ''));
    if (mergedButton) {
      enhanceLockedTemplateActionRow(container, mergedButton);
      continue;
    }

    const hasTemplateActions = buttons.some((button) => /bewerken|edit|duplic|verwij/i.test(button.textContent || ''));
    if (hasTemplateActions) normalizeTenantTemplateActionRow(container);
  }
}

function runBoundedEnhancer() {
  let attempts = 0;
  const maxAttempts = 24;
  const timer = window.setInterval(() => {
    attempts += 1;
    enhanceTemplateActions();
    const pendingMergedButton = document.querySelector('.mobile-list-stack button');
    if (attempts >= maxAttempts || !pendingMergedButton) {
      window.clearInterval(timer);
    }
  }, 250);
  enhanceTemplateActions();
  return () => window.clearInterval(timer);
}

export function InspectionTemplatesManager() {
  useEffect(() => {
    const cleanup = runBoundedEnhancer();
    window.addEventListener('resize', enhanceTemplateActions);
    window.addEventListener('focus', enhanceTemplateActions);
    return () => {
      cleanup();
      window.removeEventListener('resize', enhanceTemplateActions);
      window.removeEventListener('focus', enhanceTemplateActions);
    };
  }, []);

  return <BaseInspectionTemplatesManager />;
}

export default InspectionTemplatesManager;
