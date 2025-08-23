import img1 from "@/assets/reviews/luisa-morganti.png";
import img2 from "@/assets/reviews/miranda-mancini.png";
import img3 from "@/assets/reviews/valeria-vale.png";
import React from "react";
import { Image } from "react-native";
import Button from "../ui/button";

interface ReviewProps {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  created_at: string;
}

const reviews = [
  {
    id: "1",
    name: "Valeria vale",
    description:
      "Una delle poche pizze qui a Pesaro che non mi fanno star male. Pinsa romana buonissima, morbida all'interno e croccante in superficie, condita il giusto senza esagerare con il sale. Buona anche al piattoLe dimensioni veramente abbondanti.Consegna a domicilio puntuale..la pizza era bollente! Ci tornerò sicuramente.",
    image: img3,
    rating: 5,
    created_at: "14 Aprile 2025",
  },

  {
    id: "2",
    name: "Miranda Mancini",
    description:
      "Esperienza mistica, la spianata romana farcita con la porchetta è una bomba, il tocco in più è stato l'aggiunta di mozzarella dietro suggerimento di uno dei ragazzi del locale. L'ambiente non è grandissimo ma in fondo la pizza al taglio è un cibo da passeggio. Consigliatissimo! Tornerò sicuramente.",
    image: img2,
    rating: 5,
    created_at: "23 Maggio 2024",
  },

  {
    id: "3",
    name: "Luisa Morganti",
    description:
      "La spianata è la migliore della città. Impasto croccante e morbido, lievitazione eccellente, digeribilissima. Lavorano come matti, le ragazze al banco non hanno respiro ma sono cortesi. Il locale è stato restaurato di recente ma è privo di condizionamento, cosa che in estate può essere un problema ma, onestamente, lavorando soprattutto da asporto, la permanenza nel locale è breve.",
    image: img1,
    rating: 5,
    created_at: "24 Settembre 2024",
  },
];

const Reviews = () => {
  return (
    <section className="py-24 bg-gray-50 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold tracking-wide mb-4">
            RECENSIONI
          </span>
          <h2 className="text-4xl font-cormorant font-bold text-gray-900 leading-tight">
            COSA DICONO I NOSTRI CLIENTI
          </h2>
          <div className="h-1 w-24 bg-primary mx-auto mt-4 mb-6"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <Review
              key={review.id}
              props={{
                id: review.id,
                name: review.name,
                description: review.description,
                image: review.image,
                rating: review.rating,
                created_at: review.created_at,
              }}
            />
          ))}
        </div>
        <div className="flex justify-center mt-10">
          <Button text="Vedi tutte le recensioni" onPress={() => {}} />
        </div>
      </div>
    </section>
  );
};

const Review = ({ props }: { props: ReviewProps }) => {
  const { id, name, description, image, rating, created_at } = props;

  return (
    <div
      key={id}
      className="bg-white p-8 rounded-xl shadow-md shadow-gray-300 flex flex-col justify-between"
    >
      <div className="flex items-center mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className="w-5 h-5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-600 italic mb-6">{description}</p>
      <div className="flex items-center">
        <div className="w-12 h-12 mr-3 overflow-hidden">
          <Image
            source={image as any}
            style={{ width: 48, height: 48 }}
          />
        </div>
        <div>
          <h4 className="font-semibold text-lg">{name}</h4>
          <p className="text-sm text-gray-500">{created_at}</p>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
