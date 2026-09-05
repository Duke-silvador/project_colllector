/**
 * Site-level configuration.
 *
 * `CONTACT_DESTINATION` is the single destination behind every call to action on the
 * site — the desktop nav, the mobile nav and the contact section all read this one
 * constant, and no component hardcodes an address. Changing it here changes all three.
 *
 * This address is published on a public page, so it will be scraped. If that becomes a
 * problem, route it to an alias or a form rather than editing addresses into components.
 *
 * See docs/PM-DECISIONS.md §7 for how this value was settled.
 */
export const CONTACT_DESTINATION = "mailto:inquiry@pistac.io";

/**
 * Kept alongside the constant so a pre-launch check can assert on it rather than
 * string-matching the address.
 */
export const CONTACT_DESTINATION_IS_PLACEHOLDER = false;

/** Canonical origin, used for metadata resolution only. */
export const SITE_URL = "https://pistac.io";
