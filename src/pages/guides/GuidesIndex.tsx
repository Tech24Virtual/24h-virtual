 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { motion } from "framer-motion";
 import { BookOpen, ArrowRight, Mail, Sparkles } from "lucide-react";
 import { Navigation } from "@/components/Navigation";
 import { Footer } from "@/components/Footer";
 import { SEO } from "@/components/SEO";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
 import { GuideCard } from "@/components/guides/GuideCard";
 import { allGuides, coreGuides, industryGuides } from "@/data/guides";
 
 export default function GuidesIndex() {
   const [email, setEmail] = useState("");
 
   return (
     <>
       <SEO
         title="Free Business Guides | 24H Virtual"
         description="Expert resources to help you improve customer experience and grow your business. Download free guides on call handling, industry best practices, and more."
       />
       <Navigation />
 
       {/* Hero Section */}
       <section className="gradient-hero pt-32 pb-20">
         <div className="container-custom text-center">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="max-w-3xl mx-auto"
           >
             <div className="flex items-center justify-center gap-2 mb-4">
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg">
                 <BookOpen className="w-6 h-6" />
               </div>
             </div>
             <h1 className="text-4xl md:text-5xl font-bold text-heading mb-4">
               Free Business Guides
             </h1>
             <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
               Expert resources to help you deliver exceptional customer experience 
               and grow your business. Download, read, and implement.
             </p>
           </motion.div>
         </div>
       </section>
 
       {/* Guides Grid */}
       <section className="py-16 md:py-24 bg-background">
         <div className="container-custom">
           <Tabs defaultValue="all" className="w-full">
             <div className="flex justify-center mb-10">
               <TabsList className="bg-muted/50 p-1">
                 <TabsTrigger value="all" className="gap-2">
                   All Guides
                   <span className="hidden sm:inline text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                     {allGuides.length}
                   </span>
                 </TabsTrigger>
                 <TabsTrigger value="core" className="gap-2">
                   Getting Started
                   <span className="hidden sm:inline text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                     {coreGuides.length}
                   </span>
                 </TabsTrigger>
                 <TabsTrigger value="industry" className="gap-2">
                   Industry Guides
                   <span className="hidden sm:inline text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                     {industryGuides.length}
                   </span>
                 </TabsTrigger>
               </TabsList>
             </div>
 
             <TabsContent value="all">
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {allGuides.map((guide, index) => (
                   <GuideCard key={guide.slug} guide={guide} index={index} />
                 ))}
               </div>
             </TabsContent>
 
             <TabsContent value="core">
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {coreGuides.map((guide, index) => (
                   <GuideCard key={guide.slug} guide={guide} index={index} />
                 ))}
               </div>
             </TabsContent>
 
             <TabsContent value="industry">
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {industryGuides.map((guide, index) => (
                   <GuideCard key={guide.slug} guide={guide} index={index} />
                 ))}
               </div>
             </TabsContent>
           </Tabs>
         </div>
       </section>
 
       {/* Newsletter CTA */}
       <section className="py-16 bg-gradient-to-br from-primary/5 via-accent/30 to-secondary/5">
         <div className="container-custom">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="glass-card rounded-2xl p-8 md:p-12 max-w-4xl mx-auto text-center"
           >
             <div className="flex items-center justify-center gap-2 mb-4">
               <Sparkles className="w-5 h-5 text-secondary" />
               <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                 Stay Updated
               </span>
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-heading mb-3">
               Get New Guides Delivered
             </h2>
             <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
               Be the first to receive our latest business guides and tips for 
               improving your customer experience.
             </p>
             
             <form 
               className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6"
               onSubmit={(e) => e.preventDefault()}
             >
               <div className="relative flex-1">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <Input
                   type="email"
                   placeholder="Enter your email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="pl-11 h-12 rounded-full"
                 />
               </div>
               <Button type="submit" variant="cta" className="h-12 px-6 rounded-full">
                 Subscribe
                 <ArrowRight className="ml-2 w-4 h-4" />
               </Button>
             </form>
 
             <p className="text-sm text-muted-foreground">
               Or{" "}
               <Link to="/get-started" className="text-primary hover:underline font-medium">
                 book a free consultation
               </Link>{" "}
               with our team.
             </p>
           </motion.div>
         </div>
       </section>
 
       <Footer />
     </>
   );
 }