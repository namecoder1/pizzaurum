import ProductCard from '@/components/(private)/(admin)/product-card'
import PageHeader from '@/components/(private)/page-header'
import PrivateLayout from '@/components/(private)/private-layout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Loader from '@/components/ui/Loader'
import { Separator } from '@/components/ui/separator'
import { getProductType } from '@/lib/utils'
import { AnalyticsData, ProductAnalyticsData, ProductProps, SpianataProps, TimeSpan } from '@/types/types'
import { fetchAnalyticsData, fetchProductAnalytics } from '@/utils/analytics-actions'
import { getAllProducts, getTopProductPosition, isTopProduct, useSanityData } from '@/utils/sanity-data'
import { Link } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { Image, Platform, Text } from 'react-native'


const ProductsPage = () => {
  const os = Platform.OS
  const [selectedProduct, setSelectedProduct] = useState<ProductProps | SpianataProps | null>(null)
  const [loading, setLoading] = useState(false);
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('weekly');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>();
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalyticsData | null>(null);
  
  // Use the new Sanity data hook
  const sanityData = useSanityData();
  const allProducts = getAllProducts(sanityData);

  // Enrich analytics data with product information
  const enrichedAnalyticsData = useMemo(() => {
    if (!analyticsData) return null;
    
    // Create enriched version of analytics data
    return {
      ...analyticsData,
      // The topProducts will already be enriched from fetchAnalyticsData
      topProducts: analyticsData.topProducts || []
    };
  }, [analyticsData]);

  const handleShowInfo = (product: ProductProps | SpianataProps) => {
    setSelectedProduct(product)
    // Fetch product-specific analytics when a product is selected
    if (product.id) {
      fetchProductAnalytics({
        setLoading,
        timeSpan,
        productId: product.id,
        setProductAnalytics
      });
    }
  }

  useEffect(() => {
    fetchAnalyticsData({
      setLoading,
      timeSpan,
      setAnalyticsData
    });
  }, [timeSpan]);


  if (sanityData.loading) {
    return <Loader size="fullscreen" text="Caricamento prodotti..." />;
  }

  const sanityUrl = 'https://pizzaurum.sanity.studio/structure/'

  if (os === 'web') {
    return (
      <PrivateLayout title="Prodotti" description="Gestione dei prodotti">
        <section className='max-w-7xl mx-auto w-full px-4 py-8'>
          <PageHeader title="Prodotti" description="Gestione dei prodotti" />
          <Separator className='my-4' />
          
          {allProducts.length === 0 ? (
            <div className="text-center py-8">
              <Text className="text-gray-500">Nessun prodotto trovato</Text>
            </div>
          ) : (
            <div className='flex flex-col-reverse md:grid md:grid-cols-6 gap-x-2'>
              <div className='h-fit max-h-[700px] w-full flex flex-col col-span-4'>
                <div className='overflow-y-auto no-scrollbar md:pr-6'>
                  {allProducts.map((product: ProductProps | SpianataProps, index: number) => (
                    <ProductCard 
                      product={product} 
                      key={`${product.id || index}`} 
                      type={getProductType(product)} 
                      setShowInfo={handleShowInfo} 
                      isSelected={selectedProduct?.id === product.id}
                      isTopProduct={isTopProduct(product.id, enrichedAnalyticsData as AnalyticsData)}
                      topProductPosition={getTopProductPosition(product.id, enrichedAnalyticsData as AnalyticsData)}
                    />
                  ))}
                </div>
              </div>
              {selectedProduct ? (
                <Card className='w-full h-fit col-span-2 mb-6 md:mb-0' key={selectedProduct.id}>
                  <Image
                    source={{ uri: selectedProduct.image }}
                    className='w-full h-72 rounded-t-xl'
                    width={96}
                    height={96}
                    resizeMode='cover'
                  />
                  <CardHeader>
                    <CardTitle className='flex items-center justify-between gap-x-2'>
                      <p className='text-2xl font-bold'>{selectedProduct.name}</p>
                      <p className='text-sm text-gray-500'>{selectedProduct.price.toFixed(2)}€</p>
                    </CardTitle>
                    <CardDescription>
                      <p className="text-md">{selectedProduct.description}</p>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    
                    <Separator className='mb-4' />
                    {/* Product Analytics */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Analitiche Prodotto</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 py-2 rounded-lg">
                              <p className="text-sm text-gray-600">Ordini Totali</p>
                              <p className="text-xl font-bold">{productAnalytics?.totalOrders || 0}</p>
                            </div>
                            <div className="bg-gray-50 py-2 rounded-lg">
                              <p className="text-sm text-gray-600">Quantità Totale</p>
                              <p className="text-xl font-bold">{productAnalytics?.totalQuantity || 0}</p>
                            </div>
                            <div className="bg-gray-50 py-2 rounded-lg">
                              <p className="text-sm text-gray-600">Fatturato</p>
                              <p className="text-xl font-bold text-green-600">€{(productAnalytics?.totalRevenue || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 py-2 rounded-lg">
                              <p className="text-sm text-gray-600">% Fatturato</p>
                              <p className="text-xl font-bold text-blue-600">{productAnalytics?.revenueShare?.toFixed(1) || 0}%</p>
                            </div>
                          </div>
                        </div>
                      
                      </div>
                  </CardContent>
                  <CardFooter>
                    <Link 
                      className='ml-auto mt-auto border border-border rounded-md py-2 px-4' 
                      target='_blank' 
                      href={`${sanityUrl}${selectedProduct.type};${selectedProduct.id}`}
                    >
                      <p className='text-sm text-blue-500'>Modifica</p>
                    </Link>
                  </CardFooter>
                </Card>
              ) : (
                <Card className='w-full h-fit col-span-2 mb-6 md:mb-0 p-6'>
                  <p className='text-center text-gray-500'>Nessun prodotto selezionato</p>
                </Card>
              )}
            </div>
          )}
        </section>
      </PrivateLayout>
    )
  }
  
  return null
}

export default ProductsPage