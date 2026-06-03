import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  question: string;
  answer: string;
}

interface ServiceFAQProps {
  title?: string;
  subtitle?: string;
  faqs: FAQ[];
  showViewAll?: boolean;
}

export function ServiceFAQ({
  title = "Frequently Asked Questions",
  subtitle,
  faqs,
  showViewAll = true,
}: ServiceFAQProps) {
  return (
    <section className="section-spacing bg-accent/30">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-4">{title}</h2>
            {subtitle && (
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border rounded-xl px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left text-heading hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {showViewAll && (
            <div className="text-center mt-8">
              <Link
                to="/faqs"
                className="text-primary font-medium hover:underline"
              >
                View all FAQs →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
