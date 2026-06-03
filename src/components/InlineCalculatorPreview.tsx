import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export function InlineCalculatorPreview() {
  const [callVolume, setCallVolume] = useState([200]);
  const [currentCost, setCurrentCost] = useState(4500);

  // Simplified calculation
  const estimatedServiceCost = Math.round(callVolume[0] * 1.5 + 200);
  const estimatedSavings = Math.max(0, currentCost - estimatedServiceCost);

  return (
    <Card className="border-2 border-brand-rose bg-accent/30">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Calculator className="w-5 h-5" />
          <CardTitle className="text-lg">Quick ROI Preview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Call Volume Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium text-heading">Monthly Call Volume</Label>
            <span className="text-sm font-semibold text-primary">{callVolume[0]} calls</span>
          </div>
          <Slider
            value={callVolume}
            onValueChange={setCallVolume}
            max={1000}
            min={50}
            step={25}
            className="w-full"
          />
        </div>

        {/* Current Cost Input */}
        <div className="space-y-2">
          <Label htmlFor="current-cost" className="text-sm font-medium text-heading">
            Current Monthly Receptionist Cost
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="current-cost"
              type="number"
              value={currentCost}
              onChange={(e) => setCurrentCost(Number(e.target.value))}
              className="pl-7"
            />
          </div>
        </div>

        {/* Results */}
        <div className="pt-4 border-t">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Estimated Monthly Savings</p>
            <div className="text-4xl font-bold text-cta">
              <AnimatedCounter value={estimatedSavings} prefix="$" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <Button variant="cta" className="w-full group" asChild>
          <Link to="/cost-calculator">
            Calculate Full ROI
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
