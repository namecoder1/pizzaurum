import { ClockIcon } from "lucide-react-native";
import OpenDays from "./open-days";
import { OpenDaysProps } from "@/types/types";

const WebMap = ({ openDays, openDaysLoading }: { openDays: OpenDaysProps[], openDaysLoading: boolean }) => {
  return (
    <section id="trova-ci" className="py-32 bg-gradient-to-b from-white to-gray-50 px-4">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold tracking-wide mb-4">
            DOVE SIAMO
          </span>
          <h2 className="text-4xl font-cormorant font-bold text-gray-900 leading-tight mb-4">VIENI A TROVARCI</h2>
          <div className="h-1 w-24 bg-primary mx-auto mt-4 mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Scopri il vero gusto della pizza artigianale nel cuore di Pesaro. Ti
            aspettiamo nel nostro locale accogliente e moderno.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center justify-center">
          <div className="space-y-10 flex flex-col items-start justify-start">
            <div className="flex flex-col items-start justify-start">
              <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-2">Dove siamo?</h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-start">
                Ci troviamo in Via delle Contramine 16, nel cuore di Pesaro.
                La nostra posizione è ideale per chi vuole visitare la città e, 
                arrivando dalla stazione, vuole gustarsi una buona pizza prima di 
                avventurarsi nella città.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <span className="bg-primary/10 p-2 rounded-lg">
                <ClockIcon size={20} color="#B91223" />
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Orari di apertura
                </h3>
                <OpenDays openDays={openDays} openDaysLoading={openDaysLoading} variant="compact" />
              </div>
            </div>
          </div>

          <div
            className="relative"
            
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2874.5185071945757!2d12.90723801240394!3d43.907238135841865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x132d19e8b0692fc1%3A0xbbd39d40e1df9082!2sPizzaurum%20Pesaro!5e0!3m2!1sit!2sit!4v1751474583278!5m2!1sit!2sit"
              className="w-full aspect-square lg:aspect-video rounded-2xl border-2 border-border shadow-lg"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              aria-label="Mappa di Google che mostra la posizione di Pizzaurum"
            />
            {/* Decorative Elements */}
            <div className="absolute -z-10 -bottom-6 -right-6 w-64 h-64 bg-primary/5 rounded-full" />
            <div className="absolute -z-10 -top-6 -left-6 w-32 h-32 bg-primary/10 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebMap;
