import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SEO } from '@/components/SEO';

export default function SignUp() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign Up"
        description="Create your 24H Virtual account and get started with professional virtual receptionist services."
        canonical="/signup"
        noindex
      />
      <Navigation />
      <main className="flex items-center justify-center py-20 px-4">
        <SignUpForm />
      </main>
      <Footer />
    </div>
  );
}
