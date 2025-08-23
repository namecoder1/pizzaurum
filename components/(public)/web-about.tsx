import heroImg from "@/assets/images/hero2.jpg";
import React from "react";
import { Image } from "react-native";

const WebAbout = () => {
  return (
    <section
      id="chi-siamo"
      className="py-32 bg-gradient-to-b from-white to-gray-50 px-4"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image Section */}
          <div className="relative">
            <div className="relative aspect-[5/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                source={heroImg}
                alt="Pizzaurum"
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "cover",
                }}
              />
            </div>
            {/* Decorative Elements */}
            <div className="absolute -z-10 -bottom-6 -right-6 w-64 h-64 bg-primary/5 rounded-full" />
            <div className="absolute -z-10 -top-6 -left-6 w-32 h-32 bg-primary/10 rounded-full" />
          </div>

          {/* Content Section */}
          <div className="space-y-8">
            <div>
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold tracking-wide">
                LA NOSTRA STORIA
              </span>
              <h2 className="mt-6 text-4xl font-cormorant font-bold text-gray-900 leading-tight">
                CHI SIAMO
              </h2>
              <div className="h-1 w-24 bg-primary mt-4" />
            </div>

            <div className="space-y-6 text-gray-600">
              <p className="text-lg leading-relaxed">
                Nel cuore di Pesaro, Pizzaurum rappresenta l'eccellenza della
                pizza artigianale. La nostra passione per gli ingredienti di
                qualità e la tradizione italiana si riflette in ogni pizza che
                creiamo.
              </p>
              <p className="text-lg leading-relaxed">
                Utilizziamo solo ingredienti selezionati e freschi, seguendo
                ricette tradizionali che rendono le nostre pizze uniche e
                indimenticabili. Un'esperienza autentica di gusto italiano.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebAbout;
