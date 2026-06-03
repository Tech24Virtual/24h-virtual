import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, Gift, DollarSign, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const tierBonusMap: Record<string, number> = { Standard: 50, Silver: 75, Gold: 100, Platinum: 150 };

interface Affiliate {
  id: string;
  name: string | null;
  email: string;
  affiliate_code: string;
  commission_rate: number | null;
  status: string | null;
  total_earnings: number | null;
  tier: string;
  created_at: string;
}

interface WhiteLabelPartner {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  services_interested: string[] | null;
  tier: string | null;
  monthly_fee: number | null;
  status: string | null;
  created_at: string | null;
}

interface ReferralPartner {
  id: string;
  user_id: string | null;
  referrer_name: string;
  referrer_company_name: string;
  referrer_email: string;
  referrer_phone: string | null;
  referred_company_name: string;
  referred_contact_name: string;
  referred_email: string;
  relationship: string | null;
  status: string | null;
  reward_amount: number | null;
  reward_paid_at: string | null;
  created_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-brand-rose text-heading',
  active: 'bg-cta/10 text-cta',
  approved: 'bg-cta/10 text-cta',
  suspended: 'bg-destructive/10 text-destructive',
  rejected: 'bg-destructive/10 text-destructive',
  converted: 'bg-primary/10 text-primary',
};

