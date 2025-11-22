// src/components/banners/BannerNinos.jsx

import React from "react";
// Importa un archivo CSS compartido o uno específico si lo creas

// Importa la imagen específica para el banner de niños
import bannerNinosImg from "../../assets/banner_ninos02.jpg"; // Asegúrate que esta imagen exista

const BannerNinos = () => {
  return (
    // Usa clases comunes y una específica si es necesario
    <div className="banner banner-ninos"> 
      <img 
        src={bannerNinosImg} 
        alt="H&M Banner Niños" 
        className="banner-img" 
      />
      {/* Puedes añadir texto u otros elementos específicos aquí */}
      {/* <div className="banner-text">Moda divertida para Niños</div> */}
    </div>
  );
};

export default BannerNinos;