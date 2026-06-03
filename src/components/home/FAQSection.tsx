import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Why Choose 24H Virtual's Virtual Call Answering Service?",
    answer: "24H Virtual offers professional, US-based receptionists who answer calls in your business name, 24/7. We handle appointment scheduling, lead qualification, and message taking so you never miss an opportunity. Our team is trained on your specific industry protocols.",
  },
  {
    question: "Do You Offer a 24/7 Live Call Answering Service?",
    answer: "Yes! We provide true 24/7/365 coverage with live, professional receptionists. Whether it's 3 AM on a holiday or during your busiest hours, your callers always speak with a real person who represents your brand professionally.",
  },
  {
    question: "How Many Receptionists Will I Have With 24H Virtual?",
    answer: "You benefit from our entire team of 50+ trained receptionists. This means your calls are always answered promptly, with no busy signals and no hold times. We match receptionists to your account based on industry expertise and call volume.",
  },
  {
    question: "What Sets Apart Live Answering Services From AI Virtual Receptionist?",
    answer: "Live receptionists provide the personal touch and complex problem-solving that callers appreciate. Our AI Receptionist handles high-volume, routine calls instantly. Many clients choose our Hybrid Receptionist for the best of both: AI for speed and humans for complexity.",
  },
  {
    question: "Are There Any Long-Term Contracts Or Commitments?",
    answer: "No long-term contracts required. We offer flexible month-to-month plans because we believe in earning your business every month. You can upgrade, downgrade, or cancel at any time with no penalties or hidden fees.",
  },
];

export function FAQSection() {
  return (
    <section className="section-spacing bg-accent/30">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">Frequently asked questions</h2>
            <p className="text-lg text-muted-foreground">
              Got questions? We've got answers. If you can't find what you're looking for, 
              reach out to our team.
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="glass-card border-white/30 px-6 shadow-soft data-[state=open]:shadow-elevated transition-all duration-300"
                >
                  <AccordionTrigger className="text-left text-heading hover:no-underline py-6 [&[data-state=open]>svg]:rotate-45">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>

          <motion.div 
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              to="/faqs"
              className="group inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors"
            >
              View all FAQs
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}