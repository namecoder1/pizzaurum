import MobileHeader from "@/components/(private)/(admin)/mobile-header";
import PageHeader from "@/components/(private)/page-header";
import PrivateLayout from "@/components/(private)/private-layout";
import { Card } from "@/components/ui/card";
import Loader from "@/components/ui/Loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsData, TimeSpan } from "@/types/types";
import { fetchAnalyticsData } from "@/utils/analytics-actions";
import { AntDesign, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from "react-native";
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';




export default function AdminAnalytics() {
  const os = Platform.OS;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('weekly');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalOrders: 0,
    refundedOrders: 0,
    reportedOrders: 0,
    totalNetProfit: 0,
    ordersByDay: [],
    netProfitByDay: [],
    topProducts: [],
    ordersByStatus: []
  });


  useEffect(() => {
    fetchAnalyticsData({
      setLoading,
      timeSpan,
      setAnalyticsData
    });
  }, [timeSpan]);

  if (loading) {
    return <Loader size="fullscreen" text="Caricamento analitiche..." />;
  }

  // Calcola la larghezza dinamica per le chart
  const getChartWidth = () => {
    if (os === 'web') {
      // Per web, usa una larghezza che si adatta al container
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const containerWidth = Math.min(viewportWidth - 100, 800); // Massimo 800px, con padding
      return Math.max(400, containerWidth);
    }
    return Dimensions.get('window').width - 40; // Per mobile
  };

  const chartWidth = getChartWidth();


  if (os === 'web') {
    return (
      <PrivateLayout title="Analitiche | Pizzaurum" description="Analitiche">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
        <PageHeader title="Analitiche" description="Gestisci e visualizza le analitiche su ordini, profitto e prodotti." />

          <Tabs value={timeSpan} onValueChange={(value) => setTimeSpan(value as TimeSpan)}>
            <TabsList className="flex-row items-center">
              <TabsTrigger className="flex-1" value="weekly"><Text className="text-sm">Settimanale</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value="monthly"><Text className="text-sm">Mensile</Text></TabsTrigger>
            </TabsList>
            <TabsContent value="weekly" className="mt-6">
              <Data analyticsData={analyticsData} chartWidth={chartWidth} os={os} />
            </TabsContent>
            <TabsContent value="monthly" className="mt-6"> 
              <Data analyticsData={analyticsData} chartWidth={chartWidth} os={os} />
            </TabsContent>
          </Tabs>
        </section>
      </PrivateLayout>
    );
  }

  // Mobile version
  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader title="Analitiche" icon={<Ionicons name="stats-chart-outline" size={20} color="white" />} />
      <ScrollView className="flex-1 p-4 bg-white" showsVerticalScrollIndicator={false}>

        <Tabs value={timeSpan} onValueChange={(value) => setTimeSpan(value as TimeSpan)}>
          <TabsList className="flex-row items-center w-full mb-4">
            <TabsTrigger value="weekly" className="flex-1">
              <Text>Settimanale</Text>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 text-center">
              <Text>Mensile</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
            <Data analyticsData={analyticsData} chartWidth={chartWidth} os={os} />
          </TabsContent>
          <TabsContent value="monthly">
            <Data analyticsData={analyticsData} chartWidth={chartWidth} os={os} />
          </TabsContent>
        </Tabs>

      </ScrollView>
    </SafeAreaView>
  );
}

