import { Check, Plus, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { includedFeatures, paidAddOns, emailAddOns } from "@/lib/pricingData";

export function AddOnsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Accordion type="single" collapsible className="space-y-4">
        {/* Email Add-On */}
        <AccordionItem value="email" className="glass-card border rounded-xl px-6">
          <AccordionTrigger className="hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-heading">Email Support Add-On</h3>
                <p className="text-sm text-muted-foreground">
                  Add email support to Virtual Receptionist plans
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="border rounded-lg overflow-hidden mt-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Emails/Month</TableHead>
                    <TableHead className="font-semibold text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailAddOns.map((tier) => (
                    <TableRow key={tier.emails}>
                      <TableCell className="font-medium">{tier.emails}</TableCell>
                      <TableCell className="font-semibold text-heading text-right">
                        {tier.priceFormatted}/mo
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * Email support cannot be sold separately. Must be accompanied with a Virtual Receptionist plan.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Included Features */}
        <AccordionItem value="included" className="glass-card border rounded-xl px-6">
          <AccordionTrigger className="hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-heading">Included Features</h3>
                <p className="text-sm text-muted-foreground">
                  {includedFeatures.length} features included at no extra cost
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <ul className="grid sm:grid-cols-2 gap-3 mt-2">
              {includedFeatures.map((feature) => (
                <li key={feature.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {feature.name}
                    </span>
                    {feature.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Paid Add-Ons */}
        <AccordionItem value="addons" className="glass-card border rounded-xl px-6">
          <AccordionTrigger className="hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-heading">Optional Add-Ons</h3>
                <p className="text-sm text-muted-foreground">
                  Enhance your service with additional options
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <ul className="grid sm:grid-cols-2 gap-3 mt-2">
              {paidAddOns.map((addon) => (
                <li key={addon.name} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {addon.name}
                    </span>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {addon.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap flex-shrink-0">
                    {addon.price}
                  </Badge>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
