import * as migration_20261021_053901_initial from './20261021_053901_initial';
import * as migration_20261021_220326_results_attendance from './20261021_220326_results_attendance';

export const migrations = [
  {
    up: migration_20261021_053901_initial.up,
    down: migration_20261021_053901_initial.down,
    name: '20261021_053901_initial',
  },
  {
    up: migration_20261021_220326_results_attendance.up,
    down: migration_20261021_220326_results_attendance.down,
    name: '20261021_220326_results_attendance'
  },
];
