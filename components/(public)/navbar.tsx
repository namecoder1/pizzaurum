import logo from "@/assets/images/logo.png";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import LoginModal from "../(auth)/LoginModal";
import { useAuth } from "../../contexts/auth-context";
import Button from "../ui/button";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const router = useRouter();
  const { session, signOut } = useAuth();

  // In React Native, scroll detection would be handled by the parent ScrollView
  // For now, we'll simulate it or handle it differently

  const openLoginModal = () => {
    setLoginModalVisible(true);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Il redirect viene gestito automaticamente dai layout
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Errore", "Errore durante il logout");
    }
    setIsMenuOpen(false);
  };

  const navigateToHome = () => {
    router.push("/");
    setIsMenuOpen(false);
  };

  const navigateToMenu = () => {
    router.push("/menu");
    setIsMenuOpen(false);
  };

  const navigateToProfile = () => {
    router.push("/profile");
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 ">
      <View
        className={`bg-white  w-full transition-all duration-300 ${
          scrolled ? "shadow-md border-b border-gray-100" : "shadow-sm"
        }`}
      >
        <View className="max-w-7xl mx-auto w-full px-4 h-16 flex-row items-center justify-between">
          {/* Logo */}
          <TouchableOpacity
            onPress={navigateToHome}
            className="flex-row  items-center gap-1.5"
          >
            {/* Placeholder logo - replace with actual logo */}
            <View className="w-10 h-10 absolute left-0">
              <Image source={logo} style={{ width: 40, height: 40 }} />
            </View>
            <Text className="text-4xl font-black font-cormorant text-gray-800 ml-12">
              PIZZAURUM
            </Text>
          </TouchableOpacity>

          {/* Desktop Menu - hidden on small screens */}
          <View className="hidden lg:flex flex-row items-center space-x-6">
            <TouchableOpacity onPress={navigateToHome}>
              <Text className="text-gray-700 hover:text-primary">Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToMenu}>
              <Text className="text-gray-700 hover:text-primary">Menu</Text>
            </TouchableOpacity>

            {/* Prenota Button */}
            <Button
              icon={
                <Ionicons name="bookmark-outline" size={16} color="#B91223" />
              }
              text="Prenota"
              onPress={openLoginModal}
            />

            {/* User Button */}
            <TouchableOpacity
              className="w-10 h-10 bg-primary/5 border border-primary/10 rounded-full items-center justify-center"
              onPress={session ? navigateToProfile : openLoginModal}
            >
              <Ionicons name="person-outline" size={20} color="#B91223" />
            </TouchableOpacity>
          </View>

          {/* Mobile Menu Button */}
          <TouchableOpacity
            className="p-2 lg:hidden"
            onPress={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Feather
              name={isMenuOpen ? "x" : "menu"}
              size={24}
              color="black"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mobile Menu Modal */}
      <Modal
        visible={isMenuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View className="flex-1 bg-black/50">
          <Pressable className="flex-1" onPress={() => setIsMenuOpen(false)} />
          <View className="bg-white rounded-t-xl p-6 space-y-4">
            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={navigateToHome}
            >
              <Ionicons name="home-outline" size={20} color="#B91223" />
              <Text className="ml-3 text-lg text-gray-700">Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={navigateToMenu}
            >
              <Ionicons name="restaurant-outline" size={20} color="#B91223" />
              <Text className="ml-3 text-lg text-gray-700">Menu</Text>
            </TouchableOpacity>

            {session ? (
              <>
                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={navigateToProfile}
                >
                  <Ionicons name="person-outline" size={20} color="#B91223" />
                  <Text className="ml-3 text-lg text-gray-700">Profilo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={openLoginModal}
                >
                  <Ionicons name="bookmark-outline" size={20} color="#B91223" />
                  <Text className="ml-3 text-lg text-gray-700">Prenota</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  <Text className="ml-3 text-lg text-red-500">Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={openLoginModal}
                >
                  <Ionicons name="person-outline" size={20} color="#B91223" />
                  <Text className="ml-3 text-lg text-gray-700">Accedi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={openLoginModal}
                >
                  <Ionicons name="bookmark-outline" size={20} color="#B91223" />
                  <Text className="ml-3 text-lg text-gray-700">Prenota</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Login Modal */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        isMobile={Platform.OS !== "web"}
      />
    </nav>
  );
};

export default Navbar;
