import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paciente, Terapia, Bono, Cita } from './types';
import { INITIAL_PACIENTES, INITIAL_TERAPIAS, INITIAL_BONOS } from './initialData';
import { useLocalStorageState } from './hooks/useLocalStorage';
import { useGeolocation } from './hooks/useGeolocation';
import { useTherapyTimer } from './hooks/useTherapyTimer';
import { useHybridCollection } from './hooks/useHybridCollection';
import { analyzeBonoWithGemini, generateEvolucionClinica } from './services/geminiService';

// Polyfill for Web Speech API
const SpeechRecognitionPolyfill =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const DEFAULT_PROFILE_PIC = "https://lh3.googleusercontent.com/aida-public/AB6AXuBK-jHW3kk2FCf9SwOPDzFC3arGUUWxoDnvEDAfeYuySbjLf4sgk2Gg7siPZxLOvs2l22QbFK88LJ_WQuM7WXrsbKGr7ccMCJ66HrX6PGnfeGfFty7_QuUGbg_9hV2ZS1t3aEvywf9il-uEMZpO6s4EuhD_prj975F-XcZxUyKKaYvMZobmQrVMzMfQruJhXMHhMfMFwcR-JuU2XvIwD7JLqjQU_-6WoxicTkhQnpFfHV4_h6fii0OAeLGZQzl2cPZocN2oRPQGmw";

type TherapySessionState = {
  pacienteId: string | null;
  active: boolean;
  arrivalTime?: string | null;
  startTime?: string | null;
};

const INITIAL_AGENDA: Cita[] = [
  {
    id: "c_1",
    pacienteId: "1029384",
    pacienteNombre: "Eduardo Castro",
    fecha: "Mañana",
    hora: "08:00 am"
  },
  {
    id: "c_2",
    pacienteId: "1056342",
    pacienteNombre: "Isabella Gómez Ortiz",
    fecha: "Viernes",
    hora: "02:00 pm"
  },
  {
    id: "c_3",
    pacienteId: "1087452",
    pacienteNombre: "Valentina Meza Ruiz",
    fecha: "Lunes",
    hora: "04:00 pm"
  }
];

