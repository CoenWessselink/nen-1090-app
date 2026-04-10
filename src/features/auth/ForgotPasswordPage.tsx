import React from 'react';

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: 24,
};

export function ForgotPasswordPage() {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1>Wachtwoord vergeten</h1>
        <p>Vraag hier een reset aan.</p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
