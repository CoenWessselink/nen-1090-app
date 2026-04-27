type ReplacementMap = Record<string, string>;

const exact: ReplacementMap = {
  'Opslaan': 'Save',
  'Opslaan inspectie': 'Save & close',
  'Opslaan…': 'Saving…',
  'Project wijzigen': 'Update project',
  'Las aanmaken': 'Create weld',
  'weld aanmaken': 'Create weld',
  'Terug': 'Back',
  'Terug naar lassen': 'Back to welds',
  'Annuleren': 'Cancel',
  'Bewerken': 'Edit',
  'Verwijderen': 'Delete',
  'Nieuw': 'New',
  'Nieuwe las': 'Create weld',
  'Nieuwe assemblage': 'Create assembly',
  'Nieuw project': 'Create project',
  'Projecten': 'Projects',
  'Project': 'Project',
  'Projectnaam': 'Project name',
  'Projectnummer': 'Project number',
  'Startdatum': 'Start date',
  'Einddatum': 'End date',
  'Lassen': 'Welds',
  'Las': 'Weld',
  'Las bewerken': 'Edit weld',
  'Lasnummer': 'Weld number',
  'Lasdatum': 'Weld date',
  'Lasmethode': 'Welding process',
  'Lasser': 'Welder',
  'Lassers': 'Welders',
  'Lascoördinator': 'Welding Coordinator',
  'Assemblage': 'Assembly',
  'Assemblages': 'Assemblies',
  'Inspectie': 'Inspection',
  'Inspecties': 'Inspections',
  'Inspectietemplate': 'Inspection template',
  'Inspectiecontrole': 'Inspection item',
  'Inspectie laden…': 'Loading inspection…',
  'Lassen laden…': 'Loading weld data…',
  'Las laden…': 'Loading weld data…',
  'Project laden…': 'Loading project…',
  'Gegevens worden bijgewerkt…': 'Updating data…',
  'Geen locatie': 'No location',
  'Geen bestanden ontvangen': 'No files uploaded',
  'Geen preview beschikbaar.': 'No preview available.',
  'Geen toegang tot deze tenant': 'No access to this tenant',
  'Status': 'Status',
  'Tenantstatus': 'Tenant status',
  'Laatste update': 'Last updated',
  'Conform': 'Compliant',
  'Niet conform': 'Non-compliant',
  'In controle': 'Pending review',
  'Gerepareerd': 'Pending review',
  'Actief': 'Active',
  'Inactief': 'Inactive',
  'Gesuspendeerd': 'Suspended',
  'Ingekocht': 'Purchased',
  'Automatisch volgens EXC': 'Automatic based on EXC',
  'Gekoppelde users': 'Linked users',
  'Gekoppelde tenant-users': 'Linked tenant users',
  'Open': 'Open',
  'Executieklasse': 'Execution Class (EXC)',
  'Tekeningen / lasplan aanwezig': 'Drawings & weld plan available',
  'Materiaaltraceerbaarheid vastgelegd': 'Material traceability documented',
  'Juiste WPS / WPQR toegepast': 'Correct WPS/WPQR applied',
  'Opmerking': 'Remarks',
  'Toelichting': 'Explanation',
  'Toelichting / notitie': 'Explanation / note',
  'Optionele opmerking': 'Optional remarks',
  'Optionele opmerking voor deze inspectie': 'Optional remarks for this inspection',
  'Selecteer template': 'Select template',
  'Selecteer assemblage': 'Select assembly',
  'Selecteer materiaal': 'Select material',
  'Selecteer lasser': 'Select welder',
  'Selecteer WPS': 'Select WPS',
  'Selecteer lascoördinator': 'Select Welding Coordinator',
  'Foto’s toevoegen': 'Add photos',
  'Camera of fotobibliotheek': 'Camera or photo library',
  'Voeg extra foto’s toe aan deze las': 'Add supporting photos to this weld',
  'Foto verwijderen': 'Delete photo',
  'Bestand': 'File',
  'Bestanden': 'Files',
  'Documenten': 'Documents',
  'Documenten gekoppeld': 'Documents linked',
  'Documenten toevoegen': 'Add documents',
  'Instellingen': 'Settings',
  'Dashboard': 'Dashboard',
  'Rapportage': 'Reports',
  'Facturatie': 'Billing',
  'Gebruiker': 'User',
  'Gebruikers': 'Users',
  'Wachtwoord': 'Password',
  'Inloggen': 'Sign in',
  'Uitloggen': 'Sign out',
  'E-mailadres': 'Email address',
  'Wachtwoord vergeten': 'Forgot your password?',
  'Wachtwoord instellen': 'Create password',
  'Wachtwoord wijzigen': 'Change password',
  'Account activeren': 'Activate account',
  'Zoeken': 'Search',
  'Zoek tenant, id, billing of status': 'Search tenant, id, billing or status',
  'Filter': 'Filter',
  'Kolommen': 'Columns',
  'Naam': 'Name',
  'Omschrijving': 'Description',
  'Opdrachtgever': 'Client',
  'Contactpersoon': 'Contact person',
  'Aanmaken': 'Create',
  'Bijwerken': 'Update',
  'Sluiten': 'Close',
  'Bekijken': 'View',
  'Bekijk PDF': 'View PDF',
  'Downloaden': 'Download',
  'Uploaden': 'Upload',
  'Toevoegen': 'Add',
  'Opslaan wijzigingen': 'Save changes',
  'Wijzigingen opslaan': 'Save changes',
  'Project 360': 'Project overview',
  'CE Dossier': 'CE Dossier',
  'Samenvatting': 'Summary',
  'Rechten': 'Permissions',
  'Groei': 'Growth',
  'Statusbeheer': 'Status management',
  'Platformcontrole': 'Platform control',
  'Nieuwe tenant': 'Create tenant',
  'Tenantbeheer': 'Tenant management',
  'Alle tenants in platform': 'All tenants in platform',
  'Direct inzetbaar': 'Ready to use',
  'Health en contracten': 'Health and contracts',
  'Omgeving': 'Environment',
  'Aangemaakt': 'Created',
  'Acties': 'Actions',
  'Meekijken': 'View tenant',
  'Activeer': 'Activate',
  'Heractiveer': 'Reactivate',
  'Verlaat tenant-view': 'Exit tenant view',
  'Tenant-view actief': 'Tenant view active',
  'Tenant-view mislukt': 'Tenant view failed',
  'Alle statussen': 'All statuses',
  'Jaarabonnement WeldInspect': 'Annual WeldInspect subscription',
  'Creditnota door superadmin': 'Credit note by superadmin',
  'Geen tenants': 'No tenants',
  'Tenants laden...': 'Loading tenants...',
  'Health controleren...': 'Checking health...',
  'Health niet bereikbaar': 'Health unavailable',
  'Platform online': 'Platform online',
  'Health-check fout': 'Health check error',
  'Alleen lezen': 'Read only',
  'Impersonatie actief': 'Impersonation active',
  'Nog geen lassen in dit project.': 'No welds have been created for this project yet.',
  'Lasnummer is verplicht.': 'Weld number is required.',
  'Inspectie opslaan mislukt.': 'Could not save the inspection.',
  'Inspectie kon niet worden geladen.': 'The inspection could not be loaded.',
  'Las opslaan mislukt.': 'Could not save the weld.',
  'Las kon niet worden geladen.': 'The weld could not be loaded.',
  'Lassen konden niet worden geladen.': 'Weld data could not be loaded.',
  'Werk lasgegevens bij': 'Update weld details',
  'Werk projectgegevens bij': 'Update project details',
  'Maak een nieuwe las aan': 'Create a new weld',
  'Maak een nieuw project aan': 'Create a new project',
};

