import { useCleanQuery } from "@/hooks/useQueryStore";
import { FEATURED_PIZZAS_QUERY } from "@/sanity/queries";
import { ProductProps } from "@/types/types";
import { AntDesign } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import Button from "../ui/button";
import { Skeleton } from "../ui/skeleton.web";

const WebFeatured = ({ onLoginPress }: { onLoginPress: () => void }) => {
  const [loading, setLoading] = useState(true);
  const { data: posts } = useCleanQuery(FEATURED_PIZZAS_QUERY) as {
    data: ProductProps[];
  };

  useEffect(() => {
    if (posts) {
      setLoading(false);
    }
  }, [posts]);

  return (
    <div>
      <section
        id="menu"
        className="py-24 bg-gray-50 max-w-7xl mx-auto px-4 sm:px-6"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              IL MENU
            </span>
            <h2 className="text-4xl font-bold font-cormorant uppercase text-gray-900 leading-tight">
              Le nostre specialità
            </h2>
            <div className="h-1 w-24 bg-primary mx-auto mt-4 mb-6"></div>
            <p className="body-lg text-gray-600 max-w-2xl mx-auto">
              Scopri i sapori della vera spianata romana, preparata con
              ingredienti freschi e di alta qualità
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {/* Pizza Cards */}
            {loading ? (
              // Loading skeletons
              Array(4)
                .fill(0)
                .map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="bg-white rounded-xl shadow-md overflow-hidden"
                  >
                    <div className="relative overflow-hidden">
                      <Skeleton className="w-full aspect-square" />
                    </div>
                    <div className="p-6 text-center">
                      <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                      <Skeleton className="h-4 w-full mx-auto mb-4" />
                      <Skeleton className="h-6 w-1/4 mx-auto" />
                    </div>
                  </div>
                ))
            ) : posts?.length > 0 ? (
              posts.map((post, index) => (
                <div
                  key={post.id}
                  className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative overflow-hidden">
                    {post.image && (
                      <Image
                        source={post.image as ImageSourcePropType}
                        alt={post.name || "Pizza"}
                        contentFit="cover"
                        className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary text-white px-4 py-1 uppercase text-sm rounded-md font-medium">
                        {post.category || "Pizza"}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="heading-sm mb-2 text-gray-900">
                      {post.name || "Pizza"}
                    </h3>
                    <p className="body-base text-gray-600 mb-4 line-clamp-2">
                      {post.description || "Deliziosa pizza artigianale"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary text-xl font-semibold">
                        € {post?.price?.toFixed(2) || "N/A"}
                      </span>
                      <Button
                        onPress={onLoginPress}
                        className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full px-4"
                        text="Ordina"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Nessuna pizza trovata.</p>
              </div>
            )}
          </div>

          <div className="text-center flex justify-center mt-12">
            <Button
              icon={<AntDesign name="eyeo" size={20} color="#B91223" />}
              text="Vedi Menu Completo"
              onPress={() => router.push("/menu")}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default WebFeatured;
