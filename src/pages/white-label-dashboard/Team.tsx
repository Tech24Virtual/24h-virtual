import { useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Member {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
  invited_at: string;
}

const roleColors: Record<string, string> = {
  owner: 'bg-primary/10 text-primary',
  manager: 'bg-cta/10 text-cta',
  agent: 'bg-muted text-muted-foreground',
};

const statusColors: Record<string, string> = {
  active: 'bg-cta/10 text-cta',
  pending: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-destructive/10 text-destructive',
};

export default function WLTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchPartnerAndMembers(); }, [user]);

  const fetchPartnerAndMembers = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase
        .from('white_label_partners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (partner) {
        setPartnerId(partner.id);
        const { data: membersData } = await supabase
          .from('wl_partner_members')
          .select('*')
          .eq('partner_id', partner.id)
          .order('invited_at', { ascending: false });

        if (membersData) setMembers(membersData as Member[]);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!partnerId || !inviteEmail.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('wl_partner_members').insert({
        partner_id: partnerId,
        user_id: null,
        invited_email: inviteEmail.trim(),
        role: inviteRole,
        status: 'pending',
        invited_by: user!.id,
        invited_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Invite recorded", description: "Team member added as pending. They will be notified by the admin team." });

      try {
        const { error: inviteError } = await supabase.functions.invoke('invite-user', {
          body: { email: inviteEmail, role: inviteRole, partner_id: partnerId },
        });
        if (inviteError) throw inviteError;
        toast({ title: "Invite sent", description: "An invitation email has been sent to " + inviteEmail });
      } catch (inviteError) {
        console.error("Error sending invite email:", inviteError);
      }

      setInviteEmail("");
      setInviteRole("agent");
      setShowInviteForm(false);
      fetchPartnerAndMembers();
    } catch (error) {
      console.error("Error inviting member:", JSON.stringify(error));
      toast({ title: "Error", description: "Failed to send invite.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayEmail = (member: Member) => member.invited_email ?? `user:${member.user_id?.slice(0, 8)}`;

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Team</h1>
            <p className="text-muted-foreground mt-1">Manage your partner team members</p>
          </div>
          <Button onClick={() => setShowInviteForm(v => !v)}>
            <Plus className="w-4 h-4 mr-2" />Invite Member
          </Button>
        </div>

        {showInviteForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-2 flex-1">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2 w-40">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleInvite} disabled={isSubmitting || !inviteEmail.trim()}>
                    {isSubmitting ? "Sending..." : "Send Invite"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowInviteForm(false)}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No team members yet</p>
                <Button onClick={() => setShowInviteForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />Invite Your First Member
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(member => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{displayEmail(member)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColors[member.role] ?? ''}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[member.status] ?? ''}>
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(member.invited_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
