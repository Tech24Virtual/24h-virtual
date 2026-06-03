import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allServicesPricing } from "@/lib/pricingData";

interface CalculatorInputsProps {
  callVolume: number;
  setCallVolume: (value: number) => void;
  avgDuration: number;
  setAvgDuration: (value: number) => void;
  currentCost: number;
  setCurrentCost: (value: number) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  isAnnual: boolean;
  setIsAnnual: (value: boolean) => void;
}

export function CalculatorInputs({
  callVolume,
  setCallVolume,
  avgDuration,
  setAvgDuration,
  currentCost,
  setCurrentCost,
  serviceType,
  setServiceType,
  isAnnual,
  setIsAnnual,
}: CalculatorInputsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Calculate Your Savings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Call Volume Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base">Monthly Call Volume</Label>
            <span className="text-lg font-semibold text-primary">{callVolume.toLocaleString()} calls</span>
          </div>
          <Slider
            value={[callVolume]}
            onValueChange={(value) => setCallVolume(value[0])}
            min={50}
            max={5000}
            step={50}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>50 calls</span>
            <span>5,000 calls</span>
          </div>
        </div>

        {/* Average Duration Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base">Average Call Duration</Label>
            <span className="text-lg font-semibold text-primary">{avgDuration} min</span>
          </div>
          <Slider
            value={[avgDuration]}
            onValueChange={(value) => setAvgDuration(value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1 min</span>
            <span>10 min</span>
          </div>
        </div>

        {/* Current Cost Input */}
        <div className="space-y-2">
          <Label className="text-base">Current Monthly Receptionist Cost</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={currentCost}
              onChange={(e) => setCurrentCost(Math.max(0, parseInt(e.target.value) || 0))}
              className="pl-8"
              placeholder="0"
              min={0}
              max={50000}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Include salary, benefits, training, and overhead costs
          </p>
        </div>

        {/* Service Type Select */}
        <div className="space-y-2">
          <Label className="text-base">Service Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {allServicesPricing.map((service) => (
                <SelectItem key={service.slug} value={service.slug}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Annual Toggle */}
        <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
          <div>
            <Label className="text-base">Annual Billing</Label>
            <p className="text-sm text-muted-foreground">Save 10% with annual commitment</p>
          </div>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
        </div>
      </CardContent>
    </Card>
  );
}
