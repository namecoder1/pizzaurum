import logo from "@/assets/images/logo.png";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { createClientSupabase } from "@/lib/supabase";
import { Link, router } from "expo-router";
import { ChevronDown, LogOut, Menu, ShoppingCartIcon, User } from "lucide-react-native";
import React, { useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import Button from "../ui/button";
import CartItemControls from "../ui/cart-item-controls";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";
import { useUserProfile } from "@/hooks/useUserProfile";

const Navbar = () => {
  const os = Platform.OS;
  const { signOut } = useAuth();
  const {
    items,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartContext();
  const { isRider } = useUserProfile();
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubRoutes, setShowSubRoutes] = useState(false);

  React.useEffect(() => {
    const fetchAdmin = async () => {
      // Verifica che l'utente sia autenticato e abbia un ID
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      const supabase = await createClientSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching admin:', error);
      } else {
        if (data?.role === 'admin') {
          setIsAdmin(true);
        }
      }
      // Always set loading to false after the request completes
      setIsLoading(false);
    }

    fetchAdmin();
  }, [session?.user?.id])

  const handleLogout = async () => {
    try {
      await signOut();
      // Il redirect viene gestito automaticamente dai layout
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    // Create order metadata for URL
    const orderData = {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: item.customizations || [],
      })),
      totalPrice,
      totalItems,
    };

    // Encode order data using encodeURIComponent to handle Unicode characters
    const encodedOrderData = encodeURIComponent(JSON.stringify(orderData));

    setShowCartDropdown(false);
    router.push(`/checkout?orderData=${encodedOrderData}`);
  };

  const CartContent = () => (
    <div className="p-4">
      <h3 className="font-semibold text-lg mb-3">Il tuo carrello</h3>
      {items.length === 0 ? (
        <p className="text-gray-500">Il carrello è vuoto</p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <CartItemControls
                key={item.uniqueId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                showImage={true}
              />
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex justify-between items-center font-semibold mb-3">
              <span>Totale:</span>
              <span>€{totalPrice.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Procedi al checkout
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setShowCartDropdown(false);
                }}
                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
              >
                Svuota carrello
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );


  if (os === "web") {
    return (
      <nav className="fixed top-0 left-0 right-0 py-3 px-4 bg-white z-50 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto ">
          <div className="flex items-center gap-10">
            <Link href="/(private)/(customer)" className="flex items-center gap-2">
              {isLoading ? (
                <Skeleton className="w-20 h-6" />
              ) : (
                <>
                  <Image source={logo} style={{ width: 45, height: 45 }} />
                  <Text className="text-3xl font-black font-cormorant">PIZZAURUM</Text>
                </>
              )}
            </Link>
            <ul className="items-center gap-4 hidden md:flex">
              <li>
                {isLoading ? (
                  <Skeleton className="w-20 h-6" />
                ) : isRider ? (
                  <Link href="/(private)/(rider)/assigned">I miei ordini</Link>
                ) : !isAdmin ? (
                  <Link href="/(private)/(customer)">Ordina</Link>
                ) : (
                  <Link href="/(private)/(admin)">Dashboard</Link>
                )}
              </li>
              <li>
                {isLoading ? (
                  <Skeleton className="w-20 h-6" />
                ) : isRider ? (
                  <Link href="/(private)/(rider)/completed">Ordini completati</Link>
                ) : isAdmin ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Text className="mb-0.5 flex items-center gap-1 cursor-pointer">Ordini <ChevronDown size={16} /></Text>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mt-1">
                      <DropdownMenuItem asChild>
                        <Link href="/(private)/(admin)/ordini">Ordini Attivi</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/(private)/(admin)/ordini/revisione">Ordini in Revisione</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/(private)/(admin)/ordini/recensioni">Recensioni Ordini</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/(private)/(customer)/orders">I tuoi ordini</Link>
                )}
              </li>
              {isRider && (
                <li>
                  <Link href="/(private)/(rider)/earnings">Orari e stipendio</Link>
                </li>
              )}
              <li>
                {isLoading ? (
                  <Skeleton className="w-20 h-6" />
                ) : isAdmin ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Text className="mb-0.5 flex items-center gap-1 cursor-pointer">Gestione <ChevronDown size={16} /></Text>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mt-1">
                      <DropdownMenuItem asChild>
                        <Link href="/(private)/(admin)/analitiche">Analitiche</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/(private)/(admin)/prodotti">Prodotti</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/(private)/(admin)/utenti">Gestione Utenti</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="https://pizzaurum.sanity.studio" target="_blank">Gestione Menù</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            </ul>
          </div>          
          <div className="flex items-center gap-4">
            {!isAdmin && !isRider && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowCartDropdown(!showCartDropdown)}
                  className="bg-primary/10 p-2 border border-primary/30 rounded-xl flex items-center justify-center"
                >
                  <ShoppingCartIcon color="#BE1522" size={18} />
                </button>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}

                {/* Cart Dropdown - Responsive */}
                {showCartDropdown && (
                  <>
                    {/* Desktop dropdown */}
                    <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto hidden sm:block">
                      <CartContent />
                    </div>
                  </>
                )}
              </div>
            )}

            

            <DropdownMenu className="md:hidden">
              <DropdownMenuTrigger>
                <Menu />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mr-4 mt-2 p-2 md:hidden">
                <DropdownMenuGroup>
                  <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                    {isAdmin ? (
                      <Link href="/(private)/(admin)">Dashboard</Link>
                    ) : isRider ? (
                      <Link href="/(private)/(rider)/assigned">I miei ordini</Link>
                    ) : (
                      <Link href="/(private)/(customer)">Ordina</Link>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="w-full flex justify-end rounded" asChild>
                    {isAdmin ? (
                      <>
                        <button onClick={() => setShowSubRoutes(!showSubRoutes)} className="w-full flex justify-end rounded p-3 py-2">
                          <p>Gestione ordini</p>
                        </button>
                        <div className={`${showSubRoutes ? 'flex flex-col justify-end items-end gap-4 mb-2 px-3 mt-1' : 'hidden'}`}>
                          <Link href="/(private)/(admin)/ordini">Ordini</Link>
                          <Link href="/(private)/(admin)/ordini/revisione">In Revisione</Link>
                          <Link href="/(private)/(admin)/ordini/recensioni">Recensioni</Link>
                        </div>
                      </>
                    ) : isRider ? (
                      <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                        <Link href="/(private)/(rider)/completed">Ordini completati</Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                        <Link href="/(private)/(customer)/orders">I tuoi ordini</Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                    {isAdmin ? (
                      <Link href="/(private)/(admin)/analitiche">Analitiche</Link>
                    ) : isRider ? (
                      <Link href="/(private)/(rider)/earnings">Orari e stipendio</Link>
                    ) : (
                      <Link href="/(private)/(customer)/profile">Profilo</Link>
                    )}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                      <Link href="/(private)/(admin)/utenti">Gestione Utenti</Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin ? (
                    <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                      <Link href="/(private)/(admin)/profilo">Profilo</Link>
                    </DropdownMenuItem>
                  ) : isRider ? (
                    <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                      <Link href="/(private)/(rider)/profile">Profilo</Link>
                    </DropdownMenuItem>
                  ) : null}
                  {isAdmin && (
                    <DropdownMenuItem className="w-full flex justify-end rounded p-3" asChild>
                      <Link href="https://pizzaurum.sanity.studio" target="_blank">Gestione Menù</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    asChild
                    className="w-full flex justify-end rounded p-3"
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-x-2 py-2 px-3 rounded-xl bg-destructive hover:bg-destructive text-white transition-all duration-300"
                    >
                      <span>Esci</span>
                      <LogOut size={16} color="white" />
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            

            <div className="items-center gap-4 md:flex hidden">
              <Button
                text="Profilo"
                textColor="text-black"
                variant="link"
                onPress={() => router.push(!isAdmin ? "/(private)/(customer)/profile" : "/(private)/(admin)/profilo")}
                icon={<User size={16} color="black" />}
              />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive hover:bg-destructive text-white transition-all duration-300"
              >
                <LogOut size={16} color="white" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return null;
};

export default Navbar;
