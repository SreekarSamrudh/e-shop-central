
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  category?: string;
  avgRating?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: () => void;
  onAddToWishlist?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onAddToWishlist 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add items to cart",
          variant: "destructive"
        });
        return;
      }

      // Check if cart exists
      let { data: cart } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!cart) {
        // Create new cart
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({
            user_id: user.id,
            products: []
          })
          .select()
          .single();

        if (createError) throw createError;
        cart = newCart;
      }

      // Add product to cart
      const existingProducts = Array.isArray(cart.products) ? cart.products : [];
      const existingProductIndex = existingProducts.findIndex(
        (item: any) => item.id === product.id
      );

      let updatedProducts;
      if (existingProductIndex >= 0) {
        // Update quantity
        updatedProducts = [...existingProducts];
        updatedProducts[existingProductIndex].quantity += 1;
      } else {
        // Add new product
        updatedProducts = [...existingProducts, {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1
        }];
      }

      const { error: updateError } = await supabase
        .from('carts')
        .update({ products: updatedProducts })
        .eq('id', cart.id);

      if (updateError) throw updateError;

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`
      });

      onAddToCart?.();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add items to wishlist",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: product.id
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        throw error;
      }

      toast({
        title: "Added to wishlist",
        description: `${product.name} has been added to your wishlist`
      });

      onAddToWishlist?.();
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to add item to wishlist",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-4">
        <Link to={`/product/${product.id}`}>
          <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
        </Link>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {product.category || 'General'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddToWishlist}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          <Link to={`/product/${product.id}`}>
            <h3 className="font-semibold text-sm line-clamp-2 hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center gap-1">
            {product.avgRating && (
              <>
                <div className="flex">
                  {renderStars(product.avgRating)}
                </div>
                <span className="text-sm text-gray-600">
                  ({product.avgRating.toFixed(1)})
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-lg font-bold text-green-600">
                ${product.price.toFixed(2)}
              </p>
              <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || isLoading}
          className="w-full"
          size="sm"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isLoading ? 'Adding...' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
