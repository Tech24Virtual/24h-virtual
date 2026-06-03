import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Play, Pause, RotateCcw, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneFrame } from "./PhoneFrame";
import { ConversationBubble } from "./ConversationBubble";
import { ActionFeed } from "./ActionFeed";
import { ScenarioSelector } from "./ScenarioSelector";
import { IntegrationModeToggle } from "./IntegrationModeToggle";
import { scenarios } from "./scenarios";
import { type ConversationMessage, type ActionItem, type ScenarioType, type IntegrationMode } from "./types";

export function LiveCallSimulator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const hasStartedRef = useRef(false);
  const wasPlayingBeforeHidden = useRef(false);
  const userManuallyPaused = useRef(false);

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("medical");
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>("integrated");
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const scenario = scenarios.find((s) => s.id === selectedScenario)!;
  
  const scenarioActions = integrationMode === "integrated" 
    ? scenario.integratedActions 
    : scenario.nonIntegratedActions;

  // Auto-start when in view
  useEffect(() => {
    if (isInView && !hasStartedRef.current && !isPlaying && messages.length === 0) {
      hasStartedRef.current = true;
      const timer = setTimeout(() => setIsPlaying(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isInView, isPlaying, messages.length]);

  // Pause when scrolling out of view
  useEffect(() => {
    if (!isInView && isPlaying) {
      wasPlayingBeforeHidden.current = true;
      setIsPlaying(false);
    } else if (isInView && wasPlayingBeforeHidden.current && !userManuallyPaused.current) {
      wasPlayingBeforeHidden.current = false;
      setIsPlaying(true);
    }
  }, [isInView, isPlaying]);

  // Timer for call duration
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Animation engine
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Process messages based on current time
  useEffect(() => {
    if (!isPlaying) return;
    const newMessages = scenario.messages
      .filter((msg) => msg.timestamp <= currentTime)
      .map((msg, idx) => ({
        ...msg,
        id: `${selectedScenario}-msg-${idx}`,
      }));
    if (newMessages.length !== messages.length) {
      setMessages(newMessages);
    }
  }, [currentTime, isPlaying, scenario.messages, selectedScenario, messages.length]);

  // Process actions based on current time
  useEffect(() => {
    if (!isPlaying) return;
    const newActions = scenarioActions
      .filter((action) => action.timestamp <= currentTime)
      .map((action, idx) => ({
        ...action,
        id: `${selectedScenario}-${integrationMode}-action-${idx}`,
      }));
    if (newActions.length !== actions.length) {
      setActions(newActions);
    }
  }, [currentTime, isPlaying, scenarioActions, selectedScenario, integrationMode, actions.length]);

  // Auto-stop when complete
  useEffect(() => {
    const maxTime = Math.max(
      ...scenario.messages.map((m) => m.timestamp),
      ...scenarioActions.map((a) => a.timestamp)
    );
    if (currentTime > maxTime + 3000) {
      setIsPlaying(false);
    }
  }, [currentTime, scenario, scenarioActions]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setMessages([]);
    setActions([]);
    setCallDuration(0);
    setCurrentTime(0);
    hasStartedRef.current = false;
    userManuallyPaused.current = false;
    wasPlayingBeforeHidden.current = false;
  }, []);

  const handleScenarioChange = useCallback((newScenario: ScenarioType) => {
    setSelectedScenario(newScenario);
    handleReset();
    setTimeout(() => setIsPlaying(true), 300);
  }, [handleReset]);

  const handleModeChange = useCallback((newMode: IntegrationMode) => {
    setIntegrationMode(newMode);
    setActions([]);
    setCurrentTime(0);
    setCallDuration(0);
    setMessages([]);
    setTimeout(() => setIsPlaying(true), 300);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      if (prev) userManuallyPaused.current = true;
      else userManuallyPaused.current = false;
      return !prev;
    });
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge variant="secondary" className="px-4 py-1">
          Live Demo
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-heading">
          See How We Handle Your Calls
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Watch a live simulation of how we capture leads and book consultations.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 py-2 px-4 rounded-full max-w-fit mx-auto">
        <Info className="w-4 h-4" />
        <span>
          <strong>Simulation Notice:</strong> This is a demonstration of a typical call flow.
        </span>
      </div>

      {/* Integration Mode Toggle */}
      <div className="flex justify-center">
        <IntegrationModeToggle mode={integrationMode} onChange={handleModeChange} />
      </div>

      {/* Scenario Selector */}
      <div className="space-y-3">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Choose a practice area:
        </p>
        <ScenarioSelector
          scenarios={scenarios}
          selected={selectedScenario}
          onSelect={handleScenarioChange}
        />
      </div>

      {/* Main content - Split view */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Phone */}
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-muted-foreground">
            📱 Caller's Experience
          </p>
          <PhoneFrame
            callerName={scenario.callerName}
            callerPhone={scenario.callerPhone}
            callDuration={callDuration}
            isActive={isPlaying}
          >
            {messages.map((msg) => (
              <ConversationBubble
                key={msg.id}
                speaker={msg.speaker}
                text={msg.text}
                isTyping={true}
              />
            ))}
          </PhoneFrame>
        </div>

        {/* Action Feed */}
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-muted-foreground">
            ⚡ Behind the Scenes
          </p>
          <div className="glass-card rounded-2xl h-[520px] overflow-hidden">
            <ActionFeed actions={actions} isIntegrated={integrationMode === "integrated"} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex gap-3">
          <Button
            variant={isPlaying ? "outline" : "cta"}
            size="lg"
            onClick={togglePlayPause}
            className="min-w-[140px]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> {messages.length > 0 ? "Resume" : "Play Demo"}
              </>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Restart
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">Ready to experience this?</p>
          <Button variant="cta" asChild>
            <Link to="/get-started">Try It With Your Firm</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
