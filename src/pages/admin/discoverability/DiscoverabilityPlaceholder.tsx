import { InAppComingSoon } from "@/components/FeatureGate";

interface PlaceholderProps {
  title: string;
  description: string;
  comingIn: string;
  whatsComing?: string[];
}

export function DiscoverabilityPlaceholder({ title, description, comingIn, whatsComing }: PlaceholderProps) {
  return (
    <InAppComingSoon
      title={title}
      description={description}
      eta={comingIn}
      whatsComing={whatsComing}
      primaryAction={{ label: "Open Launch Controls", href: "/admin/launch-controls" }}
      secondaryAction={{ label: "View Generated Pages", href: "/admin/discoverability" }}
    />
  );
}

export default function DiscoverabilityPlaceholderRoute(props: PlaceholderProps) {
  return <DiscoverabilityPlaceholder {...props} />;
}
