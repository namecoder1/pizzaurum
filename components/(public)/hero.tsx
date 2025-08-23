import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { Image, Linking } from "react-native";
import Button from "../ui/button";
import heroImg from '@/assets/images/hero.jpg'

const Hero = ({ onLoginPress }: { onLoginPress: () => void }) => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
      {/* Background Image */}
      <Image
        source={heroImg}
        alt="Hero background"
        className="absolute inset-0 z-20 w-full h-full object-cover"
        style={{ zIndex: 1 }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl max-w-lg text-center mx-auto tracking-tight font-bold text-white mb-6">
          La pizza che Pesaro ama davvero
        </h1>
        <p className="text-xl md:text-2xl text-white mb-8 opacity-90">
          Gusto autentico, ingredienti freschissimi e un'atmosfera che sa di
          casa. Da noi trovi sempre la tua fetta di felicità.
        </p>
        <div className="flex flex-row gap-4 mx-auto w-full justify-center">
          <Button
            icon={<AntDesign name="shoppingcart" size={20} color="#B91223" />}
            text="Ordina Online"
            onPress={onLoginPress}
            className="bg-white hover:bg-white/90 py-4 px-6 gap-x-2"
          />
          <Button
            variant="outline"
            textColor="text-white"
            icon={<AntDesign name="phone" size={20} color="#fff" className="mr-2" />}
            text="Chiamaci Ora"
            onPress={() => Linking.openURL("tel:+393333333333")}
            className="bg-primary hover:bg-primary/90 py-4 px-6"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
