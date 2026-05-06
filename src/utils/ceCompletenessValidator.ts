export type CeValidationResult = {
  valid: boolean;
  missingItems: string[];
  warnings: string[];
};

export type CeValidationInput = {
  projectNumber?: string;
  projectName?: string;
  weldCount?: number;
  inspectionCount?: number;
  attachmentCount?: number;
  hasCustomer?: boolean;
  hasExecutionClass?: boolean;
  hasWpsDocuments?: boolean;
};

export function validateCeCompleteness(input: CeValidationInput): CeValidationResult {
  const missingItems: string[] = [];
  const warnings: string[] = [];

  if (!input.projectNumber) {
    missingItems.push('Projectnummer ontbreekt');
  }

  if (!input.projectName) {
    missingItems.push('Projectnaam ontbreekt');
  }

  if (!input.hasCustomer) {
    missingItems.push('Opdrachtgever ontbreekt');
  }

  if (!input.hasExecutionClass) {
    missingItems.push('Executieklasse ontbreekt');
  }

  if (!input.hasWpsDocuments) {
    warnings.push('Geen WPS-documenten gekoppeld');
  }

  if ((input.weldCount || 0) <= 0) {
    warnings.push('Geen lassen aanwezig');
  }

  if ((input.inspectionCount || 0) <= 0) {
    warnings.push('Geen inspecties aanwezig');
  }

  if ((input.attachmentCount || 0) <= 0) {
    warnings.push('Geen bijlagen of foto’s aanwezig');
  }

  const result: CeValidationResult = {
    valid: missingItems.length === 0,
    missingItems,
    warnings,
  };

  console.info('[ce-validation] completed', {
    valid: result.valid,
    missingItems: result.missingItems.length,
    warnings: result.warnings.length,
  });

  if (!result.valid) {
    console.warn('[ce-validation] missing required items', {
      missingItems: result.missingItems,
    });
  }

  return result;
}
