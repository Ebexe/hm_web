/* Archivo: src/features/chatbot/aiService.js (CORRECTO para Puter.js) */

/**
 * Llama a la API de IA de Puter.js con un prompt.
 * @param {string} prompt - El prompt completo construido por Chatbot.jsx.
 * @param {string} [model="gpt-4o-mini"] - El modelo de IA a usar (opcional, gpt-4o-mini es rápido y bueno para chat).
 * @returns {Promise<string>} La respuesta de texto de la IA.
 */
export async function askAI(prompt, model = "gpt-4o-mini") { // <-- Exporta askAI
  // Verifica si el SDK de Puter.js está disponible en el objeto window
  if (!window.puter || !window.puter.ai) {
    console.error("Error: El SDK de Puter.js (window.puter.ai) no está cargado o no se encontró.");
    // Devuelve un mensaje claro al usuario
    return "⚠️ Error: No se pudo inicializar el servicio de IA. Por favor, recarga la página.";
  }

  try {
    // Llama a la función de chat del SDK de Puter.js
    console.log("Enviando prompt a Puter AI:", prompt); // Log para depuración
    const res = await window.puter.ai.chat(prompt, { model });
    console.log("Respuesta recibida de Puter AI:", res); // Log para depuración

    // Extrae el contenido del mensaje de la respuesta
    if (res?.message?.content) {
      return res.message.content; // Devuelve solo el texto de la respuesta
    }

    // Si la estructura de la respuesta no es la esperada
    console.warn("La respuesta de la IA no tuvo el formato esperado (res.message.content):", res);
    return "⚠️ La IA dio una respuesta inesperada. Intenta reformular tu pregunta.";

  } catch (err) {
    console.error("Error al llamar a la API de Puter.js AI:", err);
    // Devuelve un mensaje de error específico para el usuario en caso de fallo de red o similar
    return "⚠️ Hubo un problema técnico al conectar con el servicio de IA. Por favor, inténtalo de nuevo más tarde.";
  }
}

// Puedes añadir más funciones aquí si necesitas otras capacidades de Puter.js AI,
// como generación de imágenes (txt2img), etc.