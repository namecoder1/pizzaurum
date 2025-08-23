import CustomBottomSheet from '@/components/ui/bottom-sheet'
import { updateOrderReport } from '@/lib/orders-actions'
import { ReportType } from '@/types/types'
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Button from '../../ui/button'

const MobileReportForm = ({ open, setOpen, orderId }: { open: boolean, setOpen: (open: boolean) => void, orderId: string }) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const snapPoints = useMemo(() => ['35%', '65%'], [])
  
  const [formData, setFormData] = useState({
    category: [] as string[],
    details: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reportCategories = [
    { value: "fake_data", label: "Dati falsi" },
    { value: "spam_orders", label: "Spam di ordini" },
    { value: "suspicious_user", label: "Utente sospetto" },
    { value: "payment_fraud", label: "Frode di pagamento" },
    { value: "other", label: "Altro" },
  ]

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  )

  // Handle open/close state
  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.present()
    } else {
      bottomSheetRef.current?.dismiss()
    }
  }, [open])

  const handleClose = () => {
    setOpen(false)
    setFormData({ category: [] as string[], details: "" })
  }

  const handleSubmit = async () => {
    if (!formData.category.length || !formData.details.trim()) {
      Alert.alert('Errore', 'Per favore compila tutti i campi')
      return
    }

    setIsSubmitting(true)
    try {
      const report: ReportType = {
        category: formData.category.join(","),
        details: formData.details.trim(),
        created_at: new Date().toISOString(),
      }

      await updateOrderReport(orderId, report)
      handleClose()
      Alert.alert('Successo', 'Report inviato con successo')
    } catch (error) {
      console.error('Error submitting report:', error)
      Alert.alert('Errore', 'Errore nell\'invio del report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCategory = (categoryValue: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(categoryValue)
        ? prev.category.filter(c => c !== categoryValue)
        : [...prev.category, categoryValue]
    }))
  }

  return (
    <CustomBottomSheet
      bottomSheetRef={bottomSheetRef}
      snapPoints={snapPoints}
      renderBackdrop={renderBackdrop}
      index={1}
      onDismiss={handleClose}
    >
      <View className="flex-1 px-6 py-4">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold">Segnala un problema</Text>
          </View>

          <Text className="text-gray-600 mb-6">
            Seleziona la categoria del problema e descrivi il problema in dettaglio.
          </Text>

          {/* Categories */}
          <View className="mb-6">
            <Text className="font-medium mb-3">Categoria</Text>
            <View className="space-y-2 flex flex-row flex-wrap gap-2">
              {reportCategories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  onPress={() => toggleCategory(category.value)}
                  className={`p-4 rounded-lg border-2 ${
                    formData.category.includes(category.value)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      formData.category.includes(category.value)
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    }`}>
                      {formData.category.includes(category.value) && (
                        <View className="w-2 h-2 rounded-full bg-white"></View>
                      )}
                    </View>
                    <Text className={`font-medium ${
                      formData.category.includes(category.value)
                        ? 'text-primary'
                        : 'text-gray-700'
                    }`}>
                      {category.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Details */}
          <View className="mb-6">
            <Text className="font-medium mb-3">Dettagli</Text>
            <TextInput
              placeholder="Descrivi il problema in dettaglio..."
              value={formData.details}
              onChangeText={(text) => setFormData(prev => ({ ...prev, details: text }))}
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-lg p-3 min-h-[100px] text-gray-700"
              textAlignVertical="top"
            />
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3 mb-6">
            <Button
              text="Annulla"
              onPress={handleClose}
              variant="outline"
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button
              text={isSubmitting ? "Invio..." : "Invia Report"}
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            />
          </View>
        </ScrollView>
      </View>
    </CustomBottomSheet>
  )
}

export default MobileReportForm