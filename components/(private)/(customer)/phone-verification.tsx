"use client";

import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { printLog } from "@/lib/utils";
import { Phone, Shield } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

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
      onVerified(phoneNumber);

      // Close modal after success
      setTimeout(() => {
        handleClose();
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
    const value = text.replace(/\D/g, "");
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

  // Return null if not open
  if (!isOpen) {
    return null;
  }

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
                <Phone size={16} />
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
            <Button
              text={
                isLoading
                  ? "Invio in corso..."
                  : initialPhone
                    ? "Conferma e invia codice"
                    : "Invia codice di verifica"
              }
              onPress={handleSendOTP}
              disabled={isLoading || !phoneNumber}
            />
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
              <Button
                text="Reinvia codice"
                onPress={handleResendCode}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                text="Verifica codice"
                onPress={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1"
              />
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
          <Shield className="h-5 w-5" />
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
              <Phone size={16} />
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
          <Button
            text={
              isLoading
                ? "Invio in corso..."
                : initialPhone
                  ? "Conferma e invia codice"
                  : "Invia codice di verifica"
            }
            onPress={handleSendOTP}
            disabled={isLoading || !phoneNumber}
          />
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
          <View className="flex flex-row gap-2">
            <Button
              text="Reinvia codice"
              onPress={handleResendCode}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              text="Verifica codice"
              onPress={handleVerifyCode}
              disabled={isLoading || verificationCode.length !== 6}
              className="flex-1"
            />
          </View>
        </>
      )}
    </View>
  );
};
