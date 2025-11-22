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
 - INSTRUCCIÓN DE OUTFIT COMPLETO:
   - SI ES POSIBLE, recomienda un outfit completo compuesto por:
     1) Ropa SUPERIOR (camisa/blusa/chaqueta), 
     2) Ropa INFERIOR (pantalón/falda/short), 
     3) CALZADO (zapatos/zapatillas/botas).
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
  upper: ['top','shirt','camisa','blusa','tee','t-shirt','polo','sweater','jersey','chaqueta','coat','cardigan','sudadera','camiseta'],
  lower: ['pant','pantal','jean','jeans','short','bermuda','skirt','falda','trouser','leggings'],
  shoes: ['shoe','zapato','sneaker','zapatilla','boot','bota','calzado']
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

// IMPORTANT: Ignorar filtro por talla en búsquedas — siempre permitir productos.
// Razon: hemos simulado que `ProductDetailPage` siempre muestra la talla correcta del usuario,
// por lo que no queremos que la búsqueda excluya candidatos por diferencias de talla.
const tallaMatchesProfile = (prod, profile) => {
  return true;
};

const ensureCompleteOutfit = (recommended, allProducts, profile) => {
  const mapByCategory = { upper: [], lower: [], shoes: [] };
  const alreadySkus = new Set(recommended.map(p => p?.sku || p?.id_producto));

  // populate with existing recommended
  recommended.forEach(p => {
    const cat = guessCategory(p);
    if (cat) mapByCategory[cat].push(p);
  });

  // buscamos en allProducts para completar faltantes
  ['upper','lower','shoes'].forEach(cat => {
    if (mapByCategory[cat].length === 0) {
      const candidate = (allProducts || []).find(p => {
        if (alreadySkus.has(p?.sku || p?.id_producto)) return false;
        if (!tallaMatchesProfile(p, profile)) return false;
        const g = guessCategory(p);
        return g === cat;
      });
      if (candidate) {
        mapByCategory[cat].push(candidate);
        alreadySkus.add(candidate?.sku || candidate?.id_producto);
      }
    }
  });

  // Construir array final preservando orden upper->lower->shoes y unicidad
  const final = [];
  ['upper','lower','shoes'].forEach(cat => {
    mapByCategory[cat].forEach(p => {
      if (!final.find(x => (x.sku || x.id_producto) === (p.sku || p.id_producto))) final.push(p);
    });
  });

  // Añadir cualquier recomendado original que no hayan sido categorizados
  recommended.forEach(p => {
    if (!final.find(x => (x.sku || x.id_producto) === (p.sku || p.id_producto))) final.push(p);
  });

  return final;
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
 
  const messagesEndRef = useRef(null);
  const { auth } = useAuth(); 
  const location = useLocation(); 

  // --- useEffect #1: Carga los Lookups (colores, estilos, etc.) UNA VEZ ---
  useEffect(() => {
    const loadLookups = async () => {
      setLookupsLoading(true);
      try {
        const lookupData = await getAllLookups();
        setLookups(lookupData);
      } catch (error) {
        console.error("Error al cargar lookups del chatbot:", error);
        setLookups(null); // Marcar que la carga falló
      } finally {
        setLookupsLoading(false);
      }
    };

    // Carga solo si el chat está abierto y los lookups no se han cargado
    if (open && !lookups) {
      loadLookups();
    }
  }, [open, lookups]); // Depende de 'open' y 'lookups'


  // --- useEffect #2: Carga el Perfil (nombre, tallas) CADA VEZ que el usuario cambia ---
  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        // Asumimos que getProfile() ya te trae las tallas
        const profile = await getProfile(auth.token);
        // Asumimos que getPreferences() ya te trae colores/estilos
        const prefs = await getPreferences(auth.token);
        const ajustes = await getUserAjustes(auth.token); // Esto devuelve el array de ajustes
        
        // --- ¡¡¡LA CORRECCIÓN ESTÁ AQUÍ!!! ---
        // Guardamos el array 'ajustes' dentro de una propiedad 'ajustes'
        setProfileData({ ...profile, ...prefs, ajustes: ajustes });

      } catch (error) {
        console.error("Error al cargar perfil del chatbot:", error);
        setProfileData(null);
      } finally {
        setProfileLoading(false);
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


  // ... (useEffect de Auto scroll sin cambios) ...
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  const handleBuscarMas = async () => {
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

      const nextPage = assistantPage + 1;
      const asRes = await assistantSearch(userQuery, deptoBusqueda || null, 50, nextPage);
      const newCandidates = asRes.candidates || [];
      if (newCandidates.length === 0) return;
      // Append new candidates to state
      setAssistantCandidates(prev => [...(prev || []), ...newCandidates]);
      setAssistantPage(nextPage);
      setAssistantTotal(asRes.total || assistantTotal);

      // Construir una combinación simple a partir de los candidatos (una por categoría)
      const pick = { upper: null, lower: null, shoes: null };
      for (const c of [...(assistantCandidates || []), ...newCandidates]) {
        const cat = guessCategory(c);
        if (cat && !pick[cat]) pick[cat] = c;
      }
      const combo = [pick.upper, pick.lower, pick.shoes].filter(Boolean);
      if (combo.length === 0) return;

      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Aquí tienes más opciones:', recommendations: combo }
      ]);

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
        const asRes = await assistantSearch(currentPrompt, deptoBusqueda || null, 50, 1);
        relevantProducts = asRes.candidates || [];
        setAssistantCandidates(relevantProducts);
        setAssistantPage(1);
        setAssistantTotal(asRes.total || 0);
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
            // Llamamos a handleBuscarMas para traer la siguiente página
            try { await handleBuscarMas(); } catch (e) { console.error('Error auto BuscarMas tras need_more:', e); }
            // No procesamos más este resultado (la nueva página añadirá sugerencias)
            setLoading(false);
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
        let completed = ensureCompleteOutfit(recommendedProducts, relevantProducts, profileData);
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