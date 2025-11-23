/* Archivo: hm-app/src/context/CartContext.jsx */

import React, { createContext, useContext, useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { 
    getCartAPI, 
    addItemToCartAPI, 
    updateItemQuantityAPI, 
    removeItemFromCartAPI,
    checkoutAPI // <-- 1. IMPORTA LA NUEVA FUNCIÓN
} from '../services/cartService';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { auth } = useAuth();
    const [cart, setCart] = useState({
        items: [],
        total: 0.00,
        count: 0,
        loading: true
    });
    
    // ... (Tu useEffect de loadCart no cambia) ...
    useEffect(() => {
        const loadCart = async () => {
            if (auth.token) {
                setCart(prev => ({ ...prev, loading: true }));
                try {
                    const data = await getCartAPI(auth.token);
                    setCart({
                        items: data.items,
                        total: parseFloat(data.total),
                        count: data.items.length,
                        loading: false
                    });
                } catch (error) {
                    console.error("Fallo al cargar el carrito:", error);
                    setCart(prev => ({ ...prev, loading: false }));
                }
            } else {
                setCart({ items: [], total: 0.00, count: 0, loading: false });
            }
        };
        loadCart();
    }, [auth.token]);

    const updateCartState = (data) => {
        setCart({
            items: data.items,
            total: parseFloat(data.total),
            count: data.items.length,
            loading: false
        });
    };

    const addItem = async (id_variante, cantidad) => {
        // ... (esta función no cambia)
        try {
            const data = await addItemToCartAPI(auth.token, id_variante, cantidad);
            updateCartState(data);
        } catch (error) {
            console.error("Error al añadir item:", error);
            throw error; // Lanza el error para que la página de producto lo cache
        }
    };

    const updateItem = async (id_variante, cantidad) => {
        // ... (esta función no cambia)
        try {
            const data = await updateItemQuantityAPI(auth.token, id_variante, cantidad);
            updateCartState(data);
        } catch (error) {
            console.error("Error al actualizar item:", error);
            throw error; // Lanza el error
        }
    };

    const removeItem = async (id_variante) => {
        // ... (esta función no cambia)
        try {
            const data = await removeItemFromCartAPI(auth.token, id_variante);
            updateCartState(data);
        } catch (error) {
            console.error("Error al eliminar item:", error);
        }
    };

    // --- 2. FUNCIÓN DE CHECKOUT AÑADIDA AL CONTEXTO ---
    const checkout = async (checkoutDetails) => {
        try {
            // Llama a la API con los detalles del envío y método de pago
            const data = await checkoutAPI(auth.token, checkoutDetails);
            
            // Si tiene éxito, la API del backend ya vació el carrito.
            // Ahora, reseteamos el estado local del carrito.
            setCart({ items: [], total: 0.00, count: 0, loading: false });
            
            // Devolvemos los datos (ej. { newOrderId: ... })
            return data; 
        } catch (error) {
            console.error("Error en checkout (Context):", error);
            // Lanza el error para que la CartPage lo muestre
            throw error; 
        }
    };

    return (
        <CartContext.Provider value={{ cart, addItem, updateItem, removeItem, checkout }}> {/* <-- 3. AÑADE checkout AL VALUE */}
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    return useContext(CartContext);
};