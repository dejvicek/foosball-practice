import { EXPLANATIONS } from '../../domain/content';

export function Explanations() {
  return (
    <details className="explanations">
      <summary>Vysvětlivky: stanoviště, pravidla a scénáře</summary>
      {EXPLANATIONS.map((g) => (
        <div key={g.title}>
          <h4>{g.title}</h4>
          {g.items.map((it) => (
            <div key={it.name} className="disc">
              <p>
                <strong>{it.name}</strong>
              </p>
              {it.parts.map((p, i) => (
                <p key={i}>
                  {p.label && <span className="k">{p.label}</span>} {p.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      ))}
    </details>
  );
}
