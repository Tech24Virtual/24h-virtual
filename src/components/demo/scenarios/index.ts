import { Stethoscope, Scale, Home, Building2 } from "lucide-react";
import { type Scenario } from "../types";

export const medicalScenario: Scenario = {
  id: "medical",
  name: "Medical Practice",
  icon: Stethoscope,
  callerName: "Sarah Johnson",
  callerPhone: "(555) 123-4567",
  messages: [
    { speaker: "ai", text: "Thank you for calling Dr. Smith's Family Practice. How may I help you today?", timestamp: 0 },
    { speaker: "caller", text: "Hi, I need to schedule an appointment for a checkup.", timestamp: 3000 },
    { speaker: "ai", text: "I'd be happy to help you schedule that. May I have your name please?", timestamp: 6000 },
    { speaker: "caller", text: "Sarah Johnson.", timestamp: 9000 },
    { speaker: "ai", text: "Thank you, Sarah. I see you're an existing patient. I have some availability this week. Would Thursday at 2pm work for you?", timestamp: 12000 },
    { speaker: "caller", text: "Yes, that works perfectly.", timestamp: 17000 },
    { speaker: "ai", text: "I've scheduled your appointment for Thursday at 2pm with Dr. Smith. You'll receive a confirmation text shortly. Is there anything else I can help with?", timestamp: 20000 },
    { speaker: "caller", text: "No, that's all. Thank you!", timestamp: 26000 },
    { speaker: "ai", text: "You're welcome! Have a great day, Sarah.", timestamp: 28000 },
  ],
  integratedActions: [
    { title: "Caller ID Match", description: "Found patient: Sarah Johnson", icon: "user-check", timestamp: 1000 },
    { title: "EHR Lookup", description: "Pulled patient history", icon: "database", timestamp: 5000 },
    { title: "Calendar Check", description: "Scanned Dr. Smith availability", icon: "calendar", timestamp: 10000 },
    { title: "Appointment Booked", description: "Thursday 2pm confirmed", icon: "calendar-check", timestamp: 19000 },
    { title: "SMS Sent", description: "Confirmation to (555) 123-4567", icon: "message-circle", timestamp: 22000 },
    { title: "EHR Updated", description: "Appointment added to record", icon: "check-circle", timestamp: 25000 },
  ],
  nonIntegratedActions: [
    { title: "Call Received", description: "Incoming from (555) 123-4567", icon: "phone-incoming", timestamp: 1000 },
    { title: "Message Created", description: "New appointment request", icon: "file-text", timestamp: 19000 },
    { title: "Email Sent", description: "To office@drsmith.com", icon: "mail", timestamp: 22000 },
  ],
};

export const legalScenario: Scenario = {
  id: "legal",
  name: "Law Firm",
  icon: Scale,
  callerName: "Michael Chen",
  callerPhone: "(555) 987-6543",
  messages: [
    { speaker: "ai", text: "Thank you for calling Anderson & Associates Law Firm. How may I assist you?", timestamp: 0 },
    { speaker: "caller", text: "Hi, I was in a car accident last week and I think I need a lawyer.", timestamp: 4000 },
    { speaker: "ai", text: "I'm sorry to hear about your accident. I can definitely help connect you with one of our attorneys. May I have your name?", timestamp: 8000 },
    { speaker: "caller", text: "Michael Chen.", timestamp: 12000 },
    { speaker: "ai", text: "Thank you, Michael. Can you briefly describe the accident and any injuries you sustained?", timestamp: 14000 },
    { speaker: "caller", text: "I was rear-ended at a stoplight. I have some neck and back pain.", timestamp: 18000 },
    { speaker: "ai", text: "I understand. One of our personal injury attorneys specializes in these cases. I have an opening tomorrow at 10am for a free consultation. Would that work?", timestamp: 22000 },
    { speaker: "caller", text: "Yes, that would be great.", timestamp: 28000 },
    { speaker: "ai", text: "I've scheduled your free consultation for tomorrow at 10am. Attorney Davis will call you at this number. Is there anything else I can help with?", timestamp: 31000 },
    { speaker: "caller", text: "No, thank you so much.", timestamp: 36000 },
  ],
  integratedActions: [
    { title: "Lead Captured", description: "New PI lead: Michael Chen", icon: "user-plus", timestamp: 6000 },
    { title: "Case Type Tagged", description: "Auto Accident - Personal Injury", icon: "tag", timestamp: 10000 },
    { title: "Lead Scored", description: "High priority: active injury", icon: "star", timestamp: 16000 },
    { title: "Calendar Booked", description: "Attorney Davis - 10am", icon: "calendar-check", timestamp: 30000 },
    { title: "CRM Updated", description: "Lead added to pipeline", icon: "database", timestamp: 33000 },
    { title: "Email Alert", description: "Sent to Attorney Davis", icon: "mail", timestamp: 35000 },
  ],
  nonIntegratedActions: [
    { title: "Call Received", description: "Incoming from (555) 987-6543", icon: "phone-incoming", timestamp: 1000 },
    { title: "Message Created", description: "New PI lead details", icon: "file-text", timestamp: 30000 },
    { title: "Email Sent", description: "To intake@andersonlaw.com", icon: "mail", timestamp: 33000 },
  ],
};

