<?php
/**
 * Uninstall cleanup: the API key must not survive.
 *
 * @package AIAltText
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	return;
}

aiat_uninstall_cleanup();

/**
 * Remove every trace of the plugin.
 *
 * @global wpdb $wpdb
 * @return void
 */
function aiat_uninstall_cleanup() {
	global $wpdb;

	delete_option( 'aiat_settings' );
	delete_option( 'aiat_tokens_today' );
	delete_option( 'aiat_tokens_day' );
	wp_clear_scheduled_hook( 'aiat_generate_batch' );

	$table = $wpdb->prefix . 'aiat_drafts';
	// phpcs:ignore WordPress.DB.PreparedSQL -- identifier derived from $wpdb->prefix only.
	$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
}
