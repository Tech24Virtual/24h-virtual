import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Clock, TrendingDown } from "lucide-react";

interface CostBreakdownProps {
  currentCost: number;
  virtualCost: number;
}

const hiddenCosts = [
  { label: "Base Salary", percent: 60 },
  { label: "Benefits & Insurance", percent: 20 },
  { label: "Training & Onboarding", percent: 8 },
  { label: "Equipment & Software", percent: 5 },
  { label: "Sick Days & PTO", percent: 7 },
];

const advantages = [
  { icon: Clock, title: "No Hiring Delays", description: "Start in 24 hours, not weeks" },
  { icon: Users, title: "Always Covered", description: "No sick days, vacations, or turnover" },
  { icon: TrendingDown, title: "Predictable Costs", description: "No surprise overtime or benefits" },
  { icon: DollarSign, title: "Pay Per Use", description: "Only pay for minutes you need" },
];

export function CostBreakdown({ currentCost, virtualCost }: CostBreakdownProps) {
  const savings = Math.max(0, currentCost - virtualCost);
  const savingsPercent = currentCost > 0 ? Math.round((savings / currentCost) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="mb-4">The True Cost of In-House vs 24H Virtual</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          When you factor in all the hidden costs of hiring, 24H Virtual delivers 
          even more value than the numbers suggest.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* In-House Costs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-heading">In-House Receptionist Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCost > 0 ? (
                <>
                  {hiddenCosts.map((cost, index) => {
                    const amount = Math.round((currentCost * cost.percent) / 100);
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cost.label}</span>
                          <span className="font-medium text-heading">${amount.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-destructive/60"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${cost.percent}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold text-heading">Total Monthly Cost</span>
                      <span className="text-xl font-bold text-destructive">${currentCost.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Enter your current cost above to see the breakdown
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 24H Virtual Costs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg text-heading">24H Virtual Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Service</span>
                  <span className="font-medium text-heading">${virtualCost.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: currentCost > 0 ? `${Math.min(100, (virtualCost / currentCost) * 100)}%` : "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Benefits & Insurance</span>
                  <span className="font-medium text-primary">$0 (Included)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Training & Onboarding</span>
                  <span className="font-medium text-primary">$0 (Included)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Equipment & Software</span>
                  <span className="font-medium text-primary">$0 (Included)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coverage Gaps</span>
                  <span className="font-medium text-primary">$0 (24/7 Coverage)</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between">
                  <span className="font-semibold text-heading">Total Monthly Cost</span>
                  <span className="text-xl font-bold text-primary">${virtualCost.toLocaleString()}</span>
                </div>
                {savings > 0 && (
                  <p className="text-sm text-primary mt-2">
                    Save {savingsPercent}% compared to in-house
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Advantages */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        {advantages.map((advantage, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="text-center h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <advantage.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-heading">{advantage.title}</h3>
                <p className="text-sm text-muted-foreground">{advantage.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
