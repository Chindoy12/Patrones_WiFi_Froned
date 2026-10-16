import { PASSWORD_RULES } from '../auth/credentials';

/** Live checklist of the password rules; each one turns green as it is met. */
export function PasswordRules({ password, id }: { password: string; id: string }) {
  return (
    <ul id={id} className="rules" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return <li key={rule.label} className={ok ? 'is-ok' : ''}><span aria-hidden="true">{ok ? '✓' : '•'}</span> {rule.label}</li>;
      })}
    </ul>
  );
}