const phrasePairs: Array<[RegExp, string]> = [
  [/\bProject wijzigen\b/g, 'Update project'],
  [/\bweld aanmaken\b/gi, 'Create weld'],
  [/\bOpslaan inspectie\b/g, 'Save & close'],
  [/\bNieuwe las\b/g, 'Create weld'],
  [/\bNieuw project\b/g, 'Create project'],
  [/\bNieuwe assemblage\b/g, 'Create assembly'],
  [/\bNieuwe\b/g, 'New'],
  [/\bOpslaan\b/g, 'Save'],
  [/\bTerug naar\b/g, 'Back to'],
  [/\bBewerken\b/g, 'Edit'],
  [/\bVerwijderen\b/g, 'Delete'],
  [/\bAnnuleren\b/g, 'Cancel'],
  [/\bNiet conform\b/g, 'Non-compliant'],
  [/\bIn controle\b/g, 'Pending review'],
  [/\bConform\b/g, 'Compliant'],
  [/\bGerepareerd\b/g, 'Pending review'],
  [/\bActief\b/g, 'Active'],
  [/\bInactief\b/g, 'Inactive'],
  [/\bGesuspendeerd\b/g, 'Suspended'],
  [/\bIngekocht\b/g, 'Purchased'],
  [/\bAutomatisch volgens EXC\b/g, 'Automatic based on EXC'],
  [/\bGekoppelde users\b/g, 'Linked users'],
  [/\bTenantstatus\b/g, 'Tenant status'],
  [/\bLassen\b/g, 'Welds'],
  [/\blas\b/gi, 'weld'],
  [/\bInspectiecontrole\b/g, 'Inspection item'],
  [/\bInspectietemplate\b/g, 'Inspection template'],
  [/\bInspectie\b/g, 'Inspection'],
  [/\bInspecties\b/g, 'Inspections'],
  [/\bProject 360\b/g, 'Project overview'],
  [/\bProjectnaam\b/g, 'Project name'],
  [/\bProjectnummer\b/g, 'Project number'],
  [/\bProjecten\b/g, 'Projects'],
  [/\bInstellingen\b/g, 'Settings'],
  [/\bGeen bestanden ontvangen\b/g, 'No files uploaded'],
  [/\bGeen preview beschikbaar\b/g, 'No preview available'],
  [/\bGeen\b/g, 'No'],
  [/\bSelecteer\b/g, 'Select'],
  [/\bOpmerking\b/g, 'Remarks'],
  [/\bToelichting\b/g, 'Explanation'],
  [/\bNotitie\b/g, 'Note'],
  [/\bMateriaaltraceerbaarheid\b/g, 'Material traceability'],
  [/\bMateriaal\b/g, 'Material'],
  [/\bDocumenten\b/g, 'Documents'],
  [/\bFoto’s\b/g, 'Photos'],
  [/\bFoto\b/g, 'Photo'],
  [/\bGebruikers\b/g, 'Users'],
  [/\bGebruiker\b/g, 'User'],
  [/\bWachtwoord vergeten\b/g, 'Forgot your password?'],
  [/\bWachtwoord instellen\b/g, 'Create password'],
  [/\bWachtwoord\b/g, 'Password'],
  [/\bInloggen\b/g, 'Sign in'],
  [/\bUitloggen\b/g, 'Sign out'],
  [/\bOpdrachtgever\b/g, 'Client'],
  [/\bContactpersoon\b/g, 'Contact person'],
  [/\bAangemaakt\b/g, 'Created'],
  [/\bLaatste update\b/g, 'Last updated'],
  [/\bLaatst\b/g, 'Last'],
  [/\blaatste\b/g, 'last'],
];

function translateText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return input;
  const direct = exact[trimmed];
  if (direct) return input.replace(trimmed, direct);
  let output = input;
  for (const [pattern, replacement] of phrasePairs) output = output.replace(pattern, replacement);
  return output;
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  return tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre' || element.hasAttribute('data-no-translate');
}

function translateAttributes(element: Element): void {
  if (shouldSkipElement(element)) return;
  for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
    const value = element.getAttribute(attr);
    if (value) element.setAttribute(attr, translateText(value));
  }
}

function translateNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (shouldSkipElement(parent)) return;
    const next = translateText(node.textContent || '');
    if (next !== node.textContent) node.textContent = next;
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    translateAttributes(element);
    element.childNodes.forEach(translateNode);
  }
}

export function installFrontendEnglish(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const run = () => translateNode(document.body);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(translateNode);
      if (mutation.type === 'characterData') translateNode(mutation.target);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
