/* Archivo: src/features/chatbot/Chatbot.jsx (Corregido 'setProfileData') */

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom"; 
import { askAI } from "./aiService"; 
import Fuse from 'fuse.js';
import "./Chatbot.css";
import IA_logo from "../../assets/IA_logo.png";
import { getProfile, getPreferences, getUserAjustes } from "../../services/userService"; 
import { getAllLookups } from "../../services/lookupService";
import { searchProducts, assistantSearch } from "../../services/productService"; 
import useAuth from "../../hooks/useAuth"; 

// --- buildSuperPrompt (Tu versión es correcta, no se cambia) ---
const buildSuperPrompt = (messages, profile, lookups, currentPage, relevantProducts) => { 
 
  let contextPrompt = "";
  let instructions = `
Instrucciones estrictas:
- Actúa únicamente como un amigable y experto asesor de moda de H&M. Tu nombre es "H&M IA Asesor".
- Prioriza colores y estilos que favorezcan el tono de piel y la contextura del usuario (si los conoces). Explica por qué tu sugerencia le quedaría bien.
- NO filtres ni rechaces recomendaciones por la talla del usuario. La aplicación no limitará por talla.
- Tómate tu tiempo para analizar y proponer recomendaciones basadas en el contexto; la aplicación consultará la base de datos después para resolver nombres. Si recomiendas productos, incluye al final un bloque JSON en una sola línea con los nombres o identificadores que puedas (si no conoces IDs, usa nombres).
Formato: ###PRODUCTS###[{"nombre":"Camisa Oxford Celeste","id_producto":"?","sku":"?"}]###END_PRODUCTS###
`;

  // INSTRUCCIÓN: OUTFIT COMPLETO (sin limitar a una lista corta)
  instructions += `
 - INSTRUCCIÓN DE OUTFIT COMPLETO (OBLIGATORIO):
   - SIEMPRE recomienda EXACTAMENTE 3 prendas que COMBINEN entre sí:
     1) Ropa SUPERIOR (camisa/blusa/chaqueta/blazer), 
     2) Ropa INFERIOR (pantalón/falda/short), 
     3) CALZADO (zapatos/zapatillas/botas).
   - Asegúrate de que los colores y estilos de las 3 prendas COMBINEN (ejemplo: si la camisa es azul marino, el pantalón puede ser beige/gris/negro, y zapatos marrones/negros).
   - Para eventos formales (boda, trabajo elegante, evento formal), considera incluir un BLAZER como prenda superior.
   - Si no puedes citar un producto exacto de la base de datos, sugiere estilos concretos y ejemplo de nombres para que la app pueda buscarlos.
`;
  // Indicar al modelo cómo pedir más productos si los candidatos no son suficientes
  instructions += `
- PROFESIONALISMO Y PETICIÓN DE MÁS PRODUCTOS:
  - Eres un asesor profesional y formal: habla con respeto, claridad y confianza.
  - Ajusta el lenguaje, los cortes y las sugerencias según el género declarado en el perfil (p. ej. masculino/femenino/non-binary). Si no hay género declarado, evita asumir y ofrece opciones neutrales o pregunta al usuario.
  - Si después de revisar los candidatos proporcionados NO puedes proponer una combinación satisfactoria, EN LUGAR de inventar coincidencias, devuelve en el bloque JSON la clave adicional ` + "`{\"need_more\":true}`" + ` dentro del mismo bloque ###PRODUCTS###...###END_PRODUCTS### para indicar que necesitas más candidatos. Ejemplo:
    ###PRODUCTS###{"need_more":true}###END_PRODUCTS###
  - Si puedes proponer combinaciones, incluye además un array ` + "`products`" + ` con los nombres o ids. Ejemplo:
    ###PRODUCTS###[{"id_producto":123,"nombre":"Loose Jeans"}]###END_PRODUCTS###
`;

  // Reforzar instrucciones de análisis y diversidad
  instructions += `
- ANÁLISIS DETALLADO Y DIVERSIDAD (OBLIGATORIO):
  - Antes de elegir, analiza detalladamente cada prenda candidata (nombre, corte, tejido, color disponible, ajuste). Para cada prenda que recomiendes, añade una línea en el texto explicando por qué la seleccionaste y cómo combina con las otras piezas.
  - Siempre que ofrezcas una combinación, proporciona al menos 2 alternativas adicionales que sean claramente diferentes entre sí (diferente paleta de color, estilo o tipo de prenda). "Claramente diferente" significa que no compartan la misma categoría-resumen y no repetirse en color y corte dominante.
  - Si las opciones propuestas son demasiado parecidas a una recomendación previa (por ejemplo, mismo nombre o mismo SKU traducido), NO las repitas: en su lugar devuelve ` + "`{\"need_more\":true}`" + ` para solicitar más candidatos.
  - No elijas rápido: simula un proceso de evaluación pausado y profesional; comenta pros/cons de cada combinación en 2-3 frases.
  - IMPORTANTE PARA ACTIVIDAD DEPORTIVA: Si el usuario pide ropa para deporte, gym, entrenamiento o ejercicio, recomienda ÚNICAMENTE prendas deportivas (camisetas deportivas, pantalones deportivos/joggers/leggings, zapatillas deportivas). NO recomiendes jeans, pantalones de vestir, camisas formales ni zapatos elegantes para actividades deportivas.
`;
    if (profile) {
        instructions += `
- ¡PERO SÍ TIENES PERFIL! El usuario es ${profile.nombre}.
- MIRA su 'Contexto del Usuario (Verificado)'...
- Ejemplo de respuesta: "¡Hola ${profile.nombre}! Para tu look de oficina casual, veo que te gustan los [Estilos Favoritos]..."
`;
    } else {
      instructions += `
  - El usuario es anónimo. Responde amablemente y pide más detalles...
  `;
    }

  
  // --- Ocasiones Válidas (obtenidas de los lookups) ---
  const ocasionesValidas = lookups?.ocasiones?.map(o => o.nombre_ocasion) || []; 
  if (ocasionesValidas.length > 0) {
    instructions += `
- Tus Ocasiones Válidas son: [${ocasionesValidas.join(', ')}].
- Lee el último mensaje del usuario. Si menciona una ocasión (ej. "boda", "trabajo", "finde"), identifica a cuál de tus Ocasiones Válidas corresponde mejor.
- Si identificas una ocasión, DEBES incluir en tu respuesta la etiqueta: OCASION_DETECTADA:[Nombre de la Ocasión Válida]. Ejemplo: OCASION_DETECTADA:[Evento Formal]. No uses la etiqueta si no estás seguro.
`;
  }

  // --- Contexto del Usuario (ACTUALIZADO CON TALLAS) ---
  if (profile && lookups?.estilos && lookups?.ocasiones && lookups?.colores) { 
    // Añadimos '?' opcionales por si alguna lookup falla
    const estilosNombres = profile.estilos?.map(id => lookups.estilos?.find(e => e.id_estilo === id)?.nombre_estilo).filter(Boolean).join(', ') || 'No especificados';
    const ocasionesNombres = profile.ocasiones?.map(id => lookups.ocasiones?.find(o => o.id_ocasion === id)?.nombre_ocasion).filter(Boolean).join(', ') || 'No especificados';
    const coloresNombres = profile.colores?.map(id => lookups.colores?.find(c => c.id_color === id)?.nombre_color).filter(Boolean).join(', ') || 'No especificados';

    contextPrompt += `

Contexto del Usuario (Verificado):
- Nombre: ${profile.nombre || 'Usuario'}
- Género: ${profile.genero || 'No especificado'}
- Departamento Preferido: ${profile.departamento_preferido || 'No especificado'}
- Edad: ${profile.edad ? profile.edad + ' años' : 'No especificada'}
- Altura: ${profile.altura_cm ? profile.altura_cm + ' cm' : 'No especificada'}
- Contextura: ${profile.tipo_cuerpo || 'No especificada'}
- Tono de Piel: ${profile.tono_piel || 'No especificado'}
--- TALLAS PREFERIDAS (del perfil) ---
${profile.ajustes?.map(ajuste => 
  `- ${ajuste.nombre_categoria}: ${ajuste.talla_habitual || 'No especificada'} (Ajuste: ${ajuste.ajuste_preferido || 'Regular'})`
).join('\n')}
--- PREFERENCIAS ---
- Estilos Favoritos (Guardados): ${estilosNombres}
- Ocasiones Favoritas (Guardadas): ${ocasionesNombres}
- Colores Favoritos (Guardados): ${coloresNombres}
`;

    // Chequeo de conflicto Departamento vs Página Actual
    if (profile.departamento_preferido && profile.departamento_preferido !== currentPage && currentPage !== 'general') {
      instructions += `
- ¡ATENCIÓN! El usuario (${profile.nombre || 'Usuario'}) está en la sección '${currentPage}', pero su perfil indica preferencia por '${profile.departamento_preferido}'. Salúdalo por su nombre y pregúntale amablemente si está buscando algo para él/ella o para otra persona (regalo) ANTES de dar recomendaciones.
`;
    } else {
      instructions += `
- Saluda al usuario por su nombre (${profile.nombre || 'Usuario'}). Ayúdalo con su petición basándote en su perfil.
`;
    }

  } else {
    // --- USUARIO ANÓNIMO ---
    contextPrompt += `
Contexto del Usuario (Anónimo):
- Sección Actual: ${currentPage}
`;
    instructions += `
- El usuario es anónimo. Basa tus recomendaciones en la sección actual ('${currentPage}').
`;
  }

  // Si se proporcionaron productos relevantes desde el backend, añádelos en formato compacto
  if (relevantProducts && Array.isArray(relevantProducts) && relevantProducts.length > 0) {
    const list = relevantProducts.slice(0, 50).map(p => {
      const colors = (p.colores || p.colores?.join?.(',') || p.colores) || '';
      const sizes = (p.tallas || p.tallas?.join?.(',') || p.tallas) || '';
      return `${p.id_producto || ''} | ${p.nombre_producto || p.nombre || ''} | colores: ${colors} | tallas: ${sizes}`;
    }).join('\n');
    instructions += `\nPRODUCTOS DISPONIBLES (lista compacta, máximo 50):\n${list}\n`;
    instructions += `\n⚠️ IMPORTANTE: Usa EXACTAMENTE los nombres de productos de la lista anterior. NO inventes nombres descriptivos como "Camisa de Mango Larga de Lino en Color Beige Claro". Usa el nombre tal cual aparece arriba, por ejemplo: si el producto se llama "Camisa Oxford Clásica", escribe ese nombre exacto en el JSON.\n`;
  }

  // --- Historial de Chat ---
  const recentMessages = messages.slice(-6); 
  const chatHistory = recentMessages
    .map((m) => {
        const cleanText = m.sender === 'bot' 
            ? m.text.replace(/<[^>]*>?/gm, ' ') // Quita HTML
            : m.text;
        return `${m.sender === "user" ? "Usuario" : "Asesor IA"}: ${cleanText}`;
    })
    .join("\n");

  // --- Construcción Final del Prompt ---
  return `
${instructions}

${contextPrompt}

=== HISTORIAL DE CONVERSACIÓN RECIENTE ===
${chatHistory}

=== TU TURNO (Asesor IA) ===
Responde al último mensaje del Usuario de forma útil y siguiendo TODAS las instrucciones estrictas (especialmente OUTFIT COMPLETO y RESPUESTA JSON):`;
};

