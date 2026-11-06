/**
 * Fork Merge — Host plugin entry.
 *
 * Registers `/merge*` commands and nothing else. No client half, no new event
 * types, no session-file access: every effect goes through the public Host
 * services (`commands`, `sessionController`, `llm`, `sessions`).
 *
 * @module dsh-fork-merge
 */

import { registerMergeCommands } from './lib/commands.js'

/** Plugin name used by the Loader. */
export const name = 'dsh-fork-merge'

/** Services this plugin cannot function without. */
export const inject = ['commands', 'sessionController', 'llm', 'sessions']

/**
 * Mount the merge command surface.
 *
 * @param {object} ctx - Host context carrying the injected services.
 * @returns {void}
 */
export function apply(ctx) {
  const dispose = registerMergeCommands(ctx)
  ctx.effect(() => dispose, 'dsh-fork-merge commands')
}
