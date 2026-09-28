import { CheckIcon, AbsentIcon } from './icons.jsx';

export default function AttendanceToggle({ attending, onToggle, childName }) {
  return (
    <div className="mini-card attendance-card">
      <span className="mini-icon">{attending ? <CheckIcon /> : <AbsentIcon />}</span>
      <span className="mini-text">
        <strong>Asistencia de hoy</strong>
        <small>{attending ? `${childName} asiste al colegio` : `${childName} no asiste hoy`}</small>
      </span>
      <button
        className={`toggle${attending ? '' : ' off'}`}
        role="switch"
        aria-checked={attending}
        aria-label="Marcar asistencia"
        onClick={onToggle}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}
