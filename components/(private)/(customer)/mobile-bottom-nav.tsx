import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import MobileCartNavButton from "./mobile-cart-nav-button";

const MobileBottomNav = ({ setIsOpen, role }: { setIsOpen: (isOpen: boolean) => void, role: 'admin' | 'customer' | 'rider' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = role === 'admin';
  const isRider = role === 'rider';

  // Show on mobile platforms (iOS and Android)
  if (Platform.OS === "web") return null;
  
  // Determine which page is currently active (using relative paths)
  const isOrderPage = pathname === "" || pathname === "/" || pathname === "/index";
  const isOrdersPage = pathname === "/orders";
  const isProfilePage = pathname === "/profile";
  
  // Admin page conditions - check for admin routes
  const isAdminPage = isAdmin && (pathname.includes("/admin") || pathname.includes("/(admin)") || pathname === "" || pathname === "/" || pathname === "/index");
  const isAdminOrdersPage = isAdmin && (pathname.includes("/ordini"));
  const isAdminAnalyticsPage = isAdmin && (pathname.includes("/analitiche"));
  const isAdminUsersPage = isAdmin && (pathname.includes("/utenti"));
  const isAdminProfilePage = isAdmin && (pathname.includes("/profilo"));
  const isManageProductsPage = isAdmin && (pathname.includes("/prodotti"));

  // Rider page conditions - check for rider routes
  const isRiderPage = isRider && (pathname.includes("/rider") || pathname.includes("/(rider)") || pathname === "" || pathname === "/" || pathname === "/index");
  const isRiderAssignedPage = isRider && (pathname.includes("/assigned"));
  const isRiderCompletedPage = isRider && (pathname.includes("/completed"));
  const isRiderEarningsPage = isRider && (pathname.includes("/earnings"));
  const isRiderProfilePage = isRider && (pathname.includes("/profile"));

  if (isAdmin) {
    return (
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-border">
      <View className="flex-row justify-around items-center px-4 py-2 pb-8">
        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(admin)")}
        >
          <Ionicons 
            name="home-outline" 
            size={24} 
            color={isAdminPage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isAdminPage ? "text-red-700" : "text-gray-500"}`}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(admin)/ordini")}
        >
          <Ionicons 
            name="list-outline" 
            size={24} 
            color={isAdminOrdersPage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isAdminOrdersPage ? "text-red-700" : "text-gray-500"}`}>
            Ordini
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(admin)/utenti")}
        >
          <Ionicons 
            name="storefront-outline" 
            size={24} 
            color={isAdminUsersPage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isAdminUsersPage ? "text-red-700" : "text-gray-500"}`}>
            Gestione
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(admin)/analitiche")}
        >
          <Ionicons 
            name="stats-chart-outline" 
            size={24} 
            color={isAdminAnalyticsPage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isAdminAnalyticsPage ? "text-red-700" : "text-gray-500"}`}>
            Analitiche
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(admin)/profilo")}
        >
          <Ionicons 
            name="person-outline" 
            size={24} 
            color={isAdminProfilePage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isAdminProfilePage ? "text-red-700" : "text-gray-500"}`}>
            Profilo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    )
  }

  if (isRider) {
    return (
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <View className="flex-row justify-around items-center px-4 py-2 pb-8">
          <TouchableOpacity
            className="flex-1 items-center py-2"
            onPress={() => router.push("/(private)/(rider)")}
          >
            <MaterialIcons name="delivery-dining" size={24} color="black" />
            <Text className={`text-xs mt-1 ${isRiderPage ? "text-red-700" : "text-gray-500"}`}>
              Ordini
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center py-2"
            onPress={() => router.push("/(private)/(rider)/assigned")}
          >
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={24} color="black" />
            <Text className={`text-xs mt-1 ${isRiderAssignedPage ? "text-red-700" : "text-gray-500"}`}>
              Assegnati
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center py-2"
            onPress={() => router.push("/(private)/(rider)/completed")}
          >
            <MaterialCommunityIcons name="clipboard-check-multiple-outline" size={24} color="black" />
            <Text className={`text-xs mt-1 ${isRiderCompletedPage ? "text-red-700" : "text-gray-500"}`}>
              Completati
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center py-2"
            onPress={() => router.push("/(private)/(rider)/earnings")}
          >
            <MaterialCommunityIcons name="account-cash-outline" size={24} color="black" />
            <Text className={`text-xs mt-1 ${isRiderEarningsPage ? "text-red-700" : "text-gray-500"}`}>
              Orari e Stipendio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center py-2"
            onPress={() => router.push("/(private)/(rider)/profile")}
          >
            <FontAwesome5 name="user-circle" size={20} color="black" />
            <Text className={`text-xs mt-1 ${isRiderProfilePage ? "text-red-700" : "text-gray-500"}`}>
              Profilo
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    )
  }

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <View className="flex-row justify-around items-center px-4 py-2 pb-8">
        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(customer)")}
        >
          <Ionicons 
            name="pizza-outline" 
            size={24} 
            color={isOrderPage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isOrderPage ? "text-red-700" : "text-gray-500"}`}>
            Ordina
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(customer)/orders")}
        >
          <Ionicons 
            name="list-outline" 
            size={24} 
            color={isOrdersPage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isOrdersPage ? "text-red-700" : "text-gray-500"}`}>
            Ordini
          </Text>
        </TouchableOpacity>

        <MobileCartNavButton setIsOpen={setIsOpen} />

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => router.push("/(private)/(customer)/profile")}
        >
          <Ionicons 
            name="person-outline" 
            size={24} 
            color={isProfilePage ? "#BA1223" : "#6B7280"} 
          />
          <Text className={`text-xs mt-1 ${isProfilePage ? "text-red-700" : "text-gray-500"}`}>
            Profilo
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

export default MobileBottomNav; 