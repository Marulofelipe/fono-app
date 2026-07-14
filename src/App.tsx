import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paciente, Terapia, Bono, Cita } from './types';
import { INITIAL_PACIENTES, INITIAL_TERAPIAS, INITIAL_BONOS } from './initialData';
import { useLocalStorageState } from './hooks/useLocalStorage';
import { useGeolocation } from './hooks/useGeolocation';
import { useTherapyTimer } from './hooks/useTherapyTimer';
import { useHybridCollection } from './hooks/useHybridCollection';
import { analyzeBonoWithGemini } from './services/geminiService';

// Components
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { Toast } from './components/shared/Toast';
import { InicioView } from './components/views/InicioView';
import { AgendaView } from './components/views/AgendaView';
import { PacientesView } from './components/views/PacientesView';
import { PacienteDetalle } from './components/views/PacienteDetalle';
import { RegistrosView } from './components/views/RegistrosView';
import { BonosView } from './components/views/BonosView';
import { AjustesView } from './components/views/AjustesView';
import { SesionActivaView } from './components/views/SesionActivaView';
import { TherapyFinishModal } from './components/modals/TherapyFinishModal';
import { LeftRadiusModal } from './components/modals/LeftRadiusModal';
import { VoiceRecordingHUD } from './components/modals/VoiceRecordingHUD';

const SpeechRecognitionPolyfill = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const DEFAULT_PROFILE_PIC = "https://lh3.googleusercontent.com/aida-public/AB6AXuBK-jHW3kk2FCf9SwOPDzFC3arGUUWxoDnvEDAfeYuySbjLf4sgk2Gg7siPZxLOvs2l22QbFK88LJ_WQuM7WXrsbKGr7ccMCJ66HrX6PGnfeGfFty7_QuUGbg_9hV2ZS1t3aEvywf9il-uEMZpO6s4EuhD_prj975F-XcZxUyKKaYvMZobmQrVMzMfQruJhXMHhMfMFwcR-JuU2XvIwD7JLqjQU_-6WoxicTkhQnpFfHV4_h6fii0OAeLGZQzl2cPZocN2oRPQGmw";

type TabId = 'inicio' | 'agenda' | 'pacientes' | 'registros' | 'bonos' | 'ajustes';

interface TherapySessionState {
  pacienteId: string | null;
  active: boolean;
  arrivalTime?: string | null;
  startTime?: string | null;
}

const INITIAL_AGENDA: Cita[] = [
  { id: "c_1", pacienteId: "1029384", pacienteNombre: "Eduardo Castro", fecha: "Mañana", hora: "08:00 am" },
  { id: "c_2", pacienteId: "1056342", pacienteNombre: "Isabella Gómez Ortiz", fecha: "Viernes", hora: "02:00 pm" },
  { id: "c_3", pacienteId: "1087452", pacienteNombre: "Valentina Meza Ruiz", fecha: "Lunes", hora: "04:00 pm" },
];

