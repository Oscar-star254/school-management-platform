import * as migration_20261021_053901_initial from './20261021_053901_initial';
import * as migration_20261021_220326_results_attendance from './20261021_220326_results_attendance';
import * as migration_20261028_234411_communication from './20261028_234411_communication';

export const migrations = [
  {
    up: migration_20261021_053901_initial.up,
    down: migration_20261021_053901_initial.down,
    name: '20261021_053901_initial',
  },
  {
    up: migration_20261021_220326_results_attendance.up,
    down: migration_20261021_220326_results_attendance.down,
    name: '20261021_220326_results_attendance',
  },
  {
    up: migration_20261028_234411_communication.up,
    down: migration_20261028_234411_communication.down,
    name: '20261028_234411_communication'
  },
];
