import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import Button from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'warning'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonVariant: 'destructive' as const
        };
      case 'warning':
        return {
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonVariant: 'primary' as const
        };
      case 'info':
        return {
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          buttonVariant: 'primary' as const
        };
      default:
        return {
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonVariant: 'primary' as const
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${styles.bgColor} border ${styles.borderColor}`}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className={styles.iconColor} />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <DialogDescription className="text-gray-700">
          {message}
        </DialogDescription>
        
        <DialogFooter>
          <div className="flex gap-3 justify-end w-full">
            <Button
              text={cancelText}
              onPress={onClose}
              variant="outline"
              className="min-w-[100px]"
            />
            <Button
              text={confirmText}
              onPress={() => {
                onConfirm();
                onClose();
              }}
              variant={styles.buttonVariant}
              className="min-w-[100px]"
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog; 