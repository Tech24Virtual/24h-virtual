import { Link } from "react-router-dom";
import { ArrowRight, Clock, DollarSign, Briefcase, Users, Heart, Shield, MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SEO } from "@/components/SEO";
import { ClutchReviewsBadge } from "@/components/home/ClutchReviewsBadge";

// Import images
import storyImage from "@/assets/about/story-receptionist.png";
import missionImage from "@/assets/about/join-team.png";
import joinTeamImage from "@/assets/about/coverage-icon.png";
import coverageImage from "@/assets/about/mission-image.png";
import serviceBusinessImage from "@/assets/about/service-business.png";
import costSavingsImage from "@/assets/about/cost-savings.png";

const features = [
  {
    icon: Clock,
    title: "24/7 Coverage",
    description: "Call answering anytime including evenings, weekends, and holidays for businesses that never stop.",
    image: coverageImage,
  },
  {
    icon: DollarSign,
    title: "Cost Savings",
    description: "Frees your team from overhead like salaries, benefits, and office space. Scales affordably with your growth.",
    image: costSavingsImage,
  },
  {
    icon: Briefcase,
    title: "Service Business Focus",
    description: "Specializes in service businesses across industries with customizable scripts for appointment booking and lead capture.",
    image: serviceBusinessImage,
  },
];

const pillars = [
  {
    icon: Shield,
    title: "Client Centric Partnership",
    description: "Excellence in every call. Receptionists undergo rigorous training and ongoing coaching to deliver professional, brand-aligned service 24/7.",
  },
  {
    icon: Heart,
    title: "People First",
    description: "We invest in our team because happy, well-trained receptionists deliver better experiences for your callers.",
  },
  {
    icon: Users,
    title: "Reliability and Scalability",
    description: "99.9% uptime guarantee with infrastructure that grows seamlessly as your business expands.",
  },
];