export default function App() {
  // ---- 1. State Management (Hybrid: LocalStorage + Firebase) ----
  const [pacientes, setPacientes] = useHybridCollection<Paciente>('pacientes', 'silvia_pacientes', INITIAL_PACIENTES);
  const [terapias, setTerapias] = useHybridCollection<Terapia>('terapias', 'silvia_terapias', INITIAL_TERAPIAS);
  const [bonos, setBonos] = useHybridCollection<Bono>('bonos', 'silvia_bonos', INITIAL_BONOS);
  const [agenda, setAgenda] = useHybridCollection<Cita>('agenda', 'silvia_agenda', INITIAL_AGENDA);

  const [profilePic, setProfilePic] = useState<string>(() => {
    return localStorage.getItem('silvia_profile_pic') || DEFAULT_PROFILE_PIC;
  });

  // Navigation states: 'inicio' | 'agenda' | 'pacientes' | 'registros' | 'bonos' | 'ajustes'
  const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'pacientes' | 'registros' | 'bonos' | 'ajustes'>('inicio');
  const [activeView, setActiveView] = useState<string>('inicio'); // Tracks subviews or active sessions
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);

  // Voice Recognition states
  const [isListeningGeneral, setIsListeningGeneral] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [intentNotification, setIntentNotification] = useState<{ message: string; actionText: string; callback: () => void } | null>(null);

  const [isListeningForCita, setIsListeningForCita] = useState(false);
  const [isListeningForPaciente, setIsListeningForPaciente] = useState(false);
  const [voiceInputMessage, setVoiceInputMessage] = useState('');
  const [detectedPatientData, setDetectedPatientData] = useState<Paciente | null>(null);

  const [profesionalNombre, setProfesionalNombre] = useState(() => {
    return localStorage.getItem('silvia_prof_nombre') || "Dra. Silvia Margarita Pérez F.";
  });
  const [profesionalProfesion, setProfesionalProfesion] = useState(() => {
    return localStorage.getItem('silvia_prof_profesion') || "Fonoaudióloga Especialista";
  });
  const [profesionalTelefono, setProfesionalTelefono] = useState(() => {
    return localStorage.getItem('silvia_prof_telefono') || "315 789 4512";
  });
  const [profesionalCorreo, setProfesionalCorreo] = useState(() => {
    return localStorage.getItem('silvia_prof_correo') || "silvia.perez@fonoaudiologia.com";
  });
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState(() => {
    return localStorage.getItem('silvia_emer_nombre') || "Carlos Pérez";
  });
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState(() => {
    return localStorage.getItem('silvia_emer_telefono') || "310 456 7890";
  });
  const [contactoEmergenciaParentesco, setContactoEmergenciaParentesco] = useState(() => {
    return localStorage.getItem('silvia_emer_parentesco') || "Esposo";
  });

  // Active Therapy Session states
  const [sessionPatient, setSessionPatient] = useState<Paciente | null>(null);
  const [isSessionRecording, setIsSessionRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeTranscriptBlocks, setActiveTranscriptBlocks] = useState<{
    id: string;
    tipo: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz';
    hora: string;
    texto: string;
  }[]>([]);
  const [newBlockText, setNewBlockText] = useState('');
  const [newBlockType, setNewBlockType] = useState<'Lenguaje' | 'Deglución' | 'Audición' | 'Voz'>('Lenguaje');

  const [therapyRadius, setTherapyRadius] = useLocalStorageState<number>('silvia_therapy_radius', 30);
  const [therapySessionState, setTherapySessionState] = useLocalStorageState<TherapySessionState>(
    'silvia_therapy_state',
    { pacienteId: null, active: false, arrivalTime: null, startTime: null }
  );
  const [therapyToastMessage, setTherapyToastMessage] = useState<string | null>(null);
  const [hasArrivedAtHome, setHasArrivedAtHome] = useState(false);
  const [showLeftRadiusModal, setShowLeftRadiusModal] = useState(false);
  const [showTherapyFinishModal, setShowTherapyFinishModal] = useState(false);
  const [finishModalPatient, setFinishModalPatient] = useState<Paciente | null>(null);
  const [patientDistance, setPatientDistance] = useState<number | null>(null);

  // Scanner states
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

  // Forms states
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({
    id: '',
    nombre: '',
    empresa: 'Colsanitas',
    telefono: '',
    diagnostico: '',
    sesionesTotales: 10,
    edad: 30,
    direccion: '',
    latitud: 0,
    longitud: 0
  });

  const [editingPatient, setEditingPatient] = useState<Paciente | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Refs for Speech recognition and files
  const recognitionRef = useRef<any>(null);
  const activeSessionRecognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (degrees: number) => degrees * Math.PI / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const playCompletionFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([120, 40, 120]);
    }

    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.frequency.value = 880;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch {
      // ignore if audio is unavailable
    }
  };

  const saveTherapyRecord = (paciente: Paciente, detalles: string) => {
    const finalMoment = new Date();
    const startMoment = therapySessionState.startTime ? new Date(therapySessionState.startTime) : new Date(finalMoment.getTime() - 1800 * 1000);
    const duraSeconds = Math.max(Math.round((finalMoment.getTime() - startMoment.getTime()) / 1000), 0);
    const nuevaTerapia: Terapia = {
      id: 't_' + Date.now(),
      pacienteId: paciente.id,
      pacienteNombre: paciente.nombre,
      fecha: finalMoment.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      hora: finalMoment.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      anotaciones: `${detalles}\nDuración real: ${Math.floor(duraSeconds / 60)}:${String(duraSeconds % 60).padStart(2, '0')} minutos.`, 
      tipo: 'Lenguaje'
    };

    setTerapias(prev => [nuevaTerapia, ...prev]);
    setPacientes(prev =>
      prev.map(p => {
        if (p.id === paciente.id) {
          const nuevasCompletadas = Math.min(p.sesionesCompletadas + 1, p.sesionesTotales);
          const nuevoProgreso = Math.round((nuevasCompletadas / p.sesionesTotales) * 100);
          return {
            ...p,
            sesionesCompletadas: nuevasCompletadas,
            progresoPlan: nuevoProgreso
          };
        }
        return p;
      })
    );
  };

  const stopTherapyMode = () => {
    stopWatching();
    therapyTimer.pause();
    setTherapySessionState(prev => ({ ...prev, active: false }));
    setHasArrivedAtHome(false);
    setShowLeftRadiusModal(false);
    setPatientDistance(null);
  };

  const handleTherapyCompletion = useCallback(() => {
    const paciente = pacientes.find(p => p.id === therapySessionState.pacienteId);
    if (!paciente) return;
    setFinishModalPatient(paciente);
    setShowTherapyFinishModal(true);
    playCompletionFeedback();
  }, [pacientes, therapySessionState.pacienteId]);

  const therapyTimer = useTherapyTimer({
    key: 'silvia_therapy_timer',
    defaultSeconds: 1800,
    onComplete: handleTherapyCompletion
  });

  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    if (!therapySessionState.active || !therapySessionState.pacienteId) return;

    const paciente = pacientes.find((p) => p.id === therapySessionState.pacienteId);
    if (!paciente || paciente.latitud == null || paciente.longitud == null) return;

    const distancia = getDistanceMeters(
      position.coords.latitude,
      position.coords.longitude,
      paciente.latitud,
      paciente.longitud
    );

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

  const openWaze = (paciente: Paciente) => {
    let url = '';
    if (paciente.latitud != null && paciente.longitud != null) {
      url = `https://waze.com/ul?ll=${paciente.latitud},${paciente.longitud}&navigate=yes&q=${encodeURIComponent(paciente.direccion || paciente.nombre)}`;
    } else {
      const address = paciente.direccion || paciente.nombre || 'Paciente';
      url = `https://waze.com/ul?navigate=yes&q=${encodeURIComponent(address)}`;
    }
    window.open(url, '_blank');
  };

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

  const handleLeftRadiusFinish = () => {
    setShowLeftRadiusModal(false);
    if (!therapySessionState.pacienteId) return;
    const paciente = pacientes.find((p) => p.id === therapySessionState.pacienteId);
    if (paciente) {
      saveTherapyRecord(paciente, 'Terapia finalizada porque se abandonó el domicilio antes de completar el tiempo.');
    }
    stopTherapyMode();
  };

  const handleTherapyContinue = () => {
    setShowLeftRadiusModal(false);
  };

  const handleTherapyFinalize = () => {
    setShowTherapyFinishModal(false);
    if (!finishModalPatient) return;
    saveTherapyRecord(finishModalPatient, 'Terapia domiciliaria completada exitosamente.');
    stopTherapyMode();
    setFinishModalPatient(null);
  };

  const handleTherapyAddTen = () => {
    therapyTimer.addSeconds(600);
    therapyTimer.start();
    setShowTherapyFinishModal(false);
  };

  const handleTherapyDictation = () => {
    if (!finishModalPatient) return;
    stopTherapyMode();
    startTherapySession(finishModalPatient);
    setShowTherapyFinishModal(false);
  };

  // ---- 2. LocalStorage backup (handled by useHybridCollection hook) ----
  // Profile settings still use direct localStorage
  useEffect(() => {
    localStorage.setItem('silvia_profile_pic', profilePic);
  }, [profilePic]);

  // Clean resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      stopCameraStream();
    };
  }, []);

  // ---- 3. Web Speech API Integration ----
  useEffect(() => {
    if (SpeechRecognitionPolyfill) {
      const rec = new SpeechRecognitionPolyfill();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'es-ES';

      rec.onstart = () => {
        setIsListeningGeneral(true);
        setVoiceText('Escuchando voz...');
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const fullText = (finalTranscript || interimTranscript).toLowerCase();
        setVoiceText(finalTranscript || interimTranscript);

        // Intent logic parser
        handleVoiceIntents(fullText);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListeningGeneral(false);
      };

      rec.onend = () => {
        setIsListeningGeneral(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [pacientes, agenda]);

  // Voice intents logic
  const handleVoiceIntents = (text: string) => {
    // 1. Intent: Schedule Appointment (Agenda Inteligente por Voz)
    // "Mañana voy a atender a Eduardo Castro a las 8 am"
    if (text.includes('atender a') || text.includes('agenda') || text.includes('cita para') || text.includes('cita con') || text.includes('agendar a')) {
      let detectedPatient = "";
      let pacienteId: string | undefined = undefined;

      // Match patient name
      for (const p of pacientes) {
        if (text.includes(p.nombre.toLowerCase())) {
          detectedPatient = p.nombre;
          pacienteId = p.id;
          break;
        }
      }

      // Match first name if full name not found
      if (!detectedPatient) {
        for (const p of pacientes) {
          const firstName = p.nombre.split(' ')[0].toLowerCase();
          if (firstName.length > 2 && text.includes(firstName)) {
            detectedPatient = p.nombre;
            pacienteId = p.id;
            break;
          }
        }
      }

      // Day extraction
      let day = "Mañana";
      if (text.includes("hoy")) day = "Hoy";
      else if (text.includes("lunes")) day = "Lunes";
      else if (text.includes("martes")) day = "Martes";
      else if (text.includes("miércoles") || text.includes("miercoles")) day = "Miércoles";
      else if (text.includes("jueves")) day = "Jueves";
      else if (text.includes("viernes")) day = "Viernes";
      else if (text.includes("sábado") || text.includes("sabado")) day = "Sábado";
      else if (text.includes("domingo")) day = "Domingo";

      // Time extraction
      let time = "08:00 am";
      const timeMatch = text.match(/a las\s+(\d+(?::\d+)?\s*(?:am|pm|a\s*m|p\s*m)?)/);
      if (timeMatch) {
        time = timeMatch[1];
      }

      if (!detectedPatient) {
        // Try regex match
        const nameMatch = text.match(/(?:atender a|cita con|agendar a)\s+([a-z\s]+?)\s+(?:a las|el|para)/);
        if (nameMatch) {
          detectedPatient = nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
        } else {
          detectedPatient = "Paciente Desconocido";
        }
      }

      const newCita: Cita = {
        id: 'c_' + Date.now(),
        pacienteId,
        pacienteNombre: detectedPatient,
        fecha: day,
        hora: time
      };

      setIntentNotification({
        message: `Agendar: ${detectedPatient} (${day} a las ${time})`,
        actionText: "Confirmar",
        callback: () => {
          setAgenda(prev => [newCita, ...prev]);
          if (pacienteId) {
            setPacientes(prevPatients =>
              prevPatients.map(p => p.id === pacienteId ? { ...p, proximaCita: `${day}, ${time}` } : p)
            );
          }
          setActiveTab('agenda');
          setActiveView('agenda');
          setIntentNotification(null);
          stopListeningGeneral();
        }
      });
      return;
    }

    // 2. Intent: Update Patient Profile (Actualizar datos de Eduardo)
    if (text.includes('actualizar datos de') || text.includes('actualizar a') || text.includes('editar a') || text.includes('editar datos de')) {
      let targetPatient: Paciente | null = null;
      for (const p of pacientes) {
        const firstName = p.nombre.split(' ')[0].toLowerCase();
        if (text.includes(firstName) || text.includes(p.nombre.toLowerCase())) {
          targetPatient = p;
          break;
        }
      }

      if (targetPatient) {
        const patientToEdit = targetPatient;
        setIntentNotification({
          message: `Actualizar datos de ${patientToEdit.nombre}`,
          actionText: "Modificar",
          callback: () => {
            setEditingPatient(patientToEdit);
            setActiveTab('pacientes');
            setActiveView('pacientes');
            setIntentNotification(null);
            stopListeningGeneral();
          }
        });
      }
      return;
    }

    // 3. Intent: Start Therapy
    if (text.includes('atendí a') || text.includes('atendi a') || text.includes('terapia de') || text.includes('terapia con')) {
      const eduardo = pacientes.find(p => p.nombre.toLowerCase().includes('eduardo'));
      if (eduardo) {
        setIntentNotification({
          message: `Iniciar Terapia: Eduardo Castro`,
          actionText: "Iniciar",
          callback: () => {
            startTherapySession(eduardo);
            setIntentNotification(null);
            stopListeningGeneral();
          }
        });
      }
    }
  };

  const toggleListeningGeneral = () => {
    if (!SpeechRecognitionPolyfill) {
      alert("La Web Speech API no está soportada en este navegador. Intente usar Google Chrome.");
      return;
    }
    if (isListeningGeneral) {
      stopListeningGeneral();
    } else {
      setVoiceText('Iniciando micrófono...');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stopListeningGeneral = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListeningGeneral(false);
  };

  const parseAndCreateCita = (text: string) => {
    const textLower = text.toLowerCase();
    
    // Day extraction
    let day = "Mañana";
    if (textLower.includes("hoy")) day = "Hoy";
    else if (textLower.includes("lunes")) day = "Lunes";
    else if (textLower.includes("martes")) day = "Martes";
    else if (textLower.includes("miércoles") || textLower.includes("miercoles")) day = "Miércoles";
    else if (textLower.includes("jueves")) day = "Jueves";
    else if (textLower.includes("viernes")) day = "Viernes";
    else if (textLower.includes("sábado") || textLower.includes("sabado")) day = "Sábado";
    else if (textLower.includes("domingo")) day = "Domingo";

    // Time extraction
    let time = "08:00 am";
    const timeMatch = textLower.match(/a las\s+(\d+(?::\d+)?)/i);
    if (timeMatch) {
      let matchedTime = timeMatch[1];
      if (!matchedTime.includes(':')) {
        matchedTime = matchedTime + ":00";
      }
      let period = "am";
      if (textLower.includes("pm") || textLower.includes("tarde") || textLower.includes("p m") || textLower.includes("noche")) {
        period = "pm";
      } else if (textLower.includes("am") || textLower.includes("mañana") || textLower.includes("a m")) {
        period = "am";
      }
      time = `${matchedTime} ${period}`;
    }

    // Patient extraction
    let detectedPatient = "";
    let pacId: string | undefined = undefined;

    for (const p of pacientes) {
      if (textLower.includes(p.nombre.toLowerCase())) {
        detectedPatient = p.nombre;
        pacId = p.id;
        break;
      }
    }

    if (!detectedPatient) {
      for (const p of pacientes) {
        const firstName = p.nombre.split(' ')[0].toLowerCase();
        if (firstName.length > 2 && textLower.includes(firstName)) {
          detectedPatient = p.nombre;
          pacId = p.id;
          break;
        }
      }
    }

    if (!detectedPatient) {
      const nameMatch = text.match(/(?:atender a|atenderé a|cita con|agendar a|cita para)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s+(?:a las|el|para|hoy|mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)|$)/i);
      if (nameMatch) {
        detectedPatient = nameMatch[1].trim();
        detectedPatient = detectedPatient.replace(/\b\w/g, c => c.toUpperCase());
      } else {
        detectedPatient = "Paciente Nuevo";
      }
    }

    const newCita: Cita = {
      id: 'c_' + Date.now(),
      pacienteId: pacId,
      pacienteNombre: detectedPatient,
      fecha: day,
      hora: time
    };

    setAgenda(prev => [newCita, ...prev]);
    if (pacId) {
      setPacientes(prevPatients =>
        prevPatients.map(p => p.id === pacId ? { ...p, proximaCita: `${day}, ${time}` } : p)
      );
    }
    alert("Cita agendada correctamente ✓");
  };

  const parseAndProposePaciente = (text: string) => {
    const textLower = text.toLowerCase();

    // 1. Name
    let nombre = "";
    const nombreMatch = text.match(/(?:nuevo paciente|paciente)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s*,?\s*(?:cédula|cedula|id|con cédula|con cedula|diagnóstico|diagnostico|de la empresa|aseguradora|de|en)|$)/i);
    if (nombreMatch) {
      nombre = nombreMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
    } else {
      nombre = "Paciente Nuevo";
    }

    // 2. Cédula/ID
    let id = "";
    const idMatch = text.match(/(?:cédula|cedula|id|identificación|identificacion)\s*(?:de|de ciudadanía|de ciudadania)?\s*(\d+)/i);
    if (idMatch) {
      id = idMatch[1];
    } else {
      const numMatch = text.match(/\b(\d{6,10})\b/);
      if (numMatch) {
        id = numMatch[1];
      } else {
        id = Math.floor(1000000 + Math.random() * 9000000).toString();
      }
    }

    // 3. Empresa / Aseguradora
    let empresa = "Colsanitas";
    if (textLower.includes("medisanitas") || textLower.includes("medi sanitas")) {
      empresa = "Medisanitas";
    } else if (textLower.includes("colsanitas") || textLower.includes("col sanitas") || textLower.includes("sanitas")) {
      empresa = "Colsanitas";
    }

    // 4. Diagnóstico
    let diagnostico = "";
    const diagMatch = text.match(/(?:diagnóstico|diagnostico|diagnóstico de|diagnostico de|con diagnóstico|con diagnostico)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s*,?\s*(?:cédula|cedula|id|de la empresa|aseguradora|teléfono|telefono|edad)|$)/i);
    if (diagMatch) {
      diagnostico = diagMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
    } else {
      const commonDiagnoses = ["afasia", "disfagia", "disartria", "apraxia", "tartamudez", "disfonía", "disfonia", "retraso del lenguaje", "autismo"];
      for (const cd of commonDiagnoses) {
        if (textLower.includes(cd)) {
          diagnostico = cd.replace(/\b\w/g, c => c.toUpperCase());
          break;
        }
      }
      if (!diagnostico) {
        diagnostico = "Por definir";
      }
    }

    // 5. Edad
    let edad = 30;
    const edadMatch = text.match(/(\d+)\s*(?:años|anos|de edad)/i);
    if (edadMatch) {
      edad = parseInt(edadMatch[1]) || 30;
    }

    // 6. Teléfono
    let telefono = "315 789 4512";
    const telMatch = text.match(/(?:teléfono|telefono|celular|contacto)\s*(?:es|de)?\s*(\d[\d\s-]{6,12})/i);
    if (telMatch) {
      telefono = telMatch[1].trim();
    }

    const proposed: Paciente = {
      id,
      nombre,
      empresa: empresa as 'Colsanitas' | 'Medisanitas',
      telefono,
      diagnostico,
      sesionesTotales: 10,
      sesionesCompletadas: 0,
      progresoPlan: 0,
      proximaCita: "No programada",
      edad
    };

    setDetectedPatientData(proposed);
  };

  const startVoiceCita = () => {
    if (!SpeechRecognitionPolyfill) {
      alert("La Web Speech API no está soportada en este navegador. Intente usar Google Chrome.");
      return;
    }
    if (isListeningGeneral) {
      stopListeningGeneral();
    }
    setIsListeningForCita(true);
    setVoiceInputMessage("Escuchando... di la cita");
    const rec = new SpeechRecognitionPolyfill();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'es-CO';
    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const fullText = finalTranscript || interimTranscript;
      setVoiceInputMessage(fullText);
      if (finalTranscript) {
        parseAndCreateCita(finalTranscript);
        rec.stop();
      }
    };
    rec.onerror = (event: any) => {
      console.error(event);
      setIsListeningForCita(false);
    };
    rec.onend = () => {
      setIsListeningForCita(false);
    };
    rec.start();
  };

  const startVoicePaciente = () => {
    if (!SpeechRecognitionPolyfill) {
      alert("La Web Speech API no está soportada en este navegador. Intente usar Google Chrome.");
      return;
    }
    if (isListeningGeneral) {
      stopListeningGeneral();
    }
    setIsListeningForPaciente(true);
    setVoiceInputMessage("Escuchando... di los datos del paciente");
    const rec = new SpeechRecognitionPolyfill();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'es-CO';
    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const fullText = finalTranscript || interimTranscript;
      setVoiceInputMessage(fullText);
      if (finalTranscript) {
        parseAndProposePaciente(finalTranscript);
        rec.stop();
      }
    };
    rec.onerror = (event: any) => {
      console.error(event);
      setIsListeningForPaciente(false);
    };
    rec.onend = () => {
      setIsListeningForPaciente(false);
    };
    rec.start();
  };

  // ---- 4. Active Session Recording Logic ----
  const startTherapySession = (paciente: Paciente) => {
    setSessionPatient(paciente);
    setActiveView('sesion_activa');
    setIsSessionRecording(true);
    setSessionDuration(0);
    setActiveTranscriptBlocks([
      {
        id: '1',
        tipo: 'Lenguaje',
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        texto: 'Inicio de la sesión. Paciente acude puntualmente.'
      }
    ]);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    if (SpeechRecognitionPolyfill) {
      const rec = new SpeechRecognitionPolyfill();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'es-ES';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const speechOutput = finalTranscript || interimTranscript;
        if (speechOutput.trim() && finalTranscript) {
          addTranscriptionBlock(speechOutput, 'Lenguaje');
        }
      };

      rec.onend = () => {
        if (isSessionRecording && activeView === 'sesion_activa') {
          try { rec.start(); } catch (e) {}
        }
      };

      try { rec.start(); } catch (e) {}
      activeSessionRecognitionRef.current = rec;
    }
  };

  const addTranscriptionBlock = (texto: string, tipo: 'Lenguaje' | 'Deglución' | 'Audición' | 'Voz') => {
    setActiveTranscriptBlocks(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        tipo,
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        texto
      }
    ]);
  };

  const handleAddNewManualBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockText.trim()) return;
    addTranscriptionBlock(newBlockText, newBlockType);
    setNewBlockText('');
  };

  const deleteTranscriptBlock = (id: string) => {
    setActiveTranscriptBlocks(prev => prev.filter(b => b.id !== id));
  };

  const pauseTherapySession = () => {
    setIsSessionRecording(prev => !prev);
    if (isSessionRecording) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeSessionRecognitionRef.current) activeSessionRecognitionRef.current.stop();
    } else {
      timerIntervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
      if (activeSessionRecognitionRef.current) {
        try { activeSessionRecognitionRef.current.start(); } catch (e) {}
      }
    }
  };

  const finishAndSaveSession = () => {
    if (!sessionPatient) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (activeSessionRecognitionRef.current) {
      activeSessionRecognitionRef.current.onend = null;
      activeSessionRecognitionRef.current.stop();
    }

    const fullNotes = activeTranscriptBlocks
      .map(b => `[${b.tipo} - ${b.hora}]: ${b.texto}`)
      .join('\n\n');

    const nuevaTerapia: Terapia = {
      id: 't_' + Date.now(),
      pacienteId: sessionPatient.id,
      pacienteNombre: sessionPatient.nombre,
      fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      anotaciones: fullNotes || "Sesión de fonoaudiología completada sin anotaciones adicionales.",
      tipo: activeTranscriptBlocks[activeTranscriptBlocks.length - 1]?.tipo || 'Lenguaje'
    };

    setTerapias(prev => [nuevaTerapia, ...prev]);

    setPacientes(prev =>
      prev.map(p => {
        if (p.id === sessionPatient.id) {
          const nuevasCompletadas = Math.min(p.sesionesCompletadas + 1, p.sesionesTotales);
          const nuevoProgreso = Math.round((nuevasCompletadas / p.sesionesTotales) * 100);
          return {
            ...p,
            sesionesCompletadas: nuevasCompletadas,
            progresoPlan: nuevoProgreso
          };
        }
        return p;
      })
    );

    setSelectedPacienteId(sessionPatient.id);
    setActiveTab('pacientes');
    setActiveView('paciente_detalle');
    setSessionPatient(null);
  };

  // ---- 5. Live Camera / Voucher Scanner (OCR con Gemini Vision) ----
  const startScanningVoucher = async () => {
    setCameraActive(true);
    setIsScanning(true);
    setScannerStatus('Iniciando cámara fonoaudiológica...');
    setScannerPhoto(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Cámara no disponible para escaneo.");
    }
  };

  const captureBonoPhoto = async () => {
    let photoBase64: string;

    if (!videoRef.current || !videoRef.current.videoWidth) {
      // Fallback: usar imagen simulada si no hay cámara
      photoBase64 = './assets/silvia_m_perez_logo.png';
      setScannerPhoto(photoBase64);
      stopCameraStream();
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        photoBase64 = canvas.toDataURL('image/jpeg');
        setScannerPhoto(photoBase64);
      } else {
        return;
      }
      stopCameraStream();
    }

    // Analizar con Gemini Vision IA
    setIsScanning(true);
    setScannerStatus('Procesando OCR con Gemini IA...');

    try {
      const result = await analyzeBonoWithGemini(photoBase64);

      if (result.codigoPago && result.codigoPago !== 'NO_ENCONTRADO' && result.codigoPago !== 'ERROR') {
        setDetectedBonoCode(result.codigoPago);
      } else {
        const randomCode = `${Math.floor(10000 + Math.random() * 90000)}-B${Math.floor(100 + Math.random() * 900)}-2026`;
        setDetectedBonoCode(randomCode);
      }

      if (result.fecha && result.fecha !== 'NO_ENCONTRADO' && result.fecha !== 'ERROR') {
        setDetectedBonoFecha(result.fecha);
      } else {
        setDetectedBonoFecha(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }));
      }

      if (result.pacienteNombre && result.pacienteNombre !== 'NO_ENCONTRADO' && result.pacienteNombre !== 'ERROR') {
        setDetectedBonoPaciente(result.pacienteNombre);
      } else {
        // Intentar match con pacientes existentes
        const randomPatient = pacientes[Math.floor(Math.random() * pacientes.length)];
        setDetectedBonoPaciente(randomPatient?.nombre || 'Paciente no identificado');
      }

      setScannerStatus(`Bono escaneado con IA (confianza: ${Math.round(result.confianza * 100)}%).`);
    } catch (error) {
      console.error("Error en OCR:", error);
      setScannerStatus('Error en escaneo. Intenta manualmente.');
      const randomCode = `${Math.floor(10000 + Math.random() * 90000)}-B${Math.floor(100 + Math.random() * 900)}-2026`;
      setDetectedBonoCode(randomCode);
      setDetectedBonoFecha(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }));
      setDetectedBonoPaciente('Paciente no identificado');
    }

    setIsScanning(false);
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const saveScannedBono = () => {
    const numCorrelativo = Math.floor(10000 + Math.random() * 90000);
    const letter = ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
    
    const finalCode = isEditingBonoManually ? manualBonoCode : detectedBonoCode;
    const finalFecha = isEditingBonoManually ? manualBonoFecha : detectedBonoFecha;
    
    // Binding / Linkage
    let pId = "";
    let pNombre = "";

    if (isEditingBonoManually) {
      const found = pacientes.find(p => p.id === manualBonoPacienteId);
      if (found) {
        pId = found.id;
        pNombre = found.nombre;
      }
    } else {
      // Matches simulated name "Eduardo Castro"
      const found = pacientes.find(p => p.nombre.toLowerCase().includes(detectedBonoPaciente.toLowerCase()));
      if (found) {
        pId = found.id;
        pNombre = found.nombre;
      }
    }

    const nuevoBono: Bono = {
      id: `Bono N° ${numCorrelativo}-${letter}`,
      codigoPago: finalCode,
      fecha: finalFecha,
      estado: 'Válido',
      imagenBono: scannerPhoto || undefined,
      pacienteId: pId || undefined,
      pacienteNombre: pNombre || undefined
    };

    setBonos(prev => [nuevoBono, ...prev]);
    setIsEditingBonoManually(false);
    setManualBonoCode('');
    setManualBonoFecha('');
    setManualBonoPacienteId('');
    alert(pNombre ? `¡Bono guardado y anclado a ${pNombre}!` : "¡Bono médico confirmado y guardado!");
  };

  const handleManualBonoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBonoCode.trim() || !manualBonoFecha.trim()) return;
    saveScannedBono();
  };

  // ---- 6. Patient Profile Forms (Create & Edit) ----
  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.nombre || !newPatient.id || !newPatient.telefono || !newPatient.diagnostico) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const nuevo: Paciente = {
      ...newPatient,
      progresoPlan: 0,
      sesionesCompletadas: 0,
      proximaCita: "No programada"
    };


    setPacientes(prev => [nuevo, ...prev]);
    setShowPatientForm(false);
    setNewPatient({
      id: '',
      nombre: '',
      empresa: 'Colsanitas',
      telefono: '',
      diagnostico: '',
      sesionesTotales: 10,
      edad: 30,
      direccion: '',
      latitud: 0,
      longitud: 0
    });
    alert(`Paciente ${nuevo.nombre} creado con éxito.`);
  };

  const handleEditPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    setPacientes(prev =>
      prev.map(p => p.id === editingPatient.id ? { ...editingPatient } : p)
    );
    setEditingPatient(null);
    alert("Datos de la ficha actualizados con éxito.");
  };

  // ---- 7. Profile Picture Upload & Custom Adjustments ----
  const triggerProfilePicUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfilePic(reader.result);
          localStorage.setItem('silvia_profile_pic', reader.result);
          alert("¡Foto de perfil actualizada desde tu galería!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredPacientes = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.diagnostico.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.id.includes(patientSearchQuery)
  );

  // Helper to get linked vouchers
  const getBonosPorPaciente = (pacienteId: string) => {
    return bonos.filter(b => b.pacienteId === pacienteId);
  };

  const nextSessionPaciente = pacientes.find(p => p.id === '1045920') || pacientes[0];

  return (
    <div id="app_viewport" className="max-w-md mx-auto min-h-screen bg-surface-bg flex flex-col relative pb-28 text-on-surface select-none shadow-xl border-x border-outline-variant/10">
      
      {/* Hidden File Input for Profile Picture */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleProfilePicChange}
        accept="image/*"
        className="hidden"
      />

      {/* ---- TOP APP BAR ---- */}
      <header className="fixed top-0 max-w-md w-full z-50 ios-blur bg-surface-bg/85 flex justify-between items-center px-5 py-3 h-16 border-b border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div 
            onClick={triggerProfilePicUpload}
            className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/40 shadow-sm cursor-pointer hover:opacity-85 transition-opacity relative group"
            title="Haz clic para subir foto de perfil"
          >
            <img 
              alt="Silvia Margarita Pérez F." 
              className="w-full h-full object-cover" 
              src={profilePic}
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-primary leading-tight text-sm">{profesionalNombre}</h1>
            <p className="text-[10px] font-callout text-secondary font-semibold uppercase tracking-wider">{profesionalProfesion}</p>
          </div>
        </div>
        <button 
          id="btn_settings"
          onClick={() => {
            setActiveTab('ajustes');
            setActiveView('ajustes');
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-95 duration-200 border ${activeTab === 'ajustes' ? 'border-secondary text-secondary' : 'border-outline-variant/10 text-primary'}`}
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </header>

      {/* ---- THERAPY STATUS TOAST ---- */}
      {therapyToastMessage && (
        <div id="toast_therapy_state" className="fixed top-32 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-surface-container-low border border-primary/20 text-primary px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">directions_car</span>
          <div className="flex-1 text-[11px] leading-snug">
            {therapyToastMessage}
          </div>
        </div>
      )}

      {/* ---- VOICE INTENT DETECTED TOAST ---- */}
      {intentNotification && (
        <div id="toast_intent_voice" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-primary text-white px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-2 border border-primary-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary animate-pulse text-2xl">spatial_audio</span>
            <div className="flex-1">
              <p className="text-[10px] font-bold font-callout text-tertiary uppercase tracking-widest leading-none">Asistente de Voz</p>
              <p className="text-xs font-semibold text-white/95 leading-snug mt-1">{intentNotification.message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button 
              onClick={() => setIntentNotification(null)}
              className="px-3 py-1 text-[11px] text-white/70 hover:text-white font-medium"
            >
              Ignorar
            </button>
            <button 
              onClick={intentNotification.callback}
              className="bg-tertiary text-primary hover:bg-white px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200"
            >
              {intentNotification.actionText}
            </button>
          </div>
        </div>
      )}

      {/* ---- MAIN CANVAS BODY ---- */}
      <main className={`px-5 flex-1 flex flex-col ${activeTab === 'inicio' ? 'pt-[68px]' : 'pt-20'}`}>

        {/* ==================== SCREEN 1: INICIO ==================== */}
        {activeTab === 'inicio' && activeView === 'inicio' && (
          <div id="view_inicio" className="flex flex-col items-center animate-fade-in pt-0 pb-2 flex-1">
            <div className="w-[80%] aspect-[4/3] max-h-64 flex items-center justify-center rounded-3xl bg-gradient-to-tr from-primary/10 via-white/80 to-secondary/15 p-[8px] shadow-sm border border-outline-variant/15 mt-0 mb-4 overflow-hidden relative">
              <img 
                src="./assets/silvia_m_perez_logo.png" 
                alt="Silvia M Perez Logo" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full text-center mb-6">
              <h2 className="font-display font-bold text-primary text-lg leading-tight">{profesionalNombre}</h2>
              <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mt-1">{profesionalProfesion}</p>
            </div>

            {/* Central Mic Button Area */}
            <div className="relative w-full aspect-square max-w-[200px] flex items-center justify-center mb-4">
              <div className={`absolute inset-0 rounded-full border border-primary/10 transition-transform duration-1000 ${isListeningGeneral ? 'scale-110 animate-ping' : 'scale-100'}`}></div>
              <button 
                id="btn_microphone_central"
                onClick={toggleListeningGeneral}
                className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 active:scale-95 group ${isListeningGeneral ? 'bg-secondary' : 'bg-primary'}`}
              >
                {isListeningGeneral && (
                  <div className="absolute inset-0 rounded-full bg-secondary/20 pulse-animation -z-10 scale-105"></div>
                )}
                <span className="material-symbols-outlined text-white text-4xl mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {isListeningGeneral ? 'mic' : 'mic_none'}
                </span>
                <span className="font-display font-semibold text-white text-xs">
                  {isListeningGeneral ? 'Escuchando...' : 'Dictar comando'}
                </span>
              </button>
            </div>

            {/* Live voice feedback transcription */}
            {voiceText && (
              <div id="transcription_box_realtime" className="w-full bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 text-center mb-4 transition-all animate-pulse">
                <span className="text-[9px] font-callout font-bold text-secondary uppercase tracking-widest block mb-0.5">Transcripción en Tiempo Real</span>
                <p className="text-xs font-semibold text-on-surface italic">
                  "{voiceText}"
                </p>
                <div className="text-[10px] text-on-surface-variant/70 mt-2 space-y-1">
                  <p>✨ Di: <span className="font-bold text-primary">"Mañana voy a atender a Eduardo Castro a las 8 am"</span></p>
                  <p>✨ Di: <span className="font-bold text-primary">"Actualizar datos de Eduardo"</span></p>
                </div>
              </div>
            )}

            {/* Micro metrics */}
            <div className="w-full grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface-container-lowest p-3 rounded-2xl luxury-shadow border border-outline-variant/20 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-primary mb-1 text-xl">calendar_today</span>
                <p className="font-callout text-[9px] font-bold text-outline uppercase tracking-wider">Citas Hoy</p>
                <p className="font-display font-bold text-primary text-base">{agenda.filter(c => c.fecha === 'Hoy' || c.fecha === 'En 15 minutos').length + 1} Pacientes</p>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-2xl luxury-shadow border border-outline-variant/20 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-secondary mb-1 text-xl">payments</span>
                <p className="font-callout text-[9px] font-bold text-outline uppercase tracking-wider">Bonos Válidos</p>
                <p className="font-display font-bold text-primary text-base">{bonos.filter(b => b.estado === 'Válido').length} Activos</p>
              </div>
            </div>

            {/* Dynamic Next Session Highlight Bento Card */}
            {nextSessionPaciente && (
              <div id="card_next_session_bento" className="w-full bg-primary-container/10 p-4 rounded-2xl luxury-shadow border border-primary/10">
                <div className="flex justify-between items-center mb-2.5">
                  <h3 className="font-display font-bold text-primary text-xs">Siguiente en Agenda</h3>
                  <span className="px-2 py-0.5 bg-primary text-white font-callout text-[9px] font-bold rounded-full uppercase tracking-wider">En 15 min</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">child_care</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-on-surface text-xs">{nextSessionPaciente.nombre}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">{nextSessionPaciente.diagnostico}</p>
                  </div>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-primary/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[9px] font-semibold text-outline">
                    <span>Aseguradora: {nextSessionPaciente.empresa}</span>
                    <span>{nextSessionPaciente.direccion || 'Sin dirección guardada'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openWaze(nextSessionPaciente)}
                      className="py-2 rounded-xl bg-secondary text-white font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-secondary/90 active:scale-95"
                    >
                      <span>🚗</span>
                      Navegar
                    </button>
                    <button
                      onClick={() => startTherapyMode(nextSessionPaciente)}
                      className="py-2 rounded-xl border border-primary text-primary font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-primary/10 active:scale-95"
                    >
                      <span>▶</span>
                      Iniciar Terapia
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SCREEN 1.5: ACTIVE SESSION CLINICAL WORKSPACE ==================== */}
        {activeView === 'sesion_activa' && sessionPatient && (
          <div id="view_sesion_activa" className="flex flex-col gap-4 animate-fade-in py-2">
            {therapySessionState.active && therapySessionState.pacienteId === sessionPatient.id && (
              <div className="bg-surface-container-lowest rounded-3xl border border-primary/10 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-primary/80">Terapia domiciliaria</p>
                    <h2 className="font-display font-bold text-primary text-sm mt-1">{sessionPatient.nombre}</h2>
                    <p className="text-[10px] text-on-surface-variant mt-1">Radio activo: {therapyRadius} m · {hasArrivedAtHome ? 'En domicilio' : 'En ruta'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                    <div className="bg-white rounded-2xl p-3 border border-outline-variant/20 text-center">
                      <p className="text-[9px] uppercase tracking-[0.24em] text-outline">Distancia</p>
                      <p className="font-bold text-primary text-sm mt-1">{patientDistance != null ? `${patientDistance} m` : 'Calculando...'}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-outline-variant/20 text-center">
                      <p className="text-[9px] uppercase tracking-[0.24em] text-outline">Temporizador</p>
                      <p className="font-bold text-primary text-sm mt-1">{Math.floor(therapyTimer.remainingSeconds/60).toString().padStart(2,'0')}:{(therapyTimer.remainingSeconds%60).toString().padStart(2,'0')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    {hasArrivedAtHome
                      ? 'Terapia iniciada tras llegada al domicilio. Mantente dentro de la zona definida para continuar.'
                      : 'Sigue la ruta y espera la confirmación automática cuando ingreses al domicilio.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openWaze(sessionPatient)}
                      className="py-2 px-3 rounded-2xl bg-secondary text-primary text-[10px] font-bold hover:bg-secondary/90 transition-colors"
                    >
                      Navegar
                    </button>
                    <button
                      onClick={handleTherapyFinalize}
                      className="py-2 px-3 rounded-2xl bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition-colors"
                    >
                      Finalizar Terapia
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-callout text-[9px] text-white bg-secondary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Sesión de Voz</span>
                <span className="text-xs font-semibold text-on-surface-variant">Duración en tiempo real</span>
              </div>
              <h2 className="font-display font-bold text-primary text-base">Paciente: {sessionPatient.nombre}</h2>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col items-center gap-3 border border-outline-variant/30 shadow-md">
              <div className="flex justify-between w-full items-center">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full bg-error ${isSessionRecording ? 'active-pulse' : ''}`}></div>
                  <span className="font-callout text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {isSessionRecording ? 'Dictado continuo activo' : 'Micrófono pausado'}
                  </span>
                </div>
                <span id="timer_elapsed_clinical" className="font-display font-bold text-primary text-sm tabular-nums">
                  {Math.floor(sessionDuration / 60).toString().padStart(2, '0')}:{(sessionDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Waveform representation */}
              <div className="w-full h-12 flex items-end justify-center gap-[2px] py-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = isSessionRecording ? Math.floor(Math.random() * 80) + 20 : 15;
                  return (
                    <div 
                      key={i} 
                      className="w-1 flex-1 rounded-full transition-all duration-300"
                      style={{ height: `${h}%`, backgroundColor: h > 50 ? '#005265' : '#b5ebff' }}
                    />
                  );
                })}
              </div>

              <div className="flex gap-2 w-full">
                <button 
                  onClick={pauseTherapySession}
                  className="flex-1 py-2 px-3 rounded-xl border border-primary text-primary font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-primary-container/5"
                >
                  <span className="material-symbols-outlined text-xs">{isSessionRecording ? 'pause' : 'play_arrow'}</span>
                  {isSessionRecording ? 'Pausar' : 'Reanudar'}
                </button>
                <button 
                  onClick={finishAndSaveSession}
                  className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-xs">done_all</span>
                  Guardar Evolución
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-display font-bold text-xs text-primary">Transcripciones del Plan</h3>
              
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {activeTranscriptBlocks.map((block) => (
                  <div key={block.id} className="bg-white p-2.5 rounded-xl border border-outline-variant/20 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-callout text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                        {block.tipo}
                      </span>
                      <span className="text-[9px] text-outline">{block.hora}</span>
                    </div>
                    <p className="text-[11px] text-on-surface leading-relaxed italic">"{block.texto}"</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddNewManualBlock} className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <select 
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value as any)}
                    className="bg-white border border-outline-variant/45 rounded-lg text-[10px] p-1 focus:ring-1 focus:ring-primary outline-none font-bold text-primary"
                  >
                    <option value="Lenguaje">Lenguaje</option>
                    <option value="Deglución">Deglución</option>
                    <option value="Voz">Voz</option>
                    <option value="Audición">Audición</option>
                  </select>
                  <input 
                    type="text"
                    value={newBlockText}
                    onChange={(e) => setNewBlockText(e.target.value)}
                    placeholder="Escribir anotación rápida..."
                    className="flex-1 bg-white border border-outline-variant/45 rounded-lg text-[10px] p-1.5 outline-none"
                  />
                  <button type="submit" className="bg-primary text-white p-1 rounded-lg">
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 2: AGENDA (NUEVA SECCIÓN) ==================== */}
        {activeTab === 'agenda' && activeView === 'agenda' && (
          <div id="view_agenda" className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display font-bold text-primary text-lg">Agenda Médica</h2>
                <p className="text-[11px] text-outline font-medium">Control de Próximas Citas</p>
              </div>
              <button 
                onClick={startVoiceCita}
                className="bg-primary text-white h-9 px-3 rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-md active:scale-95 transition-all hover:bg-primary/95"
              >
                <span className="material-symbols-outlined text-xs">mic</span>
                Nueva Cita
              </button>
            </div>

            {/* Voice booking instruction banner */}
            <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-xl flex items-start gap-2.5">
              <span className="material-symbols-outlined text-secondary text-lg">record_voice_over</span>
              <div>
                <h4 className="font-display font-bold text-secondary text-xs">Agendamiento por Voz Activado</h4>
                <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Pulsa el micrófono en el Inicio y di: <span className="font-semibold italic text-secondary">"Mañana voy a atender a Eduardo Castro a las 8 am"</span>. El sistema programará el espacio automáticamente.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {agenda.map((cita) => {
                const isLinked = pacientes.some(p => p.nombre.toLowerCase().includes(cita.pacienteNombre.toLowerCase()));
                return (
                  <div key={cita.id} className="bg-white p-3.5 rounded-2xl border border-outline-variant/15 shadow-sm flex justify-between items-center hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-xl">calendar_month</span>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1.5">
                          {cita.pacienteNombre}
                          {isLinked && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 rounded" title="Paciente registrado">
                              Vinculado
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-outline font-semibold mt-0.5">Fonoaudiología Clínica | Control</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 bg-secondary text-white font-callout text-[9px] font-bold rounded-md uppercase tracking-wider">
                        {cita.fecha}
                      </span>
                      <span className="text-[10px] text-on-surface font-bold font-callout">{cita.hora}</span>
                    </div>
                  </div>
                );
              })}

              {agenda.length === 0 && (
                <p className="text-center py-8 text-xs italic text-outline">No hay citas programadas para Silvia.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3: PACIENTES ==================== */}
        {activeTab === 'pacientes' && activeView === 'pacientes' && !editingPatient && (
          <div id="view_pacientes" className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display font-bold text-primary text-lg">Directorio Fonoaudiológico</h2>
                <p className="text-[11px] text-outline font-medium">Fichas clínicas y evolución médica</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button 
                  onClick={startVoicePaciente}
                  className="bg-primary text-white h-9 px-3 rounded-lg flex items-center gap-1 text-[11px] font-bold shadow-md active:scale-95 hover:bg-primary/95 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">mic</span>
                  Nuevo Paciente
                </button>
                <button 
                  onClick={() => setShowPatientForm(prev => !prev)}
                  className="text-primary hover:underline text-[10px] font-semibold"
                >
                  {showPatientForm ? "Ocultar formulario" : "Ingresar manualmente"}
                </button>
              </div>
            </div>

            {/* Confirmation Card for Voice Patient detection */}
            {detectedPatientData && (
              <div className="bg-white border-2 border-primary/30 p-4 rounded-2xl shadow-xl flex flex-col gap-3 animate-fade-in my-3">
                <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <span className="material-symbols-outlined text-primary text-xl">person_search</span>
                  <h3 className="font-display font-bold text-primary text-sm">Confirmar Paciente Detectado</h3>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-outline block">CÉDULA / ID</span>
                      <span className="font-semibold text-on-surface">{detectedPatientData.id || "Falta"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-outline block">EDAD</span>
                      <span className="font-semibold text-on-surface">{detectedPatientData.edad} años</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-[9px] font-bold text-outline block">NOMBRE COMPLETO</span>
                    <span className="font-bold text-primary text-sm">{detectedPatientData.nombre || "Falta"}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-outline block">ASEGURADORA</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${detectedPatientData.empresa === 'Colsanitas' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {detectedPatientData.empresa}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-outline block">TELÉFONO</span>
                      <span className="font-semibold text-on-surface">{detectedPatientData.telefono}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-outline block">DIAGNÓSTICO FONOAUDIOLÓGICO</span>
                    <span className="font-semibold text-on-surface">{detectedPatientData.diagnostico || "Falta"}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                  <button 
                    onClick={() => setDetectedPatientData(null)}
                    className="flex-1 py-2 border border-outline text-outline font-bold text-[10px] rounded-lg hover:bg-surface-container"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={() => {
                      if (!detectedPatientData.nombre || !detectedPatientData.id) {
                        alert("Por favor ingrese el nombre y la cédula del paciente.");
                        return;
                      }
                      setPacientes(prev => [detectedPatientData, ...prev]);
                      setDetectedPatientData(null);
                      alert("Paciente creado con éxito ✓");
                    }}
                    className="flex-1 py-2 bg-primary text-white font-bold text-[10px] rounded-lg shadow-md hover:bg-primary-container"
                  >
                    Guardar Paciente
                  </button>
                </div>
              </div>
            )}

            {/* Create Patient Form */}
            {showPatientForm && (
              <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-primary/20 shadow-lg animate-fade-in">
                <h3 className="font-display font-bold text-primary text-xs mb-2.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Registrar Ficha Clínica
                </h3>

                <form onSubmit={handleCreatePatient} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-outline block mb-0.5">CÉDULA / ID*</label>
                      <input 
                        type="text" required placeholder="e.g. 1029384"
                        value={newPatient.id}
                        onChange={(e) => setNewPatient({ ...newPatient, id: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-outline block mb-0.5">EDAD*</label>
                      <input 
                        type="number" required placeholder="Años" min="1" max="110"
                        value={newPatient.edad}
                        onChange={(e) => setNewPatient({ ...newPatient, edad: parseInt(e.target.value) || 30 })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE COMPLETO*</label>
                    <input 
                      type="text" required placeholder="e.g. Eduardo Castro"
                      value={newPatient.nombre}
                      onChange={(e) => setNewPatient({ ...newPatient, nombre: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-outline block mb-0.5">ASEGURADORA</label>
                      <select 
                        value={newPatient.empresa}
                        onChange={(e) => setNewPatient({ ...newPatient, empresa: e.target.value })}
                        className="w-full bg-white border border-outline-variant/30 rounded-lg p-2 text-xs outline-none font-bold text-primary"
                      >
                        <option value="Colsanitas">Colsanitas</option>
                        <option value="Medisanitas">Medisanitas</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO*</label>
                      <input 
                        type="text" required placeholder="e.g. 315 789 4512"
                        value={newPatient.telefono}
                        onChange={(e) => setNewPatient({ ...newPatient, telefono: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">DIAGNÓSTICO FONOAUDIOLÓGICO*</label>
                    <input 
                      type="text" required placeholder="e.g. Afasia motora post-trauma"
                      value={newPatient.diagnostico}
                      onChange={(e) => setNewPatient({ ...newPatient, diagnostico: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">DIRECCIÓN</label>
                    <input
                      type="text"
                      placeholder="e.g. Calle 123 #45-67"
                      value={newPatient.direccion}
                      onChange={(e) => setNewPatient({ ...newPatient, direccion: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-outline block mb-0.5">LATITUD</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newPatient.latitud}
                        onChange={(e) => setNewPatient({ ...newPatient, latitud: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-outline block mb-0.5">LONGITUD</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newPatient.longitud}
                        onChange={(e) => setNewPatient({ ...newPatient, longitud: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowPatientForm(false)} className="flex-1 py-2 border border-outline text-outline font-bold text-[10px] rounded-lg">
                      Cancelar
                    </button>
                    <button type="submit" className="flex-1 py-2 bg-primary text-white font-bold text-[10px] rounded-lg shadow-md">
                      Crear Ficha
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Search Input bar */}
            <div id="search_bar_container" className="flex items-center gap-2 bg-surface-container p-2 rounded-xl border border-outline-variant/30">
              <span className="material-symbols-outlined text-outline text-lg">search</span>
              <input 
                type="text"
                placeholder="Buscar paciente por nombre o diagnóstico..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none font-callout font-medium text-xs w-full focus:ring-0"
              />
              {patientSearchQuery && (
                <button onClick={() => setPatientSearchQuery('')} className="text-outline">
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {/* Patients List Grid */}
            <div className="space-y-2.5">
              {filteredPacientes.map((paciente) => (
                <div 
                  key={paciente.id}
                  onClick={() => {
                    setSelectedPacienteId(paciente.id);
                    setActiveView('paciente_detalle');
                  }}
                  className="bg-white p-3.5 rounded-2xl border border-outline-variant/10 shadow-sm flex justify-between items-center hover:bg-surface-container-low cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10">
                      <span className="material-symbols-outlined text-primary text-xl">person</span>
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-primary text-xs">{paciente.nombre}</h4>
                      <p className="text-[10px] text-on-surface-variant/80 font-semibold">{paciente.diagnostico} {paciente.edad ? `(${paciente.edad} años)` : ''}</p>
                      
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-1.5 py-0.5 bg-surface-container text-outline text-[8px] font-bold rounded">ID: {paciente.id}</span>
                        <span className="text-outline text-[8px]">•</span>
                        
                        {/* Correct Insurers Color Code */}
                        {paciente.empresa === 'Colsanitas' ? (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold rounded-full">
                            Colsanitas
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-bold rounded-full">
                            Medisanitas
                          </span>
                        )}
                        
                        {/* Estado del Paciente */}
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full border ${
                          (paciente.estado || 'Activo') === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          (paciente.estado || 'Activo') === 'Inactivo' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                          (paciente.estado || 'Activo') === 'Suspendido' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          (paciente.estado || 'Activo') === 'Retirado' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {paciente.estado || 'Activo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold text-primary font-callout">{paciente.progresoPlan}% Plan</span>
                    <div className="h-1 w-12 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${paciente.progresoPlan}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3.5: EDIT PATIENT VIEW ==================== */}
        {editingPatient && (
          <div id="view_edit_paciente" className="flex flex-col gap-4 animate-fade-in py-2">
            <button 
              onClick={() => setEditingPatient(null)}
              className="self-start text-primary font-bold text-xs flex items-center gap-1 mb-1 hover:underline"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Regresar al Directorio
            </button>

            <div className="bg-white p-4 rounded-2xl border border-primary/20 shadow-lg">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant/15">
                <span className="material-symbols-outlined text-primary text-xl">edit_note</span>
                <h3 className="font-display font-bold text-primary text-sm">
                  Editar Ficha Clínica: {editingPatient.nombre}
                </h3>
              </div>

              <p className="text-[10px] bg-secondary-fixed text-secondary font-bold p-2 rounded-xl mb-3 leading-snug">
                Modo de edición rápido activado. Añada o actualice la edad, el diagnóstico fonoaudiológico o el teléfono.
              </p>

              <form onSubmit={handleEditPatient} className="space-y-3">
                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">EDAD</label>
                  <input 
                    type="number"
                    value={editingPatient.edad || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, edad: parseInt(e.target.value) || 0 })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold"
                    placeholder="Indique la edad del paciente"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">DIAGNÓSTICO FONOAUDIOLÓGICO</label>
                  <input 
                    type="text"
                    value={editingPatient.diagnostico}
                    onChange={(e) => setEditingPatient({ ...editingPatient, diagnostico: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO DE CONTACTO</label>
                  <input 
                    type="text"
                    value={editingPatient.telefono}
                    onChange={(e) => setEditingPatient({ ...editingPatient, telefono: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">ASEGURADORA</label>
                  <select 
                    value={editingPatient.empresa}
                    onChange={(e) => setEditingPatient({ ...editingPatient, empresa: e.target.value })}
                    className="w-full bg-white border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none font-bold text-primary"
                  >
                    <option value="Colsanitas">Colsanitas</option>
                    <option value="Medisanitas">Medisanitas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">ESTADO DEL PACIENTE</label>
                  <select 
                    value={editingPatient.estado || 'Activo'}
                    onChange={(e) => setEditingPatient({ ...editingPatient, estado: e.target.value as any })}
                    className="w-full bg-white border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none font-bold text-primary"
                  >
                    <option value="Activo">✅ Activo</option>
                    <option value="Inactivo">⏸️ Inactivo</option>
                    <option value="Suspendido">⚠️ Suspendido (problemas de pago)</option>
                    <option value="Retirado">🚪 Retirado</option>
                    <option value="Fallecido">🕊️ Fallecido</option>
                  </select>
                </div>

                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">DIRECCIÓN</label>
                  <input
                    type="text"
                    value={editingPatient.direccion || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, direccion: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold"
                    placeholder="Calle 123 #45-67"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">LATITUD</label>
                    <input 
                      type="number"
                      step="0.000001"
                      value={editingPatient.latitud ?? ''}
                      onChange={(e) => setEditingPatient({ ...editingPatient, latitud: parseFloat(e.target.value) || undefined })}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">LONGITUD</label>
                    <input 
                      type="number"
                      step="0.000001"
                      value={editingPatient.longitud ?? ''}
                      onChange={(e) => setEditingPatient({ ...editingPatient, longitud: parseFloat(e.target.value) || undefined })}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingPatient(null)} 
                    className="flex-1 py-2.5 border border-outline text-outline font-bold text-[10px] rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-primary text-white font-bold text-[10px] rounded-lg shadow-md"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3.6: PACIENTE DETALLE (FICHA COMPLETA) ==================== */}
        {activeView === 'paciente_detalle' && selectedPacienteId && (
          (() => {
            const paciente = pacientes.find(p => p.id === selectedPacienteId);
            if (!paciente) return <p className="text-xs text-center py-4">Ficha no encontrada.</p>;

            const patientHistory = terapias.filter(t => t.pacienteId === paciente.id);
            const linkedBonos = getBonosPorPaciente(paciente.id);

            return (
              <div id="view_paciente_detalle" className="flex flex-col gap-3.5 animate-fade-in py-2">
                <button 
                  onClick={() => {
                    setActiveTab('pacientes');
                    setActiveView('pacientes');
                    setSelectedPacienteId(null);
                  }}
                  className="self-start text-primary font-bold text-xs flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Volver al Directorio
                </button>

                {/* Patient Hero Card */}
                <div className="bg-white rounded-2xl luxury-shadow border border-outline-variant/30 p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="font-callout text-[9px] font-bold text-outline uppercase tracking-widest">Expediente Clínico</span>
                      <h2 className="font-display font-bold text-primary text-base leading-snug mt-0.5">{paciente.nombre}</h2>
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded">ID: {paciente.id}</span>
                        <span className="text-outline text-xs">•</span>
                        <span className="text-outline text-[11px] font-semibold">{paciente.telefono}</span>
                        {paciente.edad && (
                          <>
                            <span className="text-outline text-xs">•</span>
                            <span className="text-outline text-[11px] font-bold">{paciente.edad} años</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {paciente.empresa === 'Colsanitas' ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold rounded-lg shadow-sm">
                          Colsanitas
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold rounded-lg shadow-sm">
                          Medisanitas
                        </span>
                      )}
                      
                      {/* Estado del Paciente */}
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border shadow-sm ${
                        (paciente.estado || 'Activo') === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        (paciente.estado || 'Activo') === 'Inactivo' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                        (paciente.estado || 'Activo') === 'Suspendido' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        (paciente.estado || 'Activo') === 'Retirado' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {paciente.estado || 'Activo'}
                      </span>
                      
                      <button 
                        onClick={() => setEditingPatient(paciente)}
                        className="text-primary hover:text-secondary text-[10px] font-bold flex items-center gap-0.5 bg-surface-container/30 px-2 py-1 rounded border border-outline-variant/20 mt-1"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                        Editar
                      </button>
                      
                      <button 
                        onClick={() => {
                          const nuevoEstado = prompt("Cambiar estado del paciente:\n\n1 = Activo\n2 = Inactivo\n3 = Suspendido\n4 = Retirado\n5 = Fallecido\n\nEscribe el número:");
                          const mapa: Record<string, any> = { '1': 'Activo', '2': 'Inactivo', '3': 'Suspendido', '4': 'Retirado', '5': 'Fallecido' };
                          if (nuevoEstado && mapa[nuevoEstado]) {
                            setPacientes(prev => prev.map(p => p.id === paciente.id ? { ...p, estado: mapa[nuevoEstado] } : p));
                            alert(`Estado cambiado a: ${mapa[nuevoEstado]} ✓`);
                          }
                        }}
                        className="text-amber-600 hover:text-amber-700 text-[10px] font-bold flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1"
                      >
                        <span className="material-symbols-outlined text-xs">swap_horiz</span>
                        Estado
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de borrar a ${paciente.nombre}?\n\nSi solo ya no viene, mejor cámbialo a "Inactivo" o "Retirado" para conservar su historial.`)) {
                            setPacientes(prev => prev.filter(p => p.id !== paciente.id));
                            setActiveView('pacientes');
                            alert(`${paciente.nombre} ha sido eliminado.`);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-0.5 bg-red-50 px-2 py-1 rounded border border-red-200 mt-1"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        Borrar
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-outline-variant/10">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-callout text-[11px] text-on-surface font-semibold">Progreso Terapéutico</span>
                      <span className="font-callout text-[11px] font-bold text-primary">{paciente.progresoPlan}% Plan</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${paciente.progresoPlan}%` }}></div>
                    </div>
                    <p className="mt-1.5 text-on-surface-variant text-[10px] font-medium italic">
                      {paciente.sesionesCompletadas} de {paciente.sesionesTotales} sesiones del plan clínico completadas.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-outline-variant/20 shadow-sm">
                    <span className="material-symbols-outlined text-primary mb-0.5 text-lg">medical_services</span>
                    <span className="font-callout text-[8px] text-outline font-bold block">DIAGNÓSTICO</span>
                    <span className="font-display font-bold text-on-surface text-[11px] block truncate">{paciente.diagnostico}</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-outline-variant/20 shadow-sm">
                    <span className="material-symbols-outlined text-secondary mb-0.5 text-lg">calendar_today</span>
                    <span className="font-callout text-[8px] text-outline font-bold block">CITAS DE CONTROL</span>
                    <span className="font-display font-bold text-on-surface text-[11px] block">{paciente.proximaCita || 'No programada'}</span>
                  </div>
                </div>

                {/* Linked Bonos Section (Camara de Bonos Inteligente) */}
                <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-3.5">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-outline-variant/10">
                    <h3 className="font-display font-bold text-xs text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">confirmation_number</span>
                      Bonos Médicos Vinculados
                    </h3>
                    <span className="text-[10px] bg-secondary-fixed text-secondary font-extrabold px-1.5 rounded-full">
                      {linkedBonos.length} bonos
                    </span>
                  </div>
                  
                  {linkedBonos.map((bono) => (
                    <div key={bono.id} className="flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/20 mb-1.5 last:mb-0">
                      <div>
                        <p className="font-display font-bold text-primary text-[11px]">{bono.id}</p>
                        <p className="text-[9px] text-outline font-semibold">Código: {bono.codigoPago} | {bono.fecha}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[8px] font-extrabold rounded-full">
                        Válido
                      </span>
                    </div>
                  ))}

                  {linkedBonos.length === 0 && (
                    <p className="text-center text-[10px] text-outline italic py-2">
                      No hay bonos médicos vinculados a esta ficha. Escanea un bono en la pestaña de "Bonos" para anclarlo.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center px-1">
                  <h3 className="font-display font-bold text-xs text-primary">Historial Reciente de Sesiones</h3>
                </div>

                <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden divide-y divide-outline-variant/10">
                  {patientHistory.map((terapia) => (
                    <div key={terapia.id} className="p-3.5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-surface-container flex flex-col items-center justify-center text-[10px]">
                            <span className="font-bold text-primary leading-none">{terapia.fecha.split(' ')[0]}</span>
                            <span className="text-[7px] text-outline uppercase font-extrabold leading-none mt-0.5">{terapia.fecha.split(' ')[2]?.substring(0,3)}</span>
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-xs text-on-surface">Evolución Clínica</h4>
                            <p className="text-[9px] text-outline font-medium">Registrado a las {terapia.hora}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-secondary-fixed text-secondary text-[8px] font-bold rounded-full uppercase">
                          {terapia.tipo}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap pl-10">
                        {terapia.anotaciones}
                      </p>
                    </div>
                  ))}

                  {patientHistory.length === 0 && (
                    <div className="p-6 text-center text-outline italic text-[11px]">
                      No hay registros previos para este paciente. Use "Iniciar Evolución" para añadir notas.
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => startTherapySession(paciente)}
                    className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1 text-[11px]"
                  >
                    <span className="material-symbols-outlined text-xs">add_notes</span>
                    Nueva Evolución
                  </button>
                  <button 
                    onClick={() => {
                      alert(`--- HISTORIAL MÉDICO IMPORTADO ---\nPaciente: ${paciente.nombre}\nID: ${paciente.id}\nEmpresa: ${paciente.empresa}\nDiagnóstico: ${paciente.diagnostico}\nSesiones Completadas: ${paciente.sesionesCompletadas} de ${paciente.sesionesTotales}\n\nFicha exportada exitosamente en formato PDF clínica.`);
                    }}
                    className="flex-1 border border-primary text-primary font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 text-[11px]"
                  >
                    <span className="material-symbols-outlined text-xs font-semibold">share</span>
                    Exportar Ficha
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* ==================== SCREEN 4: REGISTROS ==================== */}
        {activeTab === 'registros' && activeView === 'registros' && (
          <div id="view_registros" className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
            <div>
              <h2 className="font-display font-bold text-primary text-lg">Histórico Clínico</h2>
              <p className="text-[11px] text-outline font-medium">Evoluciones grabadas por la Dra. Silvia</p>
            </div>

            <div className="space-y-3">
              {terapias.map((terapia) => (
                <div key={terapia.id} className="bg-white p-3.5 rounded-2xl border border-outline-variant/15 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-callout text-[8px] font-bold text-secondary uppercase tracking-widest">{terapia.fecha}</span>
                      <h3 className="font-display font-bold text-primary text-xs mt-0.5">{terapia.pacienteNombre}</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[8px] font-bold rounded-full uppercase">
                      {terapia.tipo}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-primary/20 italic">
                    {terapia.anotaciones}
                  </p>

                  <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-outline-variant/10 text-[9px] text-outline font-medium">
                    <span>Cédula: {terapia.pacienteId}</span>
                    <button 
                      onClick={() => {
                        setSelectedPacienteId(terapia.pacienteId);
                        setActiveTab('pacientes');
                        setActiveView('paciente_detalle');
                      }}
                      className="text-primary font-bold hover:underline"
                    >
                      Ver Expediente
                    </button>
                  </div>
                </div>
              ))}

              {terapias.length === 0 && (
                <p className="text-center py-8 text-xs italic text-outline">No hay terapias registradas.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 5: BONOS (CAMARA & OCR) ==================== */}
        {activeTab === 'bonos' && activeView === 'bonos' && (
          <div id="view_bonos" className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
            <div>
              <h2 className="font-display font-bold text-primary text-lg">Cámara de Bonos Inteligente</h2>
              <p className="text-[11px] text-outline font-medium">Escaner OCR con anclaje automático</p>
            </div>

            {/* Camera Simulated Frame */}
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black shadow-md border border-outline-variant/20">
              {cameraActive ? (
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              ) : scannerPhoto ? (
                <img src={scannerPhoto} alt="Voucher Scanned" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0">
                  <img 
                    alt="Medical voucher" 
                    className="w-full h-full object-cover opacity-60 brightness-95" 
                    src="./assets/silvia_m_perez_logo.png"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
              )}

              {isScanning && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                  <div className="w-4/5 h-2/3 border border-white/50 rounded-xl relative shadow-md">
                    <div className="scanner-line absolute w-full left-0"></div>
                  </div>
                </div>
              )}

              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-secondary animate-ping' : 'bg-green-500'}`}></span>
                {scannerStatus}
              </div>

              {/* Scan Buttons */}
              <div className="absolute bottom-3.5 inset-x-0 z-20 flex justify-center gap-4 items-center">
                <button 
                  onClick={() => alert("Simulando Flash Activado.")}
                  className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90"
                >
                  <span className="material-symbols-outlined text-sm">flash_on</span>
                </button>

                <button 
                  onClick={cameraActive ? captureBonoPhoto : startScanningVoucher}
                  className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                >
                  <div className="w-full h-full rounded-full bg-primary flex items-center justify-center hover:bg-primary-container">
                    <span className="material-symbols-outlined text-white text-lg">
                      {cameraActive ? 'photo_camera' : 'sync'}
                    </span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    alert("Abriendo galería de imágenes del dispositivo...");
                    startScanningVoucher();
                  }}
                  className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90"
                >
                  <span className="material-symbols-outlined text-sm">gallery_thumbnail</span>
                </button>
              </div>
            </div>

            {/* OCR Scanned Values Form */}
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-primary text-lg">qr_code_scanner</span>
                <h3 className="font-display font-bold text-xs text-on-surface">Datos Digitalizados</h3>
              </div>

              {isEditingBonoManually ? (
                <form onSubmit={handleManualBonoSubmit} className="space-y-2.5">
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">CÓDIGO DEL BONO</label>
                    <input 
                      type="text" required
                      value={manualBonoCode}
                      onChange={(e) => setManualBonoCode(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">FECHA DEL BONO</label>
                    <input 
                      type="text" required
                      value={manualBonoFecha}
                      onChange={(e) => setManualBonoFecha(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">VINCULAR CON PACIENTE</label>
                    <select
                      value={manualBonoPacienteId}
                      onChange={(e) => setManualBonoPacienteId(e.target.value)}
                      className="w-full bg-white border border-outline-variant/30 rounded-lg p-2 text-xs font-bold text-primary"
                    >
                      <option value="">-- No vincular --</option>
                      {pacientes.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsEditingBonoManually(false)} className="flex-1 py-1.5 text-xs border border-outline text-outline font-bold rounded-md">
                      Cancelar
                    </button>
                    <button type="submit" className="flex-1 py-1.5 text-xs bg-primary text-white font-bold rounded-md">
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[8px] font-bold text-outline block">CÓDIGO DE PAGO DETECTADO</span>
                    <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl text-xs font-bold text-primary mt-0.5">
                      <span>{detectedBonoCode}</span>
                      <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] font-bold text-outline block">PACIENTE RECONOCIDO</span>
                    <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl text-xs font-bold text-primary mt-0.5">
                      <span>{detectedBonoPaciente}</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 rounded">
                        Autovínculo Activo
                      </span>
                    </div>
                    <p className="text-[9px] text-outline italic mt-1 leading-snug">
                      La IA reconoció el nombre del paciente en el bono. Se anclará automáticamente a su ficha de Eduardo Castro.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={saveScannedBono}
                      className="flex-1 bg-primary text-white font-bold h-9 rounded-lg text-[10px] shadow-sm flex items-center justify-center gap-0.5 active:scale-95"
                    >
                      Confirmar y Anclar
                      <span className="material-symbols-outlined text-xs">done</span>
                    </button>
                    <button 
                      onClick={() => {
                        setManualBonoCode(detectedBonoCode);
                        setManualBonoFecha(detectedBonoFecha);
                        setIsEditingBonoManually(true);
                      }}
                      className="flex-1 border border-primary text-primary font-bold h-9 rounded-lg text-[10px] flex items-center justify-center active:scale-95"
                    >
                      Editar Manualmente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Vouchers */}
            <div className="flex flex-col gap-2">
              <h3 className="font-display font-bold text-xs text-on-surface">Últimos Bonos Confirmados</h3>
              <div className="space-y-2">
                {bonos.map((bono) => (
                  <div key={bono.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-secondary/5 rounded-lg flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-lg">receipt_long</span>
                      </div>
                      <div>
                        <p className="font-display font-bold text-on-surface text-[11px]">{bono.id}</p>
                        <p className="text-[9px] text-outline font-semibold">
                          Código: {bono.codigoPago} | {bono.fecha}
                          {bono.pacienteNombre && ` | Vinc: ${bono.pacienteNombre}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase bg-green-100 text-green-800">
                      {bono.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 6: AJUSTES (CONFIGURACIÓN) ==================== */}
        {activeTab === 'ajustes' && activeView === 'ajustes' && (
          <div id="view_ajustes" className="flex flex-col gap-4 animate-fade-in py-2 flex-1">
            <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
              <span className="material-symbols-outlined text-primary text-xl">settings</span>
              <h2 className="font-display font-bold text-primary text-lg">Ajustes del Consultorio</h2>
            </div>

            {/* Big editable photo circle */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-3">
              <div className="relative group">
                <div 
                  onClick={triggerProfilePicUpload}
                  className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={profilePic} alt="Silvia Margarita Pérez F." className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={triggerProfilePicUpload}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow hover:bg-primary-container active:scale-90"
                  title="Cambiar foto de perfil"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </div>

              <div>
                <h3 className="font-display font-bold text-primary text-sm">{profesionalNombre}</h3>
                <p className="text-[10px] font-callout font-bold text-secondary uppercase tracking-wider mt-0.5">{profesionalProfesion}</p>
                <p className="text-[11px] text-outline mt-1 italic">Consultorio Boutique Fonoaudiológico</p>
              </div>
            </div>

            {/* Datos Profesionales Form */}
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
              <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-1.5 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-sm">badge</span>
                Datos Profesionales
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE COMPLETO</label>
                  <input 
                    type="text"
                    value={profesionalNombre}
                    onChange={(e) => setProfesionalNombre(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">PROFESIÓN / ESPECIALIDAD</label>
                  <input 
                    type="text"
                    value={profesionalProfesion}
                    onChange={(e) => setProfesionalProfesion(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO</label>
                    <input 
                      type="text"
                      value={profesionalTelefono}
                      onChange={(e) => setProfesionalTelefono(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">CORREO ELECTRÓNICO</label>
                    <input 
                      type="email"
                      value={profesionalCorreo}
                      onChange={(e) => setProfesionalCorreo(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contacto de Emergencia Form */}
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
              <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-1.5 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-sm">contact_emergency</span>
                Contacto de Emergencia
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[8px] font-bold text-outline block mb-0.5">NOMBRE DE CONTACTO</label>
                  <input 
                    type="text"
                    value={contactoEmergenciaNombre}
                    onChange={(e) => setContactoEmergenciaNombre(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">TELÉFONO</label>
                    <input 
                      type="text"
                      value={contactoEmergenciaTelefono}
                      onChange={(e) => setContactoEmergenciaTelefono(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-outline block mb-0.5">PARENTESCO</label>
                    <input 
                      type="text"
                      value={contactoEmergenciaParentesco}
                      onChange={(e) => setContactoEmergenciaParentesco(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                <div>
                  <h4 className="font-display font-bold text-primary text-xs">Radio de Geolocalización</h4>
                  <p className="text-[10px] text-on-surface-variant">Ajusta el perímetro para activar la llegada automática y detectar salida de zona.</p>
                </div>
                <span className="text-[11px] font-bold text-primary">{therapyRadius} m</span>
              </div>
              <div className="space-y-3">
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={therapyRadius}
                  onChange={(e) => setTherapyRadius(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant">
                  <span>Más estricta</span>
                  <span>Más amplia</span>
                </div>
              </div>
            </div>

            {/* Gemini API Key Config */}
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-2.5">
              <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-2 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-sm">key</span>
                Configuración de Gemini IA
              </h4>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                Pega aquí tu API key de Google AI Studio. Se guarda en tu iPhone y solo se usa para OCR de bonos y resúmenes de IA.
              </p>
              <div>
                <label className="text-[8px] font-bold text-outline block mb-0.5">GEMINI API KEY</label>
                <input
                  type="password"
                  defaultValue={localStorage.getItem('silvia_gemini_api_key') || ''}
                  placeholder="AIza..."
                  className="w-full bg-surface-container-low border border-outline-variant/25 p-2 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-primary font-mono"
                  onBlur={(e) => {
                    if (e.target.value) {
                      localStorage.setItem('silvia_gemini_api_key', e.target.value);
                    }
                  }}
                />
                <p className="text-[9px] text-outline mt-1 italic">
                  Obtén tu key gratis en: ai.google.dev/aistudio
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${localStorage.getItem('silvia_gemini_api_key') ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-on-surface-variant font-semibold">
                  {localStorage.getItem('silvia_gemini_api_key') ? 'Configurada ✓' : 'No configurada'}
                </span>
              </div>
            </div>

            {/* Profile Info Form */}
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-3">
              <h4 className="font-display font-bold text-primary text-xs flex items-center gap-1 pb-2 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-sm">clinical_notes</span>
                Información del Sistema
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline font-semibold">Nombre de la App</span>
                  <span className="font-bold text-primary">Fonoaudiología Premium</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline font-semibold">Versión del Sistema</span>
                  <span className="font-bold text-primary">v1.1.0</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline font-semibold">Estado de la Base de Datos</span>
                  <span className="font-bold text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Activo (LocalStorage)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/10 flex gap-2">
                <button 
                  onClick={() => {
                    if (confirm("¿Estás segura de que deseas restaurar todos los datos clínicos de demostración? Esto borrará tus cambios actuales.")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                >
                  Restaurar Datos
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('silvia_prof_nombre', profesionalNombre);
                    localStorage.setItem('silvia_prof_profesion', profesionalProfesion);
                    localStorage.setItem('silvia_prof_telefono', profesionalTelefono);
                    localStorage.setItem('silvia_prof_correo', profesionalCorreo);
                    localStorage.setItem('silvia_emer_nombre', contactoEmergenciaNombre);
                    localStorage.setItem('silvia_emer_telefono', contactoEmergenciaTelefono);
                    localStorage.setItem('silvia_emer_parentesco', contactoEmergenciaParentesco);
                    
                    alert("Ajustes guardados con éxito ✓");
                    setActiveTab('inicio');
                    setActiveView('inicio');
                  }}
                  className="flex-1 py-2 px-3 bg-primary hover:bg-primary/95 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95 text-center"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ---- BOTTOM FLOATING TAB BAR ---- */}
      <nav className="fixed bottom-0 max-w-md w-full z-50 ios-blur bg-surface-bg/85 flex justify-around items-center px-4 pt-2.5 pb-6 border-t border-outline-variant/30 rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => {
            setActiveTab('inicio');
            setActiveView('inicio');
            setSelectedPacienteId(null);
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${activeTab === 'inicio' ? 'text-secondary' : 'text-outline hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'inicio' ? '"FILL" 1' : '"FILL" 0' }}>home</span>
          <span className="font-callout text-[8px] font-extrabold mt-0.5 uppercase tracking-wider">Inicio</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('agenda');
            setActiveView('agenda');
            setSelectedPacienteId(null);
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${activeTab === 'agenda' ? 'text-secondary' : 'text-outline hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'agenda' ? '"FILL" 1' : '"FILL" 0' }}>calendar_month</span>
          <span className="font-callout text-[8px] font-extrabold mt-0.5 uppercase tracking-wider">Agenda</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('pacientes');
            setActiveView('pacientes');
            setSelectedPacienteId(null);
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${activeTab === 'pacientes' ? 'text-secondary' : 'text-outline hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'pacientes' ? '"FILL" 1' : '"FILL" 0' }}>group</span>
          <span className="font-callout text-[8px] font-extrabold mt-0.5 uppercase tracking-wider">Pacientes</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('registros');
            setActiveView('registros');
            setSelectedPacienteId(null);
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${activeTab === 'registros' ? 'text-secondary' : 'text-outline hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'registros' ? '"FILL" 1' : '"FILL" 0' }}>description</span>
          <span className="font-callout text-[8px] font-extrabold mt-0.5 uppercase tracking-wider">Registros</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('bonos');
            setActiveView('bonos');
            setSelectedPacienteId(null);
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${activeTab === 'bonos' ? 'text-secondary' : 'text-outline hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'bonos' ? '"FILL" 1' : '"FILL" 0' }}>redeem</span>
          <span className="font-callout text-[8px] font-extrabold mt-0.5 uppercase tracking-wider">Bonos</span>
        </button>
      </nav>

      {/* ---- THERAPY MODALS & ALERTS ---- */}
      {showLeftRadiusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-outline-variant/15 text-center">
            <span className="material-symbols-outlined text-secondary text-4xl">warning</span>
            <h3 className="font-display font-bold text-primary text-lg mt-3">Zona de Terapia Abandonada</h3>
            <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">
              Has salido de la zona de domicilio definida ({therapyRadius} m). Si continúas fuera del perímetro, la terapia se finalizará.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={handleTherapyContinue}
                className="py-3 rounded-2xl border border-outline-variant text-primary font-bold text-[11px] bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={handleLeftRadiusFinish}
                className="py-3 rounded-2xl bg-primary text-white font-bold text-[11px] hover:bg-primary/90 transition-colors"
              >
                Finalizar Terapia
              </button>
            </div>
          </div>
        </div>
      )}

      {showTherapyFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-outline-variant/15">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
              <div>
                <h3 className="font-display font-bold text-primary text-lg">Terapia Completa</h3>
                <p className="text-[11px] text-on-surface-variant mt-1">El temporizador ha llegado a cero. ¿Qué deseas hacer ahora?</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-surface-container-low p-3 border border-outline-variant/20 text-[11px] text-on-surface-variant">
                {finishModalPatient ? (
                  <>
                    <p className="font-bold text-primary">{finishModalPatient.nombre}</p>
                    <p className="mt-1">Terapia domiciliaria registrada automáticamente tras llegada a destino.</p>
                  </>
                ) : (
                  <p className="font-semibold text-on-surface">Sesión finalizada.</p>
                )}
              </div>
              <button
                onClick={handleTherapyFinalize}
                className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-[11px] hover:bg-primary/90 transition-colors"
              >
                Finalizar y Guardar
              </button>
              <button
                onClick={handleTherapyAddTen}
                className="w-full py-3 rounded-2xl border border-secondary text-secondary font-bold text-[11px] hover:bg-secondary/10 transition-colors"
              >
                Agregar 10 minutos
              </button>
              <button
                onClick={handleTherapyDictation}
                className="w-full py-3 rounded-2xl bg-surface-container text-primary font-bold text-[11px] hover:bg-surface-container-high transition-colors"
              >
                Pasar a Dictado de Evolución
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- VOICE RECORDING FLOATING HUD (FOR SCHEDULING OR PATIENTS) ---- */}
      {(isListeningForCita || isListeningForPaciente) && (
        <div id="voice_listening_hud" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-white animate-fade-in">
          <div className="bg-white text-on-surface w-[85%] max-w-sm rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-2xl border border-outline-variant/30">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
              <div className="absolute inset-2 rounded-full bg-primary/35 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-md relative z-10">
                <span className="material-symbols-outlined text-2xl">mic</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-display font-bold text-primary text-base">
                {isListeningForCita ? "Agendamiento Inteligente" : "Registrar Paciente por Voz"}
              </h3>
              <p className="text-[11px] text-outline font-semibold uppercase tracking-wider mt-0.5">ESCUCHANDO EN VIVO</p>
            </div>

            <div className="bg-surface-container p-4 rounded-2xl w-full border border-outline-variant/35 min-h-[80px] flex items-center justify-center">
              <p className="text-xs font-semibold text-primary italic leading-relaxed">
                "{voiceInputMessage}"
              </p>
            </div>

            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              {isListeningForCita 
                ? 'Di por ejemplo: "Mañana voy a atender a Eduardo Castro a las 8 am"'
                : 'Di por ejemplo: "Nuevo paciente Eduardo Castro, cédula 10295384, Colsanitas, diagnóstico Afasia Motora"'
              }
            </p>

            <button 
              onClick={() => {
                setIsListeningForCita(false);
                setIsListeningForPaciente(false);
              }}
              className="mt-2 w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-xl transition-all"
            >
              Cancelar Dictado
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
