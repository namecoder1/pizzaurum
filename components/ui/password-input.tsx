import React from 'react'
import { Platform, View } from 'react-native'
import { Input } from './input'
import { AntDesign } from '@expo/vector-icons'
import Button from './button'
import { Eye, EyeOff } from 'lucide-react-native'

const PasswordInput = ({ password, setPassword, id, showPassword, togglePasswordVisibility, placeholder } : {
  password: string;
  setPassword: (text: string) => void;
  id: string;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  placeholder: string
}) => {
  
  return (
    <View className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        className="focus:border-primary pr-12"
      />
      <Button
        variant="link"
        className="absolute right-3 top-1.5 p-1 hover:bg-gray-100/10 rounded cursor-pointer"
        onPress={togglePasswordVisibility}
        icon={showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      />
    </View>
  );
}

export default PasswordInput;