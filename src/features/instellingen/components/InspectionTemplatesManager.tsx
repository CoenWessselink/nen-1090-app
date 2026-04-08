import React from "react";
import client from "../../../api/client";

export const createTemplate = (data: Record<string, unknown>) =>
  client.post("/settings/inspection-templates", data);

export const updateTemplate = (templateId: string, data: Record<string, unknown>) =>
  client.put(`/settings/inspection-templates/${templateId}`, data);

export const deleteTemplate = (templateId: string) =>
  client.delete(`/settings/inspection-templates/${templateId}`);

export default function InspectionTemplatesManager() {
  return (
    <div>
      <h2>Inspectietemplates</h2>
      <p>Templatebeheer is gekoppeld aan de API-routes voor aanmaken, wijzigen en verwijderen.</p>
    </div>
  );
}
