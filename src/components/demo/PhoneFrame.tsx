import { ReactNode, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mic, Volume2, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhoneFrameProps {
  children: ReactNode;
  callerName: string;
  callerPhone: string;
  callDuration: number;
  isActive: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export function PhoneFrame({ children, callerName, callerPhone, callDuration, isActive }: PhoneFrameProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [children]);

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="relative rounded-[40px] bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="relative rounded-[32px] bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden h-[520px]">
          {/* Status bar */}
          <div className="h-10 flex items-center justify-center pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400 font-medium">Active Call</span>
              <div className="flex items-center gap-1 text-zinc-400">
                {isActive && (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                <span className="font-mono">{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>

          {/* Caller info */}
          <div className="text-center py-4 border-b border-zinc-800">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <p className="text-lg font-semibold text-white">{callerName}</p>
            <p className="text-sm text-zinc-500">{callerPhone}</p>
          </div>

          {/* Conversation area */}
          <div 
            ref={scrollRef}
            className="h-[300px] overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700"
          >
            {children}
          </div>

          {/* Call controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 via-zinc-900 to-transparent pt-8 pb-4">
            <div className="flex items-center justify-center gap-4">
              <button className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              <button className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                <Volume2 className="w-5 h-5" />
              </button>
              <button className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-32 h-1 rounded-full bg-zinc-600" />
        </div>
      </div>
    </div>
  );
}
