import { motion } from "framer-motion";

const tools = [
  // CRM Tools
  { name: "Salesforce", category: "CRM" },
  { name: "HubSpot CRM", category: "CRM" },
  { name: "Zoho CRM", category: "CRM" },
  { name: "Microsoft Dynamics 365", category: "CRM" },
  { name: "Pipedrive", category: "CRM" },
  { name: "Freshsales", category: "CRM" },
  { name: "SugarCRM", category: "CRM" },
  { name: "Copper CRM", category: "CRM" },
  // Field Service Tools
  { name: "WorkIz", category: "Field Service" },
  { name: "ShipTrack", category: "Field Service" },
  { name: "PropertyWare", category: "Field Service" },
  { name: "Fieldwire", category: "Field Service" },
  { name: "ServiceTitan", category: "Field Service" },
  { name: "Jobber", category: "Field Service" },
  { name: "FieldAware", category: "Field Service" },
  { name: "Skedulo", category: "Field Service" },
  { name: "mHelpDesk", category: "Field Service" },
  { name: "ClickSoftware", category: "Field Service" },
  { name: "WorkWave", category: "Field Service" },
  // Legal Tools
  { name: "Clio", category: "Legal" },
  { name: "MyCase", category: "Legal" },
  { name: "PracticePanther", category: "Legal" },
  { name: "Rocket Matter", category: "Legal" },
  { name: "Legal Files", category: "Legal" },
  { name: "CosmoLex", category: "Legal" },
  { name: "Zola Suite", category: "Legal" },
  { name: "LEAP", category: "Legal" },
  // Productivity Tools
  { name: "Microsoft Office 365", category: "Productivity" },
  { name: "Google Workspace", category: "Productivity" },
  { name: "LibreOffice", category: "Productivity" },
  { name: "Zoho Office Suite", category: "Productivity" },
  { name: "Evernote", category: "Productivity" },
  { name: "Notion", category: "Productivity" },
  { name: "Trello", category: "Productivity" },
  { name: "Slack", category: "Productivity" },
  // Automation Tools
  { name: "Zapier", category: "Automation" },
  { name: "Pabbly Connect", category: "Automation" },
  { name: "Make", category: "Automation" },
  { name: "n8n", category: "Automation" },
];

export function TrustLogosSection() {
  // Duplicate the tools array for seamless infinite scroll
  const duplicatedTools = [...tools, ...tools];

  return (
    <section className="py-10 bg-accent/30 border-y border-border/30 overflow-hidden">
      <div className="container-custom mb-6">
        <p className="text-center text-sm text-muted-foreground">
          Seamlessly integrates with your favorite tools
        </p>
      </div>
      
      {/* Scrolling container */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-accent/80 to-transparent z-10 pointer-events-none" />
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-accent/80 to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling content */}
        <motion.div 
          className="flex gap-4 hover:[animation-play-state:paused]"
          animate={{ x: [0, -50 * tools.length] }}
          transition={{ 
            duration: 40, 
            repeat: Infinity, 
            ease: "linear",
            repeatType: "loop"
          }}
        >
          {duplicatedTools.map((tool, index) => (
            <motion.div
              key={`${tool.name}-${index}`}
              className="flex-shrink-0 px-4 py-2 rounded-full bg-background/70 border border-border/50 backdrop-blur-sm hover:border-primary/30 hover:bg-background transition-all duration-300"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap hover:text-heading transition-colors">
                {tool.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
