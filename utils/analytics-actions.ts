import { createClientSupabase } from "@/lib/supabase";
import { getOrderProductsInfo } from "@/lib/order-helpers";
import { AnalyticsData, OrderProps, ProductAnalyticsData } from "@/types/types";
import { statusDictionary } from "@/lib/utils";

export const fetchAnalyticsData = async ({
  setLoading,
  timeSpan,
  setAnalyticsData
} : {
  setLoading: (loading: boolean) => void
  timeSpan: 'weekly' | 'monthly'
  setAnalyticsData: (analyticsData: AnalyticsData) => void
}) => {
  setLoading(true);
  try {
    const supabase = createClientSupabase();
    
    // Calculate date range based on timeSpan
    const now = new Date();
    let startDate: Date;
    
    if (timeSpan === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch orders within date range
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    const ordersData = orders as unknown as OrderProps[];
    
    // Enrich products for all orders
    const enrichedOrdersData = await Promise.all(
      ordersData.map(async (order) => {
        if (order.products && order.products.length > 0) {
          const enrichedProducts = await getOrderProductsInfo(order.products);
          return {
            ...order,
            products: enrichedProducts
          };
        }
        return order;
      })
    );
    
    // Calculate analytics
    const totalOrders = enrichedOrdersData.length;
    const refundedOrders = enrichedOrdersData.filter(order => order.is_refunded).length;
    const reportedOrders = enrichedOrdersData.filter(order => order.status === 'reported').length;
    const totalNetProfit = enrichedOrdersData.reduce((sum, order) => sum + (order.net_profit || 0), 0);

    // Group orders by day
    const ordersByDayMap = new Map<string, number>();
    const netProfitByDayMap = new Map<string, number>();
    
    enrichedOrdersData.forEach(order => {
      const orderDate = new Date(order.created_at);
      
      // Formatta la data sempre con giorno + mese abbreviato
      const dateLabel = orderDate.toLocaleDateString('it-IT', { 
        day: 'numeric',
        month: 'short'
      });
      
      const currentCount = ordersByDayMap.get(dateLabel) || 0;
      ordersByDayMap.set(dateLabel, Math.floor(currentCount + 1));
      netProfitByDayMap.set(dateLabel, (netProfitByDayMap.get(dateLabel) || 0) + (order?.net_profit || 0) / 100);
    });

    const ordersByDay = Array.from(ordersByDayMap.entries()).map(([label, value]) => ({
      value: Math.floor(value), // Assicura che sia un intero
      label,
      color: '#0BA5A4'
    }));

    const netProfitByDay = Array.from(netProfitByDayMap.entries()).map(([label, value]) => ({
      value: Math.round(value * 100) / 100,
      label,
      color: '#43b290'
    }));

    // Analyze top products
    const productCount = new Map<string, { count: number, id: string }>();
    enrichedOrdersData.forEach(order => {
      order.products?.forEach(product => {
        const productName = product.name || 'Unknown Product';
        const productId = product.product_id || product.id || '';
        const currentData = productCount.get(productName) || { count: 0, id: productId };
        const quantity = Math.floor(product.quantity || 1);
        productCount.set(productName, {
          count: Math.floor(currentData.count + quantity),
          id: productId
        });
      });
    });

    const topProducts = Array.from(productCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data], index) => ({
        value: Math.floor(data.count), // Assicura che sia un intero
        id: data.id,
        label: name.length > 15 ? name.substring(0, 15) + '...' : name,
        color: ['#f72d2d', '#15ace8', '#ebb134', '#ab24d4', '#f77f16'][index % 5],
      }));

    // Orders by status
    const statusCount = new Map<string, number>();
    enrichedOrdersData.forEach(order => {
      const status = order.status || 'unknown';
      const currentCount = statusCount.get(status) || 0;
      statusCount.set(status, Math.floor(currentCount + 1));
    });

    const ordersByStatus = Array.from(statusCount.entries()).map(([status, count], index) => ({
      value: Math.floor(count), // Assicura che sia un intero
      label: statusDictionary[status],
      color: ['#f72d2d', '#15ace8', '#ebb134', '#ab24d4', '#f77f16', '#0ba5a4'][index % 6]
    }));

    setAnalyticsData({
      totalOrders,
      refundedOrders,
      reportedOrders,
      totalNetProfit,
      ordersByDay,
      netProfitByDay,
      topProducts,
      ordersByStatus
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
  } finally {
    setLoading(false);
  }
}

export const fetchProductAnalytics = async ({
  setLoading,
  timeSpan,
  productId,
  setProductAnalytics
} : {
  setLoading: (loading: boolean) => void
  timeSpan: 'weekly' | 'monthly'
  productId: string
  setProductAnalytics: (analyticsData: ProductAnalyticsData | null) => void
}) => {
  setLoading(true);
  try {
    const supabase = createClientSupabase();
    
    // Calculate date range based on timeSpan
    const now = new Date();
    let startDate: Date;
    
    if (timeSpan === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch orders containing the specific product
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      setProductAnalytics(null);
      return;
    }

    const ordersData = orders as unknown as OrderProps[];
    
    // Enrich products for all orders
    const enrichedOrdersData = await Promise.all(
      ordersData.map(async (order) => {
        if (order.products && order.products.length > 0) {
          const enrichedProducts = await getOrderProductsInfo(order.products);
          return {
            ...order,
            products: enrichedProducts
          };
        }
        return order;
      })
    );
    
    // Filter orders that contain the specific product
    const productOrders = enrichedOrdersData.filter(order => 
      order.products?.some(product => 
        (product.product_id || product.id) === productId
      )
    );

    if (productOrders.length === 0) {
      setProductAnalytics(null);
      return;
    }

    // Calculate product-specific analytics
    let totalQuantity = 0;
    let totalRevenue = 0;
    let lastOrderedAt: string | undefined;
    const statusBreakdown = new Map<string, number>();
    const monthlyTrend = new Map<string, { orders: number; revenue: number }>();

    productOrders.forEach(order => {
      const productInOrder = order.products?.find(product => 
        (product.product_id || product.id) === productId
      );

      if (productInOrder) {
        const quantity = productInOrder.quantity || 1;
        const productRevenue = (productInOrder.price || 0) * quantity;
        
        totalQuantity += quantity;
        totalRevenue += productRevenue;

        // Track last order date
        if (!lastOrderedAt || order.created_at > lastOrderedAt) {
          lastOrderedAt = order.created_at;
        }

        // Status breakdown
        const status = order.status || 'unknown';
        statusBreakdown.set(status, (statusBreakdown.get(status) || 0) + 1);

        // Monthly trend
        const orderDate = new Date(order.created_at);
        const monthKey = orderDate.toLocaleDateString('it-IT', { 
          month: 'short',
          year: 'numeric'
        });
        
        const currentMonth = monthlyTrend.get(monthKey) || { orders: 0, revenue: 0 };
        monthlyTrend.set(monthKey, {
          orders: currentMonth.orders + 1,
          revenue: currentMonth.revenue + productRevenue
        });
      }
    });

    // Calculate derived metrics
    const totalOrders = productOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const daysInPeriod = timeSpan === 'weekly' ? 7 : 30;
    const orderFrequency = totalOrders / daysInPeriod;

    // Calculate revenue share (need total revenue from all orders)
    const totalRevenueAllOrders = enrichedOrdersData.reduce((sum, order) => {
      return sum + (order.products?.reduce((orderSum, product) => 
        orderSum + ((product.price || 0) * (product.quantity || 1)), 0) || 0);
    }, 0);
    
    const revenueShare = totalRevenueAllOrders > 0 ? (totalRevenue / totalRevenueAllOrders) * 100 : 0;

    // Get product name from first order
    const productName = productOrders[0]?.products?.find(product => 
      (product.product_id || product.id) === productId
    )?.name || 'Unknown Product';

    const productAnalytics: ProductAnalyticsData = {
      productId,
      productName,
      totalOrders,
      totalQuantity,
      totalRevenue,
      averageOrderValue,
      lastOrderedAt,
      orderFrequency,
      revenueShare,
      statusBreakdown: Array.from(statusBreakdown.entries()).map(([status, count]) => ({
        status,
        count
      })),
      monthlyTrend: Array.from(monthlyTrend.entries()).map(([month, data]) => ({
        month,
        orders: data.orders,
        revenue: data.revenue
      }))
    };

    setProductAnalytics(productAnalytics);

  } catch (error) {
    console.error('Error fetching product analytics:', error);
    setProductAnalytics(null);
  } finally {
    setLoading(false);
  }
}