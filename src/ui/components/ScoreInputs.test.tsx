import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ScoreInputs } from './ScoreInputs';
import type { Score } from '../../domain/types';

function Harness({ maxGoals }: { maxGoals: number }) {
  const [s, setS] = useState<Score>({});
  return <ScoreInputs label="Z" score={s} maxGoals={maxGoals} withLosses onChange={setS} />;
}

describe('ScoreInputs', () => {
  it('hodnota nad maximum se nepřijme (překlep 66 zůstane 6)', async () => {
    const user = userEvent.setup();
    render(<Harness maxGoals={10} />);
    await user.type(screen.getByLabelText('Z: góly vlevo'), '66');
    expect(screen.getByLabelText('Z: góly vlevo')).toHaveValue(6);
    await user.type(screen.getByLabelText('Z: ztráty vlevo'), '31');
    expect(screen.getByLabelText('Z: ztráty vlevo')).toHaveValue(3);
  });
  it('u simulace jsou sety nejvýš 2', async () => {
    const user = userEvent.setup();
    render(<Harness maxGoals={2} />);
    await user.type(screen.getByLabelText('Z: góly vlevo'), '3');
    expect(screen.getByLabelText('Z: góly vlevo')).toHaveValue(null);
  });
});
