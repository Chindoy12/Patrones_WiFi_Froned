import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, isNewVersionError } from '../src/components/ErrorBoundary';

function Broken({ error }: { error: Error }): never {
  throw error;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);  // React and the boundary log the error
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Error Boundary', () => {
  it('shows a message instead of a blank page when a page fails while drawing', () => {
    render(<ErrorBoundary><Broken error={new Error('x is undefined')} /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal en esta página');
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(console.error).toHaveBeenCalled();
  });

  it('explains that there is a new version when the code of a page cannot be downloaded', () => {
    render(<ErrorBoundary>
      <Broken error={new TypeError('Failed to fetch dynamically imported module: /assets/HistoryPage-abc.js')} />
    </ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('Hay una versión nueva de la página');
    expect(screen.queryByRole('link', { name: 'Volver al inicio' })).not.toBeInTheDocument();
  });

  it('shows the page again when the route changes', async () => {
    function Pages() {
      const [page, setPage] = useState('roto');
      return (
        <>
          <button onClick={() => setPage('panel')}>Ir al panel</button>
          <ErrorBoundary resetKey={page}>
            {page === 'roto' ? <Broken error={new Error('boom')} /> : <p>Panel</p>}
          </ErrorBoundary>
        </>
      );
    }
    render(<Pages />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ir al panel' }));

    expect(screen.getByText('Panel')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recognizes the errors of an outdated version in every browser', () => {
    expect(isNewVersionError(new TypeError('Failed to fetch dynamically imported module: x.js'))).toBe(true);
    expect(isNewVersionError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isNewVersionError(new Error('Loading chunk 3 failed.'))).toBe(true);
    expect(isNewVersionError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