export default function AdminPartners() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('affiliates');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [whiteLabelPartners, setWhiteLabelPartners] = useState<WhiteLabelPartner[]>([]);
  const [referralPartners, setReferralPartners] = useState<ReferralPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [whiteLabelSearch, setWhiteLabelSearch] = useState('');
  const [referralSearch, setReferralSearch] = useState('');
  const [affiliateStatusFilter, setAffiliateStatusFilter] = useState('all');
  const [whiteLabelStatusFilter, setWhiteLabelStatusFilter] = useState('all');
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllPartners();
  }, []);

  const fetchAllPartners = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchAffiliates(),
      fetchWhiteLabelPartners(),
      fetchReferralPartners(),
    ]);
    setIsLoading(false);
  };

  const fetchAffiliates = async () => {
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAffiliates(data);
  };

  const fetchWhiteLabelPartners = async () => {
    const { data } = await supabase
      .from('white_label_partners')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setWhiteLabelPartners(data);
  };

  const fetchReferralPartners = async () => {
    const { data } = await supabase
      .from('referral_partners')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReferralPartners(data);
  };

  const updateAffiliateStatus = async (id: string, status: string) => {
    await supabase.from('affiliates').update({ status }).eq('id', id);
    setAffiliates(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    toast.success(`Affiliate ${status === 'active' ? 'approved' : status}`);
  };

  const updateWhiteLabelStatus = async (id: string, status: string) => {
    await supabase.from('white_label_partners').update({ status }).eq('id', id);
    setWhiteLabelPartners(prev => prev.map(p => (p.id === id ? { ...p, status } : p)));
    toast.success(`White Label partner ${status === 'approved' ? 'approved' : status}`);
  };

  const updateReferralStatus = async (id: string, status: string) => {
    await supabase.from('referral_partners').update({ status }).eq('id', id);
    setReferralPartners(prev => prev.map(p => (p.id === id ? { ...p, status } : p)));
    toast.success(`Referral ${status}`);
  };

  const payReferralReward = async (id: string, amount: number = 150) => {
    await supabase.from('referral_partners').update({
      reward_amount: amount,
      reward_paid_at: new Date().toISOString(),
      status: 'converted',
    }).eq('id', id);
    setReferralPartners(prev =>
      prev.map(p =>
        p.id === id ? { ...p, reward_amount: amount, reward_paid_at: new Date().toISOString(), status: 'converted' } : p
      )
    );
    toast.success(`Reward of $${amount} marked as paid`);
  };

  // Filter functions
  const filteredAffiliates = affiliates.filter(a => {
    const matchesSearch =
      a.name?.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
      a.affiliate_code.toLowerCase().includes(affiliateSearch.toLowerCase());
    const matchesStatus = affiliateStatusFilter === 'all' || a.status === affiliateStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredWhiteLabelPartners = whiteLabelPartners.filter(p => {
    const matchesSearch =
      p.company_name.toLowerCase().includes(whiteLabelSearch.toLowerCase()) ||
      p.contact_name.toLowerCase().includes(whiteLabelSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(whiteLabelSearch.toLowerCase());
    const matchesStatus = whiteLabelStatusFilter === 'all' || p.status === whiteLabelStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReferralPartners = referralPartners.filter(p => {
    const matchesSearch =
      p.referrer_name.toLowerCase().includes(referralSearch.toLowerCase()) ||
      p.referrer_email.toLowerCase().includes(referralSearch.toLowerCase()) ||
      p.referred_company_name.toLowerCase().includes(referralSearch.toLowerCase());
    const matchesStatus = referralStatusFilter === 'all' || p.status === referralStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalPaidOut =
    affiliates.reduce((sum, a) => sum + (a.total_earnings || 0), 0) +
    referralPartners.reduce((sum, p) => sum + (p.reward_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Partner Management</h1>
        <p className="text-muted-foreground mt-1">Manage all partner programs</p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-heading">{affiliates.length}</p>
                <p className="text-xs text-muted-foreground">Affiliates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-heading">{whiteLabelPartners.length}</p>
                <p className="text-xs text-muted-foreground">White Label</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cta/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-cta" />
              </div>
              <div>
                <p className="text-2xl font-bold text-heading">{referralPartners.length}</p>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-heading" />
              </div>
              <div>
                <p className="text-2xl font-bold text-heading">${totalPaidOut.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="affiliates" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Affiliates</span>
          </TabsTrigger>
          <TabsTrigger value="white-label" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">White Label</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Referrals</span>
          </TabsTrigger>
        </TabsList>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle className="text-lg">All Affiliates ({filteredAffiliates.length})</CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select value={affiliateStatusFilter} onValueChange={setAffiliateStatusFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search affiliates..."
                      value={affiliateSearch}
                      onChange={(e) => setAffiliateSearch(e.target.value)}
                      className="pl-9 w-full sm:w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredAffiliates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No affiliates found</p>
                  <p className="text-sm">Affiliates will appear here when they sign up</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAffiliates.map((affiliate) => (
                        <TableRow key={affiliate.id}>
                          <TableCell className="font-medium">{affiliate.name || 'Unknown'}</TableCell>
                          <TableCell>{affiliate.email}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{affiliate.affiliate_code}</code>
                          </TableCell>
                          <TableCell>
                            <span className="whitespace-nowrap">$150 + ${tierBonusMap[affiliate.tier] || 50}/qtr</span>
                            <span className="block text-xs text-muted-foreground">{affiliate.tier || 'Standard'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {(affiliate.total_earnings || 0).toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusColors[affiliate.status || 'pending']}>
                              {affiliate.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(affiliate.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateAffiliateStatus(affiliate.id, 'active')}>
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateAffiliateStatus(affiliate.id, 'suspended')}>
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem>View Referrals</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* White Label Tab */}
        <TabsContent value="white-label" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle className="text-lg">White Label Partners ({filteredWhiteLabelPartners.length})</CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select value={whiteLabelStatusFilter} onValueChange={setWhiteLabelStatusFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search partners..."
                      value={whiteLabelSearch}
                      onChange={(e) => setWhiteLabelSearch(e.target.value)}
                      className="pl-9 w-full sm:w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredWhiteLabelPartners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No white label partners found</p>
                  <p className="text-sm">Partners will appear here when they apply</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Monthly Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWhiteLabelPartners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell className="font-medium">{partner.company_name}</TableCell>
                          <TableCell>{partner.contact_name}</TableCell>
                          <TableCell>{partner.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{partner.tier || 'reseller'}</Badge>
                          </TableCell>
                          <TableCell>${partner.monthly_fee || 0}/mo</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusColors[partner.status || 'pending']}>
                              {partner.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {partner.created_at ? format(new Date(partner.created_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/partners/${partner.id}`)}>
                                  Manage Partner
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateWhiteLabelStatus(partner.id, 'approved')}>
                                  Approve & Create Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateWhiteLabelStatus(partner.id, 'suspended')}>
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem>View Application</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Referral Partners ({filteredReferralPartners.length})</CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search referrals..."
                      value={referralSearch}
                      onChange={(e) => setReferralSearch(e.target.value)}
                      className="pl-9 w-full sm:w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredReferralPartners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No referrals found</p>
                  <p className="text-sm">Referrals will appear here when submitted</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Referred Company</TableHead>
                        <TableHead>Referred Contact</TableHead>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReferralPartners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell className="font-medium">{partner.referrer_name}</TableCell>
                          <TableCell>{partner.referrer_email}</TableCell>
                          <TableCell>{partner.referred_company_name}</TableCell>
                          <TableCell>{partner.referred_contact_name}</TableCell>
                          <TableCell>{partner.relationship || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusColors[partner.status || 'pending']}>
                              {partner.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {partner.reward_paid_at ? (
                              <span className="text-cta font-medium">${partner.reward_amount} Paid</span>
                            ) : (
                              <span className="text-muted-foreground">$150 Pending</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {partner.created_at ? format(new Date(partner.created_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateReferralStatus(partner.id, 'converted')}>
                                  Mark as Converted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => payReferralReward(partner.id)}>
                                  Pay Reward ($150)
                                </DropdownMenuItem>
                                <DropdownMenuItem>Contact Referrer</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => updateReferralStatus(partner.id, 'rejected')}
                                >
                                  Reject Referral
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
