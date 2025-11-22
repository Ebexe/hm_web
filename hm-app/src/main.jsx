/* Archivo: src/main.jsx (ACTUALIZADO) */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx'; // <-- 1. IMPORTAR EL CART PROVIDER
import './index.css'; // O tu CSS global
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 1. Envuelve todo con el Router para manejar las rutas */}
    <BrowserRouter>
      {/* 2. Envuelve todo con el AuthProvider para manejar el login */}
      <AuthProvider>
        {/* 3. Envuelve la App con el CartProvider (DEBE ESTAR DENTRO DE AUTH) */}
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);