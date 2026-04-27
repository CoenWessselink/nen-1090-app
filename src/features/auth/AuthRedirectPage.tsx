import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { buildAppReturnTo, buildMarketingUrl, redirectToMarketing, type MarketingAuthTarget } from '@/features/auth/marketing-auth';

type AuthRedirectPageProps = {
  target: MarketingAuthTarget;
  title: string;
  description: string;
  includeNext?: boolean;
};

export function AuthRedirectPage({ target, title, description, includeNext = true }: AuthRedirectPageProps) {
  const location = useLocation();
  const next = includeNext ? buildAppReturnTo(`${location.pathname}${location.search}${location.hash}`) : undefined;
  const destination = buildMarketingUrl(target, { next });

  useEffect(() => {
    const timer = window.setTimeout(() => redirectToMarketing(target, { next }), 150);
    return () => window.clearTimeout(timer);
  }, [next, target]);

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <div>
          <div className="eyebrow">Centrale auth</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <InlineMessage tone="neutral">Je wordt doorgestuurd naar de centrale marketing/auth-omgeving.</InlineMessage>
        <p><a href={destination}>Klik hier als de redirect niet automatisch start.</a></p>
      </Card>
    </div>
  );
}
