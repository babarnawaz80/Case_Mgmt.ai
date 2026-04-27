import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, ArrowRight } from 'lucide-react';

interface ProposedWrite {
  id: string;
  module: string;
  field: string;
  beforeValue: string;
  afterValue: string;
}

interface ReviewApplyModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (selectedIds: string[]) => void;
  writes: ProposedWrite[];
  engineName: string;
  engineVersion: string;
  agentName: string;
  individualName: string;
}

const ReviewApplyModal = ({ open, onClose, onApply, writes, engineName, engineVersion, agentName, individualName }: ReviewApplyModalProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(writes.map(w => w.id)));
  const [confirmed, setConfirmed] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleApply = () => {
    onApply(Array.from(selected));
    setConfirmed(false);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setConfirmed(false); }}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Review & Apply Changes
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 flex-1 overflow-auto min-h-0 py-4">
          {/* Left: Proposed Writes */}
          <div className="border border-border rounded-lg p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-foreground mb-3">Proposed Writes</h3>
            <div className="space-y-2">
              {writes.map(w => (
                <label key={w.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={selected.has(w.id)}
                    onCheckedChange={() => toggle(w.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{w.module}</p>
                    <p className="text-xs text-muted-foreground">{w.field}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {/* Middle: Before/After Diff */}
          <div className="border border-border rounded-lg p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-foreground mb-3">Before / After</h3>
            <div className="space-y-3">
              {writes.filter(w => selected.has(w.id)).map(w => (
                <div key={w.id} className="text-xs space-y-1">
                  <p className="font-medium text-foreground">{w.field}</p>
                  <div className="flex items-center gap-2">
                    <span className="bg-destructive/10 text-destructive px-2 py-1 rounded font-mono text-[11px] line-through">{w.beforeValue}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="bg-billing-healthy/10 text-billing-healthy px-2 py-1 rounded font-mono text-[11px]">{w.afterValue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right: Audit Metadata */}
          <div className="border border-border rounded-lg p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-foreground mb-3">Audit Metadata</h3>
            <div className="space-y-2 text-xs">
              <div><span className="text-muted-foreground">Engine:</span> <span className="font-medium text-foreground">{engineName} v{engineVersion}</span></div>
              <div><span className="text-muted-foreground">Agent:</span> <span className="font-medium text-foreground">{agentName}</span></div>
              <div><span className="text-muted-foreground">Individual:</span> <span className="font-medium text-foreground">{individualName}</span></div>
              <div><span className="text-muted-foreground">User:</span> <span className="font-medium text-foreground">Current User</span></div>
              <div><span className="text-muted-foreground">Timestamp:</span> <span className="font-medium text-foreground">{new Date().toISOString()}</span></div>
              <Separator className="my-2" />
              <div><span className="text-muted-foreground">Changes selected:</span> <Badge variant="secondary">{selected.size} / {writes.length}</Badge></div>
            </div>
          </div>
        </div>
        <Separator />
        <DialogFooter className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer mr-auto">
            <Checkbox checked={confirmed} onCheckedChange={(c) => setConfirmed(!!c)} />
            <span className="text-sm text-foreground">I confirm these changes</span>
          </label>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!confirmed || selected.size === 0} onClick={handleApply}>
            Apply Selected ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewApplyModal;
