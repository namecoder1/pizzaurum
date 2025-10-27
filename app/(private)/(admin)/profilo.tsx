import MobileHeader from '@/components/(private)/(admin)/mobile-header'
import PrivateLayout from '@/components/(private)/private-layout'
import Button from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PasswordInput from '@/components/ui/password-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { useSupabase } from '@/contexts/supabase-context'
import { useUserProfile } from '@/hooks/useUserProfile'
import { printLog } from '@/lib/utils'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Alert, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const AdminProfile = () => {
  const os = Platform.OS
  const [tab, setTab] = React.useState('profile')
  const { session } = useAuth()
  const { profile } = useUserProfile()
  const supabaseClient = useSupabase()

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [adminName, setAdminName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)



  const sendAdminInviteEmail = async () => {
    try {
      setLoading(true)
      
      if (!supabaseClient) {
        printLog('Failed to initialize Supabase client', true);
        return;
      }
      
      // Verifica che l'utente sia autenticato
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (!user) {
        return
      }
  
      // Estrai il token di sessione
      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (!session?.access_token) {
        return
      }
  
      // Chiama l'API con il Bearer token
      const response = await fetch('https://email.pizzaurum.store/api/send/admin-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ firstName: 'Tobia', email: 'bartolomei.private@gmail.com', password: '123456' })
      })
  
      if (response.ok) {
      } else {
        const error = await response.json()
      }
    } catch (error) {
      printLog(`Errore: ${error}`, true)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (profile?.name) {
      setAdminName(profile.name)
    }
  }, [profile?.name])

  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Errore', 'Compila tutti i campi')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono')
      return
    }

    if (newPassword.length < 8) {
      Alert.alert('Errore', 'La password deve essere di almeno 8 caratteri')
      return
    }

    // Check for weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'user', 'test']
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      Alert.alert('Errore', 'La password scelta è troppo comune. Scegli una password più sicura.')
      return
    }

    setChangingPassword(true)
    
    try {
      // Utilizza l'endpoint API per il cambio password
      const response = await fetch(`${baseUrl}/api/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          currentPassword,
          newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setPasswordError(result.error || 'Errore durante il cambio password')
        setTimeout(() => setPasswordError(null), 5000)
        return
      }

      setPasswordChanged(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // Nascondi il messaggio dopo 5 secondi
      setTimeout(() => {
        setPasswordChanged(false)
      }, 5000)
    } catch (error) {
      printLog(`Password change error: ${error}`, true)
      Alert.alert('Errore', 'Si è verificato un errore inaspettato')
    } finally {
      setChangingPassword(false)
    }
  }


  const handleSaveProfile = async () => {
    if (!adminName.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto')
      return
    }

    setSavingProfile(true)

    try {
      if (!supabaseClient) {
        Alert.alert('Errore', 'Failed to initialize Supabase client');
        return;
      }
      
      const { error } = await supabaseClient
        .from('users')
        .update({ name: adminName.trim() })
        .eq('id', session?.user?.id || '')

      if (error) {
        Alert.alert('Errore', `Errore durante il salvataggio: ${error.message}`)
      } else {
        Alert.alert('Successo', 'Profilo aggiornato con successo')
      }
    } catch (error) {
      Alert.alert('Errore', 'Si è verificato un errore inaspettato')
    } finally {
      setSavingProfile(false)
    }
  }

  if (os === 'web') {
    return (
      <PrivateLayout title="Profilo | Pizzaurum" description="Profilo">
        <div className='max-w-7xl mx-auto px-4 py-8 w-full'>
          <div className='mb-8'>
            <h1 className="text-3xl font-bold text-gray-900">Profilo & Impostazioni</h1>
            <p className="text-gray-600 mt-2">Gestisci il tuo profilo e le tue impostazioni</p>
          </div>
          
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className='flex-row items-center'>
              <TabsTrigger value='profile' className='flex-1'><Text>Profilo</Text></TabsTrigger>
              <TabsTrigger value='security' className='flex-1'><Text>Sicurezza</Text></TabsTrigger>
            </TabsList>
            
            <TabsContent value='profile' className='mt-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Informazioni Personali</CardTitle>
                  <CardDescription>Modifica le tue informazioni personali</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                       value={session?.user?.email || ''} 
                       editable={false}
                       readOnly={true}
                       className="bg-gray-50"
                     />
                    <Text className="text-xs text-gray-500">L'email non può essere modificata</Text>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input 
                      value={adminName}
                      onChangeText={setAdminName}
                      placeholder="Il tuo nome"
                    />
                  </div>
                  
                  <Button 
                    text={savingProfile ? "Salvando..." : "Salva Modifiche"}
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                    className="w-fit"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value='security' className='mt-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Cambio Password</CardTitle>
                  <CardDescription>Cambia la tua password per mantenere l'account sicuro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passwordChanged && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">
                            Password cambiata con successo!
                          </h3>
                          <p className="text-sm text-green-700 mt-1">
                            La tua password è stata aggiornata correttamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Errore nel cambio password
                          </h3>
                          <p className="text-sm text-red-700 mt-1">
                            {passwordError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Password Attuale</Label>
                    <PasswordInput
                      id="currentPassword"
                      password={currentPassword}
                      setPassword={setCurrentPassword}
                      showPassword={showCurrentPassword}
                      togglePasswordVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
                      placeholder="Inserisci password attuale"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nuova Password</Label>
                    <PasswordInput
                      id="newPassword"
                      password={newPassword}
                      setPassword={setNewPassword}
                      showPassword={showNewPassword}
                      togglePasswordVisibility={() => setShowNewPassword(!showNewPassword)}
                      placeholder="Inserisci nuova password"
                    />
                    <Text className="text-xs text-gray-500">
                      La password deve essere di almeno 8 caratteri
                    </Text>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Conferma Nuova Password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      password={confirmPassword}
                      setPassword={setConfirmPassword}
                      showPassword={showConfirmPassword}
                      togglePasswordVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                      placeholder="Conferma nuova password"
                    />
                  </div>
                  
                  <Button 
                    text={changingPassword ? "Cambiando..." : "Cambia Password"}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    className="w-fit"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
          </Tabs>
        </div>
      </PrivateLayout>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader title="Profilo" icon={<Ionicons name="person-outline" size={20} color="white" />} />
      <ScrollView className="flex-1 p-4 bg-white" showsVerticalScrollIndicator={false}>
        <View className="flex flex-col gap-6 mb-20">
          
          {/* Profile Section */}
          <Card className="p-4">
            <Text className="text-lg font-semibold mb-4">Informazioni Personali</Text>
            
            <View className="space-y-4">
              <View className="space-y-2">
                <Text className="text-sm font-medium mb-1">Email</Text>
                <Input
                  value={session?.user?.email || ''}
                  editable={false}
                  readOnly={true}
                  className="bg-gray-50"
                />
                <Text className="text-xs text-gray-500 mt-1">L'email non può essere modificata</Text>
              </View>
              
              <View className="mt-2">
                <Text className="text-sm font-medium mb-1">Nome</Text>
                <Input 
                  value={adminName}
                  onChangeText={setAdminName}
                  placeholder="Il tuo nome"
                />
              </View>
              
              <Button 
                text={savingProfile ? "Salvando..." : "Salva Modifiche"}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                className='mt-2'
              />
            </View>
          </Card>

          {/* Security Section */}
          <Card className="p-4">
            <Text className="text-lg font-semibold mb-4">Cambio Password</Text>
            
            <View className="space-y-4">
              {passwordChanged && (
                <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <View className="flex flex-row items-center">
                    <View className="flex-shrink-0">
                      <Text className="text-green-400 text-lg">✅</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-medium text-green-800">
                        Password cambiata con successo!
                      </Text>
                      <Text className="text-sm text-green-700 mt-1">
                        La tua password è stata aggiornata correttamente.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              {passwordError && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <View className="flex flex-row items-center">
                    <View className="flex-shrink-0">
                      <Text className="text-red-400 text-lg">❌</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-medium text-red-800">
                        Errore nel cambio password
                      </Text>
                      <Text className="text-sm text-red-700 mt-1">
                        {passwordError}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              <View className="space-y-2 mb-2">
                <Text className="text-sm font-medium mb-1">Password Attuale</Text>
                <PasswordInput
                  id="currentPasswordMobile"
                  password={currentPassword}
                  setPassword={setCurrentPassword}
                  showPassword={showCurrentPassword}
                  togglePasswordVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
                  placeholder="Inserisci password attuale"
                />
              </View>
              
              <View className="space-y-2 mb-2">
                <Text className="text-sm font-medium mb-1">Nuova Password</Text>
                <PasswordInput
                  id="newPasswordMobile"
                  password={newPassword}
                  setPassword={setNewPassword}
                  showPassword={showNewPassword}
                  togglePasswordVisibility={() => setShowNewPassword(!showNewPassword)}
                  placeholder="Inserisci nuova password"
                />
                <Text className="text-xs text-gray-500 mt-1">
                  La password deve essere di almeno 8 caratteri
                </Text>
              </View>
              
              <View className="space-y-2 mb-2">
                <Text className="text-sm font-medium mb-1">Conferma Nuova Password</Text>
                <PasswordInput
                  id="confirmPasswordMobile"
                  password={confirmPassword}
                  setPassword={setConfirmPassword}
                  showPassword={showConfirmPassword}
                  togglePasswordVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder="Conferma nuova password"
                />
              </View>
              
              <Button 
                text={changingPassword ? "Cambiando..." : "Cambia Password"}
                onPress={handleChangePassword}
                disabled={changingPassword}
                className='mt-2'
              />
            </View>
          </Card>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdminProfile