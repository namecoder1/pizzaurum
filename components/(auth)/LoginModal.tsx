import { useSupabase } from "@/contexts/supabase-context";
import { printLog } from "@/lib/utils";
import { AntDesign } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../../contexts/auth-context";
import { createClientSupabase } from "../../lib/supabase";
import Button from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import ToastNotification from "../ui/notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

// Desktop Login Component using Dialog
function DesktopLogin({
  visible,
  onClose,
  tab,
  handleTabChange,
}: {
  visible: boolean;
  onClose: () => void;
  tab: string;
  handleTabChange: (value: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info'
  });
  const supabaseClient = useSupabase()
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({
      visible: true,
      message,
      type
    });
    
    // Fallback per web - mostra anche Alert.alert
    if (typeof window !== 'undefined') {
      Alert.alert(type === 'error' ? 'Errore' : 'Info', message);
    }
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showNotification("Inserisci email e password", "error");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = "Errore di login";
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Email o password non corretti. Riprova.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Email non confermata. Controlla la tua casella email.";
      } else {
        errorMessage = error.message;
      }
      showNotification(errorMessage, "error");
    } else {
      setEmail("");
      setPassword("");

      onClose();
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      showNotification("Inserisci la tua email", "error");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await createClientSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        printLog(`❌ Errore reset password: ${error}`, true);
        showNotification(
          error.message || "Impossibile inviare l'email di reset",
          "error"
        );
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      printLog(`❌ Errore generico reset password: ${error}`, true);
      showNotification(
        "Impossibile inviare l'email di reset. Riprova più tardi.",
        "error"
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowRecoverPassword(false);
    setResetEmailSent(false);
    setEmail("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };



  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showNotification("Inserisci email, password e conferma password", "error");
      return;
    }

    if (password !== confirmPassword) {
      showNotification("Le password non corrispondono", "error");
      return;
    }

    if (password.length < 6) {
      showNotification("La password deve essere di almeno 6 caratteri", "error");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);

    if (error) {
      let errorMessage = "Errore di registrazione";
      if (error.message.includes("User already registered")) {
        errorMessage = "Un account con questa email esiste già. Prova ad accedere.";
      } else if (error.message.includes("Password should be at least")) {
        errorMessage = "La password deve essere di almeno 6 caratteri.";
      } else if (error.message.includes("Invalid email")) {
        errorMessage = "Email non valida. Inserisci un indirizzo email corretto.";
      } else {
        errorMessage = error.message;
      }
      showNotification(errorMessage, "error");
    } else {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      await sendWelcomeEmail()
      onClose();
    }
    setLoading(false);
  };

  const sendWelcomeEmail = async () => {
    try {
      setLoading(true)
      
      if (!supabaseClient) {
        printLog('Failed to initialize Supabase client', true);
        return;
      }
      
      // Verifica che l'utente sia autenticato
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (!user) {
        printLog('Devi essere autenticato!', true)
        return
      }

      // Estrai il nome dall'email (parte prima della @)
      const name = user.email?.split('@')[0] || 'Utente'
  
      // Chiama la nostra API route sicura
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/resend/welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          email
        })
      })
  
      if (response.ok) {
        printLog('🟡 Email di benvenuto inviata con successo!')
        showNotification('Email di benvenuto inviata!', 'success')
      } else {
        const error = await response.json()
        printLog(`❌ Errore nell\'invio email: ${error}`, true)
        showNotification('Errore nell\'invio dell\'email di benvenuto', 'error')
      }
    } catch (error) {
      printLog(`❌ Errore nell\'invio email: ${error}`, true)
      showNotification('Errore nell\'invio dell\'email di benvenuto', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        duration={5000}
      />
      <Dialog open={visible} onOpenChange={handleOpenChange}>
      {showRecoverPassword ? (
        <DialogContent className="min-w-[350px] sm:min-w-[400px] max-w-[500px]">
          <DialogHeader className="my-4">
            <DialogTitle className="text-left text-2xl font-bold text-gray-800">
              {resetEmailSent ? "Email inviata" : "Recupera password"}
            </DialogTitle>
          </DialogHeader>
          {resetEmailSent ? (
            <View className="space-y-4 py-4">
              <View className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <AntDesign name="check" size={32} color="#10B981" />
                </div>
                <Text className="text-lg font-medium text-gray-800">
                  Email inviata con successo!
                </Text>
                <Text className="text-sm text-gray-600">
                  Abbiamo inviato un link per reimpostare la password
                  all'indirizzo <Text className="font-medium">{email}</Text>
                </Text>
                <Text className="text-xs text-gray-500 mt-2">
                  Controlla la tua casella email e segui le istruzioni per
                  reimpostare la password.
                </Text>
              </View>
              <Button
                text="Torna al login"
                onPress={handleBackToLogin}
                variant="primary"
                className="w-full"
              />
            </View>
          ) : (
            <>
              <View className="space-y-4 py-4">
                <Text className="text-sm text-gray-600 mb-4">
                  Inserisci la tua email e ti invieremo un link per reimpostare
                  la password.
                </Text>
                <View className="space-y-2">
                  <Label
                    htmlFor="reset-email"
                    className="text-gray-700 font-medium"
                  >
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    placeholder="Inserisci la tua email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="focus:border-primary"
                  />
                </View>
              </View>
              <View className="flex flex-row gap-x-2">
                <Button
                  text="Torna indietro"
                  onPress={handleBackToLogin}
                  variant="outline"
                  className="flex-1"
                />
                <Button
                  text={resetLoading ? "Invio..." : "Invia email"}
                  onPress={handleResetPassword}
                  disabled={resetLoading || !email}
                  className="flex-1"
                />
              </View>
            </>
          )}
        </DialogContent>
      ) : (
        <DialogContent className="min-w-[350px] sm:min-w-[400px] max-w-[500px]">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="w-full flex flex-row justify-center items-center">
              <TabsTrigger className="w-1/2" value="login">
                <Text>Accedi</Text>
              </TabsTrigger>
              <TabsTrigger className="w-1/2" value="register">
                <Text>Registrati</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <DialogHeader className="my-4">
                <DialogTitle className="text-left text-2xl font-bold text-gray-800">
                  Accedi
                </DialogTitle>
                <DialogDescription className="text-left text-gray-600">
                  Inserisci le tue credenziali per accedere
                </DialogDescription>
              </DialogHeader>
              <View className="space-y-4 py-4">
                <View className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    placeholder="Inserisci la tua email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="focus:border-primary"
                  />
                </View>

                <View className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-700 font-medium"
                  >
                    Password
                  </Label>
                  <View className="relative">
                    <Input
                      id="password"
                      placeholder="Inserisci la tua password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="focus:border-primary pr-12"
                    />
                    <button
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1.5 p-1 hover:bg-gray-100/10 rounded cursor-pointer"
                      type="button"
                    >
                      <AntDesign
                        name={showPassword ? "eyeo" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </button>
                  </View>
                </View>
                <Button
                  text="Recupera password"
                  onPress={() => {
                    setShowRecoverPassword(!showRecoverPassword);
                  }}
                  variant="link"
                  className="text-xs text-gray-500 text-right w-fit ml-auto pb-2"
                  textColor="text-gray-500"
                />
              </View>
              <Button
                text={loading ? "Accesso..." : "Accedi"}
                onPress={handleLogin}
                disabled={loading}
                className="w-full"
              />
            </TabsContent>
            <TabsContent value="register">
              <DialogHeader className="my-4">
                <DialogTitle className="text-left text-2xl font-bold text-gray-800">
                  Registrati
                </DialogTitle>
                <DialogDescription className="text-left text-gray-600">
                  Crea un nuovo account
                </DialogDescription>
              </DialogHeader>
              <View className="space-y-4 py-4">
                <View className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    placeholder="Inserisci la tua email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="focus:border-primary"
                  />
                </View>

                <View className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-700 font-medium"
                  >
                    Password
                  </Label>
                  <View className="relative">
                    <Input
                      id="password"
                      placeholder="Inserisci la tua password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="focus:border-primary pr-12"
                    />
                    <button
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1.5 p-1 hover:bg-gray-100/10 rounded cursor-pointer"
                      type="button"
                    >
                      <AntDesign
                        name={showPassword ? "eyeo" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </button>
                  </View>
                </View>
                {password && password.length > 0 && (
                  <View className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-gray-700 font-medium"
                    >
                      Conferma password
                    </Label>
                    <View className="relative">
                      <Input
                        id="password"
                        placeholder="Conferma la tua password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!confirmPasswordVisible}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="focus:border-primary pr-12"
                      />
                      <button
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute right-3 top-1.5 p-1 hover:bg-gray-100/10 rounded cursor-pointer"
                        type="button"
                      >
                        <AntDesign
                          name={confirmPasswordVisible ? "eyeo" : "eye"}
                          size={20}
                          color="#6B7280"
                        />
                      </button>
                    </View>
                  </View>
                )}
              </View>
              <Button
                text={loading ? "Registrazione..." : "Registrati"}
                onPress={handleRegister}
                disabled={loading}
                className="w-full"
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      )}
    </Dialog>
    </>
  );
}

// Mobile Login Component using Modal with animations
function MobileLogin({
  visible,
  onClose,
  tab,
  handleTabChange,
}: {
  visible: boolean;
  onClose: () => void;
  tab: string;
  handleTabChange: (value: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const supabaseClient = useSupabase();

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);
  const modalTranslateY = useSharedValue(100);
  const modalOpacity = useSharedValue(0);

  // Animation configs
  const springConfig = {
    damping: 20,
    stiffness: 300,
  };

  const timingConfig = {
    duration: 300,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  };

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [
      { scale: modalScale.value },
      { translateY: modalTranslateY.value },
    ],
  }));

  // Animation functions
  const showModal = () => {
    backdropOpacity.value = withTiming(1, timingConfig);
    modalOpacity.value = withTiming(1, timingConfig);
    modalScale.value = withSpring(1, springConfig);
    modalTranslateY.value = withSpring(0, springConfig);
  };

  const hideModal = (callback?: () => void) => {
    backdropOpacity.value = withTiming(0, timingConfig);
    modalOpacity.value = withTiming(0, timingConfig);
    modalScale.value = withTiming(0.8, timingConfig);
    modalTranslateY.value = withTiming(100, timingConfig, () => {
      if (callback) {
        runOnJS(callback)();
      }
    });
  };

  React.useEffect(() => {
    if (visible) {
      showModal();
    } else {
      hideModal();
    }
  }, [visible]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Errore", "Inserisci email e password");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = "Errore di login";
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Email o password non corretti. Riprova.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Email non confermata. Controlla la tua casella email.";
      } else {
        errorMessage = error.message;
      }
      Alert.alert("Errore", errorMessage);
    } else {
      hideModal(() => {
        onClose();
        setEmail("");
        setPassword("");
      });
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Errore", "Inserisci la tua email");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await createClientSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        printLog(`❌ Errore reset password: ${error}`, true);
        Alert.alert(
          "Errore",
          error.message || "Impossibile inviare l'email di reset"
        );
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      printLog(`❌ Errore generico reset password: ${error}`, true);
      Alert.alert(
        "Errore",
        "Impossibile inviare l'email di reset. Riprova più tardi."
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowRecoverPassword(false);
    setResetEmailSent(false);
    setEmail("");
  };

  const handleClose = () => {
    hideModal(() => {
      setEmail("");
      setPassword("");
      setShowRecoverPassword(false);
      setResetEmailSent(false);
      onClose();
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  const sendWelcomeEmail = async () => {
    try {
      setLoading(true)
      
            if (!supabaseClient) {
              console.error('Failed to initialize Supabase client');
              return;
            }
            
            // Verifica che l'utente sia autenticato
            const { data: { user } } = await supabaseClient.auth.getUser()
            
            if (!user) {
              console.error('Devi essere autenticato!')
              return
            }

      // Estrai il nome dall'email (parte prima della @)
      const name = user.email?.split('@')[0] || 'Utente'
      
      // Chiama la nostra API route sicura
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          email
        })
      })
  
      if (response.ok) {
        printLog('Email di benvenuto inviata con successo!')
        Alert.alert('Successo', 'Email di benvenuto inviata!')
      } else {
        const error = await response.json()
        printLog(`❌ Errore nell\'invio email: ${error}`, true)
        Alert.alert('Errore', 'Errore nell\'invio dell\'email di benvenuto')
      }
    } catch (error) {
      printLog(`❌ Errore nell\'invio email: ${error}`, true)
      Alert.alert('Errore', 'Errore nell\'invio dell\'email di benvenuto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View className="flex-1">
        <Animated.View style={[backdropStyle]} className="absolute inset-0">
          <Pressable className="flex-1 bg-black/80" onPress={handleClose} />
        </Animated.View>

        <View className="flex-1 justify-center items-center px-6">
          <Animated.View
            style={[modalStyle]}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg"
          >
            {showRecoverPassword ? (
              <>
                <Text className="text-2xl font-bold text-center mb-2 text-gray-800">
                  {resetEmailSent ? "Email inviata" : "Recupera password"}
                </Text>
                {resetEmailSent ? (
                  <View className="space-y-4">
                    <View className="text-center space-y-3">
                      <View className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <AntDesign name="check" size={32} color="#10B981" />
                      </View>
                      <Text className="text-lg font-medium text-gray-800">
                        Email inviata con successo!
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Abbiamo inviato un link per reimpostare la password
                        all'indirizzo{" "}
                        <Text className="font-medium">{email}</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mt-2">
                        Controlla la tua casella email e segui le istruzioni per
                        reimpostare la password.
                      </Text>
                    </View>
                    <TouchableOpacity
                      className="w-full bg-primary py-3 rounded-xl"
                      onPress={handleBackToLogin}
                      activeOpacity={0.8}
                    >
                      <Text className="text-center text-white font-semibold">
                        Torna al login
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text className="text-center text-gray-600 mb-6">
                      Inserisci la tua email e ti invieremo un link per
                      reimpostare la password.
                    </Text>
                    <View className="mb-6">
                      <Text className="text-gray-700 mb-2 font-medium">
                        Email
                      </Text>
                      <Input
                        placeholder="Inserisci la tua email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="bg-gray-50"
                      />
                    </View>
                    <View className="flex-row gap-x-3">
                      <TouchableOpacity
                        className="flex-1 bg-gray-200 py-3 rounded-xl"
                        onPress={handleBackToLogin}
                        disabled={resetLoading}
                        activeOpacity={0.7}
                      >
                        <Text className="text-center text-gray-700 font-semibold">
                          Annulla
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl shadow-sm ${
                          resetLoading ? "bg-gray-400" : "bg-primary"
                        }`}
                        onPress={handleResetPassword}
                        disabled={resetLoading || !email}
                        activeOpacity={0.8}
                      >
                        <Text className="text-center text-white font-semibold">
                          {resetLoading ? "Invio..." : "Invia email"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                <Tabs value={tab} onValueChange={handleTabChange}>
                  <TabsList className="w-full flex flex-row justify-center items-center mb-4">
                    <TabsTrigger className="w-1/2" value="login">
                      <Text>Accedi</Text>
                    </TabsTrigger>
                    <TabsTrigger className="w-1/2" value="register">
                      <Text>Registrati</Text>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <Text className="text-2xl font-bold text-left mb-2 text-gray-800">
                      Accedi
                    </Text>
                    <Text className="text-left text-gray-600 mb-6">
                      Inserisci le tue credenziali per accedere
                    </Text>
                    <View className="mb-4">
                      <Text className="text-gray-700 mb-2 font-medium">
                        Email
                      </Text>
                      <Input
                        placeholder="Inserisci la tua email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="bg-gray-50"
                      />
                    </View>

                    <View className="mb-6">
                      <Text className="text-gray-700 mb-2 font-medium">
                        Password
                      </Text>
                      <View className="relative">
                        <Input
                          placeholder="Inserisci la tua password"
                          value={password}
                          autoComplete="password"
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="bg-gray-50 pr-12"
                        />
                        <TouchableOpacity
                          onPress={togglePasswordVisibility}
                          className="absolute right-4 top-3"
                          activeOpacity={0.7}
                        >
                          <AntDesign
                            name={showPassword ? "eyeo" : "eye"}
                            size={20}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowRecoverPassword(true)}
                        className="text-xs text-gray-500 text-right mt-2"
                        activeOpacity={0.7}
                      >
                        <Text className="text-xs text-gray-500">
                          Recupera password
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row gap-x-3">
                      <TouchableOpacity
                        className="flex-1 bg-gray-200 py-3 rounded-xl"
                        onPress={handleClose}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Text className="text-center text-gray-700 font-semibold">
                          Annulla
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl shadow-sm ${
                          loading ? "bg-primary" : "bg-primary"
                        }`}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        <Text className="text-center text-white font-semibold">
                          {loading ? "Accesso..." : "Accedi"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TabsContent>
                  <TabsContent value="register">
                    <Text className="text-2xl font-bold text-left mb-2 text-gray-800">
                      Registrati
                    </Text>
                    <Text className="text-left text-gray-600 mb-6">
                      Inserisci i tuoi dati per creare un account
                    </Text>
                    <View className="mb-4">
                      <Text className="text-gray-700 mb-2 font-medium">
                        Email
                      </Text>
                      <Input
                        placeholder="Inserisci la tua email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        className="bg-gray-50"
                      />
                    </View>

                    <View className="mb-6">
                      <Text className="text-gray-700 mb-2 font-medium">
                        Password
                      </Text>
                      <View className="relative">
                        <Input
                          placeholder="Inserisci la tua password"
                          value={password}
                          autoComplete="password"
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="bg-gray-50 pr-12"
                        />
                        <TouchableOpacity
                          onPress={togglePasswordVisibility}
                          className="absolute right-4 top-3"
                          activeOpacity={0.7}
                        >
                          <AntDesign
                            name={showPassword ? "eyeo" : "eye"}
                            size={20}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowRecoverPassword(true)}
                        className="text-xs text-gray-500 text-right mt-2"
                        activeOpacity={0.7}
                      >
                        <Text className="text-xs text-gray-500">
                          Recupera password
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {password.length > 0 && (
                      <View className="mb-6">
                        <Text className="text-gray-700 mb-2 font-medium">
                          Conferma password
                        </Text>
                        <View className="relative">
                          <Input
                            placeholder="Conferma la tua password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!confirmPasswordVisible}
                            autoCapitalize="none"
                            autoComplete="password"
                            autoCorrect={false}
                            className="bg-gray-50 pr-12"
                          />
                          <TouchableOpacity
                            onPress={toggleConfirmPasswordVisibility}
                            className="absolute right-4 top-3"
                            activeOpacity={0.7}
                          >
                            <AntDesign
                              name={confirmPasswordVisible ? "eyeo" : "eye"}
                              size={20}
                              color="#6B7280"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <View className="flex-row gap-x-3">
                      <TouchableOpacity
                        className="flex-1 bg-gray-200 py-3 rounded-xl"
                        onPress={handleClose}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Text className="text-center text-gray-700 font-semibold">
                          Annulla
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl shadow-sm ${
                          loading ? "bg-gray-400" : "bg-primary"
                        }`}
                        onPress={async () => {
                          if (!email || !password || !confirmPassword) {
                            Alert.alert("Errore", "Inserisci email, password e conferma password");
                            return;
                          }
                          
                          if (password !== confirmPassword) {
                            Alert.alert("Errore", "Le password non corrispondono");
                            return;
                          }

                          if (password.length < 6) {
                            Alert.alert("Errore", "La password deve essere di almeno 6 caratteri");
                            return;
                          }

                          setLoading(true);
                          const { error } = await signUp(email, password);
                          
                          if (error) {
                            let errorMessage = "Errore di registrazione";
                            if (error.message.includes("User already registered")) {
                              errorMessage = "Un account con questa email esiste già. Prova ad accedere.";
                            } else if (error.message.includes("Password should be at least")) {
                              errorMessage = "La password deve essere di almeno 6 caratteri.";
                            } else if (error.message.includes("Invalid email")) {
                              errorMessage = "Email non valida. Inserisci un indirizzo email corretto.";
                            } else {
                              errorMessage = error.message;
                            }
                            Alert.alert("Errore", errorMessage);
                          } else {
                            // Invia email di benvenuto
                            await sendWelcomeEmail();
                            
                            hideModal(() => {
                              onClose();
                              setEmail("");
                              setPassword("");
                              setConfirmPassword("");
                            });
                          }
                          setLoading(false);
                        }}
                        disabled={loading || password !== confirmPassword}
                        activeOpacity={0.8}
                      >
                        <Text className="text-center text-white font-semibold">
                          {loading ? "Registrazione..." : "Registrati"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// Main LoginModal component that renders the appropriate UI
export default function LoginModal({
  visible,
  onClose,
  isMobile,
}: LoginModalProps) {
  const [tab, setTab] = useState("login");
  const handleTabChange = (value: string) => {
    setTab(value);
  };

  if (isMobile) {
    return (
      <MobileLogin
        visible={visible}
        onClose={onClose}
        tab={tab}
        handleTabChange={handleTabChange}
      />
    );
  }

  return (
    <DesktopLogin
      visible={visible}
      onClose={onClose}
      tab={tab}
      handleTabChange={handleTabChange}
    />
  );
}
