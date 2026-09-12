<?php
/**
 * Plugin Name:       AI Alt Text
 * Plugin URI:        https://github.com/Yodzira/ai-alt-text
 * Description:      A media library full of images without alt text? Generate drafts in batches with your own AI vision key — review and approve. Nothing goes live without you.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Yodzira
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ai-alt-text
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AIAT_VERSION', '0.1.0' );
define( 'AIAT_FILE', __FILE__ );
define( 'AIAT_DIR', __DIR__ );

spl_autoload_register(
	static function ( $class ) {
		if ( 0 !== strpos( $class, 'AIAT_' ) ) {
			return;
		}
		$snake = strtolower( preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', substr( $class, 5 ) ) );
		$snake = str_replace( '_', '-', $snake );
		$file  = AIAT_DIR . '/includes/class-aiat-' . $snake . '.php';
		if ( is_readable( $file ) ) {
			require $file;
		}
	}
);

add_action( 'plugins_loaded', array( 'AIAT_Plugin', 'boot' ), 20 );

register_activation_hook(
	__FILE__,
	static function () {
		require_once AIAT_DIR . '/includes/class-aiat-store.php';
		AIAT_Store::activate();
		if ( ! wp_next_scheduled( 'aiat_generate_batch' ) ) {
			wp_schedule_event( time() + 300, 'hourly', 'aiat_generate_batch' );
		}
	}
);

register_deactivation_hook(
	__FILE__,
	static function () {
		wp_clear_scheduled_hook( 'aiat_generate_batch' );
	}
);
