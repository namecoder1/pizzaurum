import Button from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/ui/password-input";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Text, View } from "react-native";
import { createClientSupabase } from "../../lib/supabase";
import WebLayout from "@/components/(public)/web-layout";

const ResetPassword = () => {
  const os = Platform.OS;
  const params = useLocalSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const extractTokenFromUrl = async () => {
      try {
        // Get the current URL
        const url = await Linking.getInitialURL();

        if (url) {
          // Extract hash fragment
          const hashIndex = url.indexOf("#");
          if (hashIndex !== -1) {
            const hash = url.substring(hashIndex + 1);
            const searchParams = new URLSearchParams(hash);

            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");
            const type = searchParams.get("type");
            const expiresAt = searchParams.get("expires_at");

            if (accessToken && type === "recovery") {
              setToken(accessToken);
              if (refreshToken) {
                setRefreshToken(refreshToken);
              }

              // Extract email from JWT token
              try {
                const payload = JSON.parse(atob(accessToken.split(".")[1]));
                setEmail(payload.email || "");
              } catch (error) {
                console.error("Error parsing token:", error);
              }
            }
          }
        }

        // Also try to get from searchParams as fallback
        const accessToken = params?.access_token as string;
        const type = params?.type as string;

        if (accessToken && type === "recovery" && !token) {
          setToken(accessToken);
          const refreshTokenParam = params?.refresh_token as string;
          if (refreshTokenParam) {
            setRefreshToken(refreshTokenParam);
          }
          try {
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            setEmail(payload.email || "");
          } catch (error) {
            console.error("Error parsing token from params:", error);
          }
        }
      } catch (error) {
        console.error("Error extracting token:", error);
      }
    };

    extractTokenFromUrl();
  }, [params, token]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleResetPassword = async () => {
    if (!token || !refreshToken) {
      Alert.alert(
        "Error",
        "Token di reset non valido. Richiedi un nuovo link."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Errore", "Le password non coincidono");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Errore", "La password deve essere di almeno 8 caratteri");
      return;
    }

    // Additional password validation
    if (password.length > 128) {
      Alert.alert("Errore", "La password non può superare i 128 caratteri");
      return;
    }

    // Check for common weak passwords
    const weakPasswords = [
      "password",
      "123456",
      "qwerty",
      "admin",
      "user",
      "test",
    ];
    if (weakPasswords.includes(password.toLowerCase())) {
      Alert.alert(
        "Errore",
        "La password scelta è troppo comune. Scegli una password più sicura."
      );
      return;
    }

    setLoading(true);

    try {
      // Use the recovery token directly to update the password

      // For password reset with recovery token, we need to set the session first
      if (refreshToken) {
        const { data, error: sessionError } = await createClientSupabase().auth.setSession({
          access_token: token,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Session error:", sessionError);
          Alert.alert(
            "Errore",
            "Link di reset non valido o scaduto. Richiedi un nuovo link."
          );
          return;
        }

      }

      // Now update the password
      const { error } = await createClientSupabase().auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Password update error:", error);

        // Handle specific error for same password
        if (
          error.message.includes("should be different from the old password")
        ) {
          Alert.alert(
            "Errore",
            "La nuova password deve essere diversa dalla password attuale. Scegli una password diversa."
          );
        } else {
          Alert.alert("Errore", `Errore durante il reset: ${error.message}`);
        }
      } else {

        // Sign out first
        await createClientSupabase().auth.signOut();

        // Show success message and redirect
        Alert.alert(
          "Successo",
          "Password reimpostata con successo! Verrai reindirizzato alla home.",
          [
            {
              text: "OK",
              onPress: () => {
                // Force redirect to home page
                try {
                  router.replace("/(public)");
                } catch (redirectError) {
                  console.error("Redirect error:", redirectError);
                  // Fallback: try to navigate to index
                  router.replace("/");
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Reset password error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      Alert.alert("Errore", "Si è verificato un errore inaspettato. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  if (os === "web") {
    if (!token || !refreshToken) {
      return (
        <WebLayout title="Link non valido" description="Link non valido" className="min-h-screen flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <Text className="text-2xl font-bold text-center">Link non valido</Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              Questo link per reimpostare la password non è valido o è scaduto.
            </Text>
          </div>
        </WebLayout>
      )
    }
  }

  if (!token || !refreshToken) {
    return (
      <WebLayout title="Link non valido" description="Link non valido">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-2xl font-bold text-center">Link non valido</Text>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            Questo link per reimpostare la password non è valido o è scaduto.
          </Text>

          <Button
            text="Torna alla home"
            onPress={() => router.replace("/(public)")}
            className="mt-4"
          />
        </View>
      </WebLayout>
    );
  }

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold text-center">Reset Password</Text>
      <Text className="text-sm text-gray-500 text-center mt-2">
        Inserisci la tua nuova password
      </Text>
      <Text className="text-xs text-gray-400 text-center mt-1 mb-4">
        La nuova password deve essere diversa dalla password attuale
      </Text>

      <View className="w-full max-w-md mt-6">
        <div className="flex my-4 flex-col items-start gap-y-1 justify-between">
          <Text className="text-sm font-semibold text-gray-500">Email</Text>
          <Text className="text-sm text-gray-500">{email}</Text>
        </div>

        <div className="space-y-1 mb-4">
          <Label className="text-sm font-semibold text-gray-500">
            Nuova Password
          </Label>
          <PasswordInput
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            togglePasswordVisibility={togglePasswordVisibility}
            placeholder="Inserisci nuova password"
            id="password"
          />
          <Text className="text-xs text-gray-400 mt-1">
            Suggerimento: usa almeno 8 caratteri con lettere, numeri e simboli
          </Text>
        </div>

        <div className="space-y-1 mb-4">
          <Label className="text-sm font-semibold text-gray-500">
            Conferma Password
          </Label>
          <PasswordInput
            password={confirmPassword}
            setPassword={setConfirmPassword}
            showPassword={showConfirmPassword}
            togglePasswordVisibility={toggleConfirmPasswordVisibility}
            placeholder="Conferma nuova password"
            id="confirmPassword"
          />
        </div>

        <Button
          text={loading ? "Reimpostazione..." : "Reimposta Password"}
          onPress={handleResetPassword}
          disabled={loading}
          className="w-full mt-4"
        />

        {loading && (
          <View className="flex-row items-center justify-center mt-4">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="text-sm text-gray-500 ml-2">
              Reimpostazione password in corso...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ResetPassword;
