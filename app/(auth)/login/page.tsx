import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card title="Login" description="Authentication is prepared for Supabase-backed session handling. This page is intentionally a placeholder.">
        <form className="mt-4 space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </div>
  );
}
