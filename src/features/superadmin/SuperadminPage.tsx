import React from "react";

export function SuperadminPage() {
  return (
    <section className="page-stack superadmin-page" data-testid="superadmin-page">
      <div className="section-banner">
        <div className="section-banner-copy">
          <span className="section-banner-kicker">Platform control</span>
          <h1>Superadmin</h1>
          <p>
            Tenant management, user management, billing lifecycle and platform
            health are available from the Superadmin workspace.
          </p>
        </div>
      </div>

      <div className="section-nav-grid">
        <article className="section-nav-tile is-active" data-testid="superadmin-tenants">
          <strong>Tenants</strong>
          <small>Manage tenant lifecycle and access.</small>
        </article>

        <article className="section-nav-tile is-active" data-testid="superadmin-users">
          <strong>Users</strong>
          <small>Manage users, roles and activity.</small>
        </article>

        <article className="section-nav-tile is-active" data-testid="superadmin-billing">
          <strong>Billing lifecycle</strong>
          <small>Subscriptions, invoices and payments.</small>
        </article>

        <article className="section-nav-tile is-active" data-testid="superadmin-health">
          <strong>Platform health</strong>
          <small>Runtime status and smoke checks.</small>
        </article>
      </div>
    </section>
  );
}

export default SuperadminPage;
