import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Link, ClipboardPaste, FileText } from 'lucide-react';
import AiBadge from '@/components/billing/AiBadge';

interface StepInputMethodProps {
  inputMethod: string;
  urlValue: string;
  pasteValue: string;
  onInputMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onPasteChange: (text: string) => void;
}

const options = [
  {
    key: 'pdf',
    icon: Upload,
    title: 'Upload PDF',
    description: 'Upload state billing manual PDF for automated rule extraction',
    aiBadge: true,
  },
  {
    key: 'url',
    icon: Link,
    title: 'Paste a link',
    description: 'Paste a URL to an online state billing manual or payer document',
    aiBadge: true,
  },
  {
    key: 'paste',
    icon: ClipboardPaste,
    title: 'Paste text',
    description: 'Copy and paste billing guidelines text directly',
    aiBadge: true,
  },
  {
    key: 'manual',
    icon: FileText,
    title: 'Manual Setup',
    description: 'Manually configure rules, rates, and codes from scratch',
    aiBadge: false,
  },
];

const StepInputMethod = ({ inputMethod, urlValue, pasteValue, onInputMethodChange, onUrlChange, onPasteChange }: StepInputMethodProps) => {
  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">Input Method</h2>
      <div className="grid grid-cols-2 gap-4">
        {options.map(opt => (
          <Card
            key={opt.key}
            className={`p-6 cursor-pointer transition-all ${inputMethod === opt.key ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
            onClick={() => onInputMethodChange(opt.key)}
          >
            <opt.icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold flex items-center gap-2">
              {opt.title}
              {opt.aiBadge && <AiBadge tooltip="AI extracts rules automatically" />}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
          </Card>
        ))}
      </div>

      {inputMethod === 'pdf' && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Drag and drop your billing manual PDF here, or click to browse</p>
          <Button variant="outline" className="mt-3" size="sm">Choose File</Button>
        </div>
      )}

      {inputMethod === 'url' && (
        <div className="space-y-2">
          <Input
            placeholder="https://state.gov/billing-manual-2026.pdf"
            value={urlValue}
            onChange={e => onUrlChange(e.target.value)}
          />
        </div>
      )}

      {inputMethod === 'paste' && (
        <div className="space-y-2">
          <Textarea
            placeholder="Paste your billing guidelines text here..."
            value={pasteValue}
            onChange={e => onPasteChange(e.target.value)}
            className="min-h-[200px]"
          />
        </div>
      )}
    </div>
  );
};

export default StepInputMethod;
