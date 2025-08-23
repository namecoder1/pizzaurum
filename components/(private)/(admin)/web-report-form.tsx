import Button from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateOrderReport } from '@/lib/orders-actions';
import { ReportType } from '@/types/types';
import React from 'react';

const WebReportForm = ({ open, setOpen, orderId }: { open: boolean, setOpen: (open: boolean) => void, orderId: string }) => {
  const [formData, setFormData] = React.useState({
    category: [] as string[],
    details: "",
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const reportCategories = [
    { value: "fake_data", label: "Dati falsi" },
    { value: "spam_orders", label: "Spam di ordini" },
    { value: "suspicious_user", label: "Utente sospetto" },
    { value: "payment_fraud", label: "Frode di pagamento" },
    { value: "other", label: "Altro" },
  ];

  const handleSubmit = async () => {
    if (!formData.category.length || !formData.details.trim()) {
      alert('Per favore compila tutti i campi');
      return;
    }

    setIsSubmitting(true);
    try {
      const report: ReportType = {
        category: formData.category.join(","),
        details: formData.details.trim(),
        created_at: new Date().toISOString(),
      };

      await updateOrderReport(orderId, report);
      setOpen(false);
      // Reset form
      setFormData({ category: [] as string[], details: "" });
      alert('Report inviato con successo');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Errore nell\'invio del report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ category: [] as string[], details: "" });
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent portalHost="report-dialog">
        <DialogHeader>
          <DialogTitle>Segnala un problema</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Seleziona la categoria del problema e descrivi il problema in dettaglio.
        </DialogDescription>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="category">Categoria</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportCategories.map((category) => (
                <div
                  key={category.value}
                  className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                    formData.category.includes(category.value)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-primary dark:hover:border-gray-600'
                  }`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      category: prev.category.includes(category.value)
                        ? prev.category.filter(c => c !== category.value)
                        : [...prev.category, category.value]
                    }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.category.includes(category.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.category.includes(category.value) && (
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        )}
                      </div>
                      <span className={`font-medium ${
                        formData.category.includes(category.value)
                          ? 'text-primary dark:text-primary'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {category.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="details">Dettagli</Label>
            <Textarea
              id="details"
              placeholder="Descrivi il problema in dettaglio..."
              value={formData.details}
              onChangeText={(text) => setFormData(prev => ({ ...prev, details: text }))}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            text="Annulla"
            onPress={handleClose}
            variant="outline"
            disabled={isSubmitting}
          />
          <Button
            text={isSubmitting ? "Invio..." : "Invia Report"}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WebReportForm