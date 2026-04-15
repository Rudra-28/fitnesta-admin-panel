import { useState } from 'react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useVisitingForms, useVisitingFormById } from '@/hooks/useAdmin';
import { Loader2, Eye, MapPin, Phone, User, Calendar, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
  granted: 'bg-green-100 text-green-800 hover:bg-green-100',
  denied: 'bg-red-100 text-red-800 hover:bg-red-100',
  follow_up: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

const PLACE_TYPE_BADGE = {
  society: 'bg-blue-100 text-blue-800',
  school: 'bg-purple-100 text-purple-800',
  organisation: 'bg-teal-100 text-teal-800',
};

function Sel({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-0.5">{label}</label>
      <select
        className="h-8 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring w-40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function FormDetailModal({ formId, onClose }) {
  const { data: res, isLoading, isError } = useVisitingFormById(formId);
  const detail = res?.data;

  return (
    <Dialog open={!!formId} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visiting Form Details</DialogTitle>
          <DialogDescription>Submitted by Marketing Executive</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
             <Loader2 className="size-5 animate-spin mr-2" /> Loading details...
          </div>
        ) : isError || !detail ? (
          <div className="py-16 text-center text-sm text-red-500">Failed to load details.</div>
        ) : (
          <div className="space-y-6 mt-4">
            
            {/* Header / Main Info */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">{detail.place_name}</h3>
                  <Badge className={PLACE_TYPE_BADGE[detail.place_type] || 'bg-gray-100 text-gray-800'} variant="outline">
                    {detail.place_type?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-start text-sm text-muted-foreground gap-1.5 mt-2">
                  <MapPin className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{detail.address} ({detail.visited_place})</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={STATUS_BADGE[detail.permission_status] || 'bg-gray-100 text-gray-800'} variant="secondary">
                  {detail.permission_status?.replace('_', ' ').toUpperCase()}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="size-3" /> Visit: {fmtDate(detail.visit_date)}
                </div>
                {detail.next_visit_date && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                     <Calendar className="size-3" /> Next Visit: {fmtDate(detail.next_visit_date)}
                  </div>
                )}
              </div>
            </div>

            {/* Contacts */}
            <div>
              <h4 className="text-sm font-semibold mb-3 border-l-2 border-primary pl-2">Contact Persons</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-sm p-3 bg-slate-50 rounded-md border">
                  <span className="text-xs text-muted-foreground block mb-1">Primary Contact</span>
                  <div className="font-medium flex items-center gap-1.5"><User className="size-3.5"/> {detail.contact_person ?? 'N/A'}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mt-1"><Phone className="size-3.5"/> {detail.mobile_no ?? 'N/A'}</div>
                </div>
                
                {detail.secretary_name || detail.secretary_mobile ? (
                  <div className="text-sm p-3 bg-slate-50 rounded-md border">
                    <span className="text-xs text-muted-foreground block mb-1">Secretary</span>
                    <div className="font-medium flex items-center gap-1.5"><User className="size-3.5"/> {detail.secretary_name ?? 'N/A'}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1"><Phone className="size-3.5"/> {detail.secretary_mobile ?? 'N/A'}</div>
                  </div>
                ) : null}

                {detail.principal_name || detail.principal_mobile ? (
                  <div className="text-sm p-3 bg-slate-50 rounded-md border">
                    <span className="text-xs text-muted-foreground block mb-1">Principal</span>
                    <div className="font-medium flex items-center gap-1.5"><User className="size-3.5"/> {detail.principal_name ?? 'N/A'}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1"><Phone className="size-3.5"/> {detail.principal_mobile ?? 'N/A'}</div>
                  </div>
                ) : null}

                {detail.chairman_name || detail.chairman_mobile ? (
                  <div className="text-sm p-3 bg-slate-50 rounded-md border">
                    <span className="text-xs text-muted-foreground block mb-1">Chairman</span>
                    <div className="font-medium flex items-center gap-1.5"><User className="size-3.5"/> {detail.chairman_name ?? 'N/A'}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1"><Phone className="size-3.5"/> {detail.chairman_mobile ?? 'N/A'}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ME Info */}
            {detail.me && (
               <div>
                 <h4 className="text-sm font-semibold mb-3 border-l-2 border-primary pl-2">Marketing Executive</h4>
                 <div className="flex items-center gap-3 text-sm p-3 bg-slate-50 rounded-md border">
                   {detail.me.photo ? (
                     <img src={detail.me.photo} alt={detail.me.name} className="size-10 rounded-full object-cover border" />
                   ) : (
                     <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center border font-medium text-slate-500">
                       {detail.me.name?.charAt(0) ?? 'M'}
                     </div>
                   )}
                   <div>
                     <div className="font-medium">{detail.me.name}</div>
                     <div className="text-muted-foreground text-xs">{detail.me.mobile} | {detail.me.email}</div>
                   </div>
                 </div>
               </div>
            )}

            {/* Remark */}
            <div>
              <h4 className="text-sm font-semibold mb-3 border-l-2 border-primary pl-2">Remarks</h4>
              <div className="text-sm p-4 bg-yellow-50/50 rounded-md border border-yellow-200/50 text-slate-700 whitespace-pre-wrap leading-relaxed flex items-start gap-2">
                <MessageSquare className="size-4 shrink-0 text-yellow-600 mt-0.5" />
                {detail.remark || 'No remarks provided.'}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


export default function VisitingForms() {
  const [filters, setFilters] = useState({ page: 1, limit: 10, placeType: '', permissionStatus: '', from: '', to: '' });
  
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data: res, isLoading, isError } = useVisitingForms(activeFilters);

  const [selectedFormId, setSelectedFormId] = useState(null);

  const forms = res?.data || [];
  const totalItems = res?.total || 0;
  const totalPages = Math.ceil(totalItems / filters.limit);

  function setF(k, v) { 
    setFilters((f) => ({ ...f, [k]: v, page: k !== 'page' ? 1 : v })); 
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Visiting Forms</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Forms submitted by Marketing Executives</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end p-4 bg-slate-50 border rounded-lg">
        <Sel label="Place Type" value={filters.placeType} onChange={(v) => setF('placeType', v)}>
          <option value="">All Types</option>
          <option value="society">Society</option>
          <option value="school">School</option>
          <option value="organisation">Organisation</option>
        </Sel>
        <Sel label="Status" value={filters.permissionStatus} onChange={(v) => setF('permissionStatus', v)}>
          <option value="">All Statuses</option>
          <option value="granted">Granted</option>
          <option value="denied">Denied</option>
          <option value="follow_up">Follow Up</option>
        </Sel>
        <div>
          <label className="text-xs font-medium block mb-0.5">From Date</label>
          <Input type="date" className="h-8 text-sm w-36" value={filters.from} onChange={(e) => setF('from', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-0.5">To Date</label>
          <Input type="date" className="h-8 text-sm w-36" value={filters.to} onChange={(e) => setF('to', e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground border rounded-lg">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading forms...
        </div>
      ) : isError ? (
        <div className="py-20 text-center text-sm text-red-500 border rounded-lg">Failed to load forms.</div>
      ) : forms.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground border rounded-lg">No visiting forms found.</div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Place Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Marketing Executive</TableHead>
                <TableHead>Visit Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="text-muted-foreground">#{form.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{form.place_name}</div>
                    <div className="text-xs border-l-2 border-slate-300 pl-1.5 mt-0.5 text-muted-foreground truncate max-w-[200px]" title={form.visited_place}>
                      {form.visited_place}
                    </div>
                  </TableCell>
                  <TableCell>
                     <Badge className={PLACE_TYPE_BADGE[form.place_type] || 'bg-gray-100 text-gray-800'} variant="outline" size="sm">
                       {form.place_type}
                     </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{form.me?.name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{form.me?.mobile}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(form.visit_date)}</TableCell>
                  <TableCell>
                     <Badge className={STATUS_BADGE[form.permission_status] || 'bg-gray-100 text-gray-800'} variant="secondary">
                      {form.permission_status?.replace('_', ' ')}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedFormId(form.id)} className="h-8 w-8 hover:bg-slate-100 text-primary">
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-between px-4 py-3 border-t">
             <div className="text-sm text-muted-foreground">
               Showing {forms.length} of {totalItems} items
             </div>
             <div className="flex items-center gap-2">
               <Button 
                variant="outline" 
                size="sm" 
                disabled={filters.page <= 1}
                onClick={() => setF('page', filters.page - 1)}
               >
                 <ChevronLeft className="size-4 mr-1" /> Prev
               </Button>
               <div className="text-sm font-medium px-2">
                 Page {filters.page} of {totalPages || 1}
               </div>
               <Button 
                variant="outline" 
                size="sm" 
                disabled={filters.page >= totalPages}
                onClick={() => setF('page', filters.page + 1)}
               >
                 Next <ChevronRight className="size-4 ml-1" />
               </Button>
             </div>
          </div>
        </div>
      )}

      {selectedFormId && (
        <FormDetailModal formId={selectedFormId} onClose={() => setSelectedFormId(null)} />
      )}
    </div>
  );
}
