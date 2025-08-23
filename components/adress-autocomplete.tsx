import { allowedStreets } from "@/lib/data";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Input } from "./ui/input";

type AddressAutocompleteProps = {
  apiKey?: string; // Reso opzionale per retrocompatibilità
  onPlaceSelected?: (place: any) => void;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean, errorMessage?: string) => void;
  useOnlineValidation?: boolean; // Nuovo prop per abilitare validazione online
};

export default function AddressAutocomplete({
  apiKey, // Ignorato ma mantenuto per retrocompatibilità
  onPlaceSelected,
  defaultValue = "",
  value,
  onChange,
  onValidationChange,
  useOnlineValidation = false,
}: AddressAutocompleteProps) {
  const [internalAddress, setInternalAddress] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isWeb = Platform.OS === "web";

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalAddress;

  // Funzione per validare l'indirizzo di Pesaro (validazione base)
  const validatePesaroAddress = (
    address: string
  ): { isValid: boolean; errorMessage?: string } => {
    if (!address.trim()) {
      return { isValid: false, errorMessage: "L'indirizzo è obbligatorio" };
    }

    const addressLower = address.toLowerCase();
    const containsPesaro = addressLower.includes("pesaro");
    const containsPU = addressLower.includes("pu");
    const containsPostalCode = addressLower.includes("61121");

    // Controlla se contiene almeno uno dei criteri di Pesaro
    if (containsPesaro || containsPU || containsPostalCode) {
      return { isValid: true };
    }

    return {
      isValid: false,
      errorMessage:
        "L'indirizzo deve essere nella città di Pesaro (PU - 61121)",
    };
  };

  // Funzione per validare l'indirizzo usando Nominatim (OpenStreetMap)
  const validateAddressOnline = async (
    address: string
  ): Promise<{
    isValid: boolean;
    errorMessage?: string;
    suggestion?: string;
  }> => {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=it&limit=5&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error("Errore nella validazione online");
      }

      const results = await response.json();

      // Cerca risultati che contengono Pesaro
      const pesaroResults = results.filter((result: any) => {
        const address = result.address || {};
        return (
          address.city === "Pesaro" ||
          address.town === "Pesaro" ||
          address.municipality === "Pesaro" ||
          (address.postcode && address.postcode.startsWith("61121"))
        );
      });

      if (pesaroResults.length > 0) {
        const bestResult = pesaroResults[0];
        const suggestion = bestResult.display_name;
        return {
          isValid: true,
          suggestion: suggestion,
        };
      } else {
        return {
          isValid: false,
          errorMessage:
            "Indirizzo non trovato a Pesaro. Verifica che sia corretto.",
        };
      }
    } catch (error) {
      console.error("Errore validazione online:", error);
      // Fallback alla validazione locale in caso di errore
      return validatePesaroAddress(address);
    }
  };

  // Funzione per generare suggerimenti basati su input
  const generateSuggestions = (input: string): string[] => {
    if (input.length < 2) return [];

    const inputLower = input.toLowerCase();
    return allowedStreets
      .filter((street) => street.toLowerCase().includes(inputLower))
      .map((street) => `${street}, Pesaro PU 61121`)
      .slice(0, 5); // Massimo 5 suggerimenti
  };

  const handleInputChange = useCallback(
    (text: string) => {
      // Aggiorna il valore
      if (onChange) {
        onChange(text);
      } else {
        setInternalAddress(text);
      }

      // Genera suggerimenti
      const newSuggestions = generateSuggestions(text);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0 && text.length > 1);

      // Clear previous validation timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }

      // Validazione immediate per input vuoti
      if (!text.trim()) {
        setValidationError("L'indirizzo è obbligatorio");
        if (onValidationChange) {
          onValidationChange(false, "L'indirizzo è obbligatorio");
        }
        return;
      }

      // Validazione locale immediate
      const localValidation = validatePesaroAddress(text);

      if (useOnlineValidation && localValidation.isValid && text.length > 5) {
        // Debounce la validazione online
        setIsValidating(true);
        setValidationError("");

        validationTimeoutRef.current = setTimeout(async () => {
          const onlineValidation = await validateAddressOnline(text);
          setIsValidating(false);
          setValidationError(onlineValidation.errorMessage || "");

          if (onValidationChange) {
            onValidationChange(
              onlineValidation.isValid,
              onlineValidation.errorMessage
            );
          }

          // Se la validazione online trova un suggerimento migliore, lo propone
          if (
            onlineValidation.isValid &&
            onlineValidation.suggestion &&
            onlineValidation.suggestion !== text
          ) {
            setSuggestions((prev) =>
              [
                onlineValidation.suggestion!,
                ...prev.filter((s) => s !== onlineValidation.suggestion),
              ].slice(0, 5)
            );
            setShowSuggestions(true);
          }
        }, 1000); // Aspetta 1 secondo dopo che l'utente smette di digitare
      } else {
        // Solo validazione locale
        setValidationError(localValidation.errorMessage || "");
        if (onValidationChange) {
          onValidationChange(
            localValidation.isValid,
            localValidation.errorMessage
          );
        }
      }
    },
    [onChange, onValidationChange, useOnlineValidation]
  );

  const handleSuggestionSelect = (suggestion: string) => {
    if (onChange) {
      onChange(suggestion);
    } else {
      setInternalAddress(suggestion);
    }

    setShowSuggestions(false);
    setSuggestions([]);
    setValidationError("");
    setIsValidating(false);

    if (onValidationChange) {
      onValidationChange(true, undefined);
    }

    if (onPlaceSelected) {
      // Simula la struttura di un oggetto place per mantenere compatibilità
      onPlaceSelected({
        formatted_address: suggestion,
        name: suggestion.split(",")[0],
        address_components: [
          { long_name: "Pesaro", short_name: "Pesaro", types: ["locality"] },
          {
            long_name: "PU",
            short_name: "PU",
            types: ["administrative_area_level_2"],
          },
          { long_name: "61121", short_name: "61121", types: ["postal_code"] },
        ],
      });
    }
  };

  // Effetto per validazione iniziale
  useEffect(() => {
    if (currentValue) {
      const validation = validatePesaroAddress(currentValue);
      setValidationError(validation.errorMessage || "");
      if (onValidationChange) {
        onValidationChange(validation.isValid, validation.errorMessage);
      }
    }
  }, [currentValue, onValidationChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    };
  }, []);

  if (isWeb) {
    return (
      <div className="relative w-full z-50">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Inserisci il tuo indirizzo a Pesaro (es. Via Roma, Pesaro PU)"
            autoComplete="off"
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (currentValue.length > 1) {
                const newSuggestions = generateSuggestions(currentValue);
                setSuggestions(newSuggestions);
                setShowSuggestions(newSuggestions.length > 0);
              }
            }}
            onBlur={() => {
              // Ritarda la chiusura per permettere il click sui suggerimenti
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            className={`flex h-10 w-full rounded-md border px-3 py-2 text-base lg:text-sm placeholder:text-muted-foreground ring-offset-background file:border-0 file:bg-transparent file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              validationError
                ? "border-red-500 bg-red-50"
                : "border-input bg-background"
            }`}
          />

          {/* Indicatore di caricamento */}
          {isValidating && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
            </div>
          )}
        </div>

        {/* Suggerimenti dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-10 left-0 right-0 mt-1 max-h-60  rounded-md border border-gray-200 bg-white shadow-lg"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault(); // Previene il blur
                  handleSuggestionSelect(suggestion);
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Messaggi di errore */}
        {validationError && !isValidating && (
          <div className="mt-1 text-sm text-red-600">{validationError}</div>
        )}

        {/* Messaggio informativo */}
        <div className="mt-2 text-xs text-gray-500">
          Accettiamo solo indirizzi nella città di Pesaro (PU - 61121)
        </div>
      </div>
    );
  }

  // Mobile fallback
  return (
    <div>
      <Input
        placeholder="Inserisci il tuo indirizzo a Pesaro"
        value={currentValue}
        onChangeText={handleInputChange}
      />
      {isValidating && (
        <div className="mt-1 text-sm text-blue-600">
          Validazione indirizzo...
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500">
        Solo indirizzi nella città di Pesaro (PU - 61121)
        {useOnlineValidation && " • Validazione automatica attiva"}
      </div>
    </div>
  );
}
