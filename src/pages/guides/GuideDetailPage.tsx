 import { useState, useEffect, useCallback } from "react";
 import { useParams, Link, Navigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { ArrowLeft, Download, Clock, Share2, BookOpen, ArrowRight, Loader2 } from "lucide-react";
 import { Navigation } from "@/components/Navigation";
 import { Footer } from "@/components/Footer";
 import { SEO } from "@/components/SEO";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { GuideSidebar } from "@/components/guides/GuideSidebar";
 import { GuideContent } from "@/components/guides/GuideContent";
 import { GuideCard } from "@/components/guides/GuideCard";
 import { getGuideBySlug, getRelatedGuides, type Guide } from "@/data/guides";
 import { generateGuidePDF } from "@/lib/pdfGenerator";
 import { toast } from "@/hooks/use-toast";
 
 export default function GuideDetailPage() {
   const { slug } = useParams<{ slug: string }>();
   const [activeSection, setActiveSection] = useState("");
   const [guide, setGuide] = useState<Guide | undefined>(undefined);
   const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
 
   useEffect(() => {
     if (slug) {
       const foundGuide = getGuideBySlug(slug);
       setGuide(foundGuide);
       if (foundGuide && foundGuide.sections.length > 0) {
         setActiveSection(foundGuide.sections[0].id);
       }
     }
   }, [slug]);
 
   // Handle scroll spy
   useEffect(() => {
     if (!guide) return;
 
     const handleScroll = () => {
       const sections = guide.sections.map(s => document.getElementById(s.id));
       const scrollPosition = window.scrollY + 150;
 
       for (let i = sections.length - 1; i >= 0; i--) {
         const section = sections[i];
         if (section && section.offsetTop <= scrollPosition) {
           setActiveSection(guide.sections[i].id);
           break;
         }
       }
     };
 
     window.addEventListener("scroll", handleScroll, { passive: true });
     return () => window.removeEventListener("scroll", handleScroll);
   }, [guide]);
 
   const scrollToSection = (sectionId: string) => {
     const element = document.getElementById(sectionId);
     if (element) {
       const offset = 120;
       const top = element.offsetTop - offset;
       window.scrollTo({ top, behavior: "smooth" });
     }
   };
 
   const handleDownloadPDF = useCallback(async () => {
     if (!guide) return;
     setIsGeneratingPDF(true);
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
       setIsGeneratingPDF(false);
     }
   }, [guide]);
 
   const handleShare = async () => {
     if (navigator.share) {
       await navigator.share({
         title: guide?.title,
         text: guide?.description,
         url: window.location.href
       });
     } else {
       await navigator.clipboard.writeText(window.location.href);
     }
   };
 
   if (!slug) return <Navigate to="/guides" replace />;
   if (!guide) {
     return (
       <>
         <Navigation />
         <div className="min-h-[60vh] flex items-center justify-center">
           <div className="text-center">
             <h1 className="text-2xl font-bold text-heading mb-4">Guide Not Found</h1>
             <p className="text-muted-foreground mb-6">
               The guide you're looking for doesn't exist.
             </p>
             <Button asChild>
               <Link to="/guides">
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back to Guides
               </Link>
             </Button>
           </div>
         </div>
         <Footer />
       </>
     );
   }
 
   const relatedGuides = getRelatedGuides(guide);
   const Icon = guide.icon;
 
   return (
     <>
       <SEO
         title={`${guide.title} | Free Guide | 24H Virtual`}
         description={guide.description}
       />
       <Navigation />
 
       {/* Hero Section */}
       <section className="gradient-hero pt-32 pb-16">
         <div className="container-custom">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
           >
             {/* Breadcrumb */}
             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
               <Link to="/guides" className="hover:text-primary transition-colors">
                 Guides
               </Link>
               <span>/</span>
               <span className="text-foreground">{guide.title}</span>
             </div>
 
             <div className="max-w-3xl">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg">
                   <Icon className="w-7 h-7" />
                 </div>
                 <Badge variant="secondary" className="capitalize">
                   {guide.category === "core" ? "Getting Started" : "Industry Guide"}
                 </Badge>
               </div>
 
               <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-heading mb-4">
                 {guide.title}
               </h1>
 
               <p className="text-lg text-muted-foreground mb-6">
                 {guide.description}
               </p>
 
               <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <Clock className="w-4 h-4" />
                   <span>{guide.readingTime}</span>
                 </div>
 
                 <Button 
                   variant="cta" 
                   className="gap-2"
                   onClick={handleDownloadPDF}
                   disabled={isGeneratingPDF}
                 >
                   {isGeneratingPDF ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <Download className="w-4 h-4" />
                   )}
                   {isGeneratingPDF ? "Generating..." : "Download PDF"}
                 </Button>
 
                 <Button variant="outline" className="gap-2" onClick={handleShare}>
                   <Share2 className="w-4 h-4" />
                   Share
                 </Button>
               </div>
             </div>
           </motion.div>
         </div>
       </section>
 
       {/* Content Section */}
       <section className="py-12 md:py-16 bg-background">
         <div className="container-custom">
           <div className="grid lg:grid-cols-[250px_1fr] gap-12">
             {/* Sidebar - Desktop */}
             <aside className="hidden lg:block">
               <GuideSidebar
                 sections={guide.sections}
                 activeSection={activeSection}
                 onSectionClick={scrollToSection}
               />
             </aside>
 
             {/* Main Content */}
             <article className="max-w-3xl">
               <GuideContent sections={guide.sections} />
 
               {/* CTA Banner */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 text-center"
               >
                 <BookOpen className="w-10 h-10 text-primary mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-heading mb-2">
                   Ready to Take the Next Step?
                 </h3>
                 <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                   See how our virtual receptionist services can transform your 
                   customer experience with a free consultation.
                 </p>
                 <div className="flex flex-wrap justify-center gap-3">
                   <Button asChild variant="cta">
                     <Link to="/get-started">
                       Book Free Consultation
                       <ArrowRight className="ml-2 w-4 h-4" />
                     </Link>
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={handleDownloadPDF}
                     disabled={isGeneratingPDF}
                   >
                     {isGeneratingPDF ? (
                       <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                     ) : (
                       <Download className="mr-2 w-4 h-4" />
                     )}
                     {isGeneratingPDF ? "Generating..." : "Download PDF"}
                   </Button>
                 </div>
               </motion.div>
             </article>
           </div>
         </div>
       </section>
 
       {/* Related Guides */}
       {relatedGuides.length > 0 && (
         <section className="py-16 bg-muted/30">
           <div className="container-custom">
             <div className="text-center mb-10">
               <h2 className="text-2xl md:text-3xl font-bold text-heading mb-3">
                 Related Guides
               </h2>
               <p className="text-muted-foreground">
                 Continue learning with these related resources
               </p>
             </div>
 
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
               {relatedGuides.slice(0, 3).map((relatedGuide, index) => (
                 <GuideCard key={relatedGuide.slug} guide={relatedGuide} index={index} />
               ))}
             </div>
           </div>
         </section>
       )}
 
       <Footer />
     </>
   );
 }