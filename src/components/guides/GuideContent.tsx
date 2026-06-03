 import { motion } from "framer-motion";
 import { Info, Lightbulb, AlertTriangle, Check } from "lucide-react";
 import { cn } from "@/lib/utils";
 import type { GuideSection } from "@/data/guides";
 
 interface GuideContentProps {
   sections: GuideSection[];
 }
 
 function CalloutBox({ type, text }: { type: "tip" | "warning" | "info"; text: string }) {
   const config = {
     tip: {
       icon: Lightbulb,
       bgClass: "bg-green-50 border-green-200",
       iconClass: "text-green-600",
       textClass: "text-green-800"
     },
     warning: {
       icon: AlertTriangle,
       bgClass: "bg-amber-50 border-amber-200",
       iconClass: "text-amber-600",
       textClass: "text-amber-800"
     },
     info: {
       icon: Info,
       bgClass: "bg-blue-50 border-blue-200",
       iconClass: "text-blue-600",
       textClass: "text-blue-800"
     }
   };
 
   const { icon: Icon, bgClass, iconClass, textClass } = config[type];
 
   return (
     <div className={cn("flex gap-3 p-4 rounded-xl border mt-4", bgClass)}>
       <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconClass)} />
       <p className={cn("text-sm leading-relaxed", textClass)}>{text}</p>
     </div>
   );
 }
 
 export function GuideContent({ sections }: GuideContentProps) {
   return (
     <div className="space-y-12">
       {sections.map((section, index) => (
         <motion.section
           key={section.id}
           id={section.id}
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, margin: "-100px" }}
           transition={{ duration: 0.4, delay: index * 0.05 }}
           className="scroll-mt-28"
         >
           <h2 className="text-2xl font-bold text-heading mb-4">
             {section.title}
           </h2>
           
           <p className="text-muted-foreground leading-relaxed mb-4">
             {section.content}
           </p>
 
           {section.bullets && section.bullets.length > 0 && (
             <ul className="space-y-2 mt-4">
               {section.bullets.map((bullet, i) => (
                 <li key={i} className="flex items-start gap-3">
                   <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                     <Check className="w-3 h-3 text-primary" />
                   </span>
                   <span className="text-muted-foreground">{bullet}</span>
                 </li>
               ))}
             </ul>
           )}
 
           {section.callout && (
             <CalloutBox type={section.callout.type} text={section.callout.text} />
           )}
         </motion.section>
       ))}
     </div>
   );
 }