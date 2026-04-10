import React from 'react';

export function ForgotPasswordPage() {
  return (
    <div style={ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }>
      <div
        style={
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 20,
          padding: 24,
        }
      >
        <h1>Wachtwoord vergeten</h1>
        <p>Vraag hier een reset aan.</p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
