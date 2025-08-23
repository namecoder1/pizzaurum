import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Input } from "./ui/input";

interface PhoneInputProps {
  value?: string;
  onChangePhone?: (phone: string) => void;
  placeholder?: string;
  isVerified?: boolean;
}

export default function PhoneInputComponent({
  value = "",
  onChangePhone,
  placeholder = "Inserisci il tuo numero di telefono",
  isVerified = false,
}: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    if (value !== phoneNumber.replace(/\s/g, "")) {
      // Format the incoming value for display
      const formatted = formatPhoneNumber(value);
      setPhoneNumber(formatted);
    }
  }, [value]);

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters except +
    let cleaned = input.replace(/[^\d+]/g, "");

    // If no + at start, add +39 (Italian country code)
    if (!cleaned.startsWith("+")) {
      // If starts with 39, assume it's already Italian
      if (cleaned.startsWith("39")) {
        cleaned = "+" + cleaned;
      } else {
        // Otherwise add +39 prefix
        cleaned = "+39" + cleaned;
      }
    }

    // Extract country code and number
    const match = cleaned.match(/^\+(\d{2})(\d{0,10})/);
    if (!match) return cleaned;

    const [, countryCode, number] = match;

    // Format: +XX XXX XXX XXXX
    let formatted = `+${countryCode}`;
    if (number.length > 0) {
      formatted += ` ${number.substring(0, 3)}`;
      if (number.length > 3) {
        formatted += ` ${number.substring(3, 6)}`;
        if (number.length > 6) {
          formatted += ` ${number.substring(6, 10)}`;
        }
      }
    }

    return formatted;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);

    // Send clean number to parent (remove spaces but keep +)
    const cleanNumber = formatted.replace(/\s/g, "");
    onChangePhone?.(cleanNumber);
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+\d{2} \d{3} \d{3} \d{4}$/;
    return phoneRegex.test(phone);
  };

  if (Platform.OS === "web") {
    return (
      <div className="space-y-2">
        <Input
          placeholder={placeholder}
          value={phoneNumber}
          onChangeText={handlePhoneChange}
          inputMode="tel"
        />
        {phoneNumber && !validatePhoneNumber(phoneNumber) && !isVerified  && (
          <p className="text-xs text-red-600">
            Formato non valido. Usa: +39 123 456 7890
          </p>
        )}
      </div>
    );
  }

  // Native implementation
  return (
    <View style={{ width: "100%" }}>
      <Input
        placeholder={placeholder}
        value={phoneNumber}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
      />
      {phoneNumber && !validatePhoneNumber(phoneNumber) && !isVerified && (
        <Text style={{ fontSize: 12, color: "#dc2626", marginTop: 2, marginBottom: 2 }}>
          Formato non valido. Usa: +39 123 456 7890
        </Text>
      )}
    </View>
  );
}
