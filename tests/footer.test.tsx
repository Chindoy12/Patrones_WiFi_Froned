import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '../src/components/SiteFooter';
import { greetingName } from '../src/format';

describe('SiteFooter', () => {
  it('closes the page with the brand and the privacy promise of the agent', () => {
    render(<SiteFooter />);

    expect(screen.getByRole('contentinfo')).toHaveTextContent('WiFiSense · Monitoreo de redes Wi-Fi');
    expect(screen.getByText('Las direcciones MAC nunca salen de tu computador')).toHaveClass('stamp');
    expect(screen.getByText(/hora de Colombia/)).toBeInTheDocument();
  });
});

describe('greetingName', () => {
  it('drops the domain of an email and keeps a plain username', () => {
    expect(greetingName('laura.rios@correo.co')).toBe('laura.rios');
    expect(greetingName('Jefe.Local')).toBe('Jefe.Local');
    expect(greetingName(undefined)).toBe('');
  });
});
