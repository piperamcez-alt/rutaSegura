import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_USERS, INITIAL_STUDENTS, DRIVER_NOTIFICATIONS } from '../data/mockData.js';
import { guardians } from '../data/guardians.js';
import { safeStorage, rateLimit, auditLog, validators } from '../security/index.js';

// Keys sin prefijo — safeStorage ya añade 'fs:' como namespace
const SK = {
  AUTH_USER:         'auth-user',
  USERS:             'users',
  STUDENTS:          'students',
  PICKUP_CODE:       'pickup-code',
  PICKUP_CODE_TIME:  'pickup-code-time',
  SELECTED_GUARDIAN: 'selected-guardian',
  ATTENDANCE:        'attendance',
  ROUTE_STATUS:      'route-status',
  GUARDIAN_NOTIFS:   'guardian-notifs',
};
const STORAGE_KEYS = SK; // alias para compatibilidad

function triggerSync() {
  try { window.dispatchEvent(new Event('furgon:sync')); } catch (e) { /* noop */ }
}

/* ── Utilidad para generar notificaciones del conductor → apoderado ── */
function makeGuardianNotif(text, tone = 'green') {
  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  return {
    id: `gn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tone,
    title: text,
    time: `a las ${timeStr}`,
  };
}

const STATE_NOTIF_TEXT = {
  subio:         (name) => `🟢 El conductor confirmó que ${name} subió al furgón`,
  no_subio:      (name) => `🔴 El conductor marcó que ${name} no subió al furgón`,
  en_recorrido:  (name) => `🔵 ${name} está en recorrido hacia su domicilio`,
  listo_entrega: (name) => `🟣 ${name} está listo para ser entregado — código requerido`,
  entregado:     (name) => `✅ ${name} fue entregado correctamente por el conductor`,
  pendiente:     (name) => `🟡 ${name} está pendiente de subida`,
};

const STATE_NOTIF_TONE = {
  subio:         'green',
  no_subio:      'amber',
  en_recorrido:  'green',
  listo_entrega: 'amber',
  entregado:     'green',
  pendiente:     'amber',
};

export function useVanState() {
  /* ── 1. Usuarios ── */
  const [users, setUsers] = useState(() => {
    const s = safeStorage.get(STORAGE_KEYS.USERS);
    if (s) { try { return JSON.parse(s); } catch (_) {} }
    return DEFAULT_USERS;
  });

  /* ── 2. Usuario activo ── */
  const [currentUser, setCurrentUser] = useState(() => {
    const s = safeStorage.get(STORAGE_KEYS.AUTH_USER);
    if (s) { try { return JSON.parse(s); } catch (_) {} }
    return null;
  });

  /* ── 3. Apoderado seleccionado ── */
  const [selectedGuardianId, setSelectedGuardianId] = useState(() =>
    safeStorage.get(STORAGE_KEYS.SELECTED_GUARDIAN) || guardians[0].id
  );

  /* ── 4. Código PIN ── */
  const [pickupCode, setPickupCode] = useState(() =>
    safeStorage.get(STORAGE_KEYS.PICKUP_CODE) || '4829'
  );
  const [pickupCodeTime, setPickupCodeTime] = useState(() => {
    const s = safeStorage.get(STORAGE_KEYS.PICKUP_CODE_TIME);
    return s ? new Date(s) : new Date();
  });

  /* ── 5. Asistencia ── */
  const [attending, setAttending] = useState(() => {
    const s = safeStorage.get(STORAGE_KEYS.ATTENDANCE);
    return s !== null ? s === 'true' : true;
  });

  /* ── 6. Estado del recorrido ── */
  const [routeStatus, setRouteStatus] = useState(() =>
    safeStorage.get(STORAGE_KEYS.ROUTE_STATUS) || 'en_ruta'
  );

  /* ── 7. Alumnos ── */
  const [students, setStudents] = useState(() => {
    const s = safeStorage.get(STORAGE_KEYS.STUDENTS);
    if (s) { try { return JSON.parse(s); } catch (_) {} }
    return INITIAL_STUDENTS;
  });

  /* ── 8. Notificaciones del apoderado (generadas por acciones del conductor) ── */
  const [guardianNotifs, setGuardianNotifs] = useState(() => {
    const s = safeStorage.get(STORAGE_KEYS.GUARDIAN_NOTIFS);
    if (s) { try { return JSON.parse(s); } catch (_) {} }
    // Notificaciones iniciales de ejemplo
    return [
      { id: 'gn-init-1', tone: 'green', title: '🚐 El furgón salió del colegio', time: 'hace 6 min' },
      { id: 'gn-init-2', tone: 'amber', title: '📍 Llegada estimada actualizada a 8:24 AM', time: 'hace 2 min' },
    ];
  });

  const isUpdatingRef = useRef(false);

  /* ── Función para añadir una notificación al apoderado ── */
  const addGuardianNotif = useCallback((text, tone = 'green') => {
    const notif = makeGuardianNotif(text, tone);
    setGuardianNotifs((prev) => {
      // Máx. 20 notificaciones, más recientes primero
      const updated = [notif, ...prev].slice(0, 20);
      safeStorage.set(STORAGE_KEYS.GUARDIAN_NOTIFS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ── Sincronización desde localStorage (cross-tab / furgon:sync) ── */
  const syncFromStorage = useCallback(() => {
    if (isUpdatingRef.current) return;
    try {
      const savedUser = safeStorage.get(STORAGE_KEYS.AUTH_USER);
      if (savedUser) setCurrentUser(JSON.parse(savedUser)); else setCurrentUser(null);

      const savedUsers = safeStorage.get(STORAGE_KEYS.USERS);
      if (savedUsers) setUsers(JSON.parse(savedUsers));

      const savedGuardian = safeStorage.get(STORAGE_KEYS.SELECTED_GUARDIAN);
      if (savedGuardian) setSelectedGuardianId(savedGuardian);

      const savedCode = safeStorage.get(STORAGE_KEYS.PICKUP_CODE);
      setPickupCode(savedCode || null);

      const savedTime = safeStorage.get(STORAGE_KEYS.PICKUP_CODE_TIME);
      setPickupCodeTime(savedTime ? new Date(savedTime) : null);

      const savedAttendance = safeStorage.get(STORAGE_KEYS.ATTENDANCE);
      if (savedAttendance !== null) setAttending(savedAttendance === 'true');

      const savedRoute = safeStorage.get(STORAGE_KEYS.ROUTE_STATUS);
      if (savedRoute) setRouteStatus(savedRoute);

      const savedStudents = safeStorage.get(STORAGE_KEYS.STUDENTS);
      if (savedStudents) setStudents(JSON.parse(savedStudents));

      const savedNotifs = safeStorage.get(STORAGE_KEYS.GUARDIAN_NOTIFS);
      if (savedNotifs) setGuardianNotifs(JSON.parse(savedNotifs));
    } catch (e) {
      console.error('[useVanState sync error]', e);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key?.startsWith('furgon-seguro:')) syncFromStorage();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('furgon:sync', syncFromStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('furgon:sync', syncFromStorage);
    };
  }, [syncFromStorage]);

  /* ── Persistir usuarios ── */
  useEffect(() => {
    safeStorage.set(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  /* ── Sincronizar apoderado y PIN en alumno Martín Reyes (c1) ── */
  useEffect(() => {
    const currentGuardian = guardians.find((g) => g.id === selectedGuardianId) ?? guardians[0];
    const guardianLabel = `${currentGuardian.name} (${currentGuardian.role})`;

    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.id === 'c1' || s.isPrimaryChild) {
          return {
            ...s,
            authorizedGuardian: guardianLabel,
            pickupCode: pickupCode || s.pickupCode,
            state: attending ? (s.state === 'no_subio' ? 'subio' : s.state) : 'no_subio',
          };
        }
        return s;
      });
      safeStorage.set(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });
  }, [selectedGuardianId, pickupCode, attending]);

  /* ──────────────── MÉTODOS DE AUTENTICACIÓN ──────────────── */

  const login = useCallback((email, password, role) => {
    const { value: cleanEmail, valid: emailOk } = validators.email(email);
    if (!emailOk) return { success: false, error: 'Formato de correo inválido.' };

    // Rate limiting de intentos fallidos
    if (rateLimit.isBlocked(cleanEmail)) {
      return { success: false, error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Espera 15 minutos.' };
    }

    const cleanPass = String(password ?? '').trim();
    const user = users.find(
      (u) => u.email.toLowerCase() === cleanEmail && (!role || u.role === role)
    );

    if (!user || user.password !== cleanPass) {
      const { blocked, remaining } = rateLimit.recordFail(cleanEmail);
      auditLog.write('AUTH', `Login fallido para ${cleanEmail}`, { role });
      if (blocked) return { success: false, error: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.' };
      return { success: false, error: `Correo o contraseña incorrectos.${remaining > 0 ? ` Intentos restantes: ${remaining}.` : ''}` };
    }

    rateLimit.recordSuccess(cleanEmail);
    auditLog.write('AUTH', `Login exitoso: ${cleanEmail}`, { role: user.role });
    setCurrentUser(user);
    safeStorage.set(SK.AUTH_USER, JSON.stringify(user));
    triggerSync();
    return { success: true, user };
  }, [users]);

  const loginQuick = useCallback((role) => {
    const target = DEFAULT_USERS.find((u) => u.role === role) || users.find((u) => u.role === role);
    if (target) {
      setCurrentUser(target);
      safeStorage.set(STORAGE_KEYS.AUTH_USER, JSON.stringify(target));
      triggerSync();
    }
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    safeStorage.remove(STORAGE_KEYS.AUTH_USER);
    triggerSync();
  }, []);

  const registerUser = useCallback((formData) => {
    const { name, lastName, email, childName, grade, password, role } = formData;
    const cleanEmail = email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Ya existe un usuario registrado con este correo electrónico.' };
    }

    const newUser = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      password: password.trim(),
      role,
      childName: childName?.trim() || 'Estudiante',
      grade: grade?.trim() || 'General',
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    safeStorage.set(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));

    if (role === 'apoderado' && childName) {
      const newChild = {
        id: `c-${Date.now()}`,
        name: childName.trim(),
        grade: grade?.trim() || 'Básico',
        route: 'Furgón Los Robles',
        emoji: '🎒',
        address: 'Dirección registrada del alumno',
        stopNumber: students.length + 1,
        eta: '8:45 AM',
        state: 'pendiente',
        authorizedGuardian: `${name.trim()} ${lastName.trim()} (Apoderado)`,
        pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
      };
      const nextStudents = [...students, newChild];
      setStudents(nextStudents);
      safeStorage.set(STORAGE_KEYS.STUDENTS, JSON.stringify(nextStudents));
    }

    triggerSync();
    return { success: true, user: newUser };
  }, [users, students]);

  /* ──────────────── MÉTODOS DE CONDUCTOR ──────────────── */

  const updateStudentStatus = useCallback((studentId, newState) => {
    // Buscar el nombre del alumno para la notificación
    let studentName = 'el alumno';
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId);
      if (target) studentName = target.name;
      const updated = prev.map((s) =>
        s.id === studentId ? { ...s, state: newState } : s
      );
      safeStorage.set(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });

    // Si es Martín Reyes (c1), sincronizar asistencia en el Apoderado
    if (studentId === 'c1') {
      if (newState === 'no_subio') {
        setAttending(false);
        safeStorage.set(STORAGE_KEYS.ATTENDANCE, 'false');
      } else if (newState === 'subio') {
        setAttending(true);
        safeStorage.set(STORAGE_KEYS.ATTENDANCE, 'true');
      }
    }

    // Generar notificación para el apoderado con el estado actualizado
    const notifText = STATE_NOTIF_TEXT[newState]?.(studentName) ?? `Estado de ${studentName} actualizado`;
    const notifTone = STATE_NOTIF_TONE[newState] ?? 'green';
    const notif = makeGuardianNotif(notifText, notifTone);
    setGuardianNotifs((prev) => {
      const updated = [notif, ...prev].slice(0, 20);
      safeStorage.set(STORAGE_KEYS.GUARDIAN_NOTIFS, JSON.stringify(updated));
      return updated;
    });

    triggerSync();
  }, []);

  const deliverStudent = useCallback((studentId, enteredCode) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return { success: false, error: 'Alumno no encontrado en el sistema.' };

    const expectedCode = (student.id === 'c1' || student.isPrimaryChild)
      ? (pickupCode || student.pickupCode || '4829')
      : (student.pickupCode || '1234');

    const cleanInput = String(enteredCode).trim();
    if (cleanInput === String(expectedCode).trim()) {
      updateStudentStatus(studentId, 'entregado');

      // Notificación de entrega exitosa al apoderado
      addGuardianNotif(
        `✅ ${student.name} fue entregado a ${student.authorizedGuardian} — código verificado`,
        'green'
      );

      return { success: true, student, authorizedGuardian: student.authorizedGuardian };
    } else {
      // Notificación de intento fallido
      addGuardianNotif(
        `⚠️ Intento de entrega de ${student.name} con código incorrecto`,
        'amber'
      );
      return {
        success: false,
        error: 'Código incorrecto. Por favor, solicita la clave al apoderado e inténtalo nuevamente.',
      };
    }
  }, [students, pickupCode, updateStudentStatus, addGuardianNotif]);

  /* ──────────────── MÉTODOS DE APODERADO ──────────────── */

  const handleSelectGuardian = useCallback((id) => {
    setSelectedGuardianId(id);
    safeStorage.set(STORAGE_KEYS.SELECTED_GUARDIAN, id);
    triggerSync();
  }, []);

  const handleAttendanceToggle = useCallback(() => {
    const next = !attending;
    setAttending(next);
    safeStorage.set(STORAGE_KEYS.ATTENDANCE, String(next));

    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.id === 'c1' || s.isPrimaryChild ? { ...s, state: next ? 'subio' : 'no_subio' } : s
      );
      safeStorage.set(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });

    triggerSync();
    return next;
  }, [attending]);

  const generateNewPickupCode = useCallback(() => {
    const newCode = String(Math.floor(1000 + Math.random() * 9000));
    const now = new Date();

    setPickupCode(newCode);
    setPickupCodeTime(now);
    safeStorage.set(STORAGE_KEYS.PICKUP_CODE, newCode);
    safeStorage.set(STORAGE_KEYS.PICKUP_CODE_TIME, now.toISOString());

    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.id === 'c1' || s.isPrimaryChild ? { ...s, pickupCode: newCode } : s
      );
      safeStorage.set(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });

    triggerSync();
    return newCode;
  }, []);

  const clearPickupCode = useCallback(() => {
    setPickupCode(null);
    setPickupCodeTime(null);
    safeStorage.remove(STORAGE_KEYS.PICKUP_CODE);
    safeStorage.remove(STORAGE_KEYS.PICKUP_CODE_TIME);
    triggerSync();
  }, []);

  const handleUpdateRouteStatus = useCallback((status) => {
    setRouteStatus(status);
    safeStorage.set(STORAGE_KEYS.ROUTE_STATUS, status);

    // Notificar al apoderado sobre el cambio de estado de la ruta
    const routeNotifText =
      status === 'en_ruta'   ? '🚐 El conductor reanudó el recorrido' :
      status === 'pausado'   ? '⏸️ El conductor pausó el recorrido temporalmente' :
      status === 'finalizado'? '🏁 El conductor finalizó el recorrido del día' : null;

    if (routeNotifText) {
      addGuardianNotif(routeNotifText, status === 'finalizado' ? 'green' : 'amber');
    }

    triggerSync();
  }, [addGuardianNotif]);

  return {
    currentUser,
    users,
    students,
    selectedGuardianId,
    pickupCode,
    pickupCodeTime,
    attending,
    routeStatus,
    driverNotifications: DRIVER_NOTIFICATIONS,
    guardianNotifications: guardianNotifs,
    // Actions
    login,
    loginQuick,
    logout,
    registerUser,
    updateStudentStatus,
    deliverStudent,
    handleSelectGuardian,
    handleAttendanceToggle,
    generateNewPickupCode,
    clearPickupCode,
    handleUpdateRouteStatus,
  };
}
