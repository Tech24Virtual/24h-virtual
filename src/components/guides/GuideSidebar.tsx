 import { cn } from "@/lib/utils";
 import type { GuideSection } from "@/data/guides";
 
 interface GuideSidebarProps {
   sections: GuideSection[];
   activeSection: string;
   onSectionClick: (sectionId: string) => void;
 }
 
 export function GuideSidebar({ sections, activeSection, onSectionClick }: GuideSidebarProps) {
   return (
     <nav className="sticky top-28 space-y-1">
       <h4 className="font-semibold text-heading text-sm mb-3 uppercase tracking-wider">
         Table of Contents
       </h4>
       <ul className="space-y-1">
         {sections.map((section) => (
           <li key={section.id}>
             <button
               onClick={() => onSectionClick(section.id)}
               className={cn(
                 "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                 activeSection === section.id
                   ? "bg-primary/10 text-primary font-medium"
                   : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
               )}
             >
               {section.title}
             </button>
           </li>
         ))}
       </ul>
     </nav>
   );
 }