export const homeServicesScenario: Scenario = {
  id: "home-services",
  name: "Home Services",
  icon: Home,
  callerName: "Jennifer Martinez",
  callerPhone: "(555) 456-7890",
  messages: [
    { speaker: "ai", text: "Thank you for calling Quick Fix Plumbing. How can I help you today?", timestamp: 0 },
    { speaker: "caller", text: "Hi, I have a water leak under my kitchen sink and it's getting worse!", timestamp: 3500 },
    { speaker: "ai", text: "I understand this is urgent. Let me help you right away. Can I have your name and address?", timestamp: 7000 },
    { speaker: "caller", text: "Jennifer Martinez, 456 Oak Street.", timestamp: 11000 },
    { speaker: "ai", text: "Thank you, Jennifer. Is the water currently turned off at the main valve?", timestamp: 14000 },
    { speaker: "caller", text: "No, I don't know where that is.", timestamp: 17000 },
    { speaker: "ai", text: "No problem, I'll walk you through it. Look for a valve near your water meter, usually in the basement or outside. Turn it clockwise to shut off.", timestamp: 20000 },
    { speaker: "caller", text: "Okay, I found it and turned it off. Thank you!", timestamp: 26000 },
    { speaker: "ai", text: "Great job! I have a technician available within the hour. Can you confirm you'll be home?", timestamp: 29000 },
    { speaker: "caller", text: "Yes, I'll be here.", timestamp: 33000 },
    { speaker: "ai", text: "Our technician Tom will arrive within 45 minutes. You'll get a text when he's on the way. Anything else I can help with?", timestamp: 36000 },
  ],
  integratedActions: [
    { title: "Emergency Flagged", description: "Water leak - high priority", icon: "alert-triangle", timestamp: 5000 },
    { title: "Address Verified", description: "456 Oak Street", icon: "map-pin", timestamp: 9000 },
    { title: "Dispatch Initiated", description: "Checking available techs", icon: "truck", timestamp: 13000 },
    { title: "Tech Assigned", description: "Tom - 45 min ETA", icon: "user-check", timestamp: 28000 },
    { title: "Job Created", description: "Work order #4521", icon: "clipboard", timestamp: 32000 },
    { title: "SMS Sent", description: "ETA notification queued", icon: "message-circle", timestamp: 35000 },
  ],
  nonIntegratedActions: [
    { title: "Call Received", description: "Incoming from (555) 456-7890", icon: "phone-incoming", timestamp: 1000 },
    { title: "Message Created", description: "Emergency service request", icon: "file-text", timestamp: 28000 },
    { title: "Email Sent", description: "To dispatch@quickfix.com", icon: "mail", timestamp: 32000 },
  ],
};

export const realEstateScenario: Scenario = {
  id: "real-estate",
  name: "Real Estate",
  icon: Building2,
  callerName: "David Williams",
  callerPhone: "(555) 321-9876",
  messages: [
    { speaker: "ai", text: "Thank you for calling Premier Realty. How may I assist you?", timestamp: 0 },
    { speaker: "caller", text: "Hi, I saw a listing online for a house on Maple Drive. Is it still available?", timestamp: 4000 },
    { speaker: "ai", text: "I'd be happy to check that for you. Can you provide the full address or MLS number?", timestamp: 8000 },
    { speaker: "caller", text: "It's 789 Maple Drive, the 4-bedroom colonial.", timestamp: 12000 },
    { speaker: "ai", text: "Yes, 789 Maple Drive is still available! It's listed at $485,000. Would you like to schedule a showing?", timestamp: 16000 },
    { speaker: "caller", text: "Yes, please. Do you have anything this weekend?", timestamp: 21000 },
    { speaker: "ai", text: "Let me check our agent's availability. I have Saturday at 2pm or Sunday at 11am. Which works better for you?", timestamp: 24000 },
    { speaker: "caller", text: "Saturday at 2pm is perfect.", timestamp: 29000 },
    { speaker: "ai", text: "Excellent! I've scheduled your showing for Saturday at 2pm. May I have your name and contact information?", timestamp: 32000 },
    { speaker: "caller", text: "David Williams, and my number is the one I'm calling from.", timestamp: 36000 },
    { speaker: "ai", text: "Thank you, David! Agent Lisa will meet you at the property Saturday at 2pm. You'll receive a confirmation text shortly.", timestamp: 39000 },
  ],
  integratedActions: [
    { title: "Property Lookup", description: "789 Maple Drive - Active", icon: "home", timestamp: 10000 },
    { title: "Lead Captured", description: "David Williams - Buyer", icon: "user-plus", timestamp: 14000 },
    { title: "Calendar Check", description: "Agent Lisa availability", icon: "calendar", timestamp: 22000 },
    { title: "Showing Booked", description: "Sat 2pm - 789 Maple Dr", icon: "calendar-check", timestamp: 30000 },
    { title: "MLS Updated", description: "Showing scheduled", icon: "database", timestamp: 34000 },
    { title: "SMS Sent", description: "Confirmation to buyer", icon: "message-circle", timestamp: 38000 },
  ],
  nonIntegratedActions: [
    { title: "Call Received", description: "Incoming from (555) 321-9876", icon: "phone-incoming", timestamp: 1000 },
    { title: "Message Created", description: "Showing request details", icon: "file-text", timestamp: 30000 },
    { title: "Email Sent", description: "To lisa@premierrealty.com", icon: "mail", timestamp: 34000 },
  ],
};

export const scenarios: Scenario[] = [
  medicalScenario,
  legalScenario,
  homeServicesScenario,
  realEstateScenario,
];
