import { useState } from 'react';
import { useLegalContent, useUpsertLegalContent } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

const DASHBOARD_TYPES = [
  { value: 'trainer', label: 'Trainer' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'marketing_executive', label: 'Marketing Executive' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'student', label: 'Student' },
];

const CONTENT_TYPES = [
  { value: 'terms_and_conditions', label: 'Terms & Conditions' },
  { value: 'privacy_and_policy', label: 'Privacy Policy' },
];

function ContentEditor({ dashboardType, contentType }) {
  const { data, isLoading } = useLegalContent({ dashboard_type: dashboardType, content_type: contentType });
  const upsert = useUpsertLegalContent();

  const existing = data?.data?.[0] ?? null;
  const [text, setText] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !isLoading) {
    setText(existing?.content ?? '');
    setInitialized(true);
  }

  const handleSave = () => {
    upsert.mutate(
      { dashboard_type: dashboardType, content_type: contentType, content: text },
      {
        onSuccess: () => toast.success('Legal content saved.'),
        onError: () => toast.error('Failed to save.'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="min-h-[320px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Enter content here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending} size="sm">
          {upsert.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
          Save
        </Button>
      </div>
    </div>
  );
}

export default function LegalContent() {
  const [dashboardType, setDashboardType] = useState('student');
  const [contentType, setContentType] = useState('terms_and_conditions');

  const dashboardLabel = DASHBOARD_TYPES.find((d) => d.value === dashboardType)?.label ?? dashboardType;
  const contentLabel = CONTENT_TYPES.find((c) => c.value === contentType)?.label ?? contentType;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-xl font-semibold">Legal Content</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage Terms &amp; Conditions and Privacy Policy per dashboard type.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Dashboard Type</span>
          <select
            value={dashboardType}
            onChange={(e) => setDashboardType(e.target.value)}
            className="h-9 w-52 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {DASHBOARD_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Content Type</span>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="h-9 w-52 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CONTENT_TYPES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{contentLabel}</span>
          <Badge variant="outline">{dashboardLabel}</Badge>
        </div>
        <ContentEditor key={`${dashboardType}-${contentType}`} dashboardType={dashboardType} contentType={contentType} />
      </div>
    </div>
  );
}
