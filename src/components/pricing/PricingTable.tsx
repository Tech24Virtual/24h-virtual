import { Link } from "react-router-dom";
import { ArrowRight, Clock, Info } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ServicePricing, getAnnualPrice, formatPrice } from "@/lib/pricingData";

interface PricingTableProps {
  service: ServicePricing;
  popularIndex?: number;
  isAnnual?: boolean;
}

export function PricingTable({ service, popularIndex = 2, isAnnual = false }: PricingTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-16"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-2xl font-bold text-heading">{service.name}</h3>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{service.tagline}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{service.coverage}</span>
          </div>
          <Badge variant="outline" className="font-medium">
            Overage: {service.overageFormatted}
          </Badge>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Minutes</TableHead>
                <TableHead className="font-semibold">Base Pricing</TableHead>
                <TableHead className="font-semibold">Overage</TableHead>
                <TableHead className="text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {service.tiers.map((tier, index) => (
                <TableRow
                  key={tier.minutes}
                  className={index === popularIndex ? "bg-primary/5" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {tier.minutes.toLocaleString()}
                      {index === popularIndex && (
                        <Badge className="bg-secondary text-secondary-foreground text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-heading">
                    <div className="flex flex-col">
                      <span>{isAnnual ? formatPrice(getAnnualPrice(tier.price)) : tier.priceFormatted}</span>
                      {isAnnual && (
                        <span className="text-xs text-muted-foreground line-through">
                          {tier.priceFormatted}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.overageFormatted}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={index === popularIndex ? "cta" : "outline"}
                      asChild
                    >
                      <Link to={`/get-started?service=${service.slug}&minutes=${tier.minutes}`}>
                        Select
                        <ArrowRight className="ml-1 w-3 h-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell className="font-medium">Higher Volume</TableCell>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Custom Package
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/contact?inquiry=custom-pricing">
                      Contact Us
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}
