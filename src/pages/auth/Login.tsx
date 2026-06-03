import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { LoginForm } from '@/components/auth/LoginForm';
import { SEO } from '@/components/SEO';

export default function Login() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Login"
        description="Sign in to your 24H Virtual dashboard to manage calls, scripts, and billing."
        canonical="/login"
        noindex
      />
      <Navigation />
      <main className="flex items-center justify-center py-20 px-4">
        <LoginForm />
      </main>
      <Footer />
    </div>
  );
}
