import { ShieldAlert } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function OAuthConsent() {
  return (
    <AuthLayout
      icon={ShieldAlert}
      title="MCP authorization unavailable"
      subtitle="This integration has not been connected to the current backend."
    >
      <p className="text-sm text-muted-foreground">
        No access has been granted. Return to the application that opened this
        page and try again after the integration is configured.
      </p>
    </AuthLayout>
  );
}
