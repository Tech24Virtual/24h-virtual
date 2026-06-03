 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { ArrowRight, Download, Clock, Star, Loader2 } from "lucide-react";
 import { motion } from "framer-motion";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import type { Guide } from "@/data/guides";
 import { generateGuidePDF } from "@/lib/pdfGenerator";
 import { toast } from "@/hooks/use-toast";
 
 interface GuideCardProps {
   guide: Guide;
   index?: number;
 }
 
 export function GuideCard({ guide, index = 0 }: GuideCardProps) {
   const Icon = guide.icon;
   const [isGenerating, setIsGenerating] = useState(false);
 
   const handleDownloadPDF = async () => {
     setIsGenerating(true);
     try {
       await generateGuidePDF(guide);
       toast({
         title: "PDF Downloaded",
         description: `"${guide.title}" has been saved to your downloads.`,
       });
     } catch (error) {
       console.error("PDF generation error:", error);
       toast({
         title: "Download Failed",
         description: "Unable to generate PDF. Please try again.",
         variant: "destructive",
       });
     } finally {
       setIsGenerating(false);
     }
   };
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.4, delay: index * 0.1 }}
     >
       <Card className="group h-full flex flex-col hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden">
         <CardHeader className="pb-3">
           <div className="flex items-start justify-between gap-3 mb-2">
             <motion.div 
               className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary group-hover:to-primary/80 transition-all duration-300"
               whileHover={{ scale: 1.1, rotate: 5 }}
             >
               <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
             </motion.div>
             {guide.featured && (
               <Badge variant="secondary" className="gap-1">
                 <Star className="w-3 h-3 fill-current" />
                 Featured
               </Badge>
             )}
           </div>
           <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
             {guide.title}
           </CardTitle>
           <CardDescription className="line-clamp-2 text-sm">
             {guide.description}
           </CardDescription>
         </CardHeader>
         
         <CardContent className="flex-1 flex flex-col justify-end pt-0">
           <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
             <Clock className="w-3.5 h-3.5" />
             <span>{guide.readingTime}</span>
             <span className="text-border">•</span>
             <Badge variant="outline" className="text-xs capitalize">
               {guide.category === "core" ? "Getting Started" : "Industry Guide"}
             </Badge>
           </div>
           
           <div className="flex gap-2">
             <Button asChild variant="default" className="flex-1 group/btn">
               <Link to={`/guides/${guide.slug}`}>
                 Read Guide
                 <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
               </Link>
             </Button>
             <Button 
               variant="outline" 
               size="icon" 
               title="Download PDF"
               onClick={handleDownloadPDF}
               disabled={isGenerating}
             >
               {isGenerating ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 <Download className="w-4 h-4" />
               )}
             </Button>
           </div>
         </CardContent>
       </Card>
     </motion.div>
   );
 }