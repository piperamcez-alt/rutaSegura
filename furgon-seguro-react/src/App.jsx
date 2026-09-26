import { useState } from 'react';
import AppHeader from './components/AppHeader.jsx';
import RouteCard from './components/RouteCard.jsx';
import AttendanceToggle from './components/AttendanceToggle.jsx';
import ChildCard from './components/ChildCard.jsx';
import GuardianSheet from './components/GuardianSheet.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import RegisterModal from './components/RegisterModal.jsx';
import DriverDashboard from './components/DriverDashboard.jsx';
import { guardians, child, routeOrigin, routeDestination } from './data/guardians.js';
import { useMapboxRoute } from './map/useMapboxRoute.js';
import { useVanState } from './hooks/useVanState.js';
import './App.css';

export default function App() {
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* ── Estado central sincronizado entre Apoderado y Conductor ── */
  const {
    currentUser,
    students,
    selectedGuardianId,
    pickupCode,
    pickupCodeTime,
    attending,
    routeStatus,
    driverNotifications,
    guardianNotifications,
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
  } = useVanState();

  /* ── Ruta con Mapbox Directions API (+ fallback sin key) ── */
  const {
    busPosition,
    routeCoords,
    traveledCoords,
    progressPct,
    etaLabel,
    statusText,
    arrived,
    resetRoute,
  } = useMapboxRoute(routeOrigin, routeDestination, attending);

  function onAttendanceClick() {
    const nextAttending = handleAttendanceToggle();
    if (nextAttending) resetRoute();
    else clearPickupCode();
  }

  /* ── Pantalla de login ── */
  if (!currentUser) {
    return (
      <div className="app-shell">
        <LoginScreen
          onLogin={login}
          onQuickLogin={loginQuick}
          onOpenRegister={() => setRegisterModalOpen(true)}
        />
        <RegisterModal
          isOpen={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          onRegisterSuccess={registerUser}
        />
      </div>
    );
  }

  /* ── Vista del CONDUCTOR ── */
  if (currentUser.role === 'conductor') {
    return (
      <>
        <DriverDashboard
          currentUser={currentUser}
          students={students}
          pickupCode={pickupCode}
          routeStatus={routeStatus}
          driverNotifications={driverNotifications}
          onUpdateStudentStatus={updateStudentStatus}
          onConfirmDelivery={deliverStudent}
          onUpdateRouteStatus={handleUpdateRouteStatus}
          onLogout={logout}
        />
        <RegisterModal
          isOpen={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          onRegisterSuccess={registerUser}
        />
      </>
    );
  }

  /* ── Vista del APODERADO ── */
  const martinStudent = students.find((s) => s.id === 'c1' || s.isPrimaryChild);
  let statusChip = { label: 'En ruta' };
  if (!attending)  statusChip = { label: 'Sin recorrido', className: 'paused' };
  else if (arrived) statusChip = { label: 'Llegó', className: 'arrived' };

  return (
    <div className="app-shell">
      <div className="app-container">
        <AppHeader
          guardian={guardians.find((g) => g.id === selectedGuardianId) ?? guardians[0]}
          notifications={guardianNotifications}
          onProfileClick={() => setSheetOpen(true)}
          onLogout={logout}
        />

        <main className="content">
          <RouteCard
            attending={attending}
            statusText={attending ? statusText : 'No hay recorrido programado'}
            statusChip={statusChip}
            progressPct={progressPct}
            etaLabel={etaLabel}
            origin={routeOrigin}
            destination={routeDestination}
            busPosition={busPosition}
            routeCoords={routeCoords}
            traveledCoords={traveledCoords}
          />

          <AttendanceToggle
            attending={attending}
            childName={child.name.split(' ')[0]}
            onToggle={onAttendanceClick}
          />

          <ChildCard
            child={child}
            attending={attending}
            studentState={martinStudent?.state}
          />

          <GuardianSheet
            guardians={guardians}
            selectedId={selectedGuardianId}
            open={sheetOpen}
            onOpen={() => setSheetOpen(true)}
            onClose={() => setSheetOpen(false)}
            onSelect={handleSelectGuardian}
            pickupCode={pickupCode}
            pickupCodeTime={pickupCodeTime}
            onGenerateCode={generateNewPickupCode}
            onClearCode={clearPickupCode}
          />

          <footer className="credit">
            Furgón Seguro · Seguimiento en vivo para apoderados
          </footer>
        </main>
      </div>

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegisterSuccess={registerUser}
      />
    </div>
  );
}
