/* Archivo: src/pages/ProfilePage.jsx (FINALIZADO con Ajustes) */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getProfile, updateProfile, 
  getPreferences, updatePreferences, 
  getUserAjustes, updateUserAjustes // <-- NUEVOS SERVICIOS
} from '../services/userService';
import { getAllLookups } from '../services/lookupService';
import useAuth from '../hooks/useAuth';
import Toast from '../components/Toast';
import './profile.css'; 

function ProfilePage() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  // --- Estados ---
  const [profileData, setProfileData] = useState({
    nombre: '', email: '', genero: 'femenino', edad: 18, altura_cm: '', peso_kg: '',
    tipo_cuerpo: 'medio', tonoPielLabel: '', pecho_cm: '', cintura_cm: '', cadera_cm: '',
    largo_brazo_cm: '', largo_pierna_tiro_cm: '', talla_calzado: '',
    direccion: '', dni: '' // <-- AÑADIDO: dirección y DNI
  });
  
  const [preferences, setPreferences] = useState({
    estilos: [], ocasiones: [], colores: [],
    ajustes: [], // <-- AÑADIDO: Array de objetos {id_categoria, talla_habitual, ajuste_preferido}
  });

  // El lookup ahora necesita las Categorías de la BDD
  const [lookups, setLookups] = useState({ 
    estilos: [], ocasiones: [], colores: [], categorias: [] // <-- AÑADIDO: Categorías
  }); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [toast, setToast] = useState(null); // Toast notification

  // --- Datos para el Selector de Tono de Piel ---
  const tonos = [
    { id: "tono1", color: "#FCEBD2", label: "Muy claro" },
    { id: "tono2", color: "#F7D7B0", label: "Claro" },
    { id: "tono3", color: "#EFB07E", label: "Claro-medio" },
    { id: "tono4", color: "#D87B4A", label: "Medio" },
    { id: "tono5", color: "#C7562D", label: "Oscuro" },
    { id: "tono6", color: "#60341E", label: "Muy oscuro" },
  ];

  // --- Cargar Datos Iniciales ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!auth.token) {
        setError('Debes iniciar sesión para ver/editar tu perfil.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Cargar lookups y todas las preferencias en paralelo
        const [lookupData, profile, prefs, ajustes] = await Promise.all([ // <-- Añadido 'ajustes'
          getAllLookups(),
          getProfile(auth.token),
          getPreferences(auth.token),
          getUserAjustes(auth.token) // <-- LLAMADA NUEVA
        ]);

        // Necesitas actualizar el servicio getAllLookups para que también traiga las categorías
        // Por ahora, simulamos las categorías aquí para que compile el front
        const simulatedLookupData = {
          ...lookupData,
          categorias: [{id_categoria: 1, nombre_categoria: 'Camisas'}, {id_categoria: 2, nombre_categoria: 'Pantalones'}] // ¡DEBES TRAER ESTO DE LA API!
        };
        setLookups(simulatedLookupData);
        
        // Traducción inversa (API -> Formulario)
        let generoForm = (profile.departamento_preferido === 'hombre' || profile.departamento_preferido === 'nino') ? 'masculino' : 'femenino';

        setProfileData({
          ...profile,
          genero: generoForm,
          edad: profile.edad || 18,
          altura_cm: profile.altura_cm || '',
          peso_kg: profile.peso_kg || '',
          tipo_cuerpo: profile.tipo_cuerpo || 'medio',
          tonoPielLabel: profile.tono_piel || '',
          pecho_cm: profile.pecho_cm || '',
          cintura_cm: profile.cintura_cm || '',
          cadera_cm: profile.cadera_cm || '',
          talla_calzado: profile.talla_calzado || '',
          largo_brazo_cm: profile.largo_brazo_cm || '',
          largo_pierna_tiro_cm: profile.largo_pierna_tiro_cm || '',
          direccion: profile.direccion || '',
          dni: profile.dni || ''
        });
        setPreferences({ ...prefs, ajustes: ajustes }); // <-- AÑADIDO: Guarda los ajustes

        // Si entre los ajustes viene Calzado (id_categoria=12) lo cargamos en el formulario como `talla_calzado`
        try {
          const calzadoAjuste = (ajustes || []).find(a => Number(a.id_categoria) === 12 || /calzado/i.test(a.nombre_categoria || ''));
          if (calzadoAjuste && calzadoAjuste.talla_habitual) {
            setProfileData(prev => ({ ...prev, talla_calzado: calzadoAjuste.talla_habitual }));
          }
        } catch (e) {
          // no crítico — si no existe la propiedad, ignorar
        }

      } catch (err) {
        setError(err.message || 'Error al cargar los datos del perfil.');
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [auth.token]);

  // --- Manejadores de Cambios ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const selectTono = (label) => {
    setProfileData(prev => ({ ...prev, tonoPielLabel: label }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value, checked } = e.target;
    const id = parseInt(value, 10);
    setPreferences(prev => {
      const currentPrefs = prev[name] || [];
      if (checked) {
        return { ...prev, [name]: [...currentPrefs, id] };
      } else {
        return { ...prev, [name]: currentPrefs.filter(pId => pId !== id) };
      }
    });
  };
  
  // --- Manejador NUEVO para Ajustes (Talla/Fit) ---
  const handleAjusteChange = (e, field) => {
      const value = e.target.value;
      // El nombre del input es 'talla-1' o 'ajuste-1'
      const id_categoria = parseInt(e.target.name.split('-')[1], 10); 

      setPreferences(prev => {
          // 1. Busca si ya existe una preferencia para esta categoría
          const existingIndex = prev.ajustes.findIndex(a => a.id_categoria === id_categoria);
          
          let newAjustes = [...prev.ajustes];

          if (existingIndex !== -1) {
              // 2. Si existe, actualiza el campo (talla_habitual o ajuste_preferido)
              newAjustes[existingIndex] = { 
                  ...newAjustes[existingIndex], 
                  [field]: value // 'talla_habitual' o 'ajuste_preferido'
              };
          } else {
              // 3. Si no existe, crea una nueva entrada
              newAjustes.push({ 
                  id_categoria: id_categoria, 
                  [field]: value,
                  talla_habitual: field === 'talla_habitual' ? value : '', 
                  ajuste_preferido: field === 'ajuste_preferido' ? value : 'regular',
                  nombre_categoria: lookups.categorias.find(c => c.id_categoria === id_categoria)?.nombre_categoria 
              });
          }

          return { ...prev, ajustes: newAjustes };
      });
  };

  // --- Guardar Cambios ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Traducción (Formulario -> API)
      let departamento_preferido = (profileData.genero === 'femenino') 
        ? (parseInt(profileData.edad, 10) <= 16 ? 'nina' : 'mujer')
        : (parseInt(profileData.edad, 10) <= 16 ? 'nino' : 'hombre');

      const profileApiPayload = {
        // ... (Tu payload de profileApiPayload) ...
        nombre: profileData.nombre,
        departamento_preferido: departamento_preferido,
        edad: parseInt(profileData.edad, 10),
        altura_cm: profileData.altura_cm || null,
        peso_kg: profileData.peso_kg || null,
        tipo_cuerpo: profileData.tipo_cuerpo,
        tono_piel: profileData.tonoPielLabel || null,
        pecho_cm: profileData.pecho_cm || null,
        cintura_cm: profileData.cintura_cm || null,
        cadera_cm: profileData.cadera_cm || null,
        talla_calzado: profileData.talla_calzado || null,
        direccion: profileData.direccion || null,
        dni: profileData.dni || null
      };
      
      // 2. Preparamos payloads
      const preferencesApiPayload = { estilos: preferences.estilos, ocasiones: preferences.ocasiones, colores: preferences.colores };
      // Filtrar ajustes para eliminar cualquier ajuste de la categoría Calzado (id 12) o cuyo nombre incluya 'calzado'
      const ajustesFiltrados = (preferences.ajustes || []).filter(a => {
        if (!a) return false;
        if (a.id_categoria && Number(a.id_categoria) === 12) return false;
        if (a.nombre_categoria && /calzado/i.test(a.nombre_categoria)) return false;
        return true;
      });
      const ajustesApiPayload = { ajustes: ajustesFiltrados }; // <-- Payload de ajustes (sin calzado)

      // 3. Llamamos a TODAS las APIs
      await Promise.all([
        updateProfile(profileApiPayload, auth.token),
        updatePreferences(preferencesApiPayload, auth.token),
        updateUserAjustes(ajustesApiPayload, auth.token) // <-- LLAMADA FINAL
      ]);


      setSuccess('¡Perfil y preferencias actualizados exitosamente!');
      setToast({
        message: '¡Perfil actualizado exitosamente!',
        type: 'success'
      });

    } catch (err) {
      setError(err.message || 'Error al guardar los cambios.');
      console.error("Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };


  if (loading) return <div className="registro-page"><p>Cargando perfil...</p></div>;

  return (
    <div className="registro-page">
      <div className="registro-card">
        <header className="registro-header">
          <h2>Mi Perfil y Preferencias de IA</h2>
          <p>Completa o actualiza esta información para que nuestro Asesor de IA te conozca mejor.</p>
        </header>

        <form className="registro-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <div className="cols"> 
            
            {/* --- Columna Izquierda (Datos Básicos y Físicos) --- */}
            <div className="col izquierda">
              {/* ... (Tus secciones 1, 2 y 3) ... */}
               <h4>1. Datos Básicos</h4>
              <label>
                Nombre o apodo
                <input type="text" name="nombre" value={profileData.nombre} onChange={handleChange} />
              </label>
              <label>
                Correo electrónico (no editable)
                <input type="email" name="email" value={profileData.email} disabled readOnly />
              </label>
              <label>
                Edad
                <input type="number" name="edad" value={profileData.edad} onChange={handleChange} min="1" />
              </label>
              <div className="genero"> {/* Reutiliza la clase 'genero' */}
                <span>Compro para:</span>
                <label>
                  <input type="radio" name="genero" value="femenino" checked={profileData.genero === 'femenino'} onChange={handleChange} /> Femenino
                </label>
                <label>
                  <input type="radio" name="genero" value="masculino" checked={profileData.genero === 'masculino'} onChange={handleChange} /> Masculino
                </label>
              </div>

             

              <h4>3. Datos Físicos</h4>
              <label>
                Altura (cm)
                <input type="number" name="altura_cm" value={profileData.altura_cm} onChange={handleChange} />
              </label>
              <label>
                Peso (kg)
                <input type="number" step="0.1" name="peso_kg" value={profileData.peso_kg} onChange={handleChange} />
              </label>
              <label>
                Contextura
                <select name="tipo_cuerpo" value={profileData.tipo_cuerpo} onChange={handleChange}>
                  <option value="delgado">Delgado</option>
                  <option value="medio">Medio</option>
                  <option value="robusto">Robusto</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
          

              <h4>4. Tono de Piel</h4>
              <div className="tono-piel"> 
                {tonos.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tono-btn ${profileData.tonoPielLabel === t.label ? "selected" : ""}`}
                    style={{ backgroundColor: t.color }}
                    aria-label={t.label}
                    onClick={() => selectTono(t.label)} 
                    title={t.label}
                  />
                ))}
              </div>
              <input type="text" value={profileData.tonoPielLabel || ''} readOnly placeholder="Tono seleccionado" style={{marginTop: '10px', background:'#eee'}}/>
              
            </div>

            {/* --- Columna Derecha --- */}
            <div className="col derecha">
                
              {/* --- AÑADIDO: Sección 5. Ajuste por Categoría --- */}
              <h4>5. Ajustes por Categoría</h4>
              <p style={{marginBottom: '20px', fontSize: '0.9em', color:'#555'}}>Define tu talla base y tu corte ideal para cada prenda.</p>

              <fieldset className="preferences-group">
                <legend>Talla y Corte</legend>
                
                {/* Iteramos sobre las categorías (Camisas, Pantalones, etc.) */}
                { (lookups.categorias || []).filter(cat => !( /calzado/i.test(cat.nombre_categoria || '') || cat.id_categoria === 12 )).map(cat => {
                  const currentAjuste = preferences.ajustes.find(a => a.id_categoria === cat.id_categoria) || {};

                  return (
                    <div key={cat.id_categoria} style={{marginBottom: '15px', padding: '10px', borderBottom: '1px solid #eee'}}>
                      <label style={{fontWeight: 'bold', marginBottom: '8px', fontSize: '1em'}}>
                        {cat.nombre_categoria}
                      </label>
                      <div className="tallas-grid" style={{gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        
                        {/* 1. Selección de Talla Habitual */}
                        <label>
                          Talla Habitual
                          <input 
                            type="text" 
                            name={`talla-${cat.id_categoria}`} // Ejemplo: talla-1
                            value={currentAjuste.talla_habitual || ''} 
                            onChange={(e) => handleAjusteChange(e, 'talla_habitual')} 
                            placeholder="Ej: M, 32"
                          />
                        </label>
                        
                        {/* 2. Selección del Ajuste Preferido */}
                        <label>
                          Ajuste Preferido
                          <select 
                            name={`ajuste-${cat.id_categoria}`} // Ejemplo: ajuste-1
                            value={currentAjuste.ajuste_preferido || 'regular'} 
                            onChange={(e) => handleAjusteChange(e, 'ajuste_preferido')}
                          >
                            <option value="regular">Regular</option>
                            <option value="slim">Slim</option>
                            <option value="skinny">Skinny</option>
                            <option value="loose">Loose</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })}

                {/* Bloque específico para Calzado: sólo la Talla habitual (enviada vía profileApiPayload) */}
                <div key="calzado" style={{marginBottom: '15px', padding: '10px', borderBottom: '1px solid #eee'}}>
                  <label style={{fontWeight: 'bold', marginBottom: '8px', fontSize: '1em'}}>Calzado</label>
                  <div className="tallas-grid" style={{gridTemplateColumns: '1fr', gap: '15px'}}>
                    <label>
                      Talla Habitual (Calzado)
                      <input
                        type="text"
                        name="talla_calzado"
                        value={profileData.talla_calzado || ''}
                        onChange={handleChange}
                        placeholder="Ej: 42, 9, 7.5"
                      />
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* --- Sección 6. Preferencias de Estilo --- */}
              <h4>6. Preferencias de Estilo</h4>
              <fieldset className="preferences-group">
                <legend>Mis Estilos Favoritos</legend>
                {lookups.estilos.map(estilo => (
                  <label key={estilo.id_estilo} className="check small">
                    <input
                      type="checkbox"
                      name="estilos"
                      value={estilo.id_estilo}
                      checked={preferences.estilos.includes(estilo.id_estilo)}
                      onChange={handlePreferenceChange}
                    /> {estilo.nombre_estilo}
                  </label>
                ))}
              </fieldset>

              <fieldset className="preferences-group">
                <legend>Ocasiones Frecuentes</legend>
                {lookups.ocasiones.map(ocasion => (
                  <label key={ocasion.id_ocasion} className="check small">
                    <input
                      type="checkbox"
                      name="ocasiones"
                      value={ocasion.id_ocasion}
                      checked={preferences.ocasiones.includes(ocasion.id_ocasion)}
                      onChange={handlePreferenceChange}
                    /> {ocasion.nombre_ocasion}
                  </label>
                ))}
              </fieldset>
              
               <fieldset className="preferences-group">
                <legend>Colores Favoritos</legend>
                {lookups.colores.map(color => (
                  <label key={color.id_color} className="check small" style={{display:'flex', alignItems:'center'}}>
                    <input
                      type="checkbox"
                      name="colores"
                      value={color.id_color}
                      checked={preferences.colores.includes(color.id_color)}
                      onChange={handlePreferenceChange}
                    /> 
                    <span style={{
                      display: 'inline-block',
                      width: '1em',
                      height: '1em',
                      backgroundColor: color.hex_code || '#ccc',
                      border: '1px solid #666',
                      marginRight: '0.5em',
                      marginLeft: '0.2em'
                     }}></span>
                     {color.nombre_color}
                  </label>
                ))}
              </fieldset>

              {/* --- Sección 6. Medidas Específicas --- */}
              <h4>6. Medidas Específicas (Opcional)</h4>
              <div className="tallas-grid">
                <label> Pecho (cm) <input type="number" step="0.1" name="pecho_cm" value={profileData.pecho_cm} onChange={handleChange} /></label>
                <label> Cintura (cm) <input type="number" step="0.1" name="cintura_cm" value={profileData.cintura_cm} onChange={handleChange} /></label>
                <label> Cadera (cm) <input type="number" step="0.1" name="cadera_cm" value={profileData.cadera_cm} onChange={handleChange} /></label>
              </div>

              {/* Botones de acción */}
              <div className="actions">
                <button type="submit" className="btn-primario" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button type="button" className="btn-secundario" onClick={() => navigate(-1)} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Toast Notification */}
        {toast && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;