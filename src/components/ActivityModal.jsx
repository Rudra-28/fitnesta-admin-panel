import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateActivity, useUpdateActivity } from '@/hooks/useAdmin';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ActivityModal({ type, record, onClose }) {
  const isEdit = type === 'edit';
  const create = useCreateActivity();
  const update = useUpdateActivity();
  const mutation = isEdit ? update : create;

  const [formData, setFormData] = useState({
    name: '',
    activity_category: 'sports',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (isEdit && record) {
      setFormData({
        name: record.name || '',
        activity_category: record.activity_category || 'sports',
        notes: record.notes || '',
      });
      if (record.image_url) {
        setPreview(record.image_url);
      }
    }
  }, [isEdit, record]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(isEdit ? record.image_url : null);
    // Reset file input
    const input = document.getElementById('activity-image-input');
    if (input) input.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const data = new FormData();
    data.append('name', formData.name.trim());
    data.append('activity_category', formData.activity_category);
    data.append('notes', formData.notes.trim());
    if (file) {
      data.append('image', file);
    }

    const mutationArgs = isEdit ? { id: record.id, formData: data } : data;

    mutation.mutate(mutationArgs, {
      onSuccess: () => {
        toast.success(`Activity ${isEdit ? 'updated' : 'created'} successfully`);
        onClose();
      },
      onError: (err) => {
        const code = err.response?.data?.error;
        const msg = err.response?.data?.message;
        
        switch (code) {
          case 'ACTIVITY_NAME_REQUIRED':
            toast.error('Name is required');
            break;
          case 'ACTIVITY_CATEGORY_REQUIRED':
            toast.error('Category is required');
            break;
          case 'ACTIVITY_NOT_FOUND':
            toast.error('Activity not found');
            break;
          default:
            toast.error(msg || `Failed to ${isEdit ? 'update' : 'create'} activity`);
        }
      },
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Activity' : 'Create Activity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Cricket, Boxing, Dance"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.activity_category}
              onChange={(e) => setFormData({ ...formData, activity_category: e.target.value })}
              required
            >
              <option value="sports">Sports</option>
              <option value="non_sports">Non-Sports</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input
              placeholder="Any additional info..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image (optional)</label>
            
            {preview && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted mb-2">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="activity-image-input"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="size-5 mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[10px] text-muted-foreground">JPG/PNG (max 2MB)</p>
                </div>
                <input
                  id="activity-image-input"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEdit ? 'Save Changes' : 'Create Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
