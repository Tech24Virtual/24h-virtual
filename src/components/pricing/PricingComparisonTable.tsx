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

interface PricingComparisonTableProps {
  isAnnual?: boolean;
}

const services = [
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
];

const minuteTiers = [50, 100, 250, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000];
const popularMinutes = 250;

export function PricingComparisonTable({ isAnnual = false }: PricingComparisonTableProps) {
  const getPrice = (service: typeof services[0], minutes: number) => {
    const tier = service.tiers.find((t) => t.minutes === minutes);
    if (!tier) return "-";
    return isAnnual ? formatPrice(getAnnualPrice(tier.price)) : tier.priceFormatted;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border rounded-lg overflow-hidden shadow-card bg-card"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px]">
                Minutes
              </TableHead>
              {services.map((service) => (
                <TableHead key={service.slug} className="font-semibold text-center min-w-[140px]">
                  <div className="flex flex-col gap-1">
                    <span>{service.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {service.overageFormatted}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {minuteTiers.map((minutes) => (
              <TableRow
                key={minutes}
                className={minutes === popularMinutes ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-2">
                    {minutes.toLocaleString()}
                    {minutes === popularMinutes && (
                      <Badge className="bg-secondary text-secondary-foreground text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {services.map((service) => (
                  <TableCell key={service.slug} className="text-center font-semibold">
                    {getPrice(service, minutes)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {/* Coverage row */}
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium sticky left-0 bg-muted/30 z-10">
                Coverage
              </TableCell>
              {services.map((service) => (
                <TableCell key={service.slug} className="text-center text-sm text-muted-foreground">
                  {service.slug === "ai-receptionist" ? "24/7" : "14hr + After"}
                </TableCell>
              ))}
            </TableRow>
            {/* CTA row */}
            <TableRow>
              <TableCell className="sticky left-0 bg-card z-10"></TableCell>
              {services.map((service) => (
                <TableCell key={service.slug} className="text-center">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/solutions/${service.slug}`}>
                      Learn More
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
