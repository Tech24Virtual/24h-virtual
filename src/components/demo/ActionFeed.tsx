import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCheck, Database, Calendar, CalendarCheck, MessageCircle, CheckCircle,
  PhoneIncoming, FileText, Mail, UserPlus, Tag, Star, Truck, MapPin, 
  Clipboard, AlertTriangle, Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ActionItem } from "./types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-check": UserCheck,
  "database": Database,
  "calendar": Calendar,
  "calendar-check": CalendarCheck,
  "message-circle": MessageCircle,
  "check-circle": CheckCircle,
  "phone-incoming": PhoneIncoming,
  "file-text": FileText,
  "mail": Mail,
  "user-plus": UserPlus,
  "tag": Tag,
  "star": Star,
  "truck": Truck,
  "map-pin": MapPin,
  "clipboard": Clipboard,
  "alert-triangle": AlertTriangle,
  "home": Home,
};

interface ActionFeedProps {
  actions: ActionItem[];
  isIntegrated: boolean;
}

export function ActionFeed({ actions, isIntegrated }: ActionFeedProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <AnimatePresence mode="popLayout">
        {actions.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full text-center"
          >
            <div className="text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <p className="text-sm">Actions will appear here</p>
              <p className="text-xs mt-1 opacity-70">as the call progresses</p>
            </div>
          </motion.div>
        ) : (
          actions.map((action, index) => {
            const IconComponent = iconMap[action.icon] || CheckCircle;
            
            return (
              <motion.div
                key={action.id || index}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  "bg-accent/50 border border-border/50",
                  "hover:bg-accent transition-colors"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  isIntegrated 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : "bg-amber-500/10 text-amber-500"
                )}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading truncate">
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                  className={cn(
                    "flex-shrink-0 w-2 h-2 rounded-full",
                    isIntegrated ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
