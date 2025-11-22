// src/components/banners/BannerHombre.jsx

import React from "react";
// Importa los estilos específicos para este banner (si los tienes)
// Si usa los mismos que BannerMujer.css, puedes importar ese
import "./BannerHombre.css"; // O "./BannerMujer.css" si son idénticos
// Importa la imagen específica para el banner de hombre
import bannerHombreImg from "../../assets/men_banner02.jpg"; // Asegúrate que esta imagen exista

const BannerHombre = () => {
  return (
    // Puedes usar la misma clase 'banner' o una más específica si quieres
    <div className="banner banner-hombre"> 
      <img 
        src={bannerHombreImg} 
        alt="H&M Banner Hombre" // Cambia el alt text
        className="banner-img" 
      />
    </div>
  );
};

export default BannerHombre;