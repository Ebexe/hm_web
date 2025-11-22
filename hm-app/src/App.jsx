/* Archivo: src/App.jsx (ACTUALIZADO) */

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom"; 
import Layout from "./components/Layout";
import MujerPage from "./pages/MujerPage";
import HombrePage from "./pages/HombrePage";
import NinosPage from "./pages/NinosPage"; 
import NinasPage from "./pages/NinasPage"; 
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage"; 
import ProductDetailPage from "./pages/ProductDetailPage"; 
import CartPage from "./pages/CartPage"; 
import OrderSuccessPage from "./pages/OrderSuccessPage"; // <-- 1. IMPORTA LA PÁGINA DE ÉXITO

import './App.css'; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/mujer" replace />} /> 
        <Route path="mujer" element={<MujerPage />} />
        <Route path="hombre" element={<HombrePage />} />
        <Route path="ninos" element={<NinosPage />} /> 
        <Route path="ninas" element={<NinasPage />} /> 
        <Route path="registro" element={<RegisterPage />} /> 
        <Route path="login" element={<LoginPage />} />
        <Route path="profile" element={<ProfilePage />} /> 
        
        <Route path="producto/:productId" element={<ProductDetailPage />} />
        <Route path="carrito" element={<CartPage />} />

        {/* --- 2. AÑADE LA RUTA DE PEDIDO EXITOSO --- */}
        <Route path="pedido-exitoso/:orderId" element={<OrderSuccessPage />} />

        {/* <Route path="*" element={<h2>Página no encontrada</h2>} /> */}
      </Route>
    </Routes>
  );
}

export default App;