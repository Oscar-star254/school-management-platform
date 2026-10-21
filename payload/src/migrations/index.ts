import * as migration_20261021_053901_initial from './20261021_053901_initial';

export const migrations = [
  {
    up: migration_20261021_053901_initial.up,
    down: migration_20261021_053901_initial.down,
    name: '20261021_053901_initial'
  },
];