// --- Helpers: tallas y outfit ---
const injectProfileSizeToProducts = (products, profile) => {
  try {
    if (!products || !Array.isArray(products) || !profile) return products || [];
    const profileSizes = (profile.ajustes || [])
      .map(a => a && (a.talla_habitual || a.talla) ? String(a.talla_habitual || a.talla).trim() : null)
      .filter(Boolean);

    if (profileSizes.length === 0) return products;

    return products.map(p => {
      try {
        const newP = { ...p };
        const prodSizes = Array.isArray(newP.talla) ? newP.talla.map(String) : (newP.talla ? [String(newP.talla)] : []);
        const merged = Array.from(new Set([...prodSizes, ...profileSizes]));
        newP.talla = merged;
        // Marca para saber que fue forzada por el perfil (útil para debugging)
        newP._forceProfileSize = true;
        return newP;
      } catch (e) {
        return p;
      }
    });
  } catch (e) {
    return products;
  }
};

const categoryKeywords = {
  upper: ['top','shirt','camisa','blusa','tee','t-shirt','polo','sweater','jersey','chaqueta','coat','cardigan','sudadera','camiseta','deportiva','sport','athletic','gym','training','workout','hoodie','blazer','saco'],
  lower: ['pant','pantal','jean','jeans','short','bermuda','skirt','falda','trouser','leggings','jogger','deportivo','athletic','gym','training','workout','chandal'],
  shoes: ['shoe','zapato','sneaker','zapatilla','boot','bota','calzado','deportiva','running','trainer','athletic','oxford','derby','loafer']
};

// Keywords para detectar prendas FORMALES vs CASUALES/DEPORTIVAS
const formalKeywords = ['blazer', 'saco', 'suit', 'terno', 'vestir', 'formal', 'elegante', 'dress', 'oxford', 'derby', 'loafer', 'wedding', 'boda', 'monk'];
const casualKeywords = ['sport', 'athletic', 'gym', 'training', 'workout', 'jogger', 'hoodie', 'sneaker', 'casual', 'thong', 'bodysuit', 'tank', 'drymove', 'mesh', 'boot', 'boots', 'walking', 'hiking', 'trail', 'outdoor', 'sandal', 'flip-flop', 'slipper'];

