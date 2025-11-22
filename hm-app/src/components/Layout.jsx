import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Chatbot from "../features/chatbot/Chatbot";
import "../components/Navbar.css";
import "../features/chatbot/chatbot.css";

export default function Layout() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 80 }}>
        <Outlet />
      </main>
      <Chatbot />
    </>
  );
}