import { groups, rotate } from './rotation';

describe('rotate', () => {
  it('posune seznam o k pozic', () => {
    expect(rotate(['a', 'b', 'c', 'd'], 1)).toEqual(['b', 'c', 'd', 'a']);
  });
  it('bere k modulo délka', () => {
    expect(rotate(['a', 'b', 'c'], 4)).toEqual(['b', 'c', 'a']);
  });
  it('nemění vstup', () => {
    const input = ['a', 'b'];
    rotate(input, 1);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('groups', () => {
  it('rozdělí round-robin podle indexu', () => {
    expect(groups([1, 2, 3, 4, 5], 2)).toEqual([[1, 3, 5], [2, 4]]);
  });
});
