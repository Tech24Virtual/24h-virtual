import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
  getAnnualPrice,
  formatPrice,
} from "@/lib/pricingData";

interface CompactComparisonTableProps {
  isAnnual?: boolean;
}

const services = [
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
];

// Show only 5 popular tiers instead of all 11
const compactTiers = [50, 250, 500, 1000, 2500];
const popularMinutes = 250;

export function CompactComparisonTable({ isAnnual = false }: CompactComparisonTableProps) {
  const getPrice = (service: typeof services[0], minutes: number) => {
    const tier = service.tiers.find((t) => t.minutes === minutes);
    if (!tier) return "-";
    return isAnnual ? formatPrice(getAnnualPrice(tier.price)) : tier.priceFormatted;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border rounded-xl overflow-hidden shadow-soft bg-card mt-4"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px]">
                Minutes
              </TableHead>
              {services.map((service) => (
                <TableHead key={service.slug} className="font-semibold text-center min-w-[130px]">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs">{service.name}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {service.overageFormatted}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {compactTiers.map((minutes) => (
              <TableRow
                key={minutes}
                className={minutes === popularMinutes ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-2">
                    {minutes.toLocaleString()}
                    {minutes === popularMinutes && (
                      <Badge className="bg-secondary text-secondary-foreground text-[10px] px-1.5">
                        Popular
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {services.map((service) => (
                  <TableCell key={service.slug} className="text-center font-semibold text-sm">
                    {getPrice(service, minutes)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {/* Coverage row */}
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium sticky left-0 bg-muted/30 z-10 text-xs">
                Coverage
              </TableCell>
              {services.map((service) => (
                <TableCell key={service.slug} className="text-center text-xs text-muted-foreground">
                  {service.slug === "ai-receptionist" ? "24/7" : "14hr + After"}
                </TableCell>
              ))}
            </TableRow>
            {/* CTA row */}
            <TableRow>
              <TableCell className="sticky left-0 bg-card z-10"></TableCell>
              {services.map((service) => (
                <TableCell key={service.slug} className="text-center py-3">
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary" asChild>
                    <Link to={`/solutions/${service.slug}`}>
                      Details
                      <ArrowRight className="ml-1 w-3 h-3" />
                    </Link>
                  </Button>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
