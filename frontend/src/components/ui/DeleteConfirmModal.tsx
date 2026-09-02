import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Trash2, AlertOctagon } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  entityName: string;
  entityType: 'Member' | 'Beneficiary' | 'Fund Group' | 'Record' | string;
  itemIdentifier?: string;
  loading?: boolean;
  errorMessage?: string | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Permanently?',
  entityName,
  entityType,
  itemIdentifier,
  loading = false,
  errorMessage = null,
}) => {
  const [confirmed, setConfirmed] = useState(false);

  // Reset confirmation checkbox whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || loading) return;
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Permanent database-level deletion of ${entityType.toLowerCase()}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Warning Banner */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-2">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
            <AlertOctagon className="w-4 h-4 flex-shrink-0" />
            <span>Permanent Database Removal</span>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300/90 leading-relaxed">
            All data associated with this <b>{entityType.toLowerCase()}</b> ({entityName}{itemIdentifier ? ` - ${itemIdentifier}` : ''}), including its financial records, will be permanently removed.
          </p>
        </div>

        {/* Server Error Notice if Any Unexpected Failure Occurred */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs space-y-1 animate-fadeIn">
            <p className="text-rose-700 dark:text-rose-300 font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Checkbox Confirmation */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <label className="flex items-start space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              I understand this action cannot be undone.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="danger"
            isLoading={loading}
            disabled={!confirmed || loading}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Permanently
          </Button>
        </div>
      </form>
    </Modal>
  );
};
