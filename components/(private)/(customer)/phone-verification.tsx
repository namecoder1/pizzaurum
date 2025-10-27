"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { printLog } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Stili per i bottoni nativi
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonSecondaryText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});

interface PhoneVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phoneNumber: string) => void;
  initialPhone?: string;
  os: string;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  isOpen,
  onClose,
  onVerified,
  initialPhone = "",
  os,
}) => {
  // Early return if not open to prevent any rendering issues
  if (!isOpen) {
    return null;
  }

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Il numero di telefono deve essere valido");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/twilio/phone-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nell'invio del codice");
      }

      setSuccess("Codice di verifica inviato con successo!");
      setStep("code");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      printLog(`❌ Error sending OTP: ${error}`, true)
      setError(
        error instanceof Error ? error.message : "Errore nell'invio del codice"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Inserisci un codice di verifica valido (6 cifre)");
      return;
    }

    // Prevent multiple concurrent verification attempts
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/twilio/phone-verification`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Codice di verifica non valido");
      }

      setSuccess("Numero di telefono verificato con successo!");
      
      // Call onVerified first
      try {
        onVerified(phoneNumber);
      } catch (verificationError) {
        printLog(`❌ Error in onVerified callback: ${verificationError}`, true);
        // Don't throw here, continue with closing
      }

      // Close modal after success with a longer delay to ensure state updates complete
      setTimeout(() => {
        try {
          handleClose();
        } catch (closeError) {
          printLog(`❌ Error closing modal: ${closeError}`, true);
        }
      }, 2000);
    } catch (error) {
      printLog(`❌ Error verifying code: ${error}`, true)
      setError(
        error instanceof Error
          ? error.message
          : "Errore nella verifica del codice"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendOTP();
  };

  const resetForm = () => {
    setStep("phone");
    setVerificationCode("");
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    setPhoneNumber(initialPhone); // Reset to initial phone when closing
    onClose();
  };

  // Funzione universale per gestire input sia su web che native
  const handleInputChange = (e: any, setter: (val: string) => void) => {
    let text = "";
    if (e && e.nativeEvent && typeof e.nativeEvent.text === "string") {
      text = e.nativeEvent.text;
    } else if (e && e.target && typeof e.target.value === "string") {
      text = e.target.value;
    }
    // Solo numeri
    const value = text.replace(/\D/g, "").slice(0, 6); // Limit to 6 digits
    setter(value);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setVerificationCode("");
      setStep("phone");
      setError(null);
      setSuccess(null);
      if (initialPhone) {
        setPhoneNumber(initialPhone);
      }
    }
  }, [isOpen, initialPhone]);

  // This check is now at the beginning of the component

  if (os === "web") {
    return (
      <div className="space-y-4">

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {step === "phone" ? (
          <>
            <div className="space-y-2 mt-4">
              <div className="flex flex-row items-center gap-2">
                <Text>📱</Text>
                <Label htmlFor="phone" className="text-sm font-medium">
                  Numero di telefono
                </Label>
              </div>
              <Input
                id="phone"
                placeholder="Inserisci il tuo numero di telefono"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.nativeEvent.text)}
                className="my-2"
              />
            </div>
            <button
              onClick={handleSendOTP}
              disabled={isLoading || !phoneNumber}
              className={`w-full py-3 px-4 rounded-xl font-medium ${
                isLoading || !phoneNumber
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading
                ? "Invio in corso..."
                : initialPhone
                  ? "Conferma e invia codice"
                  : "Invia codice di verifica"}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-2 mt-4">
              <Input
                id="code"
                placeholder="Inserisci il codice a 6 cifre"
                value={verificationCode}
                onChange={(e) => handleInputChange(e, setVerificationCode)}
                maxLength={6}
              />
              <p className="text-xs mt-1 mb-3 text-muted-foreground">
                Codice inviato a: {phoneNumber}
              </p>
            </div>
            <div className="flex flex-row gap-2">
              <button
                onClick={handleResendCode}
                disabled={isLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-medium ${
                  isLoading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Reinvia codice
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className={`flex-1 py-3 px-4 rounded-xl font-medium ${
                  isLoading || verificationCode.length !== 6
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Verifica codice
              </button>
            </div>
          </>
        )}
    </div>
    );
  }

  return (
      <View className="space-y-4">
      <View className="space-y-2">
        <View className="flex items-center gap-2">
          <Text>🛡️</Text>
          <Text className="text-lg font-semibold">
            Verifica numero di telefono
          </Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          {step === "phone"
            ? initialPhone
              ? "Conferma il numero di telefono e clicca 'Invia codice' per ricevere l'OTP"
              : "Inserisci il tuo numero di telefono per ricevere un codice di verifica"
            : `Inserisci il codice di verifica che hai ricevuto al numero ${phoneNumber}`}
        </Text>
      </View>

      {error && (
        <View className="p-3 bg-red-50 border border-red-200 rounded-md">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      )}

      {success && (
        <View className="p-3 bg-green-50 border border-green-200 rounded-md">
          <Text className="text-sm text-green-700">{success}</Text>
        </View>
      )}

      {step === "phone" ? (
        <>
          <View className="space-y-2 mt-4">
            <View className="flex flex-row items-center gap-2">
              <Text>📱</Text>
              <Label htmlFor="phone" className="text-sm font-medium">
                Numero di telefono
              </Label>
            </View>
            <Input
              id="phone"
              placeholder="Inserisci il tuo numero di telefono"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.nativeEvent.text)}
              className="my-2"
            />
          </View>
          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={isLoading || !phoneNumber}
            style={isLoading || !phoneNumber ? styles.buttonDisabled : styles.button}
          >
            <Text style={isLoading || !phoneNumber ? styles.buttonTextDisabled : styles.buttonText}>
              {isLoading
                ? "Invio in corso..."
                : initialPhone
                  ? "Conferma e invia codice"
                  : "Invia codice di verifica"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View className="space-y-2 mt-4">
            <Input
              id="code"
              placeholder="Inserisci il codice a 6 cifre"
              value={verificationCode}
              onChange={(e) => handleInputChange(e, setVerificationCode)}
              maxLength={6}
            />
            <Text className="text-xs mt-1 mb-3 text-muted-foreground">
              Codice inviato a: {phoneNumber}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={isLoading}
              style={[
                isLoading ? styles.buttonDisabled : styles.buttonSecondary,
                { flex: 1 }
              ]}
            >
              <Text style={isLoading ? styles.buttonTextDisabled : styles.buttonSecondaryText}>
                Reinvia codice
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleVerifyCode}
              disabled={isLoading || verificationCode.length !== 6}
              style={[
                isLoading || verificationCode.length !== 6 ? styles.buttonDisabled : styles.button,
                { flex: 1 }
              ]}
            >
              <Text style={isLoading || verificationCode.length !== 6 ? styles.buttonTextDisabled : styles.buttonText}>
                Verifica codice
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};
