// src/components/Banner.jsx
import React from "react";
import "../banners/BannerMujer.css"; // estilos del banner
import bannerImg from "../../assets/banner_mujer.jpg"; // tu imagen en assets

const Banner = () => {
  return (
    <div className="banner">
      <img src={bannerImg} alt="H&M Banner" className="banner-img" />
    </div>
  );
};

export default Banner;
