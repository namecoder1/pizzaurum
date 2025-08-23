import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { printLog } from '@/lib/utils'
import React, { useEffect, useState } from 'react'
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native'

interface AutocompleteInputProps {
    value: string
    onChange: (value: string) => void
    placeholder: string
    className?: string
    onAddressSelect?: (address: string, placeId: string) => void
}

interface PlaceResult {
    place_id: string
    description: string
    structured_formatting: {
        main_text: string
        secondary_text: string
    }
}

const AutocompleteInput = ({
    value,
    onChange,
    placeholder,
    className,
    onAddressSelect,
}: AutocompleteInputProps) => {
    const [predictions, setPredictions] = useState<PlaceResult[]>([])
    const [showPredictions, setShowPredictions] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [apiLoaded, setApiLoaded] = useState(false)

    useEffect(() => {
        // Load Google Maps API on all platforms
        loadGoogleMapsAPI()
    }, [])

    const loadGoogleMapsAPI = async () => {
        try {
            // Check if API key is available - use EXPO_PUBLIC_ prefix
            const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
            
            if (!apiKey) {
                printLog('Google Maps API key not found. Autocomplete will be disabled.', true)
                return
            }

            if (Platform.OS === 'web') {
                // Dynamic import to avoid SSR issues
                const { Loader } = await import('@googlemaps/js-api-loader')
                
                const loader = new Loader({
                    apiKey: apiKey,
                    version: 'weekly',
                    libraries: ['places']
                })

                await loader.load()
                
                // Initialize services - use the new Places API
                if (typeof window !== 'undefined' && window.google) {
                    printLog('Google Maps API loaded successfully')
                    setApiLoaded(true)
                }
            } else {
                // Su mobile, usa direttamente le fetch API - non serve caricare Google Maps
                printLog('Mobile: API ready for direct fetch calls')
                setApiLoaded(true)
            }
            
        } catch (error) {
            printLog(`❌ Error loading Google Maps API: ${error}`, true)
        }
    }

    const getPlacePredictions = async (input: string) => {
        if (!input.trim() || !apiLoaded) {
            setPredictions([])
            setShowPredictions(false)
            return
        }

        setIsLoading(true)

        try {
            const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
            
            if (!apiKey) {
                throw new Error('API key not found')
            }

            // Use the new Places API (New) - Autocomplete endpoint
            const url = `https://places.googleapis.com/v1/places:autocomplete`
            
            const requestBody = {
                input: input,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: 43.9098, // Pesaro coordinates
                            longitude: 12.9134
                        },
                        radius: 5000.0 // 25km radius - copre Pesaro e periferia
                    }
                },
                includedRegionCodes: ["IT"],
                languageCode: "it"
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                printLog(`❌ API Error Response: ${errorText}`, true)
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
            }

            const data = await response.json()

            if (data.suggestions && Array.isArray(data.suggestions)) {
                
                const formattedPredictions = data.suggestions
                    .filter((suggestion: any) => suggestion.placePrediction)
                    .map((suggestion: any) => {
                        const placePrediction = suggestion.placePrediction
                        const text = placePrediction.text?.text || 'Indirizzo sconosciuto'
                        const mainText = placePrediction.structuredFormat?.mainText?.text || text
                        const secondaryText = placePrediction.structuredFormat?.secondaryText?.text || ''
                        
                        return {
                            place_id: placePrediction.placeId,
                            description: text,
                            structured_formatting: {
                                main_text: mainText,
                                secondary_text: secondaryText
                            }
                        }
                    })
                
                setPredictions(formattedPredictions)
                setShowPredictions(formattedPredictions.length > 0)
            } else {
                setPredictions([])
                setShowPredictions(false)
            }

            setIsLoading(false)
        } catch (error) {
            printLog(`❌ Error getting predictions: ${error}`, true)
            setIsLoading(false)
            setPredictions([])
            setShowPredictions(false)
        }
    }

    const handleInputChange = (text: string) => {
        onChange(text)
        
        // Abilita autocomplete su tutte le piattaforme se l'API è caricata
        if (apiLoaded) {
            getPlacePredictions(text)
        }
    }

    const handlePredictionSelect = async (prediction: PlaceResult) => {
        const fullAddress = prediction.description
        
        // Aggiornamento immediato su tutte le piattaforme
        printLog(`🔍 Calling onChange with: ${fullAddress}`)
        onChange(fullAddress)
        
        if (onAddressSelect) {
            printLog(`🔍 Calling onAddressSelect with: ${fullAddress}`)
            onAddressSelect(fullAddress, prediction.place_id)
        }
        
        // Reset flag di selezione dopo un breve delay
        setTimeout(() => {
            setIsSelecting(false)
            printLog(`🔍 Selection flag reset`)
        }, 100)
        
        printLog(`✅ Selection completed: ${fullAddress}`)
    }

    const handleInputFocus = () => {
        if (predictions.length > 0 && apiLoaded) {
            setShowPredictions(true)
        }
    }

    const [isSelecting, setIsSelecting] = useState(false)
    
    const handleInputBlur = () => {
        // Non nascondere se stiamo selezionando
        if (isSelecting) {
            printLog('🔍 Blur ignorato - selezione in corso')
            return
        }
        
        // Delay hiding predictions to allow for touches on mobile
        setTimeout(() => {
            if (!isSelecting) {
                printLog('🔍 Nascondendo predictions dopo blur')
                setShowPredictions(false)
            }
        }, 800) // Aumentato delay per mobile
    }

    if (Platform.OS === 'web') {
        return (
            <div className="">
              <Input
                value={value}
                onChangeText={handleInputChange}
                placeholder={placeholder}
                className={className}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
                
              {showPredictions && predictions.length > 0 && (
                  <div className=" top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-xl z-[9999] max-h-60">
                    <ScrollView className="max-h-60">
                      {predictions.map((prediction, index) => (
                        <TouchableOpacity
                          key={prediction.place_id}
                          onPress={() => {
                            setIsSelecting(true)
                            handlePredictionSelect(prediction)
                          }}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer h-fit rounded-xl"
                        >
                          <h3 className="font-medium text-gray-900">
                            {prediction.structured_formatting.main_text}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {prediction.structured_formatting.secondary_text}
                          </p>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </div>
              )}
                
              {isLoading && (
                <div className=" top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] p-4">
                  <p className="text-gray-500 text-center">Caricamento...</p>
                </div>
              )}
            </div>
        )
    }

    // Mobile with autocomplete support
    return (
        <View style={{ position: 'relative' }}>
          <Textarea
            value={value}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            className={className}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />

          {showPredictions && predictions.length > 0 && (
            <View style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 10,
              zIndex: 9999,
              maxHeight: 250,
              marginTop: 8
            }}>
              <ScrollView 
                style={{ maxHeight: 250 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                {predictions.map((prediction, index) => (
                  <TouchableOpacity
                    key={prediction.place_id}
                    onPress={() => {
                      printLog(`🔍 Mobile: Touch on prediction: ${prediction.description}`)
                      
                      // Strategia migliorata per mobile:
                      // 1. Impedisci blur immediato
                      setIsSelecting(true)
                      
                      // 2. Chiudi dropdown immediatamente 
                      setShowPredictions(false)
                      setPredictions([])
                      
                      // 3. Effettua la selezione con piccolo delay
                      setTimeout(() => {
                        printLog('🔍 Mobile: Calling handlePredictionSelect')
                        handlePredictionSelect(prediction)
                      }, 50)
                    }}
                    style={{
                      padding: 16,
                      borderBottomWidth: index < predictions.length - 1 ? 1 : 0,
                      borderBottomColor: '#f3f4f6',
                      backgroundColor: 'white'
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ 
                      fontWeight: '600', 
                      color: '#111827',
                      fontSize: 16,
                      marginBottom: 4
                    }}>
                      {prediction.structured_formatting.main_text}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#6b7280'
                    }}>
                      {prediction.structured_formatting.secondary_text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
            
          {isLoading && (
            <View style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 9999,
              padding: 16,
              marginTop: 8
            }}>
              <Text style={{ 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: 14 
              }}>
                Caricamento...
              </Text>
            </View>
          )}
        </View>
    )
}

export default AutocompleteInput