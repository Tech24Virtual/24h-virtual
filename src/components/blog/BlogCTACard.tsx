import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Calendar, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlogCTACardProps {
  variant: 'inline' | 'mid-article' | 'pre-footer' | 'sidebar';
  category?: string;
}

export function BlogCTACard({ variant, category }: BlogCTACardProps) {
  if (variant === 'inline') {
    return (
      <div className="my-10 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20">
        <h3 className="text-xl font-bold mb-2">See How Much You Could Save</h3>
        <p className="text-muted-foreground mb-4">Use our free ROI calculator to see what missed calls are really costing your business.</p>
        <Button asChild variant="cta" className="rounded-full">
          <Link to="/cost-calculator">
            <Calculator className="w-4 h-4 mr-2" />
            Get Free ROI Estimate
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-3">✓ 1,000+ businesses trust us • No spam ever</p>
      </div>
    );
  }

  if (variant === 'mid-article') {
    return (
      <div className="my-10 p-6 rounded-xl bg-card border-2 border-primary/20 text-center">
        <PhoneCall className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-2">
          {category === 'Comparisons' ? 'See How We Compare' : 'Ready to Get Started?'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {category === 'Comparisons'
            ? 'View our transparent pricing. No hidden fees, no contracts.'
            : 'Launch your virtual receptionist in as little as 24 hours.'}
        </p>
        <Button asChild variant="cta" size="sm" className="rounded-full">
          <Link to={category === 'Comparisons' ? '/pricing' : '/get-started'}>
            {category === 'Comparisons' ? 'View Pricing' : 'Get Started Free'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === 'pre-footer') {
    return (
      <div className="my-14 p-8 md:p-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Stop Missing Calls?</h2>
        <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
          Join 1,000+ businesses that never miss a lead. Launch in 24 hours, no contracts, no risk.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" variant="secondary" className="rounded-full">
            <Link to="/get-started">
              <Calendar className="w-4 h-4 mr-2" />
              Book Free Consultation
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/cost-calculator">
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Your Savings
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // sidebar
  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
      <h4 className="font-bold mb-2">Get Expert Advice</h4>
      <p className="text-sm text-muted-foreground mb-3">Free consultation to find the perfect plan for your business.</p>
      <Button asChild variant="cta" size="sm" className="w-full rounded-full">
        <Link to="/get-started">
          Book Free Consultation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
}
