import logo from "@/assets/images/logo.png";
import Entypo from '@expo/vector-icons/Entypo';

import Hero from "@/components/(public)/hero";
import MobileFooter from "@/components/(public)/mobile-footer";
import MobileList from "@/components/(public)/mobile-list";
import MobileMonthly from "@/components/(public)/mobile-monthly";
import Reviews from "@/components/(public)/reviews";
import WebAbout from "@/components/(public)/web-about";
import WebFeatured from "@/components/(public)/web-featured";
import WebLayout from "@/components/(public)/web-layout";
import WebMap from "@/components/(public)/web-map";
import Button from "@/components/ui/button";
import { AntDesign } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Platform, SafeAreaView, ScrollView, Text, View } from "react-native";
import LoginModal from "../../components/(auth)/LoginModal";
import { useCleanQuery } from "@/hooks/useQueryStore";
import { OPENDAYS_QUERY } from "@/sanity/queries";
import { OpenDaysProps } from "@/types/types";

export default function Index() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { data: openDays, loading: openDaysLoading } = useCleanQuery(OPENDAYS_QUERY) as { data: OpenDaysProps[], loading: boolean}

  // Layout per Mobile
  if (Platform.OS !== "web") {
    return (
      <View className="flex-1  mt-16">
        <View className="p-4 flex-row border-b border-neutral-950/20 justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Image source={logo} className="w-8 h-8" />
            <Text className="text-3xl text-black font-black font-cormorant">
              PIZZAURUM
            </Text>
          </View>

          <Button
            icon={<AntDesign name="shoppingcart" size={20} color="#B91223" />}
            text="Ordina"
            onPress={() => setShowLoginModal(true)}
            variant="outline"
          />
        </View>
        <ScrollView className="px-4 pt-6 bg-white">
          <MobileMonthly
            showLoginModal={showLoginModal}
            setShowLoginModal={setShowLoginModal}
          />
          <MobileList
            showLoginModal={showLoginModal}
            setShowLoginModal={setShowLoginModal}
          />
          <MobileFooter />
        </ScrollView>
      </View>
    );
  }

  // Layout per Web
  return (
    <WebLayout title="Pizzaurum" description="Pizzaurum" openDays={openDays} openDaysLoading={openDaysLoading}>
      <Hero onLoginPress={() => setShowLoginModal(true)} />
      <WebAbout />
      <WebFeatured onLoginPress={() => setShowLoginModal(true)} />
      <WebMap openDays={openDays} openDaysLoading={openDaysLoading} />

      <Reviews />
      <section className="py-24 bg-primary px-4 sm:px-6">
        <h2 className="text-4xl font-cormorant font-bold text-white leading-tight uppercase text-center">Scarica la nostra app</h2>
        <p className="text-lg text-white/80 max-w-2xl mx-auto text-center">
          Scarica la nostra app per ordinare in modo più veloce e semplice.
        </p>
        <div className="flex flex-row gap-4 items-center justify-center mt-4">
          <button className="bg-black rounded-xl text-white py-2 px-4 flex flex-row items-center gap-2">
            <AntDesign name="apple1" size={20} color="white" />
            <span className="text-sm mt-0.5">Scarica per iOS</span>
          </button>
          <button className="bg-black rounded-xl text-white py-2 px-4 flex flex-row items-center gap-2">
            <Entypo name="google-play" size={20} color="white" />
            <span className="text-sm mt-0.5">Scarica per Android</span>
          </button>
        </div>
      </section>
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        isMobile={false}
      />
    </WebLayout>
  );
}
