import { useState } from 'react';
import DriverHeader from './DriverHeader.jsx';
import DriverMap from './DriverMap.jsx';
import DeliveryModal from './DeliveryModal.jsx';
import { STUDENT_STATES } from '../data/mockData.js';
import { MapPinIcon, ShieldIcon, CheckIcon, AbsentIcon } from './icons.jsx';

export default function DriverDashboard({
  currentUser,
  students = [],
  pickupCode = '4829',
  routeStatus = 'en_ruta',
  driverNotifications = [],
  onUpdateStudentStatus,
  onConfirmDelivery,
  onUpdateRouteStatus,
  onLogout,
}) {
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedStudentForDelivery, setSelectedStudentForDelivery] = useState(null);
  const [filterState, setFilterState] = useState('todos'); // 'todos' | 'a_bordo' | 'pendientes' | 'entregados'
  const [searchTerm, setSearchTerm] = useState('');

  // Métricas del Conductor (Requisito 7)
  const totalCount = students.length;
  const subieronCount = students.filter((s) => s.state === 'subio' || s.state === 'en_recorrido' || s.state === 'listo_entrega').length;
  const pendientesCount = students.filter((s) => s.state === 'pendiente').length;
  const noAsistiranCount = students.filter((s) => s.state === 'no_subio').length;
  const entregadosCount = students.filter((s) => s.state === 'entregado').length;

  // Próxima parada activa
  const nextStudent = students.find((s) => s.state === 'listo_entrega' || s.state === 'subio' || s.state === 'en_recorrido') || students[0];
  const nextStopIndex = nextStudent ? students.findIndex((s) => s.id === nextStudent.id) : 0;

  // Filtrado de alumnos
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.grade.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterState === 'a_bordo') {
      return s.state === 'subio' || s.state === 'en_recorrido' || s.state === 'listo_entrega';
    }
    if (filterState === 'pendientes') {
      return s.state === 'pendiente';
    }
    if (filterState === 'entregados') {
      return s.state === 'entregado';
    }
    if (filterState === 'no_asisten') {
      return s.state === 'no_subio';
    }
    return true;
  });

  function handleOpenDelivery(studentId = null) {
    setSelectedStudentForDelivery(studentId || nextStudent?.id || students[0]?.id);
    setDeliveryModalOpen(true);
  }

  function handleQuickStatus(studentId, newState) {
    onUpdateStudentStatus(studentId, newState);
  }

  function toggleRouteRunning() {
    if (routeStatus === 'en_ruta') {
      onUpdateRouteStatus('pausado');
    } else {
      onUpdateRouteStatus('en_ruta');
    }
  }

  function handleFinishRoute() {
    if (window.confirm('¿Deseas dar por finalizado el recorrido de hoy?')) {
      onUpdateRouteStatus('finalizado');
    }
  }

  return (
    <div className="driver-shell">
      <div className="driver-container">
        {/* Panel Superior (Requisito 4) */}
        <DriverHeader
          driverName={`${currentUser?.name || 'Carlos'} ${currentUser?.lastName || 'Morales'}`}
          routeStatus={routeStatus}
          notifications={driverNotifications}
          onLogout={onLogout}
        />

        <main className="driver-content">
          {/* Panel de Control y Próxima Parada (Requisito 7) */}
          <section className="driver-banner-card">
            <div className="driver-banner-top">
              <div>
                <span className="banner-eyebrow">Próxima parada · Parada #{nextStopIndex + 1}</span>
                <h2 className="banner-title">{nextStudent ? nextStudent.name : 'Ruta completada'}</h2>
                <p className="banner-address">
                  <MapPinIcon width={14} height={14} />
                  {nextStudent ? nextStudent.address : 'Destino final'}
                </p>
              </div>

              <div className="banner-eta-badge">
                <span className="eta-badge-label">Llegada est.</span>
                <span className="eta-badge-time">{nextStudent ? nextStudent.eta : 'Completado'}</span>
              </div>
            </div>

            {/* Botón Principal: Entregar Niño (Requisito 5) */}
            <div className="banner-actions-row">
              <button
                type="button"
                className="action-btn-primary deliver-cta-btn"
                onClick={() => handleOpenDelivery(nextStudent?.id)}
              >
                <ShieldIcon width={20} height={20} />
                <span>Entregar niño con PIN</span>
              </button>

              <div className="route-controls-group">
                <button
                  type="button"
                  className={`route-toggle-btn${routeStatus === 'en_ruta' ? ' pause' : ' start'}`}
                  onClick={toggleRouteRunning}
                  title={routeStatus === 'en_ruta' ? 'Pausar recorrido' : 'Continuar recorrido'}
                >
                  {routeStatus === 'en_ruta' ? '⏸️ Pausar ruta' : '▶️ Iniciar ruta'}
                </button>
                {routeStatus !== 'finalizado' && (
                  <button
                    type="button"
                    className="route-finish-btn"
                    onClick={handleFinishRoute}
                    title="Finalizar jornada"
                  >
                    ⏹️ Finalizar
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Tarjetas de Métricas del Conductor (Requisito 7) */}
          <section className="driver-metrics-grid" aria-label="Métricas del recorrido">
            <div className="metric-card total">
              <span className="metric-val">{totalCount}</span>
              <span className="metric-lbl">Total Alumnos</span>
            </div>
            <div className="metric-card on-board">
              <span className="metric-val">🟢 {subieronCount}</span>
              <span className="metric-lbl">Subieron / A bordo</span>
            </div>
            <div className="metric-card pending">
              <span className="metric-val">🟡 {pendientesCount}</span>
              <span className="metric-lbl">Pendientes</span>
            </div>
            <div className="metric-card absent">
              <span className="metric-val">🔴 {noAsistiranCount}</span>
              <span className="metric-lbl">No asistirán</span>
            </div>
            <div className="metric-card delivered">
              <span className="metric-val">⚪ {entregadosCount}</span>
              <span className="metric-lbl">Entregados</span>
            </div>
          </section>

          {/* Mapa real MapTiler con la ruta del furgón (Requisito 7) */}
          <DriverMap
            students={students}
            routeStatus={routeStatus}
            nextStopIndex={nextStopIndex}
          />

          {/* Sección de Lista de Alumnos (Requisito 4 y 6) */}
          <section className="driver-students-section">
            <div className="students-section-header">
              <div>
                <h3 className="section-title">Lista de alumnos del furgón</h3>
                <p className="section-sub">Control de abordaje, estado en ruta y entrega con clave</p>
              </div>

              {/* Botón secundario para entregar niño */}
              <button
                type="button"
                className="section-deliver-btn"
                onClick={() => handleOpenDelivery()}
              >
                🔑 Entregar niño
              </button>
            </div>

            {/* Buscador y Filtros */}
            <div className="students-controls">
              <input
                type="search"
                className="students-search-input"
                placeholder="Buscar por nombre, curso o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="students-filter-chips" role="group" aria-label="Filtrar alumnos">
                <button
                  type="button"
                  className={`filter-chip${filterState === 'todos' ? ' active' : ''}`}
                  onClick={() => setFilterState('todos')}
                >
                  Todos ({totalCount})
                </button>
                <button
                  type="button"
                  className={`filter-chip${filterState === 'a_bordo' ? ' active' : ''}`}
                  onClick={() => setFilterState('a_bordo')}
                >
                  🟢 A bordo ({subieronCount})
                </button>
                <button
                  type="button"
                  className={`filter-chip${filterState === 'pendientes' ? ' active' : ''}`}
                  onClick={() => setFilterState('pendientes')}
                >
                  🟡 Pendientes ({pendientesCount})
                </button>
                <button
                  type="button"
                  className={`filter-chip${filterState === 'no_asisten' ? ' active' : ''}`}
                  onClick={() => setFilterState('no_asisten')}
                >
                  🔴 No asistirán ({noAsistiranCount})
                </button>
                <button
                  type="button"
                  className={`filter-chip${filterState === 'entregados' ? ' active' : ''}`}
                  onClick={() => setFilterState('entregados')}
                >
                  ⚪ Entregados ({entregadosCount})
                </button>
              </div>
            </div>

            {/* Listado de tarjetas de alumnos */}
            <div className="students-cards-list">
              {filteredStudents.length === 0 ? (
                <div className="empty-students-notice">
                  <span>🔍</span>
                  <p>No se encontraron alumnos con los criterios seleccionados.</p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const stateConfig = STUDENT_STATES[student.state] || STUDENT_STATES.pendiente;
                  const isBoarded = student.state === 'subio' || student.state === 'en_recorrido' || student.state === 'listo_entrega';
                  const isDelivered = student.state === 'entregado';
                  const isAbsent = student.state === 'no_subio';

                  return (
                    <article
                      key={student.id}
                      className={`driver-student-card${isBoarded ? ' boarded' : ''}${isDelivered ? ' delivered' : ''}${isAbsent ? ' absent' : ''}`}
                    >
                      <div className="student-card-main">
                        <div className="student-avatar-box">
                          <span className="student-emoji">{student.emoji || '🧒'}</span>
                          <span className="stop-num-tag">#{student.stopNumber}</span>
                        </div>

                        <div className="student-details">
                          <div className="student-name-row">
                            <h4 className="student-fullname">{student.name}</h4>
                            {/* Estado del alumno claramente visible (Requisito 6) */}
                            <span className={`student-state-badge ${stateConfig.badgeClass}`}>
                              <span className="state-badge-icon">{stateConfig.icon}</span>
                              <span className="state-badge-label">{stateConfig.label}</span>
                            </span>
                          </div>

                          <div className="student-meta-row">
                            <span className="student-grade-pill">{student.grade}</span>
                            <span className="student-eta-pill">⏱️ {student.eta}</span>
                          </div>

                          <p className="student-address-text">
                            <MapPinIcon width={13} height={13} />
                            {student.address}
                          </p>

                          <div className="student-guardian-info">
                            <span className="guardian-label">Autorizado hoy:</span>
                            <strong className="guardian-name">{student.authorizedGuardian}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Acciones de Subida y Entrega (Requisito 4 y 5) */}
                      <div className="student-card-actions">
                        <div className="boarding-buttons-group">
                          <button
                            type="button"
                            className={`board-btn up${student.state === 'subio' ? ' active' : ''}`}
                            onClick={() => handleQuickStatus(student.id, 'subio')}
                            title="Marcar que el alumno subió al furgón"
                          >
                            <CheckIcon />
                            <span>Subió al furgón</span>
                          </button>

                          <button
                            type="button"
                            className={`board-btn down${student.state === 'no_subio' ? ' active' : ''}`}
                            onClick={() => handleQuickStatus(student.id, 'no_subio')}
                            title="Marcar que el alumno no subió o no asistirá"
                          >
                            <AbsentIcon />
                            <span>No subió</span>
                          </button>
                        </div>

                        {/* Selector de estado avanzado y Botón de Entrega */}
                        <div className="card-right-actions">
                          <select
                            className="status-quick-select"
                            value={student.state}
                            onChange={(e) => handleQuickStatus(student.id, e.target.value)}
                            aria-label={`Cambiar estado de ${student.name}`}
                          >
                            <option value="pendiente">🟡 Pendiente</option>
                            <option value="subio">🟢 Subió al furgón</option>
                            <option value="en_recorrido">🔵 En recorrido</option>
                            <option value="listo_entrega">🟣 Listo p/ entregar</option>
                            <option value="entregado">⚪ Entregado</option>
                            <option value="no_subio">🔴 No subió</option>
                          </select>

                          <button
                            type="button"
                            className="deliver-action-btn"
                            onClick={() => handleOpenDelivery(student.id)}
                            title="Validar entrega con PIN de 4 dígitos"
                          >
                            🔑 Entregar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <footer className="credit">
            Furgón Seguro · Panel de Operación del Conductor
          </footer>
        </main>

        {/* Modal de Validación de Clave y Entrega (Requisito 5 y 8) */}
        <DeliveryModal
          isOpen={deliveryModalOpen}
          onClose={() => setDeliveryModalOpen(false)}
          students={students}
          selectedStudentId={selectedStudentForDelivery}
          onConfirmDelivery={onConfirmDelivery}
          activePickupCode={pickupCode}
        />
      </div>
    </div>
  );
}