const stats = [
  { value: 15, suffix: "+", label: "Years in Business" },
  { value: 1, suffix: "M+", label: "Calls Handled" },
  { value: 1000, suffix: "+", label: "Businesses Served" },
  { value: 99.9, suffix: "%", label: "Uptime Guarantee", decimals: 1 },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About 24H Virtual"
        description="1000+ businesses trust us to capture leads and book appointments. Learn about our mission, values, and the team behind 24H Virtual."
        canonical="/about"
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance">About 24H Virtual</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              1000+ businesses trust us to capture leads and book appointments by never missing a call
            </p>
          </motion.div>
        </div>
      </section>

      {/* The 24H Virtual Story */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left - Image */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <img
                  src={storyImage}
                  alt="24H Virtual receptionist team"
                  className="relative rounded-2xl w-full object-cover mix-blend-multiply"
                />
              </div>
            </motion.div>

            {/* Right - Content */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                Great Service Great Results
              </Badge>
              
              <h2>The 24H Virtual Story</h2>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  24H Virtual Receptionist was founded with a dream and passion for helping businesses 
                  and business owners deliver better customer service and elevated customer experience to clients.
                </p>
                <p>
                  We have been on a trajectory of growth ever since. As a company, we succeed when you succeed. 
                  That is why we have maintained a strict standard to only utilizing the best of the best 
                  Virtual Receptionists for your campaigns.
                </p>
                <p>
                  Years later and now we're still on the same path to help our clients scale and grow 
                  their businesses to greater and greater heights.
                </p>
              </div>

              <Button variant="cta" size="lg" asChild>
                <Link to="/get-started">
                  Get Started Today
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How Can We Help You Succeed? - Feature Grid */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Left - Content */}
            <motion.div
              className="space-y-6 lg:sticky lg:top-32"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                Core Receptionist Services
              </Badge>
              
              <h2>How Can We Help You Succeed</h2>
              
              <p className="text-lg text-muted-foreground">
                We are a professional organization, focused in helping businesses manage calls 
                efficiently and affordably. Our virtual receptionists become an extension of your team.
              </p>

              <Button variant="cta" size="lg" asChild>
                <Link to="/get-started">
                  Get Started Today
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>

            {/* Right - Feature Cards */}
            <div className="grid gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-[200px_1fr] items-center">
                        <div className="h-40 md:h-full overflow-hidden bg-muted">
                          <img
                            src={feature.image}
                            alt={feature.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-6 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <feature.icon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-heading">{feature.title}</h3>
                          </div>
                          <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Core Values */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left - Content */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                Our Guiding Goals
              </Badge>
              
              <h2>Our Mission and Core Values</h2>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  24H Virtual started with a simple goal: to empower SMBs to never miss a call or 
                  customer again. By deploying top-tier virtual receptionists who master your scripts, 
                  processes, and industry nuances, the service assures every interaction feels like 
                  an extension of your team.
                </p>
                <p>
                  Success comes from shared growth, protecting your time while boosting revenue 
                  through efficient lead capture and scheduling.
                </p>
              </div>

              <Button variant="cta" size="lg" asChild>
                <Link to="/get-started">
                  Get Started Today
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>

            {/* Right - Image */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <img
                  src={missionImage}
                  alt="Our mission and values"
                  className="relative rounded-2xl w-full object-cover mix-blend-multiply"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Core Pillars */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 mb-4">
                What Sets Us Apart
              </Badge>
              <h2>Our Three Core Pillars</h2>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pillars.map((pillar, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <pillar.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-heading text-lg">{pillar.title}</h3>
                    <p className="text-sm text-muted-foreground">{pillar.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-spacing bg-primary text-primary-foreground">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  <AnimatedCounter 
                    value={stat.value} 
                    suffix={stat.suffix} 
                    decimals={stat.decimals || 0}
                  />
                </div>
                <p className="text-primary-foreground/80">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Showcase Section */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 mb-4">
              Verified Reviews
            </Badge>
            <h2>Trusted by Businesses Nationwide</h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              See what our clients say on verified review platforms
            </p>
          </motion.div>

          {/* Platform Badges */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ClutchReviewsBadge size="md" />
          </motion.div>

          {/* Featured Client Testimonials */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Shauna MacKenzie",
                role: "Customer Service Operations Mgr",
                location: "Toronto, Ontario",
                quote: "The flexibility, professionalism, and training were all amazing.",
              },
              {
                name: "Project Manager",
                role: "AffordableApartments.ca",
                location: "Duncan, BC",
                quote: "The team's intelligent communication has been impressive in the workflow.",
              },
              {
                name: "Julianne Aury",
                role: "CEO, Financial Foothold",
                location: "Austin, Texas",
                quote: "It has been a great process and I would highly recommend.",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="font-semibold text-heading">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {testimonial.location}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* View all reviews link */}
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <a
              href="https://clutch.co/profile/24h-virtual"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              View all reviews on Clutch
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Join Our Team */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left - Image */}
            <motion.div
              className="relative order-2 lg:order-1"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <img
                  src={joinTeamImage}
                  alt="Join our team"
                  className="relative rounded-2xl w-full object-cover mix-blend-multiply"
                />
              </div>
            </motion.div>

            {/* Right - Content */}
            <motion.div
              className="space-y-6 order-1 lg:order-2"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                Careers
              </Badge>
              
              <h2>Join Our Team</h2>
              
              <p className="text-lg text-muted-foreground">
                24H Virtual is dedicated to creating a revolutionary Virtual Receptionist company 
                full of dedicated individuals who enjoy the flexibility of time and freedom. 
                We're always looking for talented people to join our growing team.
              </p>

              <Button variant="cta" size="lg" asChild>
                <Link to="/careers">
                  View Open Positions
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <ServiceCTA
        title="Ready to Get Started"
        subtitle="We are more than a service provider. We are part of your team"
        ctaText="Get Started Now"
        ctaLink="/get-started"
      />

      <Footer />
    </div>
  );
}