export default function App() {
  // ---- State ----
  const [pacientes, setPacientes] = useHybridCollection<Paciente>('pacientes', 'silvia_pacientes', INITIAL_PACIENTES);
  const [terapias, setTerapias] = useHybridCollection<Terapia>('terapias', 'silvia_terapias', INITIAL_TERAPIAS);
  const [bonos, setBonos] = useHybridCollection<Bono>('bonos', 'silvia_bonos', INITIAL_BONOS);
  const [agenda, setAgenda] = useHybridCollection<Cita>('agenda', 'silvia_agenda', INITIAL_AGENDA);
  const [profilePic, setProfilePic] = useState<string>(() => localStorage.getItem('silvia_profile_pic') || DEFAULT_PROFILE_PIC);
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [activeView, setActiveView] = useState<string>('inicio');
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);

  // Voice
  const [isListeningGeneral, setIsListeningGeneral] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [intentNotification, setIntentNotification] = useState<{ message: string; actionText: string; callback: () => void } | null>(null);
  const [isListeningForCita, setIsListeningForCita] = useState(false);
  const [isListeningForPaciente, setIsListeningForPaciente] = useState(false);
  const [voiceInputMessage, setVoiceInputMessage] = useState('');
  const [detectedPatientData, setDetectedPatientData] = useState<Paciente | null>(null);

  // Profile settings
  const [profesionalNombre, setProfesionalNombre] = useState(() => localStorage.getItem('silvia_prof_nombre') || "Dra. Silvia Margarita Pérez F.");
  const [profesionalProfesion, setProfesionalProfesion] = useState(() => localStorage.getItem('silvia_prof_profesion') || "Fonoaudióloga Especialista");
  const [profesionalTelefono, setProfesionalTelefono] = useState(() => localStorage.getItem('silvia_prof_telefono') || "315 789 4512");
  const [profesionalCorreo, setProfesionalCorreo] = useState(() => localStorage.getItem('silvia_prof_correo') || "silvia.perez@fonoaudiologia.com");
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState(() => localStorage.getItem('silvia_emer_nombre') || "Carlos Pérez");
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState(() => localStorage.getItem('silvia_emer_telefono') || "310 456 7890");
  const [contactoEmergenciaParentesco, setContactoEmergenciaParentesco] = useState(() => localStorage.getItem('silvia_emer_parentesco') || "Esposo");

  // Therapy session
  const [sessionPatient, setSessionPatient] = useState<Paciente | null>(null);
  const [isSessionRecording, setIsSessionRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeTranscriptBlocks, setActiveTranscriptBlocks] = useState<{ id: string; tipo: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz'; hora: string; texto: string }[]>([]);
  const [newBlockText, setNewBlockText] = useState('');
  const [newBlockType, setNewBlockType] = useState<'Lenguaje' | 'Deglución' | 'Audición' | 'Voz'>('Lenguaje');
  const [therapyRadius, setTherapyRadius] = useLocalStorageState<number>('silvia_therapy_radius', 30);
  const [therapySessionState, setTherapySessionState] = useLocalStorageState<TherapySessionState>('silvia_therapy_state', { pacienteId: null, active: false, arrivalTime: null, startTime: null });
  const [therapyToastMessage, setTherapyToastMessage] = useState<string | null>(null);
  const [hasArrivedAtHome, setHasArrivedAtHome] = useState(false);
  const [showLeftRadiusModal, setShowLeftRadiusModal] = useState(false);
  const [showTherapyFinishModal, setShowTherapyFinishModal] = useState(false);
  const [finishModalPatient, setFinishModalPatient] = useState<Paciente | null>(null);
  const [patientDistance, setPatientDistance] = useState<number | null>(null);

  // Scanner
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Buscando código...');
  const [detectedBonoCode, setDetectedBonoCode] = useState('88319-K294-2026');
  const [detectedBonoFecha, setDetectedBonoFecha] = useState('24 de Junio, 2026');
  const [detectedBonoPaciente, setDetectedBonoPaciente] = useState('Eduardo Castro');
  const [scannerPhoto, setScannerPhoto] = useState<string | null>(null);
  const [manualBonoCode, setManualBonoCode] = useState('');
  const [manualBonoFecha, setManualBonoFecha] = useState('');
  const [manualBonoPacienteId, setManualBonoPacienteId] = useState('');
  const [isEditingBonoManually, setIsEditingBonoManually] = useState(false);

  // Forms
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ id: '', nombre: '', empresa: 'Colsanitas', telefono: '', diagnostico: '', sesionesTotales: 10, edad: 30, direccion: '', latitud: 0, longitud: 0 });
  const [editingPatient, setEditingPatient] = useState<Paciente | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const activeSessionRecognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Helpers ----
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const playCompletionFeedback = () => {
    if ('vibrate' in navigator) navigator.vibrate([120, 40, 120]);
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {}
  };

  const saveTherapyRecord = (paciente: Paciente, detalles: string) => {
    const finalMoment = new Date();
    const startMoment = therapySessionState.startTime ? new Date(therapySessionState.startTime) : new Date(finalMoment.getTime() - 1800000);
    const duraSeconds = Math.max(Math.round((finalMoment.getTime() - startMoment.getTime()) / 1000), 0);
    const nuevaTerapia: Terapia = {
      id: 't_' + Date.now(), pacienteId: paciente.id, pacienteNombre: paciente.nombre,
      fecha: finalMoment.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      hora: finalMoment.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      anotaciones: `${detalles}\nDuración real: ${Math.floor(duraSeconds / 60)}:${String(duraSeconds % 60).padStart(2, '0')} minutos.`,
      tipo: 'Lenguaje'
    };
    setTerapias(prev => [nuevaTerapia, ...prev]);
    setPacientes(prev => prev.map(p => {
      if (p.id === paciente.id) {
        const nuevasCompletadas = Math.min(p.sesionesCompletadas + 1, p.sesionesTotales);
        return { ...p, sesionesCompletadas: nuevasCompletadas, progresoPlan: Math.round((nuevasCompletadas / p.sesionesTotales) * 100) };
      }
      return p;
    }));
  };

  const stopTherapyMode = () => {
    stopWatching();
    therapyTimer.pause();
    setTherapySessionState(prev => ({ ...prev, active: false }));
    setHasArrivedAtHome(false);
    setShowLeftRadiusModal(false);
    setPatientDistance(null);
  };

  const openWaze = (paciente: Paciente) => {
    let url = paciente.latitud != null && paciente.longitud != null
      ? `https://waze.com/ul?ll=${paciente.latitud},${paciente.longitud}&navigate=yes&q=${encodeURIComponent(paciente.direccion || paciente.nombre)}`
      : `https://waze.com/ul?navigate=yes&q=${encodeURIComponent(paciente.direccion || paciente.nombre || 'Paciente')}`;
    window.open(url, '_blank');
  };

  // ---- Therapy Timer ----
  const handleTherapyCompletion = useCallback(() => {
    const paciente = pacientes.find(p => p.id === therapySessionState.pacienteId);
    if (!paciente) return;
    setFinishModalPatient(paciente);
    setShowTherapyFinishModal(true);
    playCompletionFeedback();
  }, [pacientes, therapySessionState.pacienteId]);

  const therapyTimer = useTherapyTimer({ key: 'silvia_therapy_timer', defaultSeconds: 1800, onComplete: handleTherapyCompletion });

  // ---- Geolocation ----
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    if (!therapySessionState.active || !therapySessionState.pacienteId) return;
    const paciente = pacientes.find(p => p.id === therapySessionState.pacienteId);
    if (!paciente || paciente.latitud == null || paciente.longitud == null) return;
    const distancia = getDistanceMeters(position.coords.latitude, position.coords.longitude, paciente.latitud, paciente.longitud);
    setPatientDistance(distancia);
    if (!hasArrivedAtHome && distancia <= therapyRadius) {
      setHasArrivedAtHome(true);
      const ahora = new Date().toISOString();
      setTherapySessionState(prev => ({ ...prev, arrivalTime: ahora, startTime: ahora }));
      therapyTimer.reset(1800);
      therapyTimer.start();
      setTherapyToastMessage(`Has llegado al domicilio de ${paciente.nombre}. Terapia iniciada.`);
      window.setTimeout(() => setTherapyToastMessage(null), 5200);
    }
    if (hasArrivedAtHome && therapyTimer.active && distancia > therapyRadius) {
      setShowLeftRadiusModal(true);
    }
  }, [therapyRadius, therapySessionState.active, therapySessionState.pacienteId, pacientes, hasArrivedAtHome, therapyTimer]);

  const { position, error, watching, startWatching, stopWatching } = useGeolocation(handlePositionUpdate);

  // ---- Therapy Actions ----
  const startTherapyMode = (paciente: Paciente) => {
    setSessionPatient(paciente);
    setActiveView('sesion_activa');
    setTherapySessionState({ pacienteId: paciente.id, active: true, arrivalTime: null, startTime: null });
    setHasArrivedAtHome(false);
    setTherapyToastMessage(`Terapia en curso activada para ${paciente.nombre}.`);
    therapyTimer.reset(1800);
    therapyTimer.pause();
    startWatching();
    window.setTimeout(() => setTherapyToastMessage(null), 4200);
  };

  const startTherapySession = (paciente: Paciente) => {
    setSessionPatient(paciente);
    setActiveView('sesion_activa');
    setIsSessionRecording(true);
    setSessionDuration(0);
    setActiveTranscriptBlocks([{ id: '1', tipo: 'Lenguaje', hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), texto: 'Inicio de la sesión. Paciente acude puntualmente.' }]);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => setSessionDuration(prev => prev + 1), 1000);
    if (SpeechRecognitionPolyfill) {
      const rec = new SpeechRecognitionPolyfill();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'es-ES';
      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript.trim()) addTranscriptionBlock(finalTranscript, 'Lenguaje');
      };
      rec.onend = () => { if (isSessionRecording && activeView === 'sesion_activa') try { rec.start(); } catch {} };
      try { rec.start(); } catch {}
      activeSessionRecognitionRef.current = rec;
    }
  };

  const addTranscriptionBlock = (texto: string, tipo: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz') => {
    setActiveTranscriptBlocks(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).substr(2, 4), tipo, hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), texto }]);
  };

  const handleAddNewManualBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockText.trim()) return;
    addTranscriptionBlock(newBlockText, newBlockType);
    setNewBlockText('');
  };

  const pauseTherapySession = () => {
    setIsSessionRecording(prev => !prev);
    if (isSessionRecording) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeSessionRecognitionRef.current) activeSessionRecognitionRef.current.stop();
    } else {
      timerIntervalRef.current = setInterval(() => setSessionDuration(prev => prev + 1), 1000);
      if (activeSessionRecognitionRef.current) try { activeSessionRecognitionRef.current.start(); } catch {}
    }
  };

  const finishAndSaveSession = () => {
    if (!sessionPatient) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (activeSessionRecognitionRef.current) { activeSessionRecognitionRef.current.onend = null; activeSessionRecognitionRef.current.stop(); }
    const fullNotes = activeTranscriptBlocks.map(b => `[${b.tipo} - ${b.hora}]: ${b.texto}`).join('\n\n');
    const nuevaTerapia: Terapia = {
      id: 't_' + Date.now(), pacienteId: sessionPatient.id, pacienteNombre: sessionPatient.nombre,
      fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      anotaciones: fullNotes || "Sesión de fonoaudiología completada sin anotaciones adicionales.",
      tipo: activeTranscriptBlocks[activeTranscriptBlocks.length - 1]?.tipo || 'Lenguaje'
    };
    setTerapias(prev => [nuevaTerapia, ...prev]);
    setPacientes(prev => prev.map(p => {
      if (p.id === sessionPatient.id) {
        const nuevasCompletadas = Math.min(p.sesionesCompletadas + 1, p.sesionesTotales);
        return { ...p, sesionesCompletadas: nuevasCompletadas, progresoPlan: Math.round((nuevasCompletadas / p.sesionesTotales) * 100) };
      }
      return p;
    }));
    setSelectedPacienteId(sessionPatient.id);
    setActiveTab('pacientes');
    setActiveView('paciente_detalle');
    setSessionPatient(null);
  };

  // ---- Therapy Modal Handlers ----
  const handleLeftRadiusFinish = () => { setShowLeftRadiusModal(false); if (!therapySessionState.pacienteId) return; const p = pacientes.find(x => x.id === therapySessionState.pacienteId); if (p) saveTherapyRecord(p, 'Terapia finalizada porque se abandonó el domicilio antes de completar el tiempo.'); stopTherapyMode(); };
  const handleTherapyFinalize = () => { setShowTherapyFinishModal(false); if (!finishModalPatient) return; saveTherapyRecord(finishModalPatient, 'Terapia domiciliaria completada exitosamente.'); stopTherapyMode(); setFinishModalPatient(null); };
  const handleTherapyAddTen = () => { therapyTimer.addSeconds(600); therapyTimer.start(); setShowTherapyFinishModal(false); };
  const handleTherapyDictation = () => { if (!finishModalPatient) return; stopTherapyMode(); startTherapySession(finishModalPatient); setShowTherapyFinishModal(false); };

  // ---- Profile persistence ----
  useEffect(() => { localStorage.setItem('silvia_profile_pic', profilePic); }, [profilePic]);
  useEffect(() => {
    const save = (k: string, v: string) => localStorage.setItem(k, v);
    save('silvia_prof_nombre', profesionalNombre);
    save('silvia_prof_profesion', profesionalProfesion);
    save('silvia_prof_telefono', profesionalTelefono);
    save('silvia_prof_correo', profesionalCorreo);
    save('silvia_emer_nombre', contactoEmergenciaNombre);
    save('silvia_emer_telefono', contactoEmergenciaTelefono);
    save('silvia_emer_parentesco', contactoEmergenciaParentesco);
  }, [profesionalNombre, profesionalProfesion, profesionalTelefono, profesionalCorreo, contactoEmergenciaNombre, contactoEmergenciaTelefono, contactoEmergenciaParentesco]);

  useEffect(() => { return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); stopCameraStream(); }; }, []);

  // ---- Voice Recognition ----
  useEffect(() => {
    if (!SpeechRecognitionPolyfill) return;
    const rec = new SpeechRecognitionPolyfill();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'es-ES';
    rec.onstart = () => { setIsListeningGeneral(true); setVoiceText('Escuchando voz...'); };
    rec.onresult = (event: any) => {
      let interimTranscript = '', finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      const fullText = (finalTranscript || interimTranscript).toLowerCase();
      setVoiceText(finalTranscript || interimTranscript);
      handleVoiceIntents(fullText);
    };
    rec.onerror = () => setIsListeningGeneral(false);
    rec.onend = () => setIsListeningGeneral(false);
    recognitionRef.current = rec;
    return () => { if (recognitionRef.current) recognitionRef.current.abort(); };
  }, [pacientes, agenda]);

  const handleVoiceIntents = (text: string) => {
    // Schedule appointment
    if (text.includes('atender a') || text.includes('agenda') || text.includes('cita para') || text.includes('cita con') || text.includes('agendar a')) {
      let detectedPatient = "", pacienteId: string | undefined;
      for (const p of pacientes) { if (text.includes(p.nombre.toLowerCase())) { detectedPatient = p.nombre; pacienteId = p.id; break; } }
      if (!detectedPatient) { for (const p of pacientes) { const fn = p.nombre.split(' ')[0].toLowerCase(); if (fn.length > 2 && text.includes(fn)) { detectedPatient = p.nombre; pacienteId = p.id; break; } } }
      let day = "Mañana";
      if (text.includes("hoy")) day = "Hoy"; else if (text.includes("lunes")) day = "Lunes"; else if (text.includes("martes")) day = "Martes"; else if (text.includes("miércoles") || text.includes("miercoles")) day = "Miércoles"; else if (text.includes("jueves")) day = "Jueves"; else if (text.includes("viernes")) day = "Viernes"; else if (text.includes("sábado") || text.includes("sabado")) day = "Sábado"; else if (text.includes("domingo")) day = "Domingo";
      let time = "08:00 am";
      const timeMatch = text.match(/a las\s+(\d+(?::\d+)?\s*(?:am|pm|a\s*m|p\s*m)?)/);
      if (timeMatch) time = timeMatch[1];
      if (!detectedPatient) { const nameMatch = text.match(/(?:atender a|cita con|agendar a)\s+([a-z\s]+?)\s+(?:a las|el|para)/); if (nameMatch) detectedPatient = nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase()); else detectedPatient = "Paciente Desconocido"; }
      const newCita: Cita = { id: 'c_' + Date.now(), pacienteId, pacienteNombre: detectedPatient, fecha: day, hora: time };
      setIntentNotification({ message: `Agendar: ${detectedPatient} (${day} a las ${time})`, actionText: "Confirmar", callback: () => { setAgenda(prev => [newCita, ...prev]); if (pacienteId) setPacientes(prev => prev.map(p => p.id === pacienteId ? { ...p, proximaCita: `${day}, ${time}` } : p)); setActiveTab('agenda'); setActiveView('agenda'); setIntentNotification(null); stopListeningGeneral(); } });
      return;
    }
    // Update patient
    if (text.includes('actualizar datos de') || text.includes('actualizar a') || text.includes('editar a') || text.includes('editar datos de')) {
      let target: Paciente | null = null;
      for (const p of pacientes) { const fn = p.nombre.split(' ')[0].toLowerCase(); if (text.includes(fn) || text.includes(p.nombre.toLowerCase())) { target = p; break; } }
      if (target) { const pt = target; setIntentNotification({ message: `Actualizar datos de ${pt.nombre}`, actionText: "Modificar", callback: () => { setEditingPatient(pt); setActiveTab('pacientes'); setActiveView('pacientes'); setIntentNotification(null); stopListeningGeneral(); } }); }
      return;
    }
    // Start therapy
    if (text.includes('atendí a') || text.includes('atendi a') || text.includes('terapia de') || text.includes('terapia con')) {
      const eduardo = pacientes.find(p => p.nombre.toLowerCase().includes('eduardo'));
      if (eduardo) setIntentNotification({ message: `Iniciar Terapia: Eduardo Castro`, actionText: "Iniciar", callback: () => { startTherapySession(eduardo); setIntentNotification(null); stopListeningGeneral(); } });
    }
  };

  const toggleListeningGeneral = () => {
    if (!SpeechRecognitionPolyfill) { alert("La Web Speech API no está soportada en este navegador. Intente usar Google Chrome."); return; }
    if (isListeningGeneral) stopListeningGeneral();
    else { setVoiceText('Iniciando micrófono...'); try { recognitionRef.current.start(); } catch {} }
  };

  const stopListeningGeneral = () => { if (recognitionRef.current) recognitionRef.current.stop(); setIsListeningGeneral(false); };

  const parseAndCreateCita = (text: string) => {
    const t = text.toLowerCase();
    let day = "Mañana";
    if (t.includes("hoy")) day = "Hoy"; else if (t.includes("lunes")) day = "Lunes"; else if (t.includes("martes")) day = "Martes"; else if (t.includes("miércoles") || t.includes("miercoles")) day = "Miércoles"; else if (t.includes("jueves")) day = "Jueves"; else if (t.includes("viernes")) day = "Viernes"; else if (t.includes("sábado") || t.includes("sabado")) day = "Sábado"; else if (t.includes("domingo")) day = "Domingo";
    let time = "08:00 am";
    const timeMatch = t.match(/a las\s+(\d+(?::\d+)?)/i);
    if (timeMatch) { let m = timeMatch[1]; if (!m.includes(':')) m += ":00"; let period = "am"; if (t.includes("pm") || t.includes("tarde")) period = "pm"; time = `${m} ${period}`; }
    let detectedPatient = "", pacId: string | undefined;
    for (const p of pacientes) { if (t.includes(p.nombre.toLowerCase())) { detectedPatient = p.nombre; pacId = p.id; break; } }
    if (!detectedPatient) { for (const p of pacientes) { const fn = p.nombre.split(' ')[0].toLowerCase(); if (fn.length > 2 && t.includes(fn)) { detectedPatient = p.nombre; pacId = p.id; break; } } }
    if (!detectedPatient) { const nameMatch = text.match(/(?:atender a|atenderé a|cita con|agendar a|cita para)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s+(?:a las|el|para|hoy|mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)|$)/i); if (nameMatch) detectedPatient = nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase()); else detectedPatient = "Paciente Nuevo"; }
    setAgenda(prev => [{ id: 'c_' + Date.now(), pacienteId: pacId, pacienteNombre: detectedPatient, fecha: day, hora: time }, ...prev]);
    if (pacId) setPacientes(prev => prev.map(p => p.id === pacId ? { ...p, proximaCita: `${day}, ${time}` } : p));
    alert("Cita agendada correctamente ✓");
  };

  const startVoiceCita = () => {
    if (!SpeechRecognitionPolyfill) { alert("Web Speech API no soportada."); return; }
    if (isListeningGeneral) stopListeningGeneral();
    setIsListeningForCita(true);
    setVoiceInputMessage("Escuchando... di la cita");
    const rec = new SpeechRecognitionPolyfill();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'es-CO';
    rec.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) { if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript; }
      const fullText = finalTranscript || Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join('');
      setVoiceInputMessage(fullText);
      if (finalTranscript) { parseAndCreateCita(finalTranscript); rec.stop(); }
    };
    rec.onerror = () => setIsListeningForCita(false);
    rec.onend = () => setIsListeningForCita(false);
    rec.start();
  };

  const parseAndProposePaciente = (text: string) => {
    const t = text.toLowerCase();
    let nombre = "", id = "", empresa = "Colsanitas", diagnostico = "", edad = 30, telefono = "315 789 4512";
    const nombreMatch = text.match(/(?:nuevo paciente|paciente)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s*,?\s*(?:cédula|cedula|id|con cédula|con cedula|diagnóstico|diagnostico|de la empresa|aseguradora|de|en)|$)/i);
    if (nombreMatch) nombre = nombreMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase()); else nombre = "Paciente Nuevo";
    const idMatch = text.match(/(?:cédula|cedula|id|identificación|identificacion)\s*(?:de|de ciudadanía|de ciudadania)?\s*(\d+)/i);
    if (idMatch) id = idMatch[1]; else { const numMatch = text.match(/\b(\d{6,10})\b/); if (numMatch) id = numMatch[1]; else id = Math.floor(1000000 + Math.random() * 9000000).toString(); }
    if (t.includes("medisanitas")) empresa = "Medisanitas";
    const diagMatch = text.match(/(?:diagnóstico|diagnostico|diagnóstico de|diagnostico de|con diagnóstico|con diagnostico)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s*,?\s*(?:cédula|cedula|id|de la empresa|aseguradora|teléfono|telefono|edad)|$)/i);
    if (diagMatch) diagnostico = diagMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
    else { const common = ["afasia", "disfagia", "disartria", "apraxia", "tartamudez", "disfonía", "retraso del lenguaje", "autismo"]; for (const cd of common) { if (t.includes(cd)) { diagnostico = cd.replace(/\b\w/g, c => c.toUpperCase()); break; } } if (!diagnostico) diagnostico = "Por definir"; }
    const edadMatch = text.match(/(\d+)\s*(?:años|anos|de edad)/i); if (edadMatch) edad = parseInt(edadMatch[1]) || 30;
    const telMatch = text.match(/(?:teléfono|telefono|celular|contacto)\s*(?:es|de)?\s*(\d[\d\s-]{6,12})/i); if (telMatch) telefono = telMatch[1].trim();
    setDetectedPatientData({ id, nombre, empresa: empresa as any, telefono, diagnostico, sesionesTotales: 10, sesionesCompletadas: 0, progresoPlan: 0, proximaCita: "No programada", edad });
  };

  const startVoicePaciente = () => {
    if (!SpeechRecognitionPolyfill) { alert("Web Speech API no soportada."); return; }
    if (isListeningGeneral) stopListeningGeneral();
    setIsListeningForPaciente(true);
    setVoiceInputMessage("Escuchando... di los datos del paciente");
    const rec = new SpeechRecognitionPolyfill();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'es-CO';
    rec.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) { if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript; }
      const fullText = finalTranscript || Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join('');
      setVoiceInputMessage(fullText);
      if (finalTranscript) { parseAndProposePaciente(finalTranscript); rec.stop(); }
    };
    rec.onerror = () => setIsListeningForPaciente(false);
    rec.onend = () => setIsListeningForPaciente(false);
    rec.start();
  };

  // ---- Camera / OCR ----
  const startScanningVoucher = async () => {
    setCameraActive(true); setIsScanning(true); setScannerStatus('Iniciando cámara...'); setScannerPhoto(null);
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } } catch { console.warn("Cámara no disponible."); }
  };

  const captureBonoPhoto = async () => {
    let photoBase64: string;
    if (!videoRef.current || !videoRef.current.videoWidth) { photoBase64 = './assets/silvia_m_perez_logo.png'; setScannerPhoto(photoBase64); stopCameraStream(); }
    else { const canvas = document.createElement('canvas'); canvas.width = videoRef.current.videoWidth || 640; canvas.height = videoRef.current.videoHeight || 480; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); photoBase64 = canvas.toDataURL('image/jpeg'); setScannerPhoto(photoBase64); stopCameraStream(); }
    setIsScanning(true); setScannerStatus('Procesando OCR con Gemini IA...');
    try {
      const result = await analyzeBonoWithGemini(photoBase64);
      if (result.codigoPago && result.codigoPago !== 'NO_ENCONTRADO' && result.codigoPago !== 'ERROR') setDetectedBonoCode(result.codigoPago);
      else setDetectedBonoCode(`${Math.floor(10000 + Math.random() * 90000)}-B${Math.floor(100 + Math.random() * 900)}-2026`);
      if (result.fecha && result.fecha !== 'NO_ENCONTRADO' && result.fecha !== 'ERROR') setDetectedBonoFecha(result.fecha);
      else setDetectedBonoFecha(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }));
      if (result.pacienteNombre && result.pacienteNombre !== 'NO_ENCONTRADO' && result.pacienteNombre !== 'ERROR') setDetectedBonoPaciente(result.pacienteNombre);
      else { const rp = pacientes[Math.floor(Math.random() * pacientes.length)]; setDetectedBonoPaciente(rp?.nombre || 'Paciente no identificado'); }
      setScannerStatus(`Bono escaneado con IA (confianza: ${Math.round(result.confianza * 100)}%).`);
    } catch { setScannerStatus('Error en escaneo. Intenta manualmente.'); }
    setIsScanning(false);
  };

  const stopCameraStream = () => { if (videoRef.current && videoRef.current.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; } setCameraActive(false); };

  const saveScannedBono = () => {
    const letter = ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
    const finalCode = isEditingBonoManually ? manualBonoCode : detectedBonoCode;
    const finalFecha = isEditingBonoManually ? manualBonoFecha : detectedBonoFecha;
    let pId = "", pNombre = "";
    if (isEditingBonoManually) { const found = pacientes.find(p => p.id === manualBonoPacienteId); if (found) { pId = found.id; pNombre = found.nombre; } }
    else { const found = pacientes.find(p => p.nombre.toLowerCase().includes(detectedBonoPaciente.toLowerCase())); if (found) { pId = found.id; pNombre = found.nombre; } }
    const nuevoBono: Bono = { id: `Bono N° ${Math.floor(10000 + Math.random() * 90000)}-${letter}`, codigoPago: finalCode, fecha: finalFecha, estado: 'Válido', imagenBono: scannerPhoto || undefined, pacienteId: pId || undefined, pacienteNombre: pNombre || undefined };
    setBonos(prev => [nuevoBono, ...prev]);
    setIsEditingBonoManually(false);
    alert("Bono confirmado y anclado exitosamente ✓");
  };

  const handleManualBonoSubmit = (e: React.FormEvent) => { e.preventDefault(); saveScannedBono(); };

  // ---- Patient CRUD ----
  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.id || !newPatient.nombre) { alert("Cédula y nombre son obligatorios."); return; }
    const nuevo: Paciente = { id: newPatient.id, nombre: newPatient.nombre, empresa: newPatient.empresa as any, telefono: newPatient.telefono, diagnostico: newPatient.diagnostico, sesionesTotales: newPatient.sesionesTotales, sesionesCompletadas: 0, progresoPlan: 0, proximaCita: "No programada", edad: newPatient.edad, direccion: newPatient.direccion, latitud: newPatient.latitud || undefined, longitud: newPatient.longitud || undefined, estado: 'Activo' };
    setPacientes(prev => [nuevo, ...prev]);
    setNewPatient({ id: '', nombre: '', empresa: 'Colsanitas', telefono: '', diagnostico: '', sesionesTotales: 10, edad: 30, direccion: '', latitud: 0, longitud: 0 });
    alert(`Paciente ${nuevo.nombre} creado con éxito.`);
  };

  const handleEditPatient = (e: React.FormEvent) => { e.preventDefault(); if (!editingPatient) return; setPacientes(prev => prev.map(p => p.id === editingPatient.id ? { ...editingPatient } : p)); setEditingPatient(null); alert("Datos de la ficha actualizados con éxito."); };

  // ---- Terapia CRUD ----
  const handleEditTerapia = (id: string, cambios: Partial<Terapia>) => {
    setTerapias(prev => prev.map(t => t.id === id ? { ...t, ...cambios } : t));
    alert("Terapia actualizada con éxito.");
  };

  const handleDeleteTerapia = (id: string) => {
    setTerapias(prev => prev.filter(t => t.id !== id));
    alert("Terapia eliminada.");
  };

  const triggerProfilePicUpload = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { if (typeof reader.result === 'string') { setProfilePic(reader.result); localStorage.setItem('silvia_profile_pic', reader.result); alert("¡Foto de perfil actualizada!"); } }; reader.readAsDataURL(file); } };

  const filteredPacientes = pacientes.filter(p => p.nombre.toLowerCase().includes(patientSearchQuery.toLowerCase()) || p.diagnostico.toLowerCase().includes(patientSearchQuery.toLowerCase()) || p.id.includes(patientSearchQuery));
  const nextSessionPaciente = pacientes.find(p => p.id === '1045920') || pacientes[0];

  // ---- Navigation ----
  const navigateTo = (tab: TabId) => { setActiveTab(tab); setActiveView(tab); setSelectedPacienteId(null); };

  // ---- Render ----
  return (
    <div id="app_viewport" className="max-w-md mx-auto min-h-screen bg-surface-bg flex flex-col relative pb-28 text-on-surface select-none shadow-xl border-x border-outline-variant/10">
      <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} accept="image/*" className="hidden" />

      <TopBar profilePic={profilePic} profesionalNombre={profesionalNombre} profesionalProfesion={profesionalProfesion} activeTab={activeTab} onSettingsClick={() => navigateTo('ajustes')} onProfilePicClick={triggerProfilePicUpload} />

      {therapyToastMessage && <Toast message={therapyToastMessage} icon="directions_car" />}
      {intentNotification && <Toast message={intentNotification.message} type="intent" actionText={intentNotification.actionText} onAction={intentNotification.callback} onDismiss={() => setIntentNotification(null)} />}

      <main className={`px-5 flex-1 flex flex-col ${activeTab === 'inicio' ? 'pt-[68px]' : 'pt-20'}`}>
        {/* INICIO */}
        {activeTab === 'inicio' && activeView === 'inicio' && (
          <InicioView profesionalNombre={profesionalNombre} profesionalProfesion={profesionalProfesion} isListeningGeneral={isListeningGeneral} voiceText={voiceText} agenda={agenda} onToggleMic={toggleListeningGeneral} />
        )}

        {/* SESIÓN ACTIVA */}
        {activeView === 'sesion_activa' && sessionPatient && (
          <SesionActivaView sessionPatient={sessionPatient} isSessionRecording={isSessionRecording} sessionDuration={sessionDuration} activeTranscriptBlocks={activeTranscriptBlocks} newBlockText={newBlockText} newBlockType={newBlockType} therapyTimer={therapyTimer} therapySessionState={therapySessionState} therapyRadius={therapyRadius} patientDistance={patientDistance} hasArrivedAtHome={hasArrivedAtHome} onNewBlockTextChange={setNewBlockText} onNewBlockTypeChange={setNewBlockType} onAddManualBlock={handleAddNewManualBlock} onPauseResume={pauseTherapySession} onFinishAndSave={finishAndSaveSession} onOpenWaze={openWaze} onFinalizeTherapy={handleTherapyFinalize} />
        )}

        {/* AGENDA */}
        {activeTab === 'agenda' && activeView === 'agenda' && (
          <AgendaView agenda={agenda} pacientes={pacientes} onStartVoiceCita={startVoiceCita} />
        )}

        {/* PACIENTES */}
        {activeTab === 'pacientes' && activeView === 'pacientes' && !editingPatient && (
          <PacientesView pacientes={pacientes} filteredPacientes={filteredPacientes} patientSearchQuery={patientSearchQuery} onSearchChange={setPatientSearchQuery} showPatientForm={showPatientForm} onToggleForm={() => setShowPatientForm(prev => !prev)} newPatient={newPatient} onNewPatientChange={setNewPatient} onCreatePatient={handleCreatePatient} detectedPatientData={detectedPatientData} onConfirmDetected={() => { if (!detectedPatientData?.nombre || !detectedPatientData?.id) { alert("Ingrese nombre y cédula."); return; } setPacientes(prev => [detectedPatientData, ...prev]); setDetectedPatientData(null); alert("Paciente creado con éxito ✓"); }} onDiscardDetected={() => setDetectedPatientData(null)} onStartVoicePaciente={startVoicePaciente} onSelectPatient={(id) => { setSelectedPacienteId(id); setActiveView('paciente_detalle'); }} />
        )}

        {/* EDITAR PACIENTE */}
        {editingPatient && (
          <div className="flex flex-col gap-3 animate-fade-in py-2">
            <button onClick={() => setEditingPatient(null)} className="self-start text-primary font-bold text-xs flex items-center gap-1 hover:underline">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Cancelar Edición
            </button>
            <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm">
              <h3 className="font-display font-bold text-primary text-sm mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-base">edit</span> Editar Ficha de {editingPatient.nombre}</h3>
              <form onSubmit={handleEditPatient} className="space-y-2.5">
                <div><label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE</label><input type="text" value={editingPatient.nombre} onChange={(e) => setEditingPatient({ ...editingPatient, nombre: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold" /></div>
                <div><label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO</label><input type="text" value={editingPatient.telefono} onChange={(e) => setEditingPatient({ ...editingPatient, telefono: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold" /></div>
                <div><label className="text-[8px] font-bold text-outline block mb-0.5">DIAGNÓSTICO</label><input type="text" value={editingPatient.diagnostico} onChange={(e) => setEditingPatient({ ...editingPatient, diagnostico: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold" /></div>
                <div><label className="text-[8px] font-bold text-outline block mb-0.5">ASEGURADORA</label><select value={editingPatient.empresa} onChange={(e) => setEditingPatient({ ...editingPatient, empresa: e.target.value })} className="w-full bg-white border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none font-bold text-primary"><option value="Colsanitas">Colsanitas</option><option value="Medisanitas">Medisanitas</option></select></div>
                <div><label className="text-[8px] font-bold text-outline block mb-0.5">ESTADO</label><select value={editingPatient.estado || 'Activo'} onChange={(e) => setEditingPatient({ ...editingPatient, estado: e.target.value as any })} className="w-full bg-white border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none font-bold text-primary"><option value="Activo">✅ Activo</option><option value="Inactivo">⏸️ Inactivo</option><option value="Suspendido">⚠️ Suspendido</option><option value="Retirado">🚪 Retirado</option><option value="Fallecido">🕊️ Fallecido</option></select></div>
                <div><label className="text-[8px] font-bold text-outline block mb-0.5">DIRECCIÓN</label><input type="text" value={editingPatient.direccion || ''} onChange={(e) => setEditingPatient({ ...editingPatient, direccion: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold" placeholder="Calle 123 #45-67" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[8px] font-bold text-outline block mb-0.5">LATITUD</label><input type="number" step="0.000001" value={editingPatient.latitud ?? ''} onChange={(e) => setEditingPatient({ ...editingPatient, latitud: parseFloat(e.target.value) || undefined })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold" /></div>
                  <div><label className="text-[8px] font-bold text-outline block mb-0.5">LONGITUD</label><input type="number" step="0.000001" value={editingPatient.longitud ?? ''} onChange={(e) => setEditingPatient({ ...editingPatient, longitud: parseFloat(e.target.value) || undefined })} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold" /></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setEditingPatient(null)} className="flex-1 py-2.5 border border-outline text-outline font-bold text-[10px] rounded-lg">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 bg-primary text-white font-bold text-[10px] rounded-lg shadow-md">Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PACIENTE DETALLE */}
        {activeView === 'paciente_detalle' && selectedPacienteId && (() => {
          const paciente = pacientes.find(p => p.id === selectedPacienteId);
          if (!paciente) return <p className="text-xs text-center py-4">Ficha no encontrada.</p>;
          return <PacienteDetalle paciente={paciente} terapias={terapias} bonos={bonos} onBack={() => { setActiveTab('pacientes'); setActiveView('pacientes'); setSelectedPacienteId(null); }} onEdit={setEditingPatient} onDelete={(id, nombre) => { if (confirm(`¿Estás seguro de borrar a ${nombre}?`)) { setPacientes(prev => prev.filter(p => p.id !== id)); setActiveView('pacientes'); alert(`${nombre} ha sido eliminado.`); } }} onChangeEstado={(id) => { const nuevoEstado = prompt("Cambiar estado:\n1=Activo\n2=Inactivo\n3=Suspendido\n4=Retirado\n5=Fallecido\n\nEscribe el número:"); const mapa: Record<string, any> = { '1': 'Activo', '2': 'Inactivo', '3': 'Suspendido', '4': 'Retirado', '5': 'Fallecido' }; if (nuevoEstado && mapa[nuevoEstado]) { setPacientes(prev => prev.map(p => p.id === id ? { ...p, estado: mapa[nuevoEstado] } : p)); alert(`Estado cambiado a: ${mapa[nuevoEstado]} ✓`); } }} onStartSession={startTherapySession} onExportFicha={(p) => alert(`--- FICHA CLÍNICA ---\nPaciente: ${p.nombre}\nID: ${p.id}\nEmpresa: ${p.empresa}\nDiagnóstico: ${p.diagnostico}\nSesiones: ${p.sesionesCompletadas}/${p.sesionesTotales}\n\nExportada exitosamente.`)} />;
        })()}

        {/* REGISTROS */}
        {activeTab === 'registros' && activeView === 'registros' && (
          <RegistrosView terapias={terapias} onViewPatient={(pid) => { setSelectedPacienteId(pid); setActiveTab('pacientes'); setActiveView('paciente_detalle'); }} onEditTerapia={handleEditTerapia} onDeleteTerapia={handleDeleteTerapia} />
        )}

        {/* BONOS */}
        {activeTab === 'bonos' && activeView === 'bonos' && (
          <BonosView bonos={bonos} pacientes={pacientes} cameraActive={cameraActive} isScanning={isScanning} scannerStatus={scannerStatus} scannerPhoto={scannerPhoto} detectedBonoCode={detectedBonoCode} detectedBonoPaciente={detectedBonoPaciente} detectedBonoFecha={detectedBonoFecha} isEditingBonoManually={isEditingBonoManually} manualBonoCode={manualBonoCode} manualBonoFecha={manualBonoFecha} manualBonoPacienteId={manualBonoPacienteId} onManualBonoCodeChange={setManualBonoCode} onManualBonoFechaChange={setManualBonoFecha} onManualBonoPacienteIdChange={setManualBonoPacienteId} onStartScanning={startScanningVoucher} onCapturePhoto={captureBonoPhoto} onSaveBono={saveScannedBono} onEditManual={() => { setManualBonoCode(detectedBonoCode); setManualBonoFecha(detectedBonoFecha); setIsEditingBonoManually(true); }} onCancelManual={() => setIsEditingBonoManually(false)} onSubmitManual={handleManualBonoSubmit} videoRef={videoRef} />
        )}

        {/* AJUSTES */}
        {activeTab === 'ajustes' && activeView === 'ajustes' && (
          <AjustesView profilePic={profilePic} profesionalNombre={profesionalNombre} profesionalProfesion={profesionalProfesion} profesionalTelefono={profesionalTelefono} profesionalCorreo={profesionalCorreo} contactoEmergenciaNombre={contactoEmergenciaNombre} contactoEmergenciaTelefono={contactoEmergenciaTelefono} contactoEmergenciaParentesco={contactoEmergenciaParentesco} therapyRadius={therapyRadius} onProfilePicClick={triggerProfilePicUpload} onNombreChange={setProfesionalNombre} onProfesionChange={setProfesionalProfesion} onTelefonoChange={setProfesionalTelefono} onCorreoChange={setProfesionalCorreo} onEmergenciaNombreChange={setContactoEmergenciaNombre} onEmergenciaTelefonoChange={setContactoEmergenciaTelefono} onEmergenciaParentescoChange={setContactoEmergenciaParentesco} onRadiusChange={setTherapyRadius} />
        )}
      </main>

      <BottomNav activeTab={activeTab} onNavigate={navigateTo} />

      {/* Modals */}
      {showLeftRadiusModal && <LeftRadiusModal therapyRadius={therapyRadius} onContinue={() => setShowLeftRadiusModal(false)} onFinish={handleLeftRadiusFinish} />}
      {showTherapyFinishModal && <TherapyFinishModal patient={finishModalPatient} onFinalize={handleTherapyFinalize} onAddTenMinutes={handleTherapyAddTen} onDictation={handleTherapyDictation} />}
      <VoiceRecordingHUD isListeningForCita={isListeningForCita} isListeningForPaciente={isListeningForPaciente} voiceInputMessage={voiceInputMessage} onCancel={() => { setIsListeningForCita(false); setIsListeningForPaciente(false); }} />
    </div>
  );
}
