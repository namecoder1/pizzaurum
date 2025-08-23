import heroImg from "@/assets/images/hero2.jpg";
import React from "react";
import { Image } from "react-native";
import Button from "../ui/button";

const WebCTA = () => {
  return (
    <section className="relative py-32">
      {/* Background Image */}
      <Image
        source={heroImg}
        alt="Hero background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: -1 }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <span className="inline-block px-4 py-1 bg-primary/80 text-white rounded-full text-sm font-medium mb-6">
            PRENOTA ORA
          </span>
          <h2 className="text-5xl font-bold text-white leading-tight tracking-tighter mb-8">
            Il vero gusto della pizza artigianale
            <span className="block mt-2">vicino a casa tua</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              text="Prenota un Tavolo"
              onPress={() => {}}
              className="bg-white hover:bg-white/90 py-4 px-6 gap-x-2"
            />
            <Button
              text="Ordina Online"
              onPress={() => {}}
              textColor="text-white"
              className="bg-primary hover:bg-primary/90 py-4 px-6"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebCTA;
