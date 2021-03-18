import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const loadLocalStorage = (newCard: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCard));
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data } = await api.get<Stock>(`stock/${productId}`);

      if (amount > data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((item) => {
        if (item.id === productId) {
          item.amount = amount;
        }
        return item;
      });

      loadLocalStorage(newCart);
      setCart(newCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  const addProduct = async (productId: number) => {
    try {
      const cartItem = cart.find((item) => item.id === productId);

      if (!cartItem) {
        const product = (await api.get<Product>(`products/${productId}`)).data;
        const stock = (await api.get<Stock>(`stock/${productId}`)).data;

        if (stock.amount > 0) {
          const newCartItem = [...cart, { ...product, amount: 1 }];
          loadLocalStorage(newCartItem);
          setCart(newCartItem);
          return;
        }
        
      }

      if (cartItem) {
        updateProductAmount({ productId, amount: cartItem.amount + 1 });
      }
      
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.some((item) => item.id === productId)) {
        const newCart = cart.filter((item) => item.id !== productId);
        loadLocalStorage(newCart);
        setCart(newCart);
      } else {
        throw new Error("Erro na remoção do produto");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
