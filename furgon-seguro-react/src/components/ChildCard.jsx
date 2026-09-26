import { STUDENT_STATES } from '../data/mockData.js';

export default function ChildCard({ child, attending, studentState }) {
  // Si no se pasa studentState explícito, se deriva de attending
  const effectiveKey = studentState || (attending ? 'subio' : 'no_subio');
  const stateConfig = STUDENT_STATES[effectiveKey] || STUDENT_STATES.subio;

  return (
    <section className="child-card">
      <span className="child-avatar" aria-hidden="true">{child.emoji}</span>
      <div className="child-info">
        <strong>{child.name}</strong>
        <small>{child.grade} · {child.route}</small>
      </div>
      <span className={`child-state ${stateConfig.badgeClass}`}>
        <span style={{ marginRight: 4 }}>{stateConfig.icon}</span>
        {stateConfig.label}
      </span>
    </section>
  );
}
