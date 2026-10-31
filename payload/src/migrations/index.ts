import * as migration_20261021_053901_initial from './20261021_053901_initial'

import * as migration_20261021_220326_results_attendance from './20261021_220326_results_attendance'

import * as migration_20261028_234411_communication from './20261028_234411_communication'

import * as migration_20261030_014626_finance from './20261030_014626_finance'

import * as migration_20261031_113000_school_platform_features from './20261031_113000_school_platform_features'

import * as migration_20261031_163000_school_photo from './20261031_163000_school_photo'

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

    name: '20261028_234411_communication',
  },

  {
    up: migration_20261030_014626_finance.up,

    down: migration_20261030_014626_finance.down,

    name: '20261030_014626_finance',
  },

  {
    up: migration_20261031_113000_school_platform_features.up,

    down: migration_20261031_113000_school_platform_features.down,

    name: '20261031_113000_school_platform_features',
  },

  {
    up: migration_20261031_163000_school_photo.up,

    down: migration_20261031_163000_school_photo.down,

    name: '20261031_163000_school_photo',
  },
]
