// src/components/banners/BannerNinas.jsx

import React from "react";
// Importa el mismo archivo CSS compartido o uno específico

import "./BannerNinas.css"

// Importa la imagen específica para el banner de niñas
import bannerNinasImg from "../../assets/banner_ninas.jpg"; // Asegúrate que esta imagen exista

const BannerNinas = () => {
  return (
    // Usa clases comunes y una específica si es necesario
    <div className="banner banner-ninas"> 
      <img 
        src={bannerNinasImg} 
        alt="H&M Banner Niñas" 
        className="banner-img" 
      />
      {/* Puedes añadir texto u otros elementos específicos aquí */}
      {/* <div className="banner-text">Estilos encantadores para Niñas</div> */}
    </div>
  );
};

export default BannerNinas;