const Data = ({ analyticsData, chartWidth, os }: { analyticsData: AnalyticsData, chartWidth: number, os: string }) => {

  const statsData = [
    {
      title: 'Ordini Totali',
      value: analyticsData.totalOrders,
      textColor: 'text-gray-900~',
    },
    {
      title: 'Profitto Netto',
      value: analyticsData.totalNetProfit,
      textColor: 'text-green-600',
    },
    {
      title: 'Ordini Rimborsati',
      value: analyticsData.refundedOrders,
      textColor: 'text-red-600',
    },
    {
      title: 'Ordini Segnalati',
      value: analyticsData.reportedOrders,
      textColor: 'text-orange-600',
    }
  ]

  if (os === 'web') {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsData.map((item, index) => (
            <div key={index} className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">{item.title}</h3>
              <p className={`text-2xl font-bold ${item.textColor}`}>{item.value}</p>
            </div>
          ))}          
        </div>
  
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders by Day Chart */}
          <div className="bg-white border rounded-lg p-6 w-full">
            <h2 className="text-lg font-semibold mb-4">
            <AntDesign name="barschart" size={18} color="black" className="mr-1.5" />
              Ordini per Giorno
            </h2>
            {analyticsData.ordersByDay.length > 0 ? (
              <div className="w-full overflow-hidden">
                <BarChart
                  data={analyticsData.ordersByDay}
                  width={chartWidth}
                  height={250}
                  barBorderColor="#0BA5A4"
                  barBorderRadius={4}
                  frontColor='#256'
                  yAxisThickness={0}
                  xAxisThickness={0}
                  isAnimated
                  animationDuration={1000}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nessun dato disponibile
              </div>
            )}
          </div>
  
          {/* Net Profit by Day Chart */}
          <div className="bg-white border rounded-lg p-6 w-full">
            <h2 className="text-lg font-semibold mb-4">
              <FontAwesome6 name="money-bills" size={16} color="black" className="mr-1.5" />
              Profitto Netto per Giorno
            </h2>
            {analyticsData.netProfitByDay.length > 0 ? (
              <div className="w-full overflow-hidden">
                <LineChart
                  data={analyticsData.netProfitByDay}
                  width={chartWidth}
                  height={250}
                  thickness={3}
                  color="#43b290"
                  dataPointsColor="#43b290"
                  yAxisThickness={0}
                  xAxisThickness={0}
                  isAnimated
                  animationDuration={1000}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nessun dato disponibile
              </div>
            )}
          </div>
  
          {/* Top Products Chart */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              <Ionicons name="trophy-outline" size={16} color="black" className="mr-1.5" />
              Prodotti Più Venduti
            </h2>
            {analyticsData.topProducts.length > 0 ? (
              <div className="flex flex-col items-center">
                <PieChart
                  data={analyticsData.topProducts}
                  showText
                  showTooltip                    
                  textColor="black"
                  radius={120}
                  textSize={16}
                  showValuesAsLabels
                  centerLabelComponent={() => (
                    <View className="flex flex-col items-center">
                      <Ionicons name="trophy-outline" size={32} color="black" />
                    </View>
                  )}
                  showTextBackground
                  textBackgroundRadius={16}
                  isAnimated
                  animationDuration={200}
                  strokeWidth={2}
                  strokeColor="white"
                />
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-md">
                  {analyticsData.topProducts.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-600 truncate">
                        {item.label}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nessun dato disponibile
              </div>
            )}
          </div>
  
          {/* Orders by Status Chart */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              <FontAwesome6 name="pen-to-square" size={16} color="black" className="mr-1.5" />
              Ordini per Stato
            </h2>
            {analyticsData.ordersByStatus.length > 0 ? (
              <div className="flex flex-col items-center">
                <PieChart
                  data={analyticsData.ordersByStatus}
                  radius={120}
                  showText
                  textColor="black"
                  textSize={14}
                  showValuesAsLabels
                  centerLabelComponent={() => (
                    <View className="flex flex-col items-center">
                      <FontAwesome6 name="pen-to-square" size={30} color="black" />                      
                    </View>
                  )}
                  showTextBackground
                  textBackgroundColor="#fdfdfd"
                  textBackgroundRadius={16}
                  isAnimated
                  animationDuration={1000}
                  strokeWidth={2}
                  strokeColor="white"
                />
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-md">
                  {analyticsData.ordersByStatus.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-600 truncate">
                        {item.label}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nessun dato disponibile
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <View className="flex flex-row items-center justify-center gap-4 mb-4 w-full">
        {statsData.slice(0, 2).map( (item, index) => (
          <View key={index} className="bg-white border border-border rounded-lg p-4 flex-1">
            <Text className="text-sm font-medium text-gray-500 mb-1">{item.title}</Text>
            <Text className={`text-2xl font-bold ${item.textColor}`}>{item.value}</Text>
          </View>
        ))}
      </View>
      <View className="flex flex-row items-center justify-center gap-4 mb-8 w-full">
        {statsData.slice(2, 4).map( (item, index) => (
          <View key={index} className="bg-white border border-border rounded-lg p-4 flex-1">
            <Text className="text-sm font-medium text-gray-500 mb-1">{item.title}</Text>
            <Text className={`text-2xl font-bold ${item.textColor}`}>{item.value}</Text>
          </View>
        ))}
      </View>
  
      {/* Charts Grid */}
      <View className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">
        {/* Orders by Day Chart */}
        <View className="bg-white border border-border rounded-lg p-4 w-full">
          <View className="flex flex-row items-center gap-1.5">
            <AntDesign name="barschart" size={18} color="black" />
            <Text className="text-lg font-semibold">
              Ordini per Giorno
            </Text>
          </View>
          {analyticsData.ordersByDay.length > 0 ? (
            <View className="w-full overflow-hidden">
              <BarChart
                data={analyticsData.ordersByDay}
                width={chartWidth}
                height={250}
                barBorderColor="#0BA5A4"
                barBorderRadius={4}
                frontColor='#256'
                yAxisThickness={0}
                xAxisThickness={0}
                isAnimated
                animationDuration={1000}
              />
            </View>
          ) : (
            <View className="flex items-center justify-center h-64">
              <Text className="text-gray-500">Nessun dato disponibile</Text>
            </View>
          )}
        </View>

        {/* Net Profit by Day Chart */}
        <View className="bg-white border border-border rounded-lg p-4 w-full">
          <View className="flex flex-row items-center gap-1.5">
            <FontAwesome6 name="money-bills" size={16} color="black" />
            <Text className="text-lg font-semibold">
              Profitto Netto per Giorno
            </Text>
          </View>
          {analyticsData.netProfitByDay.length > 0 ? (
            <View className="w-full overflow-hidden">
              <LineChart
                data={analyticsData.netProfitByDay}
                width={chartWidth}
                height={250}
                thickness={3}
                color="#43b290"
                dataPointsColor="#43b290"
                yAxisThickness={0}
                xAxisThickness={0}
                isAnimated
                animationDuration={1000}
              />
            </View>
          ) : (
            <View className="flex items-center justify-center h-64">
              <Text className="text-gray-500">Nessun dato disponibile</Text>
            </View>
          )}
        </View>

        {/* Top Products Chart */}
        <View className="bg-white border border-border rounded-lg p-4">
          <View className="flex flex-row items-center gap-1.5">
            <Ionicons name="trophy-outline" size={16} color="black" />
            <Text className="text-lg font-semibold">
              Prodotti Più Venduti
            </Text>
          </View>
          {analyticsData.topProducts.length > 0 ? (
            <View className="flex flex-col items-center">
              <PieChart
                data={analyticsData.topProducts}
                showText
                showTooltip                    
                textColor="black"
                radius={120}
                textSize={16}
                showValuesAsLabels
                centerLabelComponent={() => (
                  <View className="flex flex-col items-center">
                    <Ionicons name="trophy-outline" size={32} color="black" />
                  </View>
                )}
                showTextBackground
                showValuesAsTooltipText
                textBackgroundRadius={14}
                isAnimated
                animationDuration={200}
                strokeWidth={2}
                strokeColor="white"
              />
              {/* Legend */}
              <View className="mt-4 flex flex-row flex-wrap items-center gap-4 w-full max-w-md">
                {analyticsData.topProducts.map((item, index) => (
                  <View key={index} className="flex flex-row items-center gap-2">
                    <View 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <Text className="text-xs text-gray-600 truncate">
                      {item.label}: {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="flex items-center justify-center h-64">
              <Text className="text-gray-500">Nessun dato disponibile</Text>
            </View>
          )}
        </View>

        {/* Orders by Status Chart */}
        <View className="bg-white border border-border rounded-lg p-4">
          <View className="flex flex-row items-center gap-1.5">
            <FontAwesome6 name="pen-to-square" size={16} color="black" />
            <Text className="text-lg font-semibold">
              Ordini per Stato
            </Text>
          </View>
          {analyticsData.ordersByStatus.length > 0 ? (
            <View className="flex flex-col items-center">
              <PieChart
                data={analyticsData.ordersByStatus}
                showText
                showTooltip                    
                textColor="black"
                radius={120}
                textSize={16}
                showValuesAsLabels
                centerLabelComponent={() => (
                  <View className="flex flex-col items-center">
                    <Ionicons name="trophy-outline" size={32} color="black" />
                  </View>
                )}
                showTextBackground
                showValuesAsTooltipText
                
                tooltipComponent={( { item } : { item: { label: string, value: number, color: string } }) => {
                  return (
                    <Card className="p-2">
                      <Text>{item.label}</Text>
                      <Text>{item.value}</Text>
                    </Card>
                  )
                }}
                textBackgroundRadius={14}
                isAnimated
                animationDuration={200}
                strokeWidth={2}
                strokeColor="white"
              />
              {/* Legend */}
              <View className="mt-4 flex flex-row flex-wrap items-center gap-4 w-full max-w-md">
                {analyticsData.ordersByStatus.map((item, index) => (
                  <View key={index} className="flex flex-row items-center gap-2">
                    <View 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <Text className="text-xs text-gray-600 truncate">
                      {item.label}: {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="flex items-center justify-center h-64">
              <Text className="text-gray-500">Nessun dato disponibile</Text>
            </View>
          )}
        </View>
      </View>
    </>
  )
}