// Función para limpiar la respuesta del bot (remover JSON, símbolos innecesarios)
const cleanBotResponse = (text) => {
  if (!text) return '';
  let cleaned = text;
  
  // 1. Remover bloques de código con backticks (```json ... ``` o ``` ... ```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  
  // 2. Remover bloque ###PRODUCTS### si aún queda (con o sin contenido)
  cleaned = cleaned.replace(/###PRODUCTS###[\s\S]*?###END_PRODUCTS###/g, '');
  
  // 3. Remover cualquier ### que quede suelto (líneas que empiecen con ###)
  cleaned = cleaned.replace(/^###.*$/gm, '');
  
  // 4. Remover etiquetas OCASION_DETECTADA:[...]
  cleaned = cleaned.replace(/OCASION_DETECTADA:\[.*?\]/g, '');
  
  // 5. Remover símbolos de markdown innecesarios al inicio de línea
  cleaned = cleaned.replace(/^\*\*\*+\s*/gm, '');
  
  // 6. Limpiar múltiples saltos de línea (dejar máximo 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 7. Limpiar líneas vacías consecutivas
  cleaned = cleaned.replace(/^\s*[\r\n]/gm, '\n');
  
  // 8. Limpiar espacios al inicio y final
  cleaned = cleaned.trim();
  
  return cleaned;
};


const guessCategory = (prod) => {
  const text = (
    (prod.categoria||'') + ' ' + 
    (prod.tipo||'') + ' ' + 
    (prod.nombre_producto||'') + ' ' + 
    (prod.nombre||'') + ' ' +
    (prod.tags||'')
  ).toLowerCase();

  for (const k of categoryKeywords.upper) if (text.includes(k)) return 'upper';
  for (const k of categoryKeywords.lower) if (text.includes(k)) return 'lower';
  for (const k of categoryKeywords.shoes) if (text.includes(k)) return 'shoes';
  return null;
};

// Nueva función: detectar si una prenda es FORMAL
const isFormalWear = (prod) => {
  if (!prod) return false;
  const text = (
    (prod.categoria||'') + ' ' + 
    (prod.tipo||'') + ' ' + 
    (prod.nombre_producto||'') + ' ' + 
    (prod.nombre||'') + ' ' +
    (prod.short_description||'') + ' ' +
    (prod.descripcion||'') + ' ' +
    (prod.tags||'')
  ).toLowerCase();
  
  // Si contiene keywords casuales/deportivas, NO es formal
  if (casualKeywords.some(kw => text.includes(kw))) return false;
  
  // Si contiene keywords formales, SÍ es formal
  if (formalKeywords.some(kw => text.includes(kw))) return true;
  
  // Por defecto, considerar neutral (puede ser formal o casual dependiendo del contexto)
  return null; // null = indeterminado
};

// IMPORTANT: Ignorar filtro por talla en búsquedas — siempre permitir productos.
// Razon: hemos simulado que `ProductDetailPage` siempre muestra la talla correcta del usuario,
// por lo que no queremos que la búsqueda excluya candidatos por diferencias de talla.
const tallaMatchesProfile = (prod, profile) => {
  return true;
};

const ensureCompleteOutfit = (recommended, allProducts, profile, userQuery = '') => {
  if (!recommended || !Array.isArray(recommended)) return [];
  
  // Detectar si es contexto FORMAL (boda, trabajo formal, evento formal)
  const formalContext = /boda|wedding|formal|elegante|trabajo|oficina|terno|suit|blazer/i.test(userQuery);
  
  console.log(`[ensureCompleteOutfit] Contexto formal detectado: ${formalContext} (query: "${userQuery}")`);
  
  // FORZAR EXACTAMENTE 3 PRENDAS: upper, lower, shoes
  const pick = { upper: null, lower: null, shoes: null };
  for (const r of recommended) {
    const cat = guessCategory(r);
    if (cat && !pick[cat]) {
      // Si es contexto formal, verificar que la prenda sea formal
      if (formalContext) {
        const isFormal = isFormalWear(r);
        if (isFormal === false) {
          console.log(`[ensureCompleteOutfit] ⚠️ Rechazando prenda no formal: ${r.nombre_producto || r.nombre} (contexto formal)`);
          continue; // Saltar esta prenda
        }
      }
      pick[cat] = r;
    }
  }

  // Si falta alguna categoría, buscar en allProducts
  const alreadyUsed = new Set([pick.upper, pick.lower, pick.shoes].filter(Boolean).map(p => p.sku || p.id_producto));
  
  ['upper', 'lower', 'shoes'].forEach(cat => {
    if (!pick[cat] && allProducts && allProducts.length > 0) {
      const candidate = allProducts.find(p => {
        if (alreadyUsed.has(p.sku || p.id_producto)) return false;
        if (!tallaMatchesProfile(p, profile)) return false;
        const g = guessCategory(p);
        if (g !== cat) return false;
        
        // Si es contexto formal, SOLO considerar prendas formales o neutrales
        if (formalContext) {
          const isFormal = isFormalWear(p);
          if (isFormal === false) return false; // Rechazar casuales/deportivas
        }
        
        return true;
      });
      if (candidate) {
        pick[cat] = candidate;
        alreadyUsed.add(candidate.sku || candidate.id_producto);
      }
    }
  });

  // RETORNAR EXACTAMENTE 3 PRENDAS (o menos si no se encontraron todas)
  const result = [pick.upper, pick.lower, pick.shoes].filter(Boolean);
  
  console.log(`[ensureCompleteOutfit] Resultado final: ${result.length} prendas`);
  result.forEach(p => console.log(`  - ${guessCategory(p)}: ${p.nombre_producto || p.nombre} (formal: ${isFormalWear(p)})`));
  
  // Si tenemos más de 3, recortar (solo debería pasar si hay duplicados)
  return result.slice(0, 3);
};

// Busca un candidato por categoría usando primero los productos ya cargados,
// luego Fuse.js (si está disponible) y finalmente el backend (searchProducts).
const fetchCategoryCandidate = async (cat, allProducts, recommendedSet, profile, fuse, deptoBusqueda) => {
  // Keywords para buscar (español primero, luego inglés)
  const catQueries = {
    upper: ['camisa', 'camiseta', 'polo', 'shirt', 't-shirt', 'tee'],
    lower: ['pantalón', 'pantalon', 'jeans', 'pants', 'trouser', 'short'],
    shoes: ['zapato', 'zapatilla', 'sneaker', 'shoe', 'bota', 'boot']
  };

  // 1) Busca en allProducts localmente
  const local = (allProducts || []).find(p => {
    if (recommendedSet.has(p?.sku || p?.id_producto)) return false;
    if (!tallaMatchesProfile(p, profile)) return false;
    const g = guessCategory(p);
    return g === cat;
  });
  if (local) return local;

  // 2) Intentar Fuse.js sobre allProducts
  if (typeof fuse !== 'undefined' && fuse) {
    for (const q of catQueries[cat]) {
      try {
        const fRes = fuse.search(q);
        if (fRes && fRes.length > 0) {
          for (const r of fRes) {
            const item = r.item;
            if (!recommendedSet.has(item?.sku || item?.id_producto) && tallaMatchesProfile(item, profile)) return { ...item, _fallback: true };
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  // 3) Llamar al backend con queries específicas (gratis) hasta encontrar uno
  for (const q of catQueries[cat]) {
    try {
      const backRes = await searchProducts(q, deptoBusqueda);
      if (backRes && backRes.length > 0) {
        const cand = backRes.find(p => !recommendedSet.has(p?.sku || p?.id_producto) && tallaMatchesProfile(p, profile));
        if (cand) return { ...cand, _fallback: true };
      }
    } catch (e) {
      console.error('Error buscando candidato por categoría', cat, q, e);
    }
  }

  return null;
};

// --- Helper rápido de traducción (diccionario) ---
const translateToSpanish = (text) => {
  if (!text || typeof text !== 'string') return text;
  const dict = {
    'shirt': 'camisa',
    't-shirt': 'camiseta',
    'tee': 'camiseta',
    'polo': 'polo',
    'pants': 'pantalón',
    'pant': 'pantalón',
    'jeans': 'jeans',
    'trouser': 'pantalón',
    'shorts': 'short',
    'skirt': 'falda',
    'jacket': 'chaqueta',
    'coat': 'abrigo',
    'sweater': 'suéter',
    'hoodie': 'sudadera',
    'sneaker': 'zapatilla',
    'sneakers': 'zapatillas',
    'shoe': 'zapato',
    'shoes': 'zapatos',
    'dress': 'vestido',
    'blouse': 'blusa',
    'bag': 'bolso',
    'jumpsuit': 'mono'
  };

  // reemplaza palabras por coincidencia simple (word boundaries)
  let out = text.toLowerCase();
  Object.keys(dict).forEach(k => {
    const re = new RegExp('\\b' + k + '\\b', 'gi');
    out = out.replace(re, dict[k]);
  });
  // capitalizar primera letra si el original estaba capitalizado
  if (text[0] === text[0].toUpperCase()) out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
};

// Intenta resolver un nombre devuelto por la IA a productos reales.
// Estrategia (gratis): 1) Fuse sobre productos cargados, 2) backend con frase completa,
// 3) traducir y reintentar, 4) probar tokens individuales (ej. 'Loose' 'Jeans'),
// 5) probar token sustantivo final (ej. 'Jeans'). Devuelve array de productos o [].
const resolveNameToProducts = async (name, deptoBusqueda, fuse, profile, allProducts) => {
  if (!name) return [];
  const tried = new Set();
  const results = [];
  const pushIfNew = (arr) => {
    (arr || []).forEach(p => {
      const id = p?.id_producto || p?.sku || JSON.stringify(p);
      if (!tried.has(id)) {
        tried.add(id);
        results.push(p);
      }
    });
  };

  const nameStr = String(name || '').trim();
  const nameLower = nameStr.toLowerCase();

  // 0) Si tenemos la lista de productos (allProducts), intentar detectar coincidencias
  //    cuando el 'name' es un prompt largo que contiene el nombre del producto.
  try {
    if (allProducts && Array.isArray(allProducts) && allProducts.length > 0) {
      for (const p of allProducts) {
        try {
          const pn = ((p.nombre_producto || p.nombre || '') + '').toLowerCase();
          if (!pn) continue;
          // si el prompt largo contiene el nombre del producto, lo consideramos candidato
          if (nameLower.includes(pn) || pn.includes(nameLower)) {
            pushIfNew([p]);
          }
        } catch (e) { /* ignore per-item errors */ }
      }
      if (results.length > 0) return results; // si hay coincidencias claras, devolverlas
    }
  } catch (e) { /* ignore */ }

  // 0b) Extraer partes entre comillas ("..." o '...') si existen y usar eso como nombre exacto
  try {
    const qMatch = nameStr.match(/['"`]{1}([^'"`]+)['"`]{1}/);
    if (qMatch && qMatch[1]) {
      const quoted = qMatch[1].trim();
      if (quoted.length > 1) {
        // intentar Fuse y backend con la frase entrecomillada inmediatamente
        if (fuse) {
          try { const fq = fuse.search(quoted); if (fq && fq.length) pushIfNew(fq.map(r => r.item)); } catch(e){}
        }
        try { const bq = await searchProducts(quoted, deptoBusqueda); if (bq && bq.length) pushIfNew(bq); } catch(e){}
        if (results.length > 0) return results;
      }
    }
  } catch(e) { /* ignore */ }

  // 1) Fuse full phrase (y también sobre la cadena limpia)
  if (fuse) {
    try {
      const fRes = fuse.search(String(nameStr));
      if (fRes && fRes.length > 0) pushIfNew(fRes.map(r => r.item));
    } catch (e) { /* ignore */ }
  }

  // 2) Backend full phrase
  try {
    const backRes = await searchProducts(String(nameStr), deptoBusqueda);
    if (backRes && backRes.length > 0) pushIfNew(backRes);
  } catch (e) { /* ignore */ }

  // 3) Traducción completa y reintento
  try {
    const translated = translateToSpanish(String(name));
    if (translated && translated.toLowerCase() !== String(name).toLowerCase()) {
      if (fuse) {
        try {
          const fRes2 = fuse.search(String(translated));
          if (fRes2 && fRes2.length > 0) pushIfNew(fRes2.map(r => r.item));
        } catch (e) { /* ignore */ }
      }
      const backRes2 = await searchProducts(String(translated), deptoBusqueda);
      if (backRes2 && backRes2.length > 0) pushIfNew(backRes2);
    }
  } catch (e) { /* ignore */ }

  // 4) Tokenizar y probar tokens individuales (favor nouns)
  try {
    const tokens = nameStr.split(/\s+/).map(t => t.trim()).filter(Boolean);
    
    // Si el nombre es muy largo (>30 chars), es probable que sea descriptivo
    // En ese caso, filtrar tokens cortos y stopwords, y buscar matches por keywords
    const isLongDescriptive = nameStr.length > 30;
    const stopwords = ['de', 'la', 'el', 'en', 'con', 'para', 'color', 'talla', 'manga', 'larga', 'corta', 'tipo'];
    const meaningfulTokens = tokens.filter(t => t.length > 3 && !stopwords.includes(t.toLowerCase()));
    
    if (isLongDescriptive && meaningfulTokens.length >= 2 && allProducts && allProducts.length > 0) {
      console.log(`[resolveNameToProducts] Nombre descriptivo largo detectado. Keywords: [${meaningfulTokens.join(', ')}]`);
      // Buscar productos que contengan al menos 2 keywords
      const keywordMatches = allProducts.filter(p => {
        const pname = ((p.nombre_producto || p.nombre || '') + ' ' + (p.short_description || '')).toLowerCase();
        const matchCount = meaningfulTokens.filter(kw => pname.includes(kw.toLowerCase())).length;
        return matchCount >= 2;
      });
      if (keywordMatches.length > 0) {
        console.log(`[resolveNameToProducts] Encontrados ${keywordMatches.length} productos por keywords (mínimo 2 matches)`);
        pushIfNew(keywordMatches.slice(0, 5)); // Limitar a 5 mejores matches
        if (results.length > 0) return results; // Si encontramos algo, retornar inmediatamente
      }
    }
    
    // Búsqueda normal por tokens individuales
    for (const t of tokens) {
      if (t.length <= 2) continue;
      // fuse
      if (fuse) {
        try {
          const fResT = fuse.search(t);
          if (fResT && fResT.length > 0) pushIfNew(fResT.map(r => r.item));
        } catch (e) { /* ignore */ }
      }
      // backend
      try {
        const backResT = await searchProducts(t, deptoBusqueda);
        if (backResT && backResT.length > 0) pushIfNew(backResT);
      } catch (e) { /* ignore */ }
      // traducido
      try {
        const tr = translateToSpanish(t);
        if (tr && tr.toLowerCase() !== t.toLowerCase()) {
          if (fuse) {
            const fResTr = fuse.search(tr);
            if (fResTr && fResTr.length > 0) pushIfNew(fResTr.map(r => r.item));
          }
          const backResTr = await searchProducts(tr, deptoBusqueda);
          if (backResTr && backResTr.length > 0) pushIfNew(backResTr);
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  // 5) If still empty, try last token (often noun like 'jeans')
  try {
      const parts = nameStr.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      if (fuse) {
        try {
          const fResL = fuse.search(last);
          if (fResL && fResL.length > 0) pushIfNew(fResL.map(r => r.item));
        } catch (e) { /* ignore */ }
      }
      const backResL = await searchProducts(last, deptoBusqueda);
      if (backResL && backResL.length > 0) pushIfNew(backResL);
      const trLast = translateToSpanish(last);
      if (trLast && trLast.toLowerCase() !== last.toLowerCase()) {
        if (fuse) {
          const fResTrL = fuse.search(trLast);
          if (fResTrL && fResTrL.length > 0) pushIfNew(fResTrL.map(r => r.item));
        }
        const backResTrL = await searchProducts(trLast, deptoBusqueda);
        if (backResTrL && backResTrL.length > 0) pushIfNew(backResTrL);
      }
    }
  } catch (e) { /* ignore */ }

  return results;
};


// --- Componente Principal Chatbot ---
function Chatbot() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false); 
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "¡Hola! Soy tu asesor de moda IA de H&M 👗🕶️. Cuéntame, ¿qué tienes en mente hoy?",
      recommendations: [] 
    },
  ]);
 
  const [profileData, setProfileData] = useState(null); 
  const [lookups, setLookups] = useState(null); 
  const [profileLoading, setProfileLoading] = useState(false); 
  const [lookupsLoading, setLookupsLoading] = useState(false); // Estado separado
  const [assistantCandidates, setAssistantCandidates] = useState([]);
  const [assistantPage, setAssistantPage] = useState(0);
  const [assistantTotal, setAssistantTotal] = useState(0);
  const [assistantAutoFetchCount, setAssistantAutoFetchCount] = useState(0);
  const [assistantFetchedPages, setAssistantFetchedPages] = useState([]); // páginas ya solicitadas
  const MAX_AUTO_ATTEMPTS = 5; // máximo reintentos automáticos (puedes ajustar)
 
  const messagesEndRef = useRef(null);
  const { auth } = useAuth(); 
  const location = useLocation(); 

  // Cargar perfil del usuario (incluye preferencias y ajustes)
  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      if (!auth || !auth.token) {
        setProfileData(null);
        setProfileLoading(false);
        return;
      }

      // Cargar perfil, preferencias y ajustes en paralelo
      const [p, prefs, ajustes, allLookups] = await Promise.all([
        getProfile(auth.token).catch(() => null),
        getPreferences(auth.token).catch(() => ({})),
        getUserAjustes(auth.token).catch(() => []),
        // solo cargar lookups si aún no están cargados
        (lookups ? Promise.resolve(lookups) : getAllLookups().catch(() => null))
      ]);

      const merged = {
        ...(p || {}),
        estilos: prefs?.estilos || prefs?.estilos_ids || [],
        ocasiones: prefs?.ocasiones || [],
        colores: prefs?.colores || [],
        ajustes: ajustes || []
      };

      setProfileData(merged);
      if (!lookups && allLookups) setLookups(allLookups);
    } catch (e) {
      console.error('Error cargando perfil en Chatbot:', e);
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // --- useEffect #1: Carga los Lookups (colores, estilos, etc.) UNA VEZ ---
  useEffect(() => {
    const loadLookups = async () => {
      try {
        // Determinar última consulta del usuario
        const lastUserMsg = [...messages].slice().reverse().find(m => m.sender === 'user');
        const userQuery = lastUserMsg ? lastUserMsg.text : prompt || '';

        let currentPageKey = 'general';
        if (location.pathname.includes('/mujer')) currentPageKey = 'mujer';
        else if (location.pathname.includes('/hombre')) currentPageKey = 'hombre';
        else if (location.pathname.includes('/nino')) currentPageKey = 'nino';
        else if (location.pathname.includes('/nina')) currentPageKey = 'nina';
        const deptoBusqueda = profileData?.departamento_preferido || (currentPageKey !== 'general' ? currentPageKey : null);

        // Automatizar reintentos: traer páginas y volver a invocar IA hasta 3 intentos
        let attempts = 0;
        const maxAttempts = MAX_AUTO_ATTEMPTS;
        let localCandidates = assistantCandidates ? [...assistantCandidates] : [];

        while (attempts < maxAttempts) {
          const nextPage = assistantPage + 1 + attempts; // siguiente página relativa
          const asRes = await assistantSearch(userQuery, deptoBusqueda || null, 50, nextPage);
          const newCandidates = asRes.candidates || [];
          if (!newCandidates || newCandidates.length === 0) {
            // No hay más candidatos; salimos
            break;
          }

          // Append to local and global state
          localCandidates = [...localCandidates, ...newCandidates];
          setAssistantCandidates(prev => [...(prev || []), ...newCandidates]);
          setAssistantPage(p => Math.max(p, nextPage));
          setAssistantTotal(asRes.total || assistantTotal);

          // Construir prompt con candidatos acumulados y volver a invocar IA
          const fullPrompt = buildSuperPrompt(
            messages.concat([]),
            profileData,
            lookups,
            currentPageKey,
            localCandidates
          );

          // Llamada a la IA
          const aiRes = await askAI(fullPrompt);

          // Buscar bloque JSON
          const jsonRegex = /###PRODUCTS###([\s\S]*?)###END_PRODUCTS###/;
          const match = aiRes.match(jsonRegex);
          let parsedJson = null;
          if (match && match[1]) {
            try { parsedJson = JSON.parse(match[1].replace(/\n/g, '')); } catch(e) { parsedJson = null; }
          }

          // Si IA pide más, incrementamos attempts y continuamos
          const requestedMore = parsedJson && (parsedJson.need_more === true || (Array.isArray(parsedJson) && parsedJson.some(it => it && it.need_more)));
          if (requestedMore) {
            attempts += 1;
            setMessages(prev => [
              ...prev.filter(m => !m.typing),
              { sender: 'bot', text: 'El asesor solicita más opciones para encontrar alternativas distintas...', recommendations: [] }
            ]);
            continue; // siguiente intento (traer más candidatos)
          }

          // Si IA devolvió productos, tratar de resolverlos a productos reales
          let visibleText = aiRes;
          let recommendedProducts = [];
          if (parsedJson) {
            // parsedJson puede ser array de strings, array de objetos o un objeto con products
            let productIds = parsedJson;
            if (parsedJson.products) productIds = parsedJson.products;

            if (Array.isArray(productIds) && productIds.length > 0 && typeof productIds[0] === 'string') {
              for (const name of productIds) {
                const candidates = await resolveNameToProducts(String(name), deptoBusqueda, null, profileData, localCandidates);
                if (candidates && candidates.length > 0) recommendedProducts.push(candidates[0]);
              }
            } else if (Array.isArray(productIds) && productIds.length > 0) {
              for (const rec of productIds) {
                if (!rec) continue;
                let found = null;
                if (rec.sku) found = localCandidates.find(p => p.sku === rec.sku);
                if (!found && rec.id_producto) found = localCandidates.find(p => String(p.id_producto) === String(rec.id_producto));
                if (!found && (rec.nombre || rec.nombre_producto)) {
                  const cand = await resolveNameToProducts(String(rec.nombre || rec.nombre_producto), deptoBusqueda, null, profileData, localCandidates);
                  if (cand && cand.length > 0) found = cand[0];
                }
                if (found) recommendedProducts.push(found);
              }
            }

            // Asegurar outfit completo
            recommendedProducts = ensureCompleteOutfit(recommendedProducts, localCandidates, profileData, userQuery);

            // Comprobar similitud con última recomendación
            const lastBotMsg = messages.slice().reverse().find(m => m.sender === 'bot' && m.recommendations && m.recommendations.length > 0);
            let tooSimilar = false;
            try {
              if (lastBotMsg && lastBotMsg.recommendations && lastBotMsg.recommendations.length > 0) {
                const prevIds = new Set(lastBotMsg.recommendations.map(p => String(p.id_producto || p.sku || '').toLowerCase()));
                const overlap = recommendedProducts.filter(p => prevIds.has(String(p.id_producto || p.sku || '').toLowerCase())).length;
                const ratio = recommendedProducts.length > 0 ? (overlap / recommendedProducts.length) : 0;
                tooSimilar = ratio >= 0.5;
              }
            } catch (e) { tooSimilar = false; }

            if (tooSimilar && attempts < maxAttempts) {
              attempts += 1;
              setMessages(prev => [
                ...prev.filter(m => !m.typing),
                { sender: 'bot', text: 'Las opciones resultaron muy parecidas a lo ofrecido antes; buscando alternativas más variadas...', recommendations: [] }
              ]);
              continue; // pedir más
            }

            // Mostrar resultado final
            visibleText = aiRes.replace(jsonRegex, '').trim();
            visibleText = cleanBotResponse(visibleText); // ⭐ Limpiar respuesta antes de mostrar
            setMessages(prev => [
              ...prev.filter(m => !m.typing),
              { sender: 'bot', text: visibleText, recommendations: recommendedProducts }
            ]);

            // reset auto-fetch counter
            setAssistantAutoFetchCount(0);
            setLoading(false);
            return;
          }

          // Si AI no devolvió nada útil, incrementamos attempts
          attempts += 1;
        }

        // Si llegamos aquí, no obtuvimos recomendaciones satisfactorias tras maxAttempts
        setMessages(prev => [
          ...prev.filter(m => !m.typing),
          { sender: 'bot', text: 'Lo siento — no he podido encontrar una combinación suficientemente distinta. Puedes intentar aclarar la preferencia o revisar el catálogo manualmente.', recommendations: [] }
        ]);
        setAssistantAutoFetchCount(0);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error en Buscar más (auto):', e);
        setLoading(false);
      }
    };

    if (open && auth.token) {
      // Si el chat está abierto y HAY un token, carga el perfil
      console.log("Detectado cambio de usuario o apertura, cargando perfil...");
      loadProfile();
    } else if (open) {
      // Si el chat está abierto pero NO hay token (logout), limpia el perfil
      console.log("Detectado logout, limpiando perfil...");
      setProfileData(null);
      setProfileLoading(false);
    }
    
  }, [open, auth.token]); // Depende de 'open' y 'auth.token'


  // Auto scroll cuando cambian los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll al último mensaje cuando se abre el chat
  useEffect(() => {
    if (open) {
      // Usar timeout para asegurar que el DOM esté renderizado
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [open]);

  // ... (toggleOpen y resetConversation sin cambios) ...
  const toggleOpen = () => setOpen(!open);
  const resetConversation = () => {
    setMessages([
      {
        sender: "bot",
        text: "¡Hola! Soy tu asesor de moda IA de H&M 👗🕶️. Cuéntame, ¿qué tienes en mente hoy?",
        recommendations: [] 
      },
    ]);
    setPrompt("");
    setLoading(false);
  };

  // Cargar más candidatos desde el backend (paginado) y mostrar nuevas sugerencias
  const handleBuscarMas = async (opts = { auto: false, attempt: 0, reason: null }) => {
    try {
      // Determinar última consulta del usuario con contenido significativo
      const reversedMsgs = [...messages].slice().reverse();
      let userQuery = '';
      const genericWords = ['otros', 'más', 'mas', 'diferente', 'alternativas', 'opciones', 'otro', 'otra'];
      
      for (const msg of reversedMsgs) {
        if (msg.sender === 'user') {
          const trimmed = msg.text.trim();
          const isGeneric = trimmed.split(/\s+/).every(word => 
            word.length <= 3 || genericWords.includes(word.toLowerCase().replace(/[¿?!]/g, ''))
          );
          if (!isGeneric && trimmed.length > 5) {
            userQuery = trimmed;
            break;
          }
        }
      }
      
      // Fallback: usar prompt actual o último mensaje
      if (!userQuery) {
        const lastUserMsg = reversedMsgs.find(m => m.sender === 'user');
        userQuery = lastUserMsg ? lastUserMsg.text : prompt || '';
      }
      
      console.log(`[handleBuscarMas] Query detectado: "${userQuery}"`);

      let currentPageKey = 'general';
      if (location.pathname.includes('/mujer')) currentPageKey = 'mujer';
      else if (location.pathname.includes('/hombre')) currentPageKey = 'hombre';
      else if (location.pathname.includes('/nino')) currentPageKey = 'nino';
      else if (location.pathname.includes('/nina')) currentPageKey = 'nina';
      const deptoBusqueda = profileData?.departamento_preferido || (currentPageKey !== 'general' ? currentPageKey : null);


      // Elegir una página aleatoria entre las no solicitadas aún (si tenemos total)
      const limit = 50;
      const total = assistantTotal || 0;
      const estimatedTotal = total > 0 ? total : Math.max(500, assistantTotal || 500);
      const totalPages = Math.max(1, Math.ceil(estimatedTotal / limit));

      // elegir páginas disponibles (no solicitadas aún)
      const fetched = assistantFetchedPages || [];
      let availablePages = [];
      for (let i = 1; i <= totalPages; i++) availablePages.push(i);
      const notFetched = availablePages.filter(p => !fetched.includes(p));
      let nextPage;
      if (notFetched.length > 0) {
        nextPage = notFetched[Math.floor(Math.random() * notFetched.length)];
      } else {
        // si ya consultamos todas, volver a samplear aleatoriamente
        nextPage = availablePages[Math.floor(Math.random() * availablePages.length)];
      }

      const asRes = await assistantSearch(userQuery, deptoBusqueda || null, limit, nextPage);
      const newCandidates = asRes.candidates || [];
      console.log(`[handleBuscarMas] Página aleatoria ${nextPage} → ${newCandidates.length} candidatos nuevos (total acumulado: ${(assistantCandidates || []).length + newCandidates.length})`);
      if (newCandidates.length === 0) {
        console.log(`[handleBuscarMas] Página ${nextPage} vacía. Intentando siguiente página...`);
        // Si página vacía, marcar como consultada y reintentar con nueva página (recursivo)
        setAssistantFetchedPages(prev => [...new Set([...prev, nextPage])]);
        const currentAttempt = opts.attempt || 1;
        if (currentAttempt < MAX_AUTO_ATTEMPTS) {
          return await handleBuscarMas({ auto: opts.auto, attempt: currentAttempt + 1, reason: opts.reason || 'empty_page' });
        } else {
          console.log(`[handleBuscarMas] Agotados intentos (${MAX_AUTO_ATTEMPTS}). Mostrando mensaje final.`);
          setMessages(prev => [
            ...prev.filter(m => !m.typing),
            { sender: 'bot', text: 'He revisado múltiples páginas pero no encuentro más opciones adecuadas en este momento. ¿Podrías ser más específico con tu solicitud?' }
          ]);
          setLoading(false);
          setAssistantAutoFetchCount(0);
          return;
        }
      }

      // Local snapshot de candidatos acumulados (estado puede no haberse actualizado aún)
      const accumulated = [...(assistantCandidates || []), ...newCandidates];

      // Actualizar estado global y páginas consultadas
      setAssistantCandidates(prev => [...(prev || []), ...newCandidates]);
      setAssistantPage(asRes.page || nextPage);
      setAssistantTotal(asRes.total || assistantTotal);
      setAssistantFetchedPages(prev => Array.from(new Set([...(prev || []), asRes.page || nextPage])));

      // Si estamos en modo automático, volvemos a invocar a la IA con los candidatos acumulados
      if (opts && opts.auto) {
        try {
          // Construir mensajes para el prompt: incluir un mensaje explicito indicando
          // que se solicitan más alternativas cuando la invocación es automática.
          const promptMessages = (opts.reason === 'too_similar' || opts.reason === 'need_more')
            ? [...messages, { sender: 'bot', text: 'El asesor solicita más alternativas para encontrar combinaciones más variadas.' }]
            : messages.concat([]);

          const fullPrompt = buildSuperPrompt(
            promptMessages,
            profileData,
            lookups,
            currentPageKey,
            accumulated
          );

          console.log(`[Auto re-invoke AI] Intento ${opts.attempt || 1}/${MAX_AUTO_ATTEMPTS} | Candidatos: ${accumulated.length} | Razón: ${opts.reason || 'unknown'}`);
          const aiRes = await askAI(fullPrompt);
          const jsonRegex = /###PRODUCTS###([\s\S]*?)###END_PRODUCTS###/;
          const match = aiRes.match(jsonRegex);
          let parsedJson = null;
          if (match && match[1]) {
            try { parsedJson = JSON.parse(match[1].replace(/\n/g, '')); } catch(e) { parsedJson = null; }
          }

          const requestedMore = parsedJson && (parsedJson.need_more === true || (Array.isArray(parsedJson) && parsedJson.some(it => it && it.need_more)));
          if (requestedMore) {
            const currentAttempt = opts.attempt || 1;
            console.log(`[Auto re-invoke AI] IA solicitó más candidatos (need_more=true). Intento ${currentAttempt}/${MAX_AUTO_ATTEMPTS}.`);
            if (currentAttempt < MAX_AUTO_ATTEMPTS) {
              const nextAttempt = currentAttempt + 1;
              setAssistantAutoFetchCount(nextAttempt);
              return await handleBuscarMas({ auto: true, attempt: nextAttempt, reason: 'need_more' });
            } else {
              // agotados los intentos, avisar al usuario y finalizar loading
              setMessages(prev => [
                ...prev.filter(m => !m.typing),
                { sender: 'bot', text: 'He terminado de buscar más opciones y no encontré suficientes alternativas radicalmente distintas.', recommendations: [] }
              ]);
              setAssistantAutoFetchCount(0);
              setLoading(false);
              return;
            }
          }

          // Si la IA devolvió productos, intentar resolverlos y mostrarlos
          if (parsedJson) {
            let visibleText = aiRes.replace(jsonRegex, '').trim();
            let recommendedProducts = [];
            let productIds = parsedJson.products || parsedJson;

            if (Array.isArray(productIds) && productIds.length > 0 && typeof productIds[0] === 'string') {
              console.log(`[Auto re-invoke AI] Resolviendo ${productIds.length} nombres de productos...`);
              for (const name of productIds) {
                console.log(`[Auto re-invoke AI] Resolviendo: "${name}"`);
                const candidates = await resolveNameToProducts(String(name), deptoBusqueda, null, profileData, accumulated);
                console.log(`[Auto re-invoke AI] "${name}" → ${candidates.length} candidatos encontrados`);
                if (candidates && candidates.length > 0) {
                  recommendedProducts.push(candidates[0]);
                } else {
                  console.warn(`[Auto re-invoke AI] ⚠️ No se encontró producto para: "${name}"`);
                }
              }
            } else if (Array.isArray(productIds) && productIds.length > 0) {
              for (const rec of productIds) {
                if (!rec) continue;
                let found = null;
                if (rec.sku) found = accumulated.find(p => p.sku === rec.sku);
                if (!found && rec.id_producto) found = accumulated.find(p => String(p.id_producto) === String(rec.id_producto));
                if (!found && (rec.nombre || rec.nombre_producto)) {
                  const needle = String(rec.nombre || rec.nombre_producto).toLowerCase().trim();
                  found = accumulated.find(p => ((p.nombre_producto || p.nombre || '') + '').toLowerCase().includes(needle));
                }
                if (found) recommendedProducts.push(found);
              }
            }

            // completar outfit si falta
            try { recommendedProducts = ensureCompleteOutfit(recommendedProducts, accumulated, profileData, userQuery); } catch(e) {}

            console.log(`[Auto re-invoke AI] IA devolvió ${recommendedProducts.length} productos. Mostrando resultado final.`);
            // Mostrar resultado al usuario
            visibleText = cleanBotResponse(visibleText || 'Aquí tienes más opciones:'); // ⭐ Limpiar respuesta
            setMessages(prev => [
              ...prev.filter(m => !m.typing),
              { sender: 'bot', text: visibleText, recommendations: recommendedProducts }
            ]);
            // reset counter y finalizar loading
            setAssistantAutoFetchCount(0);
            setLoading(false);
            return;
          }

        } catch (e) {
          console.error('Error en auto re-invocar IA tras BuscarMas:', e);
        }
      }

      // Si no es modo automático, mostrar una combinación simple a partir de los candidatos
      const pick = { upper: null, lower: null, shoes: null };
      for (const c of accumulated) {
        const cat = guessCategory(c);
        if (cat && !pick[cat]) pick[cat] = c;
      }
      const combo = [pick.upper, pick.lower, pick.shoes].filter(Boolean);
      if (combo.length === 0) return;

      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Aquí tienes más opciones:', recommendations: combo }
      ]);

      // reset auto-fetch count on manual successful fetch
      setAssistantAutoFetchCount(0);

    } catch (e) {
      console.error('Error en Buscar más:', e);
    }
  };


  // --- handleAsk (Lógica de .find() CORREGIDA) ---
  const handleAsk = async () => {
    if (!prompt.trim() || loading || profileLoading || lookupsLoading || !lookups) return; 

    const userMessage = { sender: "user", text: prompt };
    const currentMessages = [...messages, userMessage]; 
    setMessages(currentMessages);
    setLoading(true);
    const currentPrompt = prompt; 
    setPrompt("");   

    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: "typing", typing: true },
    ]);

      try {
        let currentPage = 'general';
      if (location.pathname.includes('/mujer')) currentPage = 'mujer';
      else if (location.pathname.includes('/hombre')) currentPage = 'hombre';
      else if (location.pathname.includes('/nino')) currentPage = 'nino';
      else if (location.pathname.includes('/nina')) currentPage = 'nina';

      // departamento a usar en búsquedas (puede ser null para global)
      let deptoBusqueda = profileData?.departamento_preferido || (currentPage !== 'general' ? currentPage : null);

      // Ya no pre-cargamos una lista rápida de productos: dejamos que la IA analice
      // y luego resolvemos nombres consultando el backend según sea necesario.
      let relevantProducts = [];
      let fuse = null; // se podrá inicializar más tarde si es necesario

      // 1) Pedir al backend la primera página de candidatos compactos basados en el prompt
      try {
        // Construir query mejorado: usar último mensaje del usuario + contexto previo si es genérico
        let searchQuery = currentPrompt.trim();
        
        // Si el query es muy corto o genérico (ej. "otros ?", "más"), usar contexto previo
        const genericWords = ['otros', 'más', 'mas', 'diferente', 'alternativas', 'opciones', 'otro', 'otra'];
        const isGeneric = searchQuery.split(/\s+/).every(word => 
          word.length <= 3 || genericWords.includes(word.toLowerCase().replace(/[¿?!]/g, ''))
        );
        
        if (isGeneric && currentMessages.length > 1) {
          // Buscar último mensaje del usuario con contenido significativo
          for (let i = currentMessages.length - 2; i >= 0; i--) {
            if (currentMessages[i].sender === 'user') {
              const prevQuery = currentMessages[i].text.trim();
              if (prevQuery.length > 5) {
                searchQuery = prevQuery;
                console.log(`[handleAsk] Query genérico detectado ("${currentPrompt}"), usando query previo: "${searchQuery}"`);
                break;
              }
            }
          }
        }
        
        // Comenzamos desde página 1 para asegurar que hay candidatos (evita páginas vacías)
        const initialPage = 1;
        console.log(`[handleAsk] Primera invocación: consultando página ${initialPage} con query="${searchQuery}"`);
        const asRes = await assistantSearch(searchQuery, deptoBusqueda || null, 50, initialPage);
        relevantProducts = asRes.candidates || [];
        console.log(`[handleAsk] Página ${initialPage} → ${relevantProducts.length} candidatos`);
        setAssistantCandidates(relevantProducts);
        setAssistantPage(asRes.page || initialPage);
        setAssistantTotal(asRes.total || 0);
        setAssistantFetchedPages([asRes.page || initialPage]);
      } catch (e) {
        console.error('Error assistantSearch inicial:', e);
        relevantProducts = [];
      }

      // 2) Construir prompt incluyendo la lista compacta de candidatos para que la IA razone
      const fullPrompt = buildSuperPrompt(
        currentMessages,
        profileData,
        lookups,
        currentPage,
        relevantProducts
      );

      console.log("--- SÚPER PROMPT ENVIADO A PUTER.JS ---");
      console.log(`[handleAsk] Candidatos incluidos en prompt: ${relevantProducts.length}`);

      // 3) Llamar a la IA con el prompt que ya incluye candidatos compactos
      const res = await askAI(fullPrompt);

      // 4. Procesar Respuesta
      let visibleText = res;
      let recommendedProducts = [];

      // Corregido para multilínea
      const jsonRegex = /###PRODUCTS###([\s\S]*?)###END_PRODUCTS###/; 
      const match = res.match(jsonRegex); 
      
      if (match && match[1]) {
        try {
          // Limpiamos el JSON de posibles saltos de línea antes de parsear
          const cleanJsonString = match[1].replace(/\n/g, '');
          const parsedJson = JSON.parse(cleanJsonString);
          const productIds = parsedJson;
          visibleText = res.replace(jsonRegex, '').trim(); 

          // Si la IA solicita más productos explícitamente
          const requestedMore = (parsedJson && parsedJson.need_more) || (Array.isArray(parsedJson) && parsedJson.some(it => it && it.need_more));
          if (requestedMore) {
            // Añadimos mensaje informando que buscamos más y disparamos la carga automática
            setMessages(prev => [
              ...prev.filter(m => !m.typing),
              { sender: 'bot', text: 'El asesor solicita más opciones. Buscando más productos...', recommendations: [] }
            ]);
            // Llamamos a handleBuscarMas (modo automático) para traer la siguiente página
            try { await handleBuscarMas({ auto: true, attempt: 1, reason: 'need_more' }); } catch (e) { console.error('Error auto BuscarMas tras need_more:', e); }
            // No procesamos más este resultado (la nueva página añadirá sugerencias)
            // Nota: NO llamamos setLoading(false) aquí; handleBuscarMas se encargará al final
            return;
          }
          visibleText = res.replace(jsonRegex, '').trim(); 
          
          // productIds puede ser [{sku, id_producto, nombre}, ...] o un array de strings (nombres)
          if (Array.isArray(productIds) && productIds.length > 0 && typeof productIds[0] === 'string') {
            // IA devolvió nombres simples -> intentamos match local primero
            recommendedProducts = productIds.map(name => {
              const needle = String(name).toLowerCase().trim();
              // Comparación directa en los productos relevantes
              let found = relevantProducts.find(p => ((p.nombre_producto || p.nombre || '') + '').toLowerCase().includes(needle));
              // Si no lo encontramos, intentar Fuse.js local (fuzzy) si está disponible
              if (!found && typeof fuse !== 'undefined' && fuse) {
                try {
                  const fRes = fuse.search(String(name));
                  if (fRes && fRes.length > 0) found = fRes[0].item;
                } catch (e) { /* ignore */ }
              }
              return found;
            }).filter(Boolean);

            // Si faltan algunos nombres, intentamos buscarlos en el backend (fallback rápido)
            if (recommendedProducts.length < productIds.length) {
              const missing = productIds.filter(n => !recommendedProducts.find(p => ((p.nombre_producto || p.nombre || '') + '').toLowerCase().includes(String(n).toLowerCase().trim())));
              for (const name of missing) {
                try {
                  // usa la variable deptoBusqueda calculada al inicio
                  deptoBusqueda = profileData?.departamento_preferido || (currentPage !== 'general' ? currentPage : null);
                  // Intento resolver nombre mediante varias estrategias (Fuse, backend, traducción, tokens)
                  const candidates = await resolveNameToProducts(String(name), deptoBusqueda, fuse, profileData, relevantProducts);
                  if (candidates && candidates.length > 0) {
                    const cand = candidates[0];
                    if (!recommendedProducts.find(p => p.id_producto === cand.id_producto)) recommendedProducts.push(cand);
                    continue; // siguiente missing
                  }
                } catch (e) {
                  console.error('Fallback backend search error (string name):', e);
                }
              }
            }

          } else {
            // IA devolvió objetos (sku/id/nombre)
            recommendedProducts = productIds.map(rec => {
              if (!rec) return null;
              let foundProduct = null;
              if (rec.sku) {
                foundProduct = relevantProducts.find(p => p.sku === rec.sku);
              }
              if (!foundProduct && rec.id_producto) {
                foundProduct = relevantProducts.find(p => String(p.id_producto) === String(rec.id_producto));
              }
              if (!foundProduct && (rec.nombre || rec.nombre_producto)) {
                const needle = String(rec.nombre || rec.nombre_producto).toLowerCase().trim();
                foundProduct = relevantProducts.find(p => ((p.nombre_producto || p.nombre || '') + '').toLowerCase().includes(needle));
                // Si no lo encontramos, probar Fuse local
                if (!foundProduct && typeof fuse !== 'undefined' && fuse) {
                  try {
                    const fRes = fuse.search(String(rec.nombre || rec.nombre_producto));
                    if (fRes && fRes.length > 0) foundProduct = fRes[0].item;
                  } catch (e) { /* ignore */ }
                }
              }
              return foundProduct;
            }).filter(Boolean);

            // Fallback rápido: para cada producto no encontrado intentamos buscar en backend por nombre
            if (recommendedProducts.length < productIds.length) {
              for (const rec of productIds) {
                const already = recommendedProducts.find(p => {
                  return (rec.sku && p.sku === rec.sku) || (rec.id_producto && String(p.id_producto) === String(rec.id_producto)) || ((rec.nombre || rec.nombre_producto) && ((p.nombre_producto || p.nombre || '') + '').toLowerCase().includes(String(rec.nombre || rec.nombre_producto).toLowerCase().trim()));
                });
                if (already) continue;
                try {
                  const nameToSearch = rec.nombre || rec.nombre_producto || (typeof rec === 'string' ? rec : null);
                  if (!nameToSearch) continue;
                  // usa la variable deptoBusqueda calculada al inicio
                  deptoBusqueda = profileData?.departamento_preferido || (currentPage !== 'general' ? currentPage : null);
                  // Intento resolver el nombre con estrategias múltiples (Fuse, backend, traducción y tokens)
                  const candidatesObj = await resolveNameToProducts(String(nameToSearch), deptoBusqueda, fuse, profileData, relevantProducts);
                  if (candidatesObj && candidatesObj.length > 0) {
                    const cand = candidatesObj[0];
                    if (!recommendedProducts.find(p => p.id_producto === cand.id_producto)) {
                      recommendedProducts.push(cand);
                      continue;
                    }
                  }
                } catch (e) {
                  console.error('Fallback backend search error (object rec):', e);
                }
              }
            }
          }

          const uniqueSkus = new Set();
          recommendedProducts = recommendedProducts.filter(prod => {
              if (!prod.sku) return true; 
              if (uniqueSkus.has(prod.sku)) {
                  return false; 
              }
              uniqueSkus.add(prod.sku);
              return true; 
          });

          console.log("Productos recomendados por la IA (extraído y filtrado):", recommendedProducts);

        } catch (e) {
          console.error("Error al parsear JSON de la IA:", e, "JSON recibido:", match[1]);
          visibleText = res; 
        }
      } else {
        console.log("No se encontró el bloque JSON ###PRODUCTS### en la respuesta.");
        visibleText = res; 
      }

      // --- NUEVO: asegurar outfit completo en frontend si la IA no devolvió todas las categorías ---
      try {
        let completed = ensureCompleteOutfit(recommendedProducts, relevantProducts, profileData, currentPrompt);
        if (completed.length > 0 && completed.length !== recommendedProducts.length) {
          console.log("Se completó outfit localmente. Antes:", recommendedProducts.length, "Ahora:", completed.length);
        }

        // Si aún faltan categorías, intentamos buscarlas por categoría (Fuse/local/backend)
        const presentCats = new Set(completed.map(p => guessCategory(p)).filter(Boolean));
        const missingCats = ['upper','lower','shoes'].filter(c => !presentCats.has(c));
        if (missingCats.length > 0) {
          const recommendedSet = new Set(completed.map(p => p?.sku || p?.id_producto));
          for (const cat of missingCats) {
            try {
              const cand = await fetchCategoryCandidate(cat, relevantProducts, recommendedSet, profileData, fuse, deptoBusqueda);
              if (cand) {
                completed.push(cand);
                recommendedSet.add(cand?.sku || cand?.id_producto);
                console.log(`[RAG] Agregado candidato por categoría ${cat}:`, cand?.id_producto || cand?.sku || cand?.nombre_producto || cand?.nombre);
              }
            } catch (errCat) {
              console.error('Error al obtener candidato por categoría', cat, errCat);
            }
          }
        }

        recommendedProducts = completed;
      } catch (e) {
        console.error("Error al completar outfit localmente:", e);
      }
      
      // B. Limpiar la etiqueta de OCASIÓN (sin cambios)
      const ocasionMatch = visibleText.match(/OCASION_DETECTADA:\[(.*?)\]/); 
      if (ocasionMatch && ocasionMatch[1]) {
          console.log("IA detectó ocasión:", ocasionMatch[1]);
          visibleText = visibleText.replace(/OCASION_DETECTADA:\[.*?\]\s*/, '').trim();
      }

      // C. Convertir Markdown simple a HTML (sin cambios)
      visibleText = visibleText
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
          .replace(/\n/g, '<br />'); 

      // 5. Mostrar la respuesta final
          // Antes de mostrar, comprobar similitud con la última recomendación mostrada
          const lastBotMsg = messages.slice().reverse().find(m => m.sender === 'bot' && m.recommendations && m.recommendations.length > 0);
          const isTooSimilar = () => {
            try {
              if (!lastBotMsg || !lastBotMsg.recommendations || lastBotMsg.recommendations.length === 0) return false;
              const prevIds = new Set(lastBotMsg.recommendations.map(p => String(p.id_producto || p.sku || '').toLowerCase()));
              if (prevIds.size === 0) return false;
              const overlap = recommendedProducts.filter(p => prevIds.has(String(p.id_producto || p.sku || '').toLowerCase())).length;
              const ratio = recommendedProducts.length > 0 ? (overlap / recommendedProducts.length) : 0;
              // Si más del 50% de las recomendaciones coinciden con las previas, consideramos similar
              return ratio >= 0.5;
            } catch (e) { return false; }
          };

          if (isTooSimilar() && assistantAutoFetchCount < MAX_AUTO_ATTEMPTS) {
            console.log('Recomendaciones demasiado similares a la última; solicitando más candidatos automáticamente.');
            const nextAttempt = (assistantAutoFetchCount || 0) + 1;
            setAssistantAutoFetchCount(nextAttempt);
            // Informar al usuario y pedir más candidatos
            setMessages(prev => [
              ...prev.filter(m => !m.typing),
              { sender: 'bot', text: 'El asesor considera que las opciones son demasiado similares a lo ya ofrecido. Buscando más alternativas más variadas...', recommendations: [] }
            ]);
            try { await handleBuscarMas({ auto: true, attempt: nextAttempt, reason: 'too_similar' }); } catch (e) { console.error('Error auto BuscarMas:', e); }
            // Nota: NO llamamos setLoading(false) aquí; handleBuscarMas se encargará al final
            return;
          }

          visibleText = cleanBotResponse(visibleText); // ⭐ Limpiar respuesta antes de mostrar
          setMessages((prev) => [
            ...prev.filter(m => !m.typing), 
            { 
              sender: "bot", 
              text: visibleText, 
              recommendations: recommendedProducts 
            },
          ]);

    } catch (err) {
      console.error("Error en handleAsk (IA Call):", err);
      setMessages((prev) => [
        ...prev.filter(m => !m.typing),
        { sender: "bot", text: "⚠️ Hubo un error al procesar tu solicitud con la IA.", recommendations: [] },
      ]);
    }

    setLoading(false); 
  };
  
  // --- Placeholder y lógica de deshabilitado actualizados ---
  const isAnythingLoading = loading || profileLoading || lookupsLoading;
  const canSubmit = !isAnythingLoading && lookups && prompt.trim();
  const placeholderText = 
    lookupsLoading ? "Cargando opciones..." :
    profileLoading ? "Cargando tu perfil..." :
    !lookups ? "Error al cargar opciones" :
    "Escribe tu consulta de moda...";


  // --- Renderizado del Componente (ACTUALIZADO) ---
  return (
    <div>
      <button className="chatbot-toggle-button" onClick={toggleOpen}>
        <img src={IA_logo} alt="IA" className="chatbot-icon" />
      </button>

      {open && (
        <div className="chatbot-window">
          {/* ... (Cabecera sin cambios) ... */}
          <div className="chatbot-header">
            Asesor H&M
            <div className="chatbot-controls">
              <button className="reset-btn" onClick={resetConversation} title="Reiniciar conversación"> ↻ </button>
              <button className="close-btn-chatbot" onClick={toggleOpen} title="Cerrar chat"> ✖ </button>
            </div>
          </div>

          <div className="chatbot-body">
            {/* Mensajes de carga separados */}
            {profileLoading && (
              <div className="message bot-message">Cargando tu perfil...</div>
            )}
            {lookupsLoading && (
              <div className="message bot-message">Cargando opciones...</div>
            )}
            {!lookupsLoading && !lookups && (
               <div className="message bot-message error">No se pudieron cargar las opciones. Intenta reabrir el chat.</div> 
            )}
            
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message ${
                  msg.sender === "user"
                    ? "user-message"
                    : msg.typing
                    ? "bot-message typing"
                    : "bot-message"
                }`}
              >
                {msg.typing ? (
                  <><span></span><span></span><span></span></>
                ) : (
                  // --- (Lógica de renderizado Markdown/HTML sin cambios) ---
                  msg.sender === 'user' ? (
                    <div className="user-message-content">
                      {msg.text.split("\n").map((line, idx) => ( 
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div 
                      className="bot-message-content" 
                      dangerouslySetInnerHTML={{ __html: msg.text }} 
                    />
                  )
                )}

                {/* --- Bloque de Links (ACTUALIZADO CON SKU) --- */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="chatbot-recommendations">
                    <p><strong>Te podría interesar:</strong></p>
                    {msg.recommendations.map((prod) => (
                      <div key={prod.sku || prod.id_producto} className="chatbot-product-card">
                        <Link
                          to={`/producto/${prod.id_producto}`}
                          onClick={toggleOpen}
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#c82333',
                            color: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            margin: '4px 0'
                          }}
                        >
                          {prod.nombre_producto || prod.nombre || 'Ver producto'}
                        </Link>
                      </div>
                    ))}
                    {/* Botón Buscar más: carga siguiente página de candidatos desde backend */}
                    {assistantTotal > (assistantCandidates?.length || 0) && (
                      <div style={{ marginTop: 8 }}>
                        <button className="buscar-mas-btn" onClick={handleBuscarMas}>
                          Buscar más
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* --- FIN Bloque de Links --- */}

              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ... (Input ACTUALIZADO) ... */}
          <div className="chatbot-input-container">
            <textarea
              className="chatbot-input"
              placeholder={placeholderText}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              disabled={isAnythingLoading || !lookups} // Deshabilita si carga algo
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
            <button
              className="chatbot-submit-button"
              onClick={handleAsk}
              disabled={!canSubmit} // Usa la variable combinada
            >
              {loading ? "..." : (isAnythingLoading ? "..." : "Enviar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatbot;