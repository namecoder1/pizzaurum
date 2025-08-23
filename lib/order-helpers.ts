import { cleanProductName, cleanProductNameAggressive, printLog } from '@/lib/utils';
import { client } from '@/sanity/client';
import { PRODUCT_BY_ID_QUERY } from '@/sanity/queries';
import { OrderProductProps } from '@/types/types';

// Cache per evitare chiamate duplicate a Sanity
const productCache = new Map<string, any>();

// Helper function to fetch product details from Sanity
async function fetchProductFromSanity(productId: string) {
  // Check cache first
  if (productCache.has(productId)) {
    return productCache.get(productId);
  }

  try {
    const products = await client.fetch(PRODUCT_BY_ID_QUERY, { id: productId });
    const product = products[0];
    
    if (product) {
      // Clean the product name
      const originalName = product.name;
      product.name = cleanProductName(product.name);
      
      if (product.name.length > originalName.length * 0.8) {
        product.name = cleanProductNameAggressive(originalName);
      }

      // Cache the result
      productCache.set(productId, product);
    }
    
    return product;
  } catch (error) {
    printLog(`Error fetching product ${productId} from Sanity: ${error}`, true);
    return null;
  }
}

// Main function to get complete product info for an order
export async function getOrderProductsInfo(products: OrderProductProps[]): Promise<OrderProductProps[]> {
  try {
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // If product already has a proper name and price, it's already enriched
        if (product.name && 
            product.name !== `Prodotto ${product.product_id}` && 
            product.price > 0) {
          return product;
        }

        // If we have a product_id, fetch from Sanity
        if (product.product_id) {
          const sanityProduct = await fetchProductFromSanity(product.product_id);
          
          if (sanityProduct) {
            return {
              ...product,
              name: sanityProduct.name,
              price: sanityProduct.price
            };
          } else {
            // Fallback if product not found in Sanity
            return {
              ...product,
              name: product.name || `Prodotto ${product.product_id}`,
              price: product.price || 0
            };
          }
        }

        // If no product_id, return as is
        return product;
      })
    );

    return enrichedProducts;
  } catch (error) {
    printLog(`Error enriching order products: ${error}`, true);
    // Return original products if enrichment fails
    return products;
  }
}

// Function to clear cache (useful for testing or when products are updated)
export function clearProductCache() {
  productCache.clear();
}

// Function to preload specific products into cache
export async function preloadProducts(productIds: string[]) {
  const uniqueIds = [...new Set(productIds)];
  
  await Promise.all(
    uniqueIds.map(async (id) => {
      if (!productCache.has(id)) {
        await fetchProductFromSanity(id);
      }
    })
  );
}

// Function to check if products need enrichment
export function needsEnrichment(products: OrderProductProps[]): boolean {
  if (!products || products.length === 0) {
    return false;
  }

  return products.some(product => 
    !product.name || 
    product.name === `Prodotto ${product.product_id}` || 
    product.price === 0
  );
